/**
 * Recálculo dinâmico — throttle e validação.
 */
(function (global) {
  "use strict";

  const CFG = () => global.LiveNavigationConfig?.LIVE_NAVIGATION_CONFIG || {};
  const PERF = () => global.LiveNavigationConfig?.PERFORMANCE_CONFIG || {};

  function createRerouteController(opts = {}) {
    let lastRerouteAt = 0;
    let rerouteCount = 0;
    let lastReason = null;
    let inFlight = false;

    function canRerouteNow() {
      const minMs = PERF().minimumRerouteIntervalMs ?? CFG().minimumRerouteIntervalMs ?? 5000;
      return Date.now() - lastRerouteAt >= minMs && !inFlight;
    }

    async function performReroute(context) {
      const {
        matchResult,
        destinationNodeIds,
        baseGraph,
        edgeCache,
        routePreferences,
        onRoute,
        onError,
      } = context;

      if (!canRerouteNow()) return null;
      if (!matchResult?.isReliable || !matchResult.matchedEdgeId) return null;

      inFlight = true;
      lastReason = "off_route_confirmed";

      try {
        const route = global.LiveVirtualNode?.calculateRouteFromVirtualNode?.({
          baseGraph,
          matchResult,
          destinationNodeIds,
          routePreferences,
          edgeCache,
        });

        if (route) {
          lastRerouteAt = Date.now();
          rerouteCount += 1;
          onRoute?.(route, { rerouteCount, reason: lastReason });
          return route;
        }
        onError?.("no_route");
        return null;
      } finally {
        inFlight = false;
      }
    }

    function requestReroute(context) {
      if (PERF().recalculateRouteOnEveryPosition) {
        console.warn("recalculateRouteOnEveryPosition deve permanecer false");
      }
      return performReroute(context);
    }

    return {
      canRerouteNow,
      requestReroute,
      performReroute,
      getStats: () => ({ rerouteCount, lastReason, lastRerouteAt }),
    };
  }

  global.LiveRerouting = {
    createRerouteController,
  };
})(typeof window !== "undefined" ? window : globalThis);
