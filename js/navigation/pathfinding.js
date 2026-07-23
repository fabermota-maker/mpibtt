/**
 * API de pathfinding — delega ao NavigationRouter (grafo JSON).
 */
(function (global) {
  "use strict";

  const NR = () => global.NavigationRouter;

  function findRoutesForPoiPair(graph, startIds, endIds, opts) {
    return NR()?.findRoutesForPoiPair?.(graph, startIds, endIds, opts) || [];
  }

  function findKShortestRoutes(graph, startId, endId, opts) {
    return NR()?.findKShortestRoutes?.(graph, startId, endId, opts) || [];
  }

  function nearestNodeId(point, graph, opts) {
    return NR()?.nearestNodeId?.(point, graph, opts) || null;
  }

  function rankLabel(rank, total) {
    return NR()?.rankLabel?.(rank, total) || `Rota ${rank}`;
  }

  global.PIBMapPathfinding = {
    findRoutesForPoiPair,
    findKShortestRoutes,
    nearestNodeId,
    rankLabel,
  };
})(typeof window !== "undefined" ? window : globalThis);
