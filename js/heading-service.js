/**
 * Heading do dispositivo via sensores (DeviceOrientation).
 */
(function (global) {
  "use strict";

  const GT = () => (typeof GeoTransform !== "undefined" ? GeoTransform : null);

  function createHeadingService(opts = {}) {
    const smoothingFactor = opts.smoothingFactor ?? 0.18;
    const targetHz = opts.targetHz ?? 30;
    const minInterval = 1000 / targetHz;

    let bound = false;
    let active = false;
    let paused = false;
    let displayHeading = null;
    let rawHeading = null;
    let hasSensor = false;
    let lastTick = 0;
    const listeners = new Set();
    let rafId = null;

    function emit() {
      listeners.forEach((fn) => {
        try { fn(displayHeading, rawHeading); } catch (err) { console.warn("HeadingService listener:", err); }
      });
    }

    function screenOffset() {
      const angle = screen.orientation?.angle;
      if (isFinite(angle)) return angle;
      if (isFinite(window.orientation)) return window.orientation;
      return 0;
    }

    function readHeading(ev) {
      if (ev.webkitCompassHeading != null && isFinite(ev.webkitCompassHeading)) {
        return GT()?.normalizeAngle(ev.webkitCompassHeading) ?? ev.webkitCompassHeading;
      }
      if (ev.alpha == null || !isFinite(ev.alpha)) return null;
      let h = 360 - ev.alpha;
      if (!ev.absolute) h += screenOffset();
      return GT()?.normalizeAngle(h) ?? ((h % 360) + 360) % 360;
    }

    function handler(ev) {
      if (paused) return;
      const now = performance.now();
      if (now - lastTick < minInterval) return;
      lastTick = now;
      const h = readHeading(ev);
      if (h == null) return;
      rawHeading = h;
      hasSensor = true;
      if (displayHeading == null) {
        displayHeading = h;
      } else {
        displayHeading = GT()?.interpolateAngle(displayHeading, h, smoothingFactor) ?? h;
      }
      emit();
    }

    function bindEvents() {
      if (bound) return;
      bound = true;
      addEventListener("deviceorientationabsolute", handler, true);
      addEventListener("deviceorientation", handler, true);
    }

    function start() {
      if (active) return true;
      active = true;
      paused = false;
      bindEvents();
      return true;
    }

    function stop() {
      active = false;
      if (bound) {
        removeEventListener("deviceorientationabsolute", handler, true);
        removeEventListener("deviceorientation", handler, true);
        bound = false;
      }
      if (rafId) cancelAnimationFrame(rafId);
    }

    function pause() { paused = true; }
    function resume() { paused = false; }

    function combineWithLocationBearing(locationBearing, speed) {
      if (displayHeading == null) return locationBearing;
      if (locationBearing == null || (speed || 0) < 1.5) return displayHeading;
      return GT()?.interpolateAngle(displayHeading, locationBearing, 0.25) ?? displayHeading;
    }

    function subscribe(fn) {
      listeners.add(fn);
      return () => listeners.delete(fn);
    }

    function getDisplayHeading() {
      return displayHeading;
    }

    function sensorAvailable() {
      return hasSensor;
    }

    return {
      start,
      stop,
      pause,
      resume,
      subscribe,
      combineWithLocationBearing,
      getDisplayHeading,
      sensorAvailable,
      isActive: () => active,
    };
  }

  global.HeadingService = { create: createHeadingService };
})(typeof window !== "undefined" ? window : globalThis);
