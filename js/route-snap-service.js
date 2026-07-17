/**
 * Snap da posição GPS aos edges da rota atual (não ao SVG livre).
 */
(function (global) {
  "use strict";

  const projectOnSeg =
    global.NearestGraphPoint?.projectOnSeg ||
    function (p, a, b) {
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const len2 = dx * dx + dy * dy || 1e-9;
      let t = ((p.x - a.x) * dx + (p.y - a.y) * dy) / len2;
      t = Math.max(0, Math.min(1, t));
      const x = a.x + t * dx;
      const y = a.y + t * dy;
      return { x, y, t, d: Math.hypot(p.x - x, p.y - y) };
    };

  /**
   * @returns {{
   *   edgeId: string|null,
   *   snappedPosition: {x:number,y:number}|null,
   *   distanceFromRouteMeters: number,
   *   routeProgress: number,
   *   offRoute: boolean
   * }}
   */
  function snapGpsPositionToRoute({
    svgPoint,
    accuracy,
    currentRoute,
    currentFloorId,
    navGraph,
    metersPerUnit = 0.35,
    maximumSnapDistanceMeters = 12,
  }) {
    const empty = {
      edgeId: null,
      snappedPosition: null,
      distanceFromRouteMeters: Infinity,
      routeProgress: 0,
      offRoute: true,
    };

    if (!svgPoint || !currentRoute) return empty;

    const maxSvg = maximumSnapDistanceMeters / metersPerUnit;
    const edgeIds = collectRouteEdgeIds(currentRoute, currentFloorId, navGraph);
    let best = null;
    let cumulativeBefore = 0;
    let totalLen = 0;

    // comprimento total da rota no andar (ou pontos)
    const pts = getRoutePointsForFloor(currentRoute, currentFloorId);
    for (let i = 1; i < pts.length; i++) {
      totalLen += Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y);
    }
    if (totalLen <= 0) totalLen = 1;

    let walked = 0;
    for (let i = 1; i < pts.length; i++) {
      const a = pts[i - 1];
      const b = pts[i];
      const segLen = Math.hypot(b.x - a.x, b.y - a.y);
      const pr = projectOnSeg(svgPoint, a, b);
      if (!best || pr.d < best.d) {
        best = {
          d: pr.d,
          snapped: { x: pr.x, y: pr.y },
          progressAlong: walked + pr.t * segLen,
          edgeId: a.edgeId || b.edgeId || edgeIds[i - 1] || null,
        };
      }
      walked += segLen;
    }

    // tenta match por edges do grafo se disponíveis
    if (navGraph?.edgesById && edgeIds.length) {
      for (const edgeId of edgeIds) {
        const e = navGraph.edgesById.get(edgeId);
        if (!e) continue;
        if (currentFloorId && (e.level || "L00") !== currentFloorId) continue;
        const path =
          e.path?.length >= 2
            ? e.path
            : (() => {
                const n0 = navGraph.nodesById.get(e.from);
                const n1 = navGraph.nodesById.get(e.to);
                return n0 && n1 ? [n0, n1] : null;
              })();
        if (!path) continue;
        for (let i = 1; i < path.length; i++) {
          const pr = projectOnSeg(svgPoint, path[i - 1], path[i]);
          if (!best || pr.d < best.d) {
            best = {
              d: pr.d,
              snapped: { x: pr.x, y: pr.y },
              progressAlong: best?.progressAlong ?? 0,
              edgeId,
            };
          }
        }
      }
    }

    if (!best) return empty;

    const distM = best.d * metersPerUnit;
    const offRoute = distM > maximumSnapDistanceMeters || best.d > maxSvg;

    return {
      edgeId: best.edgeId,
      snappedPosition: best.snapped,
      distanceFromRouteMeters: distM,
      routeProgress: Math.max(
        0,
        Math.min(1, (best.progressAlong || 0) / totalLen),
      ),
      offRoute,
      accuracy,
    };
  }

  function collectRouteEdgeIds(route, floorId, navGraph) {
    const ids = [];
    if (route.edgeIds?.length) {
      for (const id of route.edgeIds) {
        const e = navGraph?.edgesById?.get(id);
        if (!floorId || !e || (e.level || "L00") === floorId) ids.push(id);
      }
      return ids;
    }
    if (route.legs?.length) {
      for (const leg of route.legs) {
        if (floorId && leg.level && leg.level !== floorId) continue;
        if (leg.edgeIds) ids.push(...leg.edgeIds);
      }
    }
    return ids;
  }

  function getRoutePointsForFloor(route, floorId) {
    if (route.legs?.length) {
      const leg =
        route.legs.find((l) => l.level === floorId) ||
        route.legs[0];
      if (leg?.points?.length) return leg.points;
    }
    return route.points || [];
  }

  global.RouteSnapService = {
    snapGpsPositionToRoute,
    collectRouteEdgeIds,
    getRoutePointsForFloor,
  };
})(typeof window !== "undefined" ? window : globalThis);
