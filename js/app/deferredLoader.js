/**
 * Carregamento diferido de scripts (GPS / navegação ao vivo).
 */
(function (global) {
  "use strict";

  const loaded = new Set();
  let gpsPromise = null;

  function scriptUrl(src) {
    const v = document.querySelector('script[src*="app.js"]')?.src?.match(/[?&]v=(\d+)/);
    const q = v ? `?v=${v[1]}` : "";
    return src.includes("?") ? src : `${src}${q}`;
  }

  function loadScript(src) {
    if (loaded.has(src)) return Promise.resolve();
    return new Promise((resolve, reject) => {
      const s = document.createElement("script");
      s.src = scriptUrl(src);
      s.async = false;
      s.onload = () => { loaded.add(src); resolve(); };
      s.onerror = () => reject(new Error(`Falha ao carregar ${src}`));
      document.body.appendChild(s);
    });
  }

  async function loadLiveNavStack() {
    const chain = [
      "js/navigation/live/liveNavigationConfig.js",
      "js/navigation/live/polylineGeometry.js",
      "js/navigation/live/spatialIndex.js",
      "js/navigation/live/edgeCache.js",
      "js/navigation/live/mapMatching.js",
      "js/navigation/live/virtualNode.js",
      "js/navigation/live/positionSmoothing.js",
      "js/navigation/live/routeProgress.js",
      "js/navigation/live/offRouteDetection.js",
      "js/navigation/live/rerouting.js",
      "js/navigation/live/coordinateTransform.js",
      "js/navigation/live/geolocationService.js",
      "js/navigation/live/liveNavigationController.js",
    ];
    for (const src of chain) await loadScript(src);
    return true;
  }

  async function loadGpsStack() {
    if (gpsPromise) return gpsPromise;
    gpsPromise = (async () => {
      await loadLiveNavStack();
      const chain = [
        "js/gps-orientation.js",
        "js/permission-service.js",
        "js/location-service.js",
        "js/heading-service.js",
        "js/gps-compass.js",
        "js/user-location-puck.js",
        "js/map-camera-controller.js",
        "js/user-location.js",
      ];
      for (const src of chain) {
        if (loaded.has(src)) continue;
        await loadScript(src);
      }
      return true;
    })();
    return gpsPromise;
  }

  global.PIBMapDeferred = { loadScript, loadLiveNavStack, loadGpsStack };
})(typeof window !== "undefined" ? window : globalThis);
