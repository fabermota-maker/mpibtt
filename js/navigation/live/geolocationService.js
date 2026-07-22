/**
 * Geolocation API — um único watchPosition por sessão.
 */
(function (global) {
  "use strict";

  const WATCH_OPTIONS = {
    enableHighAccuracy: true,
    maximumAge: 3000,
    timeout: 10000,
  };

  function createGeolocationService() {
    let watchId = null;
    let onUpdate = null;
    let onError = null;

    function requestLocationPermission() {
      return new Promise((resolve, reject) => {
        if (!navigator.geolocation) {
          reject(new Error("Geolocalização não disponível"));
          return;
        }
        navigator.geolocation.getCurrentPosition(
          (pos) => resolve(pos),
          (err) => reject(err),
          WATCH_OPTIONS,
        );
      });
    }

    function startLocationTracking(updateCb, errorCb) {
      stopLocationTracking();
      if (!navigator.geolocation) return false;
      onUpdate = updateCb;
      onError = errorCb;
      watchId = navigator.geolocation.watchPosition(
        (pos) => handleLocationUpdate(pos),
        (err) => handleLocationError(err),
        WATCH_OPTIONS,
      );
      return watchId != null;
    }

    function stopLocationTracking() {
      if (watchId != null) {
        navigator.geolocation.clearWatch(watchId);
        watchId = null;
      }
      onUpdate = null;
      onError = null;
    }

    function handleLocationUpdate(position) {
      const c = position?.coords;
      if (!c) return;
      const reading = {
        latitude: c.latitude,
        longitude: c.longitude,
        accuracy: c.accuracy,
        heading: isFinite(c.heading) && c.heading >= 0 ? c.heading : null,
        speed: c.speed,
        timestamp: position.timestamp || Date.now(),
      };
      onUpdate?.(reading);
    }

    function handleLocationError(error) {
      onError?.(error);
    }

    function isWatching() {
      return watchId != null;
    }

    return {
      requestLocationPermission,
      startLocationTracking,
      stopLocationTracking,
      handleLocationUpdate,
      handleLocationError,
      isWatching,
      WATCH_OPTIONS,
    };
  }

  global.LiveGeolocationService = {
    create: createGeolocationService,
    WATCH_OPTIONS,
  };
})(typeof window !== "undefined" ? window : globalThis);
