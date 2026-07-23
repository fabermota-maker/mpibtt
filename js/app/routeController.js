/**
 * Rotas — pintura e opções (extensão incremental; lógica principal em app.js).
 */
(function (global) {
  "use strict";

  function create(ctx) {
    async function prepareRouteGraph(origin, dest) {
      const o = typeof ctx.poiLevel === "function" ? ctx.poiLevel(origin) : origin?.level;
      const d = typeof ctx.poiLevel === "function" ? ctx.poiLevel(dest) : dest?.level;
      return ctx.state?.ensureNavGraphFloors?.(o, d);
    }

    return { prepareRouteGraph };
  }

  global.PIBMapRouteController = { create };
})(typeof window !== "undefined" ? window : globalThis);
