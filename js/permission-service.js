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
        return {
          ok: false,
          status: locationStatus,
          error: "Geolocalização não suportada neste navegador.",
        };
      }
      if (typeof window !== "undefined" && window.isSecureContext === false) {
        locationStatus = "unavailable";
        return {
          ok: false,
          status: locationStatus,
          error:
            "Abra o mapa em HTTPS (ou em localhost) para liberar o GPS do navegador.",
          code: "INSECURE_CONTEXT",
        };
      }
      return new Promise((resolve) => {
        navigator.geolocation.getCurrentPosition(
          () => {
            locationStatus = "granted";
            resolve({ ok: true, status: locationStatus });
          },
          (err) => {
            // 1ª tentativa falhou — tenta de novo com cache mais tolerante
            if (err.code === 3 || err.code === 2) {
              navigator.geolocation.getCurrentPosition(
                () => {
                  locationStatus = "granted";
                  resolve({ ok: true, status: locationStatus });
                },
                (err2) => {
                  if (err2.code === 1) locationStatus = "denied";
                  else if (err2.code === 2) locationStatus = "unavailable";
                  else if (err2.code === 3) locationStatus = "timeout";
                  else locationStatus = "unavailable";

                  let error = err2.message || "Falha ao obter localização.";
                  if (err2.code === 1) {
                    error =
                      "Permissão de localização negada. Ative nas configurações do navegador.";
                  } else if (err2.code === 3) {
                    error =
                      "O GPS demorou para responder. Ative a localização do aparelho e tente de novo.";
                  } else {
                    error =
                      "Localização indisponível. Ative o GPS do aparelho e permita o acesso a este site.";
                  }
                  resolve({
                    ok: false,
                    status: locationStatus,
                    error,
                    code: err2.code,
                    permanent: err2.code === 1,
                  });
                },
                { enableHighAccuracy: true, timeout: 20000, maximumAge: 60000 },
              );
              return;
            }

            if (err.code === 1) locationStatus = "denied";
            else if (err.code === 2) locationStatus = "unavailable";
            else if (err.code === 3) locationStatus = "timeout";
            else locationStatus = "unavailable";

            let error = err.message || "Falha ao obter localização.";
            if (typeof window !== "undefined" && window.isSecureContext === false) {
              error =
                "Abra o mapa em HTTPS (ou em localhost) para liberar o GPS do navegador.";
            } else if (err.code === 1) {
              error =
                "Permissão de localização negada. Ative nas configurações do navegador.";
            } else if (err.code === 3) {
              error =
                "O GPS demorou para responder. Ative a localização do aparelho e tente de novo.";
            } else {
              error =
                "Localização indisponível. Ative o GPS do aparelho e permita o acesso a este site.";
            }

            resolve({
              ok: false,
              status: locationStatus,
              error,
              code: err.code,
              permanent: err.code === 1,
            });
          },
          { enableHighAccuracy: true, timeout: 15000, maximumAge: 5000 },
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
