/**
 * Rastreamento contínuo de posição via Geolocation API.
 */
(function (global) {
  "use strict";

  const GT = () => (typeof GeoTransform !== "undefined" ? GeoTransform : null);

  function createLocationService(opts = {}) {
    const positionSmoothing = opts.positionSmoothing ?? 0.18;
    let watchId = null;
    let active = false;
    let lastRaw = null;
    let display = {
      latitude: null,
      longitude: null,
      accuracy: null,
      speed: null,
      locationBearing: null,
      timestamp: null,
    };
    const listeners = new Set();

    function emit() {
      listeners.forEach((fn) => {
        try { fn(display); } catch (err) { console.warn("LocationService listener:", err); }
      });
    }

    function onPosition(pos) {
      const c = pos.coords;
      const next = {
        latitude: c.latitude,
        longitude: c.longitude,
        accuracy: c.accuracy,
        speed: c.speed,
        locationBearing: isFinite(c.heading) && c.heading >= 0 ? c.heading : null,
        timestamp: pos.timestamp || Date.now(),
      };

      if (lastRaw && isFinite(lastRaw.latitude)) {
        const gt = GT();
        const computed = gt?.bearingFromMovement(lastRaw, next);
        if (computed != null && (next.locationBearing == null || (next.speed || 0) > 1.2)) {
          next.locationBearing = computed;
        }
      }

      if (display.latitude == null || display.longitude == null) {
        display = { ...next };
      } else {
        const f = positionSmoothing;
        display = {
          latitude: display.latitude + (next.latitude - display.latitude) * f,
          longitude: display.longitude + (next.longitude - display.longitude) * f,
          accuracy: next.accuracy,
          speed: next.speed,
          locationBearing: next.locationBearing,
          timestamp: next.timestamp,
        };
      }

      lastRaw = next;
      emit();
    }

    function onError(err) {
      console.warn("LocationService:", err?.message || err);
      listeners.forEach((fn) => {
        try { fn(null, err); } catch (e) { console.warn(e); }
      });
    }

    function start() {
      if (active || !navigator.geolocation) return false;
      active = true;
      // Fix imediato com posição em cache (não bloqueia o watch)
      navigator.geolocation.getCurrentPosition(onPosition, () => {}, {
        enableHighAccuracy: true,
        maximumAge: 120000,
        timeout: 3500,
      });
      watchId = navigator.geolocation.watchPosition(onPosition, onError, {
        enableHighAccuracy: true,
        maximumAge: opts.maximumAge ?? 2000,
        timeout: opts.timeout ?? 12000,
      });
      return true;
    }

    function stop() {
      active = false;
      if (watchId != null) {
        navigator.geolocation.clearWatch(watchId);
        watchId = null;
      }
    }

    function subscribe(fn) {
      listeners.add(fn);
      return () => listeners.delete(fn);
    }

    function getDisplay() {
      return { ...display };
    }

    return { start, stop, subscribe, getDisplay, isActive: () => active };
  }

  global.LocationService = { create: createLocationService };
})(typeof window !== "undefined" ? window : globalThis);
