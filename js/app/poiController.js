/**
 * POIs — busca, filtros e metadados (extensão incremental).
 */
(function (global) {
  "use strict";

  function create(ctx) {
    const { G, state } = ctx;

    function searchablePois(levelId) {
      const lvl = levelId || state.activeLevel || "L00";
      return (G.pois || []).filter((p) => {
        if (typeof ctx.isSearchablePoi === "function" && !ctx.isSearchablePoi(p)) return false;
        return (p.level || "L00") === lvl;
      });
    }

    return { searchablePois };
  }

  global.PIBMapPoiController = { create };
})(typeof window !== "undefined" ? window : globalThis);
