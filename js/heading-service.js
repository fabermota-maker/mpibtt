/**
 * Heading do dispositivo via sensores (DeviceOrientation).
 * Fonte única para bússola e rotação do puck — suavização em requestAnimationFrame.
 */
(function (global) {
  "use strict";

  const GT = () => (typeof GeoTransform !== "undefined" ? GeoTransform : null);

  function normalizeAngle(deg) {
    if (deg == null || !isFinite(deg)) return null;
    if (GT()?.normalizeAngle) return GT().normalizeAngle(deg);
    return ((deg % 360) + 360) % 360;
  }

  function interpolateAngle(from, to, t) {
    if (GT()?.interpolateAngle) return GT().interpolateAngle(from, to, t);
    let delta = ((to - from + 540) % 360) - 180;
    return normalizeAngle(from + delta * t);
  }

  function createHeadingService(opts = {}) {
    const smoothingFactor = opts.smoothingFactor ?? 0.12;
    const minEmitDelta = opts.minEmitDelta ?? 0.15;

    let bound = false;
    let active = false;
    let paused = false;
    let permissionGranted = false;
    let permissionRequested = false;
    let displayHeading = null;
    let targetHeading = null;
    let rawHeading = null;
    let hasSensor = false;
    let lastEmitHeading = null;
    const listeners = new Set();
    let rafId = null;

    function emit(force) {
      if (displayHeading == null) return;
      if (
        !force &&
        lastEmitHeading != null &&
        Math.abs(((displayHeading - lastEmitHeading + 540) % 360) - 180) < minEmitDelta
      ) {
        return;
      }
      lastEmitHeading = displayHeading;
      listeners.forEach((fn) => {
        try {
          fn(displayHeading, rawHeading);
        } catch (err) {
          console.warn("HeadingService listener:", err);
        }
      });
    }

    function screenOffset() {
      const angle = screen.orientation?.angle;
      if (isFinite(angle)) return angle;
      if (isFinite(global.orientation)) return global.orientation;
      return 0;
    }

    function readHeading(ev) {
      if (ev.webkitCompassHeading != null && isFinite(ev.webkitCompassHeading)) {
        return normalizeAngle(ev.webkitCompassHeading);
      }
      if (ev.absolute && ev.alpha != null && isFinite(ev.alpha)) {
        return normalizeAngle(360 - ev.alpha);
      }
      if (ev.alpha != null && isFinite(ev.alpha)) {
        let h = 360 - ev.alpha + screenOffset();
        return normalizeAngle(h);
      }
      return null;
    }

    function handler(ev) {
      if (paused || !permissionGranted) return;
      const h = readHeading(ev);
      if (h == null) return;
      rawHeading = h;
      targetHeading = h;
      hasSensor = true;
      if (displayHeading == null) {
        displayHeading = h;
        emit(true);
      }
    }

    function tick() {
      if (active && !paused && targetHeading != null) {
        if (displayHeading == null) {
          displayHeading = targetHeading;
        } else {
          displayHeading = interpolateAngle(displayHeading, targetHeading, smoothingFactor);
        }
        emit(false);
      }
      rafId = requestAnimationFrame(tick);
    }

    function bindEvents() {
      if (bound) return;
      bound = true;
      addEventListener("deviceorientationabsolute", handler, true);
      addEventListener("deviceorientation", handler, true);
    }

    function unbindEvents() {
      if (!bound) return;
      removeEventListener("deviceorientationabsolute", handler, true);
      removeEventListener("deviceorientation", handler, true);
      bound = false;
    }

    async function requestPermission() {
      if (permissionRequested && permissionGranted) return true;
      if (typeof DeviceOrientationEvent === "undefined") {
        permissionGranted = false;
        permissionRequested = true;
        return false;
      }
      try {
        if (typeof DeviceOrientationEvent.requestPermission === "function") {
          const result = await DeviceOrientationEvent.requestPermission();
          permissionGranted = result === "granted";
        } else {
          permissionGranted = true;
        }
      } catch (err) {
        console.warn("HeadingService.requestPermission:", err);
        permissionGranted = false;
      }
      permissionRequested = true;
      return permissionGranted;
    }

    function start() {
      if (active) return permissionGranted;
      if (
        !permissionGranted &&
        typeof DeviceOrientationEvent !== "undefined" &&
        typeof DeviceOrientationEvent.requestPermission === "function"
      ) {
        return false;
      }
      active = true;
      paused = false;
      bindEvents();
      if (!rafId) rafId = requestAnimationFrame(tick);
      return true;
    }

    function stop() {
      active = false;
      unbindEvents();
      if (rafId) {
        cancelAnimationFrame(rafId);
        rafId = null;
      }
      displayHeading = null;
      targetHeading = null;
      rawHeading = null;
      lastEmitHeading = null;
      hasSensor = false;
    }

    function pause() {
      paused = true;
    }

    function resume() {
      paused = false;
    }

    function combineWithLocationBearing(locationBearing, speed) {
      if (displayHeading == null) return locationBearing;
      if (locationBearing == null || (speed || 0) < 1.5) return displayHeading;
      return interpolateAngle(displayHeading, locationBearing, 0.25);
    }

    function subscribe(fn) {
      listeners.add(fn);
      return () => listeners.delete(fn);
    }

    function getDisplayHeading() {
      return displayHeading;
    }

    function toMapHeading(deviceHeading, geoTransform) {
      if (deviceHeading == null || !isFinite(deviceHeading)) return null;
      const mapped = geoTransform?.gpsBearingToMapHeading
        ? geoTransform.gpsBearingToMapHeading(deviceHeading)
        : deviceHeading;
      return normalizeAngle(mapped);
    }

    function sensorAvailable() {
      return hasSensor;
    }

    function isPermissionGranted() {
      return permissionGranted;
    }

    return {
      start,
      stop,
      pause,
      resume,
      subscribe,
      requestPermission,
      combineWithLocationBearing,
      getDisplayHeading,
      toMapHeading,
      sensorAvailable,
      isPermissionGranted,
      isActive: () => active,
    };
  }

  global.HeadingService = { create: createHeadingService };
})(typeof window !== "undefined" ? window : globalThis);
