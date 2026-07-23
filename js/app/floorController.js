/**
 * Controle de andares — lazy load do grafo + troca de mapa.
 * Funções principais ainda orquestradas em app.js (migração incremental).
 */
(function (global) {
  "use strict";

  function create(ctx) {
    const { state } = ctx;

    async function loadFloorData(levelId) {
      if (!levelId) return state.navGraph;
      return state.ensureNavGraphFloors?.(levelId) || state.navGraph;
    }

    function loadedFloors() {
      return state.navLoader?.loadedLevels?.() || ["L00"];
    }

    return { loadFloorData, loadedFloors };
  }

  global.PIBMapFloorController = { create };
})(typeof window !== "undefined" ? window : globalThis);
