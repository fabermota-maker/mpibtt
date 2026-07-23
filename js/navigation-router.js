/**
 * Motor de navegação — única fonte: JSON (nodes/edges/pois).
 * A* + Yen’s K-shortest. Sem conexões automáticas / sem linha reta.
 */
(function (global) {
  "use strict";

  const ALLOW_AUTOMATIC_NODE_CONNECTIONS = false;
  const ALLOW_STRAIGHT_LINE_FALLBACK = false;
  const ALLOW_ROUTE_OUTSIDE_GRAPH = false;
  const MAX_ROUTE_ALTERNATIVES = 4;
  const MAX_ROUTE_SIMILARITY = 0.72;
  const MAX_ROUTE_POINT_SIMILARITY = 0.78;

  function dist(a, b) {
    const dx = (a.x || 0) - (b.x || 0);
    const dy = (a.y || 0) - (b.y || 0);
    return Math.sqrt(dx * dx + dy * dy);
  }

  function heuristic(current, destination) {
    return dist(current, destination);
  }

  function getEdgeCost(edge, preference, ctx) {
    let cost = edge.distanceMeters;
    if (preference === "simplest") {
      cost += (ctx?.turnPenalty || 0) + (ctx?.levelPenalty || 0);
      if (edge.type === "stairs") cost += 8;
      if (edge.type === "level_transition") cost += 6;
    }
    if (preference === "accessible") {
      if (edge.type === "elevator" || edge.type === "ramp") cost *= 0.85;
    }
    if (ctx?.avoidParking && edge.parkingLot) cost += 1e6;
    return cost;
  }

  function edgePassesPreference(edge, preference) {
    if (!edge || !edge.active) return false;
    if (preference === "accessible") {
      if (!edge.accessible) return false;
      if (edge.type === "stairs") return false;
    }
    return true;
  }

  function buildAdjacencyList(nodes, edges) {
    const adjacency = new Map();
    const edgesById = new Map();
    const nodesById = new Map();

    for (const node of nodes) {
      nodesById.set(node.id, node);
      adjacency.set(node.id, []);
    }

    for (const edge of edges) {
      edgesById.set(edge.id, edge);
      if (!edge.active) continue;
      if (!adjacency.has(edge.from)) {
        throw new Error(`Node inexistente: ${edge.from}`);
      }
      if (!adjacency.has(edge.to)) {
        throw new Error(`Node inexistente: ${edge.to}`);
      }
      adjacency.get(edge.from).push(edge);
      if (edge.bidirectional) {
        adjacency.get(edge.to).push({
          ...edge,
          from: edge.to,
          to: edge.from,
          path: [...(edge.path || [])].reverse(),
          _rev: true,
        });
      }
    }

    return { adjacency, edgesById, nodesById };
  }

  function validateNavigationGraph(data) {
    const issues = [];
    if (!data || !Array.isArray(data.nodes) || !Array.isArray(data.edges)) {
      return { ok: false, issues: ["JSON de navegação inválido"] };
    }
    const nodeIds = new Set();
    for (const n of data.nodes) {
      if (!n?.id) { issues.push("Node sem id"); continue; }
      if (nodeIds.has(n.id)) issues.push(`Node duplicado: ${n.id}`);
      nodeIds.add(n.id);
    }
    const edgeIds = new Set();
    for (const e of data.edges) {
      if (!e?.id) { issues.push("Edge sem id"); continue; }
      if (edgeIds.has(e.id)) issues.push(`Edge duplicada: ${e.id}`);
      edgeIds.add(e.id);
      if (!nodeIds.has(e.from)) issues.push(`Edge sem Node from: ${e.id}→${e.from}`);
      if (!nodeIds.has(e.to)) issues.push(`Edge sem Node to: ${e.id}→${e.to}`);
      if (!(e.distanceMeters > 0)) issues.push(`Edge distância inválida: ${e.id}`);
      if (!e.path || e.path.length < 2) issues.push(`Edge path vazio: ${e.id}`);
    }
    for (const p of data.pois || []) {
      if (!p?.nodeIds?.length) issues.push(`POI sem Node: ${p?.id || "?"}`);
      else for (const nid of p.nodeIds) {
        if (!nodeIds.has(nid)) issues.push(`POI ${p.id} referencia Node inexistente: ${nid}`);
      }
    }
    return { ok: issues.length === 0, issues };
  }

  function validateRouteSequence(nodeIds, edgeIds, edgesById) {
    if (!nodeIds || nodeIds.length < 2) return false;
    if (!edgeIds || edgeIds.length !== nodeIds.length - 1) return false;
    for (let i = 0; i < edgeIds.length; i++) {
      const edge = edgesById.get(edgeIds[i]);
      if (!edge || !edge.active) return false;
      const fromNode = nodeIds[i];
      const toNode = nodeIds[i + 1];
      const validForward = edge.from === fromNode && edge.to === toNode;
      const validReverse = edge.bidirectional && edge.to === fromNode && edge.from === toNode;
      if (!validForward && !validReverse) return false;
    }
    return true;
  }

  function validateRoute(route, graph) {
    if (!route?.nodeIds?.length) return false;
    // rota degenerada (mesmo nó): válida se tem exatamente 1 node e 0 edges
    if (route.nodeIds.length === 1) {
      return (!route.edgeIds || route.edgeIds.length === 0)
        && graph.nodesById.has(route.nodeIds[0]);
    }
    if (!route.edgeIds) return false;
    if (!validateRouteSequence(route.nodeIds, route.edgeIds, graph.edgesById)) return false;
    for (const id of route.nodeIds) {
      if (!graph.nodesById.has(id)) return false;
    }
    for (let i = 1; i < route.nodeIds.length; i++) {
      for (let j = 0; j < i - 1; j++) {
        if (route.nodeIds[i] === route.nodeIds[j] && i !== route.nodeIds.length - 1) {
          return false;
        }
      }
    }
    for (let i = 0; i < route.edgeIds.length; i++) {
      const edge = graph.edgesById.get(route.edgeIds[i]);
      const a = graph.nodesById.get(route.nodeIds[i]);
      const b = graph.nodesById.get(route.nodeIds[i + 1]);
      if (a && b && a.level && b.level && a.level !== b.level) {
        if (!["stairs", "elevator", "ramp", "level_transition"].includes(edge.type)) {
          return false;
        }
      }
    }
    return true;
  }

  function buildRoutePoints(routeEdgeIds, routeNodeIds, edgesById) {
    const points = [];
    for (let index = 0; index < routeEdgeIds.length; index++) {
      const edge = edgesById.get(routeEdgeIds[index]);
      if (!edge) throw new Error(`Edge inexistente: ${routeEdgeIds[index]}`);
      const currentNodeId = routeNodeIds[index];
      const nextNodeId = routeNodeIds[index + 1];
      let edgePoints = edge.path || [];
      if (edge.from === nextNodeId && edge.to === currentNodeId) {
        edgePoints = [...edgePoints].reverse();
      } else if (!(edge.from === currentNodeId && edge.to === nextNodeId)) {
        // bidirectional reverse copy stored as forward in adj — path already oriented
        if (edge._rev) edgePoints = edge.path || [];
      }
      for (const point of edgePoints) {
        const lastPoint = points[points.length - 1];
        if (!lastPoint || lastPoint.x !== point.x || lastPoint.y !== point.y) {
          points.push({ x: point.x, y: point.y });
        }
      }
    }
    return points;
  }

  function reconstructPath(cameFrom, edgeUsed, endId) {
    const nodeIds = [endId];
    const edgeIds = [];
    let cur = endId;
    while (cameFrom.has(cur)) {
      const prev = cameFrom.get(cur);
      const e = edgeUsed.get(cur);
      edgeIds.unshift(e.id);
      nodeIds.unshift(prev);
      cur = prev;
    }
    return { nodeIds, edgeIds };
  }

  function astar(startId, goalIds, graph, opts = {}) {
    if (ALLOW_AUTOMATIC_NODE_CONNECTIONS || ALLOW_STRAIGHT_LINE_FALLBACK || ALLOW_ROUTE_OUTSIDE_GRAPH) {
      throw new Error("Configuração de integridade violada");
    }
    const goals = new Set(Array.isArray(goalIds) ? goalIds : [goalIds]);
    if (!graph.nodesById.has(startId)) return null;
    for (const g of goals) if (!graph.nodesById.has(g)) return null;

    const preference = opts.preference || "shortest";
    const blockedEdges = opts.blockedEdges || new Set();
    const avoidParking = !!opts.avoidParking;
    const bannedTypes = new Set(opts.bannedTypes || []);

    // objetivo heurístico: goal mais próximo geometricamente
    let goalNode = graph.nodesById.get([...goals][0]);
    for (const gid of goals) {
      const n = graph.nodesById.get(gid);
      if (n && dist(graph.nodesById.get(startId), n) < dist(graph.nodesById.get(startId), goalNode)) {
        goalNode = n;
      }
    }

    const open = new Set([startId]);
    const cameFrom = new Map();
    const edgeUsed = new Map();
    const gScore = new Map([[startId, 0]]);
    const fScore = new Map([[startId, heuristic(graph.nodesById.get(startId), goalNode)]]);

    while (open.size) {
      let current = null;
      let bestF = Infinity;
      for (const id of open) {
        const f = fScore.get(id) ?? Infinity;
        if (f < bestF) { bestF = f; current = id; }
      }
      if (current == null) break;
      if (goals.has(current)) {
        const { nodeIds, edgeIds } = reconstructPath(cameFrom, edgeUsed, current);
        let distanceMeters = 0;
        for (const eid of edgeIds) {
          const e = graph.edgesById.get(eid);
          if (e) distanceMeters += e.distanceMeters;
        }
        let points = edgeIds.length
          ? buildRoutePoints(edgeIds, nodeIds, graph.edgesById)
          : [];
        // mesmo nó: usa a coordenada do node para o spur até o ícone do POI
        if (!points.length && nodeIds.length === 1) {
          const n = graph.nodesById.get(nodeIds[0]);
          if (n) points = [{ x: n.x, y: n.y }];
        }
        const route = {
          id: `route-${nodeIds.join(">")}`,
          nodeIds,
          edgeIds,
          points,
          distanceMeters,
          estimatedTimeSeconds: distanceMeters / (opts.walkingSpeedMps || 1.2),
          score: distanceMeters,
          rank: 1,
        };
        if (!validateRoute(route, graph)) return null;
        return route;
      }
      open.delete(current);

      const neighbors = graph.adjacency.get(current) || [];
      for (const edge of neighbors) {
        const baseId = edge.id;
        if (blockedEdges.has(baseId)) continue;
        if (bannedTypes.has(edge.type)) continue;
        if (!edgePassesPreference(edge, preference)) continue;
        if (avoidParking && edge.parkingLot) continue;

        const neighbor = edge.to;
        const step = getEdgeCost(edge, preference, { avoidParking });
        const tentative = (gScore.get(current) ?? Infinity) + step;
        if (tentative < (gScore.get(neighbor) ?? Infinity)) {
          cameFrom.set(neighbor, current);
          edgeUsed.set(neighbor, edge);
          gScore.set(neighbor, tentative);
          const h = heuristic(graph.nodesById.get(neighbor), goalNode);
          fScore.set(neighbor, tentative + h);
          open.add(neighbor);
        }
      }
    }
    return null;
  }

  function calculateEdgeSimilarity(routeA, routeB) {
    const edgesA = new Set(routeA.edgeIds || []);
    const edgesB = new Set(routeB.edgeIds || []);
    const intersection = [...edgesA].filter((id) => edgesB.has(id)).length;
    const union = new Set([...(routeA.edgeIds || []), ...(routeB.edgeIds || [])]).size;
    if (union === 0) return 1;
    return intersection / union;
  }

  function polylineLength(pts) {
    let total = 0;
    for (let i = 1; i < (pts || []).length; i++) total += dist(pts[i - 1], pts[i]);
    return total;
  }

  function samplePolyline(pts, count) {
    if (!pts?.length) return [];
    if (pts.length === 1) return Array(count).fill({ x: pts[0].x, y: pts[0].y });
    const total = polylineLength(pts);
    if (total < 0.01) return Array(count).fill({ x: pts[0].x, y: pts[0].y });
    const out = [];
    let seg = 0;
    let acc = 0;
    let segLen = dist(pts[0], pts[1]);
    const n = Math.max(2, count);
    for (let i = 0; i < n; i++) {
      const target = (total * i) / (n - 1);
      while (seg < pts.length - 2 && acc + segLen < target - 1e-6) {
        acc += segLen;
        seg++;
        segLen = dist(pts[seg], pts[seg + 1]);
      }
      const t = segLen > 1e-6 ? Math.min(1, Math.max(0, (target - acc) / segLen)) : 0;
      out.push({
        x: pts[seg].x + (pts[seg + 1].x - pts[seg].x) * t,
        y: pts[seg].y + (pts[seg + 1].y - pts[seg].y) * t,
      });
    }
    return out;
  }

  function calculatePointSimilarity(ptsA, ptsB) {
    if (!ptsA?.length || !ptsB?.length) return 0;
    const lenA = polylineLength(ptsA);
    const lenB = polylineLength(ptsB);
    if (lenA < 1 || lenB < 1) return ptsA.length === ptsB.length ? 1 : 0;
    const lenRatio = Math.min(lenA, lenB) / Math.max(lenA, lenB);
    if (lenRatio < 0.78) return 0;
    const sa = samplePolyline(ptsA, 20);
    const sb = samplePolyline(ptsB, 20);
    let sum = 0;
    for (let i = 0; i < sa.length; i++) sum += dist(sa[i], sb[i]);
    const avg = sum / sa.length;
    return Math.max(0, 1 - avg / 24) * lenRatio;
  }

  function nodeSetSimilarity(routeA, routeB) {
    const na = routeA?.nodeIds || [];
    const nb = routeB?.nodeIds || [];
    if (!na.length || !nb.length) return 0;
    const setA = new Set(na);
    const setB = new Set(nb);
    let inter = 0;
    for (const id of setA) if (setB.has(id)) inter++;
    const union = new Set([...na, ...nb]).size;
    return union ? inter / union : 0;
  }

  /** Rotas iguais ou quase iguais — nunca devem aparecer como alternativas distintas. */
  function isTooSimilarRoute(routeA, routeB) {
    if (!routeA || !routeB || routeA === routeB) return !!routeA && routeA === routeB;
    const nodeA = (routeA.nodeIds || []).join(">");
    const nodeB = (routeB.nodeIds || []).join(">");
    if (nodeA && nodeA === nodeB) return true;
    if (calculateEdgeSimilarity(routeA, routeB) >= MAX_ROUTE_SIMILARITY) return true;
    if (calculatePointSimilarity(routeA.points, routeB.points) >= MAX_ROUTE_POINT_SIMILARITY) return true;
    if (nodeSetSimilarity(routeA, routeB) >= 0.88) return true;
    const lenA = routeA.distanceMeters || polylineLength(routeA.points);
    const lenB = routeB.distanceMeters || polylineLength(routeB.points);
    if (lenA > 0 && lenB > 0) {
      const lenRatio = Math.min(lenA, lenB) / Math.max(lenA, lenB);
      const ptSim = calculatePointSimilarity(routeA.points, routeB.points);
      if (lenRatio >= 0.9 && ptSim >= 0.68) return true;
      if (lenRatio >= 0.94 && calculateEdgeSimilarity(routeA, routeB) >= 0.62) return true;
    }
    return false;
  }

  function routeSignature(route) {
    return (route.edgeIds || []).join(">");
  }

  /**
   * Yen’s Algorithm — até K rotas simples distintas.
   */
  function findKShortestRoutes(startNodeId, destinationNodeIds, graph, k, opts = {}) {
    const K = Math.min(k || MAX_ROUTE_ALTERNATIVES, MAX_ROUTE_ALTERNATIVES);
    const A = [];
    const B = [];

    const first = astar(startNodeId, destinationNodeIds, graph, opts);
    if (!first) return [];
    A.push(first);

    for (let kIdx = 1; kIdx < K; kIdx++) {
      const prev = A[kIdx - 1];
      for (let i = 0; i < prev.nodeIds.length - 1; i++) {
        const spurNode = prev.nodeIds[i];
        const rootPathNodes = prev.nodeIds.slice(0, i + 1);
        const rootPathEdges = prev.edgeIds.slice(0, i);
        const blocked = new Set(opts.blockedEdges || []);

        for (const r of A) {
          if (r.nodeIds.length > i && rootPathNodes.every((n, idx) => n === r.nodeIds[idx])) {
            if (r.edgeIds[i]) blocked.add(r.edgeIds[i]);
          }
        }

        // remove nós do root (exceto spur) temporariamente bloqueando edges incidentes
        for (const nid of rootPathNodes.slice(0, -1)) {
          for (const e of graph.adjacency.get(nid) || []) blocked.add(e.id);
          // também edges que chegam nele
          for (const [, list] of graph.adjacency) {
            for (const e of list) if (e.to === nid) blocked.add(e.id);
          }
        }

        const spur = astar(spurNode, destinationNodeIds, graph, { ...opts, blockedEdges: blocked });
        if (!spur) continue;

        const nodeIds = rootPathNodes.slice(0, -1).concat(spur.nodeIds);
        const edgeIds = rootPathEdges.concat(spur.edgeIds);
        // dedupe nodes se spur recomeça no spurNode
        const totalDist = edgeIds.reduce((s, id) => s + (graph.edgesById.get(id)?.distanceMeters || 0), 0);
        let points;
        try {
          points = buildRoutePoints(edgeIds, nodeIds, graph.edgesById);
        } catch {
          continue;
        }
        const candidate = {
          id: `route-${edgeIds.join(",")}`,
          nodeIds,
          edgeIds,
          points,
          distanceMeters: totalDist,
          estimatedTimeSeconds: totalDist / (opts.walkingSpeedMps || 1.2),
          score: totalDist,
          rank: 1,
        };
        if (!validateRoute(candidate, graph)) continue;
        if (A.some((r) => routeSignature(r) === routeSignature(candidate))) continue;
        if (B.some((r) => routeSignature(r) === routeSignature(candidate))) continue;
        B.push(candidate);
      }

      if (!B.length) break;
      B.sort((a, b) => a.distanceMeters - b.distanceMeters);
      A.push(B.shift());
    }

    // filtrar rotas visualmente iguais ou quase iguais
    const filtered = [];
    for (const route of A.sort((a, b) => a.distanceMeters - b.distanceMeters)) {
      if (filtered.some((r) => isTooSimilarRoute(r, route))) continue;
      filtered.push(route);
      if (filtered.length >= K) break;
    }

    // se só restou 1, tenta incluir alternativas realmente distintas
    if (filtered.length === 1 && A.length > 1) {
      for (const route of A) {
        if (filtered.some((r) => routeSignature(r) === routeSignature(route))) continue;
        if (filtered.some((r) => isTooSimilarRoute(r, route))) continue;
        filtered.push(route);
        if (filtered.length >= K) break;
      }
      filtered.sort((a, b) => a.distanceMeters - b.distanceMeters);
    }

    filtered.forEach((r, i) => { r.rank = /** @type {1|2|3} */ (i + 1); });
    return filtered.slice(0, K);
  }

  function findRoutesForPoiPair(originNodeIds, destNodeIds, graph, opts = {}) {
    const starts = Array.isArray(originNodeIds) ? originNodeIds : [originNodeIds];
    const ends = Array.isArray(destNodeIds) ? destNodeIds : [destNodeIds];
    const all = [];
    const seen = new Set();

    for (const s of starts) {
      if (!s || !graph.nodesById.has(s)) continue;
      const routes = findKShortestRoutes(s, ends, graph, MAX_ROUTE_ALTERNATIVES, opts);
      for (const r of routes) {
        const sig = routeSignature(r);
        if (seen.has(sig)) continue;
        seen.add(sig);
        all.push(r);
      }
    }

    all.sort((a, b) => a.distanceMeters - b.distanceMeters);
    const out = [];
    for (const route of all) {
      if (out.some((r) => isTooSimilarRoute(r, route))) continue;
      out.push(route);
      if (out.length >= MAX_ROUTE_ALTERNATIVES) break;
    }
    if (out.length < Math.min(2, all.length)) {
      for (const route of all) {
        if (out.some((r) => routeSignature(r) === routeSignature(route))) continue;
        if (out.some((r) => isTooSimilarRoute(r, route))) continue;
        out.push(route);
        if (out.length >= MAX_ROUTE_ALTERNATIVES) break;
      }
      out.sort((a, b) => a.distanceMeters - b.distanceMeters);
    }
    out.forEach((r, i) => { r.rank = /** @type {1|2|3} */ (i + 1); });
    return out.slice(0, MAX_ROUTE_ALTERNATIVES);
  }

  function createNavigationGraph(data) {
    const check = validateNavigationGraph(data);
    if (!check.ok) {
      const err = new Error("Grafo de navegação inválido: " + check.issues.slice(0, 5).join("; "));
      err.issues = check.issues;
      throw err;
    }
    const built = buildAdjacencyList(data.nodes, data.edges);
    return {
      ...built,
      pois: data.pois || [],
      metersPerUnit: data.metersPerUnit,
      walkingSpeedMps: data.walkingSpeedMetersPerSecond || 1.2,
      config: data.config || {},
      raw: data,
    };
  }

  /** Mescla nodes/edges/pois de um andar no grafo existente (lazy load). */
  function mergeNavigationLevel(graph, levelData) {
    if (!graph) {
      return createNavigationGraph({
        version: "1.0.0",
        nodes: levelData.nodes || [],
        edges: levelData.edges || [],
        pois: levelData.pois || [],
        metersPerUnit: levelData.metersPerUnit,
        walkingSpeedMetersPerSecond: levelData.walkingSpeedMetersPerSecond,
        config: levelData.config || {},
      });
    }

    const raw = graph.raw || { nodes: [], edges: [], pois: [] };
    const nodeIds = new Set(raw.nodes.map((n) => n.id));
    for (const n of levelData.nodes || []) {
      if (!nodeIds.has(n.id)) {
        raw.nodes.push(n);
        nodeIds.add(n.id);
      }
    }
    const edgeIds = new Set(raw.edges.map((e) => e.id));
    for (const e of levelData.edges || []) {
      if (!edgeIds.has(e.id)) {
        raw.edges.push(e);
        edgeIds.add(e.id);
      }
    }
    const poiKeys = new Set(raw.pois.map((p) => `${p.id}|${p.level || ""}`));
    for (const p of levelData.pois || []) {
      const key = `${p.id}|${p.level || ""}`;
      if (!poiKeys.has(key)) {
        raw.pois.push(p);
        poiKeys.add(key);
      }
    }

    const built = buildAdjacencyList(raw.nodes, raw.edges);
    return {
      ...built,
      pois: raw.pois,
      metersPerUnit: graph.metersPerUnit ?? raw.metersPerUnit,
      walkingSpeedMps: graph.walkingSpeedMps ?? raw.walkingSpeedMetersPerSecond ?? 1.2,
      config: graph.config || raw.config || {},
      raw,
    };
  }

  function nearestNodeId(point, graph, {
    avoidParking = false,
    preferOutdoor = false,
    level = null,
    maxDistanceSvg = Infinity,
  } = {}) {
    function isParkingOnlyNode(id) {
      if (/estacionamento|escacionamento|_moto|_parking/i.test(String(id))) return true;
      const adj = graph.adjacency.get(id) || [];
      if (!adj.length) return false;
      return adj.every((e) => e.parkingLot);
    }

    function isOutdoorPoiNode(id) {
      return /sevenpass|seven_pass|N0047|bazar|N0046|refeitorio|N0025|area_kids|N0051|N0020|N0021|N0023|N0055|N0043|N0044|N0045|N0050|N0056|N0049|ginasio|outdoor|toldo/i.test(
        String(id),
      );
    }

    let best = null;
    let bestScore = Infinity;
    for (const [id, n] of graph.nodesById) {
      if (!n.active) continue;
      if (level && (n.level || "L00") !== level) continue;
      if (!(graph.adjacency.get(id) || []).length) continue;

      const d = dist(point, n);
      if (d > maxDistanceSvg) continue;

      const parkingOnly = isParkingOnlyNode(id);
      if (avoidParking && parkingOnly) continue;

      let score = d;
      if (preferOutdoor) {
        if (isOutdoorPoiNode(id)) score -= 45;
        if (parkingOnly) score += 150;
        if (/^L00_N008[0-9]|^L00_N009[0-3]/.test(id)) score += 100;
        if (/L00_N0018_estacionamento|L00_N0017_estacionamento/.test(id)) score += 80;
      }

      if (score < bestScore) {
        bestScore = score;
        best = id;
      }
    }
    return best;
  }

  function rankLabel(rank, total) {
    if (rank === 1) return "Rota 1 — Mais curta";
    if (rank === 2) return "Rota 2 — Alternativa";
    if (rank === 3) return total >= 4 ? "Rota 3 — Alternativa" : "Rota 3 — Alternativa mais longa";
    if (rank === 4) return "Rota 4 — Alternativa";
    return `Rota ${rank}`;
  }

  global.NavigationRouter = {
    ALLOW_AUTOMATIC_NODE_CONNECTIONS,
    ALLOW_STRAIGHT_LINE_FALLBACK,
    ALLOW_ROUTE_OUTSIDE_GRAPH,
    MAX_ROUTE_ALTERNATIVES,
    MAX_ROUTE_SIMILARITY,
    MAX_ROUTE_POINT_SIMILARITY,
    calculateEdgeSimilarity,
    calculatePointSimilarity,
    isTooSimilarRoute,
    validateNavigationGraph,
    createNavigationGraph,
    mergeNavigationLevel,
    findKShortestRoutes,
    findRoutesForPoiPair,
    astar,
    nearestNodeId,
    rankLabel,
    calculateEdgeSimilarity,
    buildRoutePoints,
    validateRoute,
  };
})(typeof window !== "undefined" ? window : globalThis);
