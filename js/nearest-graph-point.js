/**
 * Conecta posição GPS ao grafo caminhável (âncoras → entradas → nodes → edges).
 * Não inventa nodes; respeita andar e preferência por áreas externas.
 */
(function (global) {
  "use strict";

  const hv = () =>
    global.GpsReadingCollector?.haversineMeters ||
    function (aLat, aLng, bLat, bLng) {
      const R = 6371000;
      const toR = Math.PI / 180;
      const dLat = (bLat - aLat) * toR;
      const dLng = (bLng - aLng) * toR;
      const s =
        Math.sin(dLat / 2) ** 2 +
        Math.cos(aLat * toR) * Math.cos(bLat * toR) * Math.sin(dLng / 2) ** 2;
      return 2 * R * Math.asin(Math.min(1, Math.sqrt(s)));
    };

  function checkUserInsideGeofence(latitude, longitude, geofenceService) {
    if (geofenceService?.contains) {
      return geofenceService.contains(latitude, longitude);
    }
    const ring = (global.PIB_CURITIBA_GEOFENCE || []).map((p) => ({
      latitude: p.lat,
      longitude: p.lng,
    }));
    if (global.GeofenceService?.containsLocation) {
      return global.GeofenceService.containsLocation(latitude, longitude, ring);
    }
    return false;
  }

  function rankReferences(userPosition, accuracy) {
    const refs = global.PIB_CURITIBA_GPS_REFERENCE_POINTS || [];
    const scored = refs.map((reference) => {
      const distance = hv()(
        userPosition.latitude ?? userPosition.lat,
        userPosition.longitude ?? userPosition.lng,
        reference.lat,
        reference.lng,
      );
      return { ...reference, distance };
    });
    scored.sort((a, b) => a.distance - b.distance);
    return scored;
  }

  function isAcceptableDistance(distance, accuracy) {
    const acc = isFinite(accuracy) ? accuracy : 30;
    return distance <= Math.max(20, acc);
  }

  function isOutdoorNode(node, edgeSample) {
    if (!node) return false;
    const id = String(node.id || "");
    if (/entrada|estacionamento|outdoor|jardim|pedestre|batel|bento/i.test(id)) {
      return true;
    }
    if (edgeSample?.zone === "outdoor" || edgeSample?.type === "outdoor_path") {
      return true;
    }
    if (edgeSample?.parkingLot) return true;
    return false;
  }

  function isInternalOnlyNode(node) {
    const id = String(node?.id || "");
    return /sala|elevador|elevator|corredor_interno|narnia|refeitorio/i.test(id) &&
      !/entrada|intersection_entrada/i.test(id);
  }

  /**
   * Prioridade: ENTRANCE → âncoras com navNodeId → DESTINATION só se navNodeId
   * e distância segura → node externo → edge externo.
   */
  function findBestInitialReference({
    latitude,
    longitude,
    accuracy,
    navGraph,
    latLngToSvg,
    metersPerUnit = 0.35,
  }) {
    const ranked = rankReferences({ latitude, longitude }, accuracy);
    const entrances = ranked.filter((r) => r.category === "ENTRANCE");
    const withNode = ranked.filter((r) => r.navNodeId);
    const candidates = [
      ...entrances,
      ...withNode.filter((r) => r.category !== "ENTRANCE"),
    ];

    const nearest = candidates[0] || null;
    const second = candidates[1] || null;

    if (
      nearest &&
      second &&
      isAcceptableDistance(nearest.distance, accuracy) &&
      Math.abs(nearest.distance - second.distance) < (accuracy || 30)
    ) {
      return {
        ambiguous: true,
        options: [nearest, second].filter((r) =>
          isAcceptableDistance(r.distance, accuracy),
        ),
        nearest,
        second,
      };
    }

    if (nearest && isAcceptableDistance(nearest.distance, accuracy)) {
      // Destinos internos sem navNodeId não iniciam sozinhos
      if (
        nearest.category === "DESTINATION" ||
        nearest.category === "CORRIDOR" ||
        nearest.category === "VERTICAL_CONNECTOR"
      ) {
        if (!nearest.navNodeId) {
          // cai para node externo
        } else {
          return { ambiguous: false, reference: nearest };
        }
      } else {
        return { ambiguous: false, reference: nearest };
      }
    }

    // Fallback: SVG → node/edge externo
    const svgPt = latLngToSvg?.(latitude, longitude);
    if (!svgPt || !navGraph) {
      return { ambiguous: false, reference: null, needsManual: true };
    }

    const nodeHit = findNearestValidNavNode(svgPt, navGraph, {
      level: "L00",
      preferOutdoor: true,
      maxDistanceSvg: (Math.max(20, accuracy || 30) / metersPerUnit) * 1.5,
    });
    if (nodeHit) {
      return {
        ambiguous: false,
        reference: {
          id: "NEAREST_NAV_NODE",
          name: nodeHit.node.id,
          floorId: nodeHit.node.level || "L00",
          navNodeId: nodeHit.id,
          category: "NAV_NODE",
          distance: nodeHit.distanceMeters,
          svgX: nodeHit.node.x,
          svgY: nodeHit.node.y,
        },
      };
    }

    const edgeHit = findNearestWalkableEdge(svgPt, navGraph, {
      level: "L00",
      preferOutdoor: true,
      maxDistanceSvg: (Math.max(20, accuracy || 30) / metersPerUnit) * 1.5,
      metersPerUnit,
    });
    if (edgeHit) {
      return {
        ambiguous: false,
        reference: {
          id: "NEAREST_NAV_EDGE",
          name: edgeHit.edgeId,
          floorId: edgeHit.level || "L00",
          navNodeId: edgeHit.nearestNodeId,
          category: "NAV_EDGE",
          distance: edgeHit.distanceMeters,
          svgX: edgeHit.snapped.x,
          svgY: edgeHit.snapped.y,
          edgeId: edgeHit.edgeId,
        },
      };
    }

    return { ambiguous: false, reference: null, needsManual: true };
  }

  function findNearestValidNavNode(point, graph, opts = {}) {
    if (!graph?.nodesById) return null;
    const level = opts.level || "L00";
    const maxD = opts.maxDistanceSvg ?? Infinity;
    let best = null;
    let bestD = Infinity;

    for (const [id, n] of graph.nodesById) {
      if (!n.active) continue;
      if ((n.level || "L00") !== level) continue;
      const adj = graph.adjacency?.get(id) || [];
      if (!adj.length) continue;
      if (opts.preferOutdoor && isInternalOnlyNode(n)) continue;

      const d = Math.hypot(point.x - n.x, point.y - n.y);
      if (d > maxD) continue;

      if (opts.preferOutdoor) {
        const sample = adj[0];
        const outdoor = isOutdoorNode(n, sample);
        // ainda aceita internos se nada outdoor estiver perto — mas prioriza outdoor
        const score = outdoor ? d : d + 40;
        if (score < bestD) {
          bestD = score;
          best = { id, node: n, distanceSvg: d };
        }
      } else if (d < bestD) {
        bestD = d;
        best = { id, node: n, distanceSvg: d };
      }
    }

    if (!best) return null;
    const mpu = opts.metersPerUnit || graph.metersPerUnit || 0.35;
    return {
      ...best,
      distanceMeters: best.distanceSvg * mpu,
    };
  }

  function projectOnSeg(p, a, b) {
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const len2 = dx * dx + dy * dy || 1e-9;
    let t = ((p.x - a.x) * dx + (p.y - a.y) * dy) / len2;
    t = Math.max(0, Math.min(1, t));
    return {
      x: a.x + t * dx,
      y: a.y + t * dy,
      t,
      d: Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy)),
    };
  }

  function findNearestWalkableEdge(point, graph, opts = {}) {
    if (!graph?.edgesById) return null;
    const level = opts.level || "L00";
    const maxD = opts.maxDistanceSvg ?? Infinity;
    const mpu = opts.metersPerUnit || graph.metersPerUnit || 0.35;
    let best = null;

    for (const [edgeId, e] of graph.edgesById) {
      if (e.active === false) continue;
      if ((e.level || "L00") !== level) continue;
      if (e.type === "elevator" || e.type === "stairs" || e.type === "level_transition") {
        continue;
      }
      if (opts.preferOutdoor) {
        const outdoor =
          e.zone === "outdoor" ||
          e.type === "outdoor_path" ||
          e.parkingLot ||
          /entrada|estacionamento|outdoor/i.test(edgeId);
        if (!outdoor && e.zone === "indoor") continue;
      }

      const path = e.path?.length >= 2
        ? e.path
        : (() => {
            const a = graph.nodesById.get(e.from);
            const b = graph.nodesById.get(e.to);
            return a && b ? [a, b] : null;
          })();
      if (!path || path.length < 2) continue;

      for (let i = 1; i < path.length; i++) {
        const pr = projectOnSeg(point, path[i - 1], path[i]);
        if (pr.d > maxD) continue;
        if (!best || pr.d < best.d) {
          const da = Math.hypot(pr.x - path[0].x, pr.y - path[0].y);
          const db = Math.hypot(
            pr.x - path[path.length - 1].x,
            pr.y - path[path.length - 1].y,
          );
          best = {
            edgeId,
            edge: e,
            snapped: { x: pr.x, y: pr.y },
            d: pr.d,
            nearestNodeId: da <= db ? e.from : e.to,
            level: e.level || "L00",
            distanceMeters: pr.d * mpu,
          };
        }
      }
    }
    return best;
  }

  function resolveStartNodeId(reference, navGraph, svgHint) {
    if (!reference) return null;
    if (reference.navNodeId && navGraph?.nodesById?.has(reference.navNodeId)) {
      return reference.navNodeId;
    }
    const floorId = reference.floorId || "L00";
    if (svgHint) {
      const hit = findNearestValidNavNode(svgHint, navGraph, {
        level: floorId,
        preferOutdoor: true,
      });
      return hit?.id || null;
    }
    return null;
  }

  global.NearestGraphPoint = {
    checkUserInsideGeofence,
    findBestInitialReference,
    findNearestValidNavNode,
    findNearestWalkableEdge,
    resolveStartNodeId,
    rankReferences,
    isAcceptableDistance,
    projectOnSeg,
  };
})(typeof window !== "undefined" ? window : globalThis);
