/**
 * Rota orientada pelo GPS — encaixa posição em NAV_EDGES + Dijkstra com penalidade de heading.
 * Integração: getSelectedDestinationNodeId, convertGpsToMapCoordinates, updateGpsMarker, drawCalculatedRoute.
 */
(function (global) {
  "use strict";

  const VIRTUAL_START_ID = "__GPS_CURRENT_POSITION__";

  const DEFAULT_CONFIG = {
    mapNorthOffsetDeg: 0,
    headingPenalty: 25,
    maxSnapDistanceSvg: 120,
  };

  function normalizeAngle(angle) {
    return ((angle % 360) + 360) % 360;
  }

  function angularDifference(angleA, angleB) {
    const diff = Math.abs(normalizeAngle(angleA) - normalizeAngle(angleB));
    return Math.min(diff, 360 - diff);
  }

  function distanceBetween(a, b) {
    return Math.hypot(b.x - a.x, b.y - a.y);
  }

  function getMapBearing(startPoint, targetPoint) {
    const deltaX = targetPoint.x - startPoint.x;
    const deltaY = targetPoint.y - startPoint.y;
    return normalizeAngle((Math.atan2(deltaX, -deltaY) * 180) / Math.PI);
  }

  function projectPointOnSegment(point, start, end) {
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const len2 = dx * dx + dy * dy || 1e-9;
    let t = ((point.x - start.x) * dx + (point.y - start.y) * dy) / len2;
    t = Math.max(0, Math.min(1, t));
    const x = start.x + t * dx;
    const y = start.y + t * dy;
    return { x, y, t, distance: Math.hypot(point.x - x, point.y - y) };
  }

  function edgeWalkPath(edge, nodesById) {
    if (edge.path?.length >= 2) return edge.path;
    const a = nodesById.get(edge.from);
    const b = nodesById.get(edge.to);
    return a && b ? [a, b] : null;
  }

  function isWalkableEdge(edge) {
    if (!edge || edge.active === false) return false;
    if (edge.type === "elevator" || edge.type === "stairs" || edge.type === "level_transition") {
      return false;
    }
    return true;
  }

  function findClosestNavigationEdge(point, navGraph, opts = {}) {
    if (!navGraph?.edgesById || !navGraph?.nodesById) return null;
    const level = opts.level || "L00";
    const maxD = opts.maxSnapDistanceSvg ?? DEFAULT_CONFIG.maxSnapDistanceSvg;
    let best = null;

    for (const [edgeId, edge] of navGraph.edgesById) {
      if (!isWalkableEdge(edge)) continue;
      if ((edge.level || "L00") !== level) continue;

      const path = edgeWalkPath(edge, navGraph.nodesById);
      if (!path || path.length < 2) continue;

      for (let i = 1; i < path.length; i++) {
        const pr = projectPointOnSegment(point, path[i - 1], path[i]);
        if (pr.distance > maxD) continue;
        if (!best || pr.distance < best.distance) {
          best = {
            edgeId,
            edge,
            startNode: navGraph.nodesById.get(edge.from),
            endNode: navGraph.nodesById.get(edge.to),
            point: { x: pr.x, y: pr.y },
            t: pr.t,
            distance: pr.distance,
          };
        }
      }
    }
    return best;
  }

  function calculateHeadingPenalty(startPoint, targetPoint, heading, mapNorthOffsetDeg, headingPenalty) {
    if (heading == null || !isFinite(heading)) return 0;
    const mapHeading = normalizeAngle(heading - (mapNorthOffsetDeg || 0));
    const targetBearing = getMapBearing(startPoint, targetPoint);
    const difference = angularDifference(mapHeading, targetBearing);
    return (headingPenalty || 0) * (difference / 180);
  }

  function createTemporaryGraph(navGraph, mapMatch, heading, config) {
    const graph = new Map();
    const nodesById = navGraph.nodesById;
    const level = mapMatch.edge.level || "L00";

    for (const [id, n] of nodesById) {
      if ((n.level || "L00") !== level || !n.active) continue;
      if (!(navGraph.adjacency.get(id) || []).length) continue;
      graph.set(String(id), []);
    }

    for (const [edgeId, edge] of navGraph.edgesById) {
      if (!isWalkableEdge(edge)) continue;
      if ((edge.level || "L00") !== level) continue;
      if (!graph.has(String(edge.from)) || !graph.has(String(edge.to))) continue;

      const weight = Number(edge.distanceMeters) || distanceBetween(
        nodesById.get(edge.from),
        nodesById.get(edge.to),
      );

      graph.get(String(edge.from)).push({ to: String(edge.to), cost: weight, edgeId });
      if (edge.bidirectional !== false) {
        graph.get(String(edge.to)).push({ to: String(edge.from), cost: weight, edgeId });
      }
    }

    graph.set(VIRTUAL_START_ID, []);

    const matchedEdge = mapMatch.edge;
    const fromId = String(matchedEdge.from);
    const toId = String(matchedEdge.to);
    const startNode = mapMatch.startNode;
    const endNode = mapMatch.endNode;
    const totalWeight =
      Number(matchedEdge.distanceMeters) ||
      distanceBetween(startNode, endNode) * (navGraph.metersPerUnit || 0.35);

    const costToStart = totalWeight * mapMatch.t;
    const costToEnd = totalWeight * (1 - mapMatch.t);

    if (matchedEdge.bidirectional !== false && graph.has(fromId)) {
      graph.get(VIRTUAL_START_ID).push({
        to: fromId,
        cost:
          costToStart +
          calculateHeadingPenalty(
            mapMatch.point,
            startNode,
            heading,
            config.mapNorthOffsetDeg,
            config.headingPenalty,
          ),
      });
    }

    if (graph.has(toId)) {
      graph.get(VIRTUAL_START_ID).push({
        to: toId,
        cost:
          costToEnd +
          calculateHeadingPenalty(
            mapMatch.point,
            endNode,
            heading,
            config.mapNorthOffsetDeg,
            config.headingPenalty,
          ),
      });
    }

    return { graph, virtualStartId: VIRTUAL_START_ID, nodesById };
  }

  function shortestPath(graph, startId, destinationId) {
    const distances = new Map();
    const previous = new Map();
    const previousEdge = new Map();
    const unvisited = new Set(graph.keys());

    for (const nodeId of graph.keys()) distances.set(nodeId, Infinity);
    distances.set(startId, 0);

    while (unvisited.size > 0) {
      let currentId = null;
      let currentDistance = Infinity;
      for (const nodeId of unvisited) {
        const d = distances.get(nodeId);
        if (d < currentDistance) {
          currentDistance = d;
          currentId = nodeId;
        }
      }
      if (currentId == null || currentDistance === Infinity) break;
      if (currentId === destinationId) break;
      unvisited.delete(currentId);

      for (const neighbor of graph.get(currentId) || []) {
        if (!unvisited.has(neighbor.to)) continue;
        const alt = currentDistance + neighbor.cost;
        if (alt < distances.get(neighbor.to)) {
          distances.set(neighbor.to, alt);
          previous.set(neighbor.to, currentId);
          previousEdge.set(neighbor.to, neighbor.edgeId || null);
        }
      }
    }

    if (startId !== destinationId && !previous.has(destinationId)) return null;

    const nodeIds = [];
    const edgeIds = [];
    let currentId = destinationId;
    while (currentId !== undefined) {
      nodeIds.unshift(currentId);
      if (currentId === startId) break;
      const eid = previousEdge.get(currentId);
      if (eid) edgeIds.unshift(eid);
      currentId = previous.get(currentId);
    }

    return { nodeIds, edgeIds, lengthMeters: distances.get(destinationId) };
  }

  function buildRoutePoints(navGraph, nodeIds, edgeIds, snapPoint) {
    const NR = global.NavigationRouter;
    const points = [{ x: snapPoint.x, y: snapPoint.y }];

    if (NR?.buildRoutePoints && edgeIds?.length && nodeIds?.length > 1) {
      const built = NR.buildRoutePoints(edgeIds, nodeIds.slice(1), navGraph.edgesById);
      if (built?.length) return points.concat(built);
    }

    for (let i = 1; i < nodeIds.length; i++) {
      const id = nodeIds[i];
      if (id === VIRTUAL_START_ID) continue;
      const n = navGraph.nodesById.get(id);
      if (n) points.push({ x: n.x, y: n.y });
    }
    return points;
  }

  function calculateGpsOrientedRoute({
    navGraph,
    mapPoint,
    heading = null,
    destinationNodeId,
    level = "L00",
    mapNorthOffsetDeg = 0,
    headingPenalty = 25,
    maxSnapDistanceSvg,
  }) {
    if (!navGraph || !mapPoint || !destinationNodeId) return null;

    const config = {
      ...DEFAULT_CONFIG,
      mapNorthOffsetDeg,
      headingPenalty,
      maxSnapDistanceSvg,
    };

    const mapMatch = findClosestNavigationEdge(mapPoint, navGraph, {
      level,
      maxSnapDistanceSvg: config.maxSnapDistanceSvg,
    });
    if (!mapMatch) return null;

    const destId = String(destinationNodeId);
    if (!navGraph.nodesById.has(destId)) return null;

    const temp = createTemporaryGraph(navGraph, mapMatch, heading, config);
    if (!temp.graph.has(destId)) return null;

    const path = shortestPath(temp.graph, temp.virtualStartId, destId);
    if (!path?.nodeIds?.length) return null;

    const realNodeIds = path.nodeIds.filter((id) => id !== VIRTUAL_START_ID);
    const startNodeId = realNodeIds[0] || mapMatch.edge.from;

    const points = buildRoutePoints(navGraph, realNodeIds, path.edgeIds, mapMatch.point);
    const mpu = navGraph.metersPerUnit || 0.35;
    let lengthMeters = path.lengthMeters;
    if (!isFinite(lengthMeters) || lengthMeters === Infinity) {
      lengthMeters = 0;
      for (let i = 1; i < points.length; i++) {
        lengthMeters += distanceBetween(points[i - 1], points[i]) * mpu;
      }
    }

    return {
      mapMatch,
      snap: mapMatch.point,
      startNodeId,
      destinationNodeId: destId,
      nodeIds: realNodeIds,
      edgeIds: path.edgeIds,
      points,
      lengthMeters,
      heading,
    };
  }

  /**
   * Orquestração — conecte as 4 funções do projeto.
   */
  async function orientAndCalculateGpsRoute(integration) {
    const {
      getSelectedDestinationNodeId,
      convertGpsToMapCoordinates,
      updateGpsMarker,
      drawCalculatedRoute,
      getNavGraph,
      getDeviceHeading,
      ensureDeviceOrientation,
      getMapNorthOffsetDeg,
      getActiveLevel,
      onOriginReady,
      toast,
    } = integration;

    const destinationId = getSelectedDestinationNodeId?.();
    if (!destinationId) {
      throw new Error("Selecione um destino antes de orientar pelo GPS.");
    }

    await ensureDeviceOrientation?.();

    const gpsPosition = await new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error("Este dispositivo não possui suporte a GPS."));
        return;
      }
      navigator.geolocation.getCurrentPosition(resolve, reject, {
        enableHighAccuracy: true,
        maximumAge: 0,
        timeout: 12000,
      });
    });

    const heading = typeof getDeviceHeading === "function" ? await getDeviceHeading(1500) : null;
    const latitude = gpsPosition.coords.latitude;
    const longitude = gpsPosition.coords.longitude;
    const accuracy = gpsPosition.coords.accuracy;

    const mapPoint = convertGpsToMapCoordinates(latitude, longitude);
    if (!mapPoint) {
      throw new Error("Não foi possível converter GPS para o mapa.");
    }

    const navGraph = getNavGraph?.();
    if (!navGraph) throw new Error("Grafo de navegação indisponível.");

    const result = calculateGpsOrientedRoute({
      navGraph,
      mapPoint,
      heading,
      destinationNodeId: destinationId,
      level: getActiveLevel?.() || "L00",
      mapNorthOffsetDeg: getMapNorthOffsetDeg?.() || 0,
    });

    if (!result) {
      throw new Error("Não foi encontrada uma rota navegável próxima da sua posição.");
    }

    updateGpsMarker?.({
      x: result.snap.x,
      y: result.snap.y,
      latitude,
      longitude,
      heading,
      accuracy,
    });

    await onOriginReady?.(result, { latitude, longitude, accuracy });

    await drawCalculatedRoute?.(result);

    if (typeof toast === "function") {
      toast("Rota orientada pelo GPS.");
    }

    return result;
  }

  global.GpsRouteOrientation = {
    calculateGpsOrientedRoute,
    findClosestNavigationEdge,
    orientAndCalculateGpsRoute,
    VIRTUAL_START_ID,
  };
})(typeof window !== "undefined" ? window : globalThis);
