/**
 * Coleta múltiplas leituras GPS válidas antes de iniciar orientação.
 */
(function (global) {
  "use strict";

  const DEFAULT_GPS_SETTINGS = {
    enableHighAccuracy: true,
    timeout: 15000,
    maximumAge: 2000,
    maximumAcceptedAccuracyMeters: 30,
    minimumValidReadings: 3,
    maximumReadingCollectionTimeMs: 12000,
  };

  function haversineMeters(aLat, aLng, bLat, bLng) {
    const R = 6371000;
    const toR = Math.PI / 180;
    const dLat = (bLat - aLat) * toR;
    const dLng = (bLng - aLng) * toR;
    const s =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(aLat * toR) * Math.cos(bLat * toR) * Math.sin(dLng / 2) ** 2;
    return 2 * R * Math.asin(Math.min(1, Math.sqrt(s)));
  }

  /**
   * Coleta leituras com accuracy <= máximo e devolve a melhor (menor accuracy)
   * ou a média das três melhores.
   */
  function collectAccurateGpsReadings(options = {}) {
    const settings = { ...DEFAULT_GPS_SETTINGS, ...options };

    return new Promise((resolve) => {
      if (typeof navigator === "undefined" || !navigator.geolocation) {
        resolve({
          success: false,
          reason: "UNSUPPORTED",
          message: "Geolocalização não suportada neste navegador.",
        });
        return;
      }

      const valid = [];
      const startedAt = Date.now();
      let settled = false;
      let watchId = null;
      let timeoutId = null;

      function finish(result) {
        if (settled) return;
        settled = true;
        if (watchId != null) navigator.geolocation.clearWatch(watchId);
        if (timeoutId != null) clearTimeout(timeoutId);
        resolve(result);
      }

      function pickPosition(readings) {
        const sorted = [...readings].sort(
          (a, b) => (a.accuracy ?? 999) - (b.accuracy ?? 999),
        );
        const best = sorted[0];
        const top = sorted.slice(0, Math.min(3, sorted.length));
        if (top.length >= 2) {
          const lat =
            top.reduce((s, r) => s + r.latitude, 0) / top.length;
          const lng =
            top.reduce((s, r) => s + r.longitude, 0) / top.length;
          const accuracy = Math.min(...top.map((r) => r.accuracy));
          return {
            latitude: lat,
            longitude: lng,
            accuracy,
            heading: best.heading,
            speed: best.speed,
            timestamp: best.timestamp,
            readingsUsed: top.length,
            method: "average-best",
          };
        }
        return {
          ...best,
          readingsUsed: 1,
          method: "best-accuracy",
        };
      }

      function onPos(pos) {
        const c = pos.coords;
        if (!isFinite(c.latitude) || !isFinite(c.longitude)) return;
        const accuracy = c.accuracy;
        if (
          !isFinite(accuracy) ||
          accuracy > settings.maximumAcceptedAccuracyMeters
        ) {
          return;
        }
        valid.push({
          latitude: c.latitude,
          longitude: c.longitude,
          accuracy,
          heading:
            isFinite(c.heading) && c.heading >= 0 ? c.heading : null,
          speed: c.speed,
          timestamp: pos.timestamp || Date.now(),
        });

        if (valid.length >= settings.minimumValidReadings) {
          finish({
            success: true,
            position: pickPosition(valid),
            allValid: valid,
          });
        }
      }

      function onErr(err) {
        if (err?.code === 1) {
          finish({
            success: false,
            reason: "PERMISSION_DENIED",
            message:
              "A localização não foi autorizada.\nEscolha sua posição no mapa ou escaneie um QR Code.",
          });
          return;
        }
        // timeout/position unavailable: espera o timer geral
      }

      timeoutId = setTimeout(() => {
        if (valid.length >= settings.minimumValidReadings) {
          finish({
            success: true,
            position: pickPosition(valid),
            allValid: valid,
          });
        } else if (valid.length >= 1) {
          finish({
            success: false,
            reason: "LOW_ACCURACY",
            message:
              "Não foi possível determinar sua posição com precisão.\nAproxime-se de uma entrada ou vá para uma área aberta.",
            partial: pickPosition(valid),
            validCount: valid.length,
          });
        } else {
          finish({
            success: false,
            reason: "LOW_ACCURACY",
            message:
              "Não foi possível determinar sua posição com precisão.\nAproxime-se de uma entrada ou vá para uma área aberta.",
            validCount: 0,
          });
        }
      }, settings.maximumReadingCollectionTimeMs);

      watchId = navigator.geolocation.watchPosition(onPos, onErr, {
        enableHighAccuracy: settings.enableHighAccuracy,
        timeout: settings.timeout,
        maximumAge: settings.maximumAge,
      });

      // Kick inicial
      navigator.geolocation.getCurrentPosition(onPos, onErr, {
        enableHighAccuracy: settings.enableHighAccuracy,
        timeout: settings.timeout,
        maximumAge: settings.maximumAge,
      });
    });
  }

  global.GpsReadingCollector = {
    DEFAULT_GPS_SETTINGS,
    collectAccurateGpsReadings,
    haversineMeters,
  };
})(typeof window !== "undefined" ? window : globalThis);
