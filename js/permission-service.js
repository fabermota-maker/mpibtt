/**
 * Permissões de localização e orientação do dispositivo.
 */
(function (global) {
  "use strict";

  function createPermissionService() {
    let locationStatus = "prompt";
    let orientationStatus = "prompt";

    async function probeGeolocation() {
      if (!navigator.geolocation) {
        locationStatus = "unavailable";
        return locationStatus;
      }
      if (navigator.permissions?.query) {
        try {
          const result = await navigator.permissions.query({ name: "geolocation" });
          locationStatus = result.state;
          result.onchange = () => { locationStatus = result.state; };
          return locationStatus;
        } catch {
          /* Permissions API pode falhar em alguns browsers */
        }
      }
      return locationStatus;
    }

    async function requestLocationPermission() {
      if (!navigator.geolocation) {
        locationStatus = "unavailable";
        return { ok: false, status: locationStatus, error: "Geolocalização não suportada neste navegador." };
      }
      return new Promise((resolve) => {
        navigator.geolocation.getCurrentPosition(
          () => {
            locationStatus = "granted";
            resolve({ ok: true, status: locationStatus });
          },
          (err) => {
            if (err.code === 1) locationStatus = "denied";
            else if (err.code === 2) locationStatus = "unavailable";
            else locationStatus = "unavailable";
            resolve({
              ok: false,
              status: locationStatus,
              error: err.message,
              permanent: err.code === 1,
            });
          },
          { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 },
        );
      });
    }

    async function requestOrientationPermission() {
      if (typeof DeviceOrientationEvent === "undefined") {
        orientationStatus = "unavailable";
        return { ok: false, status: orientationStatus, error: "Sensores de orientação indisponíveis." };
      }
      if (typeof DeviceOrientationEvent.requestPermission === "function") {
        try {
          const result = await DeviceOrientationEvent.requestPermission();
          orientationStatus = result === "granted" ? "granted" : "denied";
          return { ok: orientationStatus === "granted", status: orientationStatus };
        } catch (err) {
          orientationStatus = "denied";
          return { ok: false, status: orientationStatus, error: err?.message || "Permissão negada." };
        }
      }
      orientationStatus = "granted";
      return { ok: true, status: orientationStatus };
    }

    return {
      probeGeolocation,
      requestLocationPermission,
      requestOrientationPermission,
      getLocationStatus: () => locationStatus,
      getOrientationStatus: () => orientationStatus,
    };
  }

  global.PermissionService = { create: createPermissionService };
})(typeof window !== "undefined" ? window : globalThis);
