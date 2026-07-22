/**
 * Geometria pura — projeção em polilinhas (edge.path).
 */
(function (global) {
  "use strict";

  function dist(a, b) {
    return Math.hypot(b.x - a.x, b.y - a.y);
  }

  /** @returns {{ point:{x,y}, segmentRatio:number, distanceMapUnits:number }} */
  function projectPointOnSegment(point, segmentStart, segmentEnd) {
    const dx = segmentEnd.x - segmentStart.x;
    const dy = segmentEnd.y - segmentStart.y;
    const len2 = dx * dx + dy * dy || 1e-12;
    let t = ((point.x - segmentStart.x) * dx + (point.y - segmentStart.y) * dy) / len2;
    t = Math.max(0, Math.min(1, t));
    const x = segmentStart.x + t * dx;
    const y = segmentStart.y + t * dy;
    return {
      point: { x, y },
      segmentRatio: t,
      distanceMapUnits: Math.hypot(point.x - x, point.y - y),
    };
  }

  /**
   * @param {{x:number,y:number}} point
   * @param {Array<{x:number,y:number}>} path
   * @param {number} metersPerUnit
   */
  function projectPointOnPolyline(point, path, metersPerUnit = 0.35) {
    if (!path || path.length < 2) {
      return {
        point: point ? { ...point } : { x: 0, y: 0 },
        segmentIndex: 0,
        segmentRatio: 0,
        distanceMapUnits: Infinity,
        distanceMeters: Infinity,
        distanceAlongEdgeMeters: 0,
      };
    }

    let best = null;
    let walked = 0;

    for (let i = 1; i < path.length; i++) {
      const a = path[i - 1];
      const b = path[i];
      const segLen = dist(a, b);
      const pr = projectPointOnSegment(point, a, b);
      const along = walked + pr.segmentRatio * segLen;
      if (!best || pr.distanceMapUnits < best.distanceMapUnits) {
        best = {
          point: pr.point,
          segmentIndex: i - 1,
          segmentRatio: pr.segmentRatio,
          distanceMapUnits: pr.distanceMapUnits,
          distanceAlongEdgeMeters: along * metersPerUnit,
        };
      }
      walked += segLen;
    }

    return {
      ...best,
      distanceMeters: best.distanceMapUnits * metersPerUnit,
    };
  }

  function polylineLength(path, metersPerUnit = 0.35) {
    if (!path || path.length < 2) return 0;
    let t = 0;
    for (let i = 1; i < path.length; i++) t += dist(path[i - 1], path[i]);
    return t * metersPerUnit;
  }

  /** Divide path no ponto projetado → [from→proj] e [proj→to]. */
  function splitPolylineAt(path, segmentIndex, projectedPoint) {
    if (!path?.length || segmentIndex < 0 || segmentIndex >= path.length - 1) {
      return { partA: path ? [...path] : [], partB: path ? [...path] : [] };
    }
    const partA = path.slice(0, segmentIndex + 1).concat([projectedPoint]);
    const partB = [projectedPoint].concat(path.slice(segmentIndex + 1));
    return { partA, partB };
  }

  /** Inverte ordem dos pontos (edge percorrido ao contrário). */
  function reversePath(path) {
    return path ? [...path].reverse() : [];
  }

  global.LivePolylineGeometry = {
    dist,
    projectPointOnSegment,
    projectPointOnPolyline,
    polylineLength,
    splitPolylineAt,
    reversePath,
  };
})(typeof window !== "undefined" ? window : globalThis);
