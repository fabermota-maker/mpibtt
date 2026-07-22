/**
 * Índice espacial em grid — consulta local de edges candidatos.
 */
(function (global) {
  "use strict";

  function cellKey(cx, cy) {
    return `${cx},${cy}`;
  }

  /**
   * @param {Array} edgeEntries — saída de EdgeCache
   * @param {number} cellSize — unidades SVG
   */
  function buildSpatialIndex(edgeEntries, cellSize = 50) {
    const grid = new Map();
    const size = Math.max(10, cellSize);

    for (const entry of edgeEntries || []) {
      const { bbox, edgeId } = entry;
      if (!bbox) continue;
      const cMinX = Math.floor(bbox.minX / size);
      const cMaxX = Math.floor(bbox.maxX / size);
      const cMinY = Math.floor(bbox.minY / size);
      const cMaxY = Math.floor(bbox.maxY / size);
      for (let cx = cMinX; cx <= cMaxX; cx++) {
        for (let cy = cMinY; cy <= cMaxY; cy++) {
          const key = cellKey(cx, cy);
          if (!grid.has(key)) grid.set(key, []);
          grid.get(key).push(edgeId);
        }
      }
    }

    return { grid, cellSize: size, edgeCount: edgeEntries?.length || 0 };
  }

  function queryNearbyEdges(index, point, radiusSvg) {
    if (!index?.grid || !point) return [];
    const r = Math.max(1, radiusSvg);
    const size = index.cellSize;
    const cMinX = Math.floor((point.x - r) / size);
    const cMaxX = Math.floor((point.x + r) / size);
    const cMinY = Math.floor((point.y - r) / size);
    const cMaxY = Math.floor((point.y + r) / size);
    const seen = new Set();
    const out = [];
    for (let cx = cMinX; cx <= cMaxX; cx++) {
      for (let cy = cMinY; cy <= cMaxY; cy++) {
        const list = index.grid.get(cellKey(cx, cy));
        if (!list) continue;
        for (const id of list) {
          if (seen.has(id)) continue;
          seen.add(id);
          out.push(id);
        }
      }
    }
    return out;
  }

  global.LiveSpatialIndex = {
    buildSpatialIndex,
    queryNearbyEdges,
  };
})(typeof window !== "undefined" ? window : globalThis);
