/**
 * UI — tema, mobile drawer, eventos (extensão incremental).
 */
(function (global) {
  "use strict";

  function create(ctx) {
    function isMobileLayout() {
      return window.matchMedia && window.matchMedia("(max-width: 860px)").matches;
    }

    return { isMobileLayout };
  }

  global.PIBMapInterfaceController = { create };
})(typeof window !== "undefined" ? window : globalThis);
