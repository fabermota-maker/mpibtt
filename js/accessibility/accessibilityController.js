/**
 * Preferências de rota acessível e navegação inclusiva.
 */
(function (global) {
  "use strict";

  function create(ctx) {
    const { state, CONFIG } = ctx;

    function routeOptionsFromJson() {
      const pref = state.routePreference || "simplest";
      const cfg = state.navGraph?.config || CONFIG;
      return {
        preference: pref,
        avoidParking: pref !== "parking",
        config: cfg,
      };
    }

    function setRoutePreference(pref) {
      state.routePreference = pref === "accessible" ? "accessible" : "simplest";
    }

    function isAccessiblePreference() {
      return (state.routePreference || "simplest") === "accessible";
    }

    return { routeOptionsFromJson, setRoutePreference, isAccessiblePreference };
  }

  global.PIBMapAccessibilityController = { create };
})(typeof window !== "undefined" ? window : globalThis);
