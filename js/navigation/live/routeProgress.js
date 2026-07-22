/**
 * Progresso na rota — sem recalcular o caminho.
 */
(function (global) {
  "use strict";

  const PG = () => global.LivePolylineGeometry;
  const RSS = () => global.RouteSnapService;

  function findNearestPointOnCurrentRoute(svgPoint, route, floorId, navGraph, metersPerUnit = 0.35) {
    if (RSS()?.snapGpsPositionToRoute) {
      return RSS().snapGpsPositionToRoute({
        svgPoint,
        currentRoute: route,
        currentFloorId: floorId,
        navGraph,
        metersPerUnit,
        maximumSnapDistanceMeters: 999,
      });
    }

    const pts = RSS()?.getRoutePointsForFloor?.(route, floorId) || route?.points || [];
    if (pts.length < 2) return null;

    let best = null;
    let walked = 0;
    let total = 0;
    for (let i = 1; i < pts.length; i++) {
      total += PG()?.dist(pts[i - 1], pts[i]) ?? 0;
    }
    for (let i = 1; i < pts.length; i++) {
      const segLen = PG()?.dist(pts[i - 1], pts[i]) ?? 0;
      const pr = PG()?.projectPointOnSegment(svgPoint, pts[i - 1], pts[i]);
      const along = walked + pr.segmentRatio * segLen;
      if (!best || pr.distanceMapUnits < best.distanceMapUnits) {
        best = { ...pr, progressAlong: along };
      }
      walked += segLen;
    }
    if (!best) return null;
    return {
      snappedPosition: best.point,
      routeProgress: total > 0 ? best.progressAlong / total : 0,
      distanceFromRouteMeters: best.distanceMapUnits * metersPerUnit,
    };
  }

  function calculateRemainingDistance(route, progressRatio, metersPerUnit = 0.35) {
    const total = route?.distanceMeters ?? 0;
    if (!total) return 0;
    return Math.max(0, total * (1 - Math.max(0, Math.min(1, progressRatio || 0))));
  }

  function getCurrentInstruction(route, progressRatio) {
    const steps = route?.steps || route?.instructions || [];
    if (!steps.length) return null;
    const idx = Math.min(steps.length - 1, Math.floor(progressRatio * steps.length));
    return steps[idx]?.text || steps[idx] || null;
  }

  function updateRouteProgress(svgPoint, route, floorId, navGraph, metersPerUnit) {
    const snap = findNearestPointOnCurrentRoute(
      svgPoint,
      route,
      floorId,
      navGraph,
      metersPerUnit,
    );
    if (!snap) {
      return {
        routeProgress: 0,
        remainingDistanceMeters: route?.distanceMeters ?? 0,
        remainingTimeSeconds: route?.estimatedTimeSeconds ?? 0,
        instruction: null,
      };
    }
    const remaining = calculateRemainingDistance(route, snap.routeProgress, metersPerUnit);
    const speed = 1.2;
    return {
      routeProgress: snap.routeProgress ?? 0,
      remainingDistanceMeters: remaining,
      remainingTimeSeconds: remaining / speed,
      snappedPosition: snap.snappedPosition,
      distanceFromRouteMeters: snap.distanceFromRouteMeters,
      instruction: getCurrentInstruction(route, snap.routeProgress),
    };
  }

  global.LiveRouteProgress = {
    findNearestPointOnCurrentRoute,
    calculateRemainingDistance,
    getCurrentInstruction,
    updateRouteProgress,
  };
})(typeof window !== "undefined" ? window : globalThis);
