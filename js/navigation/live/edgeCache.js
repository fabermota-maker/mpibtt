/**
 * Pré-cálculo de metadados por edge (bbox, comprimento, path).
 */
(function (global) {
  "use strict";

  const PG = () => global.LivePolylineGeometry;

  function resolvePath(edge, nodesById) {
    if (edge.path?.length >= 2) return edge.path.map((p) => ({ x: p.x, y: p.y }));
    const a = nodesById.get(edge.from);
    const b = nodesById.get(edge.to);
    if (a && b) return [{ x: a.x, y: a.y }, { x: b.x, y: b.y }];
    return null;
  }

  function bboxOfPath(path) {
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    for (const p of path) {
      minX = Math.min(minX, p.x);
      minY = Math.min(minY, p.y);
      maxX = Math.max(maxX, p.x);
      maxY = Math.max(maxY, p.y);
    }
    return { minX, minY, maxX, maxY };
  }

  function isWalkableEdge(edge) {
    if (edge.active === false) return false;
    if (edge.type === "elevator" || edge.type === "level_transition") return false;
    if (edge.type === "stairs" && edge.zone === "vertical") return false;
    return true;
  }

  function isOutdoorEdge(edge) {
    return (
      edge.zone === "outdoor" ||
      edge.type === "outdoor_path" ||
      !!edge.parkingLot ||
      /entrada|estacionamento|outdoor|jardim|pedestre|batel|bento/i.test(edge.id || "")
    );
  }

  function buildEdgeCache(navGraph, opts = {}) {
    const mpu = opts.metersPerUnit || navGraph?.metersPerUnit || 0.35;
    const level = opts.level || null;
    const byId = new Map();
    const list = [];

    if (!navGraph?.edgesById) return { byId, list, metersPerUnit: mpu };

    for (const [edgeId, edge] of navGraph.edgesById) {
      if (!isWalkableEdge(edge)) continue;
      if (level && (edge.level || "L00") !== level) continue;

      const path = resolvePath(edge, navGraph.nodesById);
      if (!path || path.length < 2) continue;

      const bbox = bboxOfPath(path);
      const lengthMeters = PG()?.polylineLength(path, mpu) ?? 0;

      const entry = {
        edgeId,
        edge,
        path,
        bbox,
        lengthMeters,
        level: edge.level || "L00",
        outdoor: isOutdoorEdge(edge),
        accessible: edge.accessible !== false,
        bidirectional: edge.bidirectional !== false,
        parkingLot: !!edge.parkingLot,
      };
      byId.set(edgeId, entry);
      list.push(entry);
    }

    return { byId, list, metersPerUnit: mpu };
  }

  global.LiveEdgeCache = {
    buildEdgeCache,
    isWalkableEdge,
    isOutdoorEdge,
    resolvePath,
  };
})(typeof window !== "undefined" ? window : globalThis);
