/**
 * Coleta múltiplas leituras GPS antes de iniciar orientação.
 * Prefere accuracy ≤ 30 m; aceita fallback aproximado (≤ softMax) para não
 * bloquear o sync contínuo em ambientes urbanos/internos.
 */
(function (global) {
  "use strict";

  const DEFAULT_GPS_SETTINGS = {
    enableHighAccuracy: true,
    timeout: 15000,
    maximumAge: 1000,
    maximumAcceptedAccuracyMeters: 30,
    softMaximumAccuracyMeters: 80,
    minimumValidReadings: 3,
    minimumAnyReadings: 2,
    maximumReadingCollectionTimeMs: 10000,
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

  function pickPosition(readings) {
    const sorted = [...readings].sort(
      (a, b) => (a.accuracy ?? 999) - (b.accuracy ?? 999),
    );
    const best = sorted[0];
    const top = sorted.slice(0, Math.min(3, sorted.length));
    if (top.length >= 2) {
      return {
        latitude: top.reduce((s, r) => s + r.latitude, 0) / top.length,
        longitude: top.reduce((s, r) => s + r.longitude, 0) / top.length,
        accuracy: Math.min(...top.map((r) => r.accuracy)),
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

  function toReading(pos) {
    const c = pos.coords;
    if (!isFinite(c.latitude) || !isFinite(c.longitude)) return null;
    return {
      latitude: c.latitude,
      longitude: c.longitude,
      accuracy: isFinite(c.accuracy) ? c.accuracy : 999,
      heading: isFinite(c.heading) && c.heading >= 0 ? c.heading : null,
      speed: c.speed,
      timestamp: pos.timestamp || Date.now(),
    };
  }

  /**
   * Coleta leituras e devolve a melhor posição disponível.
   * success + approximate:true quando só há leituras acima de 30 m.
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

      const precise = [];
      const soft = [];
      const any = [];
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

      function tryFinishEarly() {
        if (precise.length >= settings.minimumValidReadings) {
          finish({
            success: true,
            approximate: false,
            position: pickPosition(precise),
            allValid: precise,
          });
        }
      }

      function settleOnTimeout() {
        if (precise.length >= settings.minimumValidReadings) {
          finish({
            success: true,
            approximate: false,
            position: pickPosition(precise),
            allValid: precise,
          });
          return;
        }
        if (precise.length >= 1) {
          finish({
            success: true,
            approximate: false,
            position: pickPosition(precise),
            allValid: precise,
          });
          return;
        }
        if (soft.length >= settings.minimumAnyReadings || soft.length >= 1) {
          finish({
            success: true,
            approximate: true,
            position: pickPosition(soft),
            allValid: soft,
          });
          return;
        }
        if (any.length >= 1) {
          finish({
            success: true,
            approximate: true,
            position: pickPosition(any),
            allValid: any,
          });
          return;
        }
        finish({
          success: false,
          reason: "LOW_ACCURACY",
          message:
            "Não foi possível determinar sua posição com precisão.\nAproxime-se de uma entrada ou vá para uma área aberta.",
          validCount: 0,
        });
      }

      function onPos(pos) {
        const reading = toReading(pos);
        if (!reading) return;
        any.push(reading);
        if (reading.accuracy <= settings.maximumAcceptedAccuracyMeters) {
          precise.push(reading);
        }
        if (reading.accuracy <= settings.softMaximumAccuracyMeters) {
          soft.push(reading);
        }
        tryFinishEarly();
      }

      function onErr(err) {
        if (err?.code === 1) {
          finish({
            success: false,
            reason: "PERMISSION_DENIED",
            message:
              "A localização não foi autorizada.\nEscolha sua posição no mapa ou escaneie um QR Code.",
          });
        }
      }

      timeoutId = setTimeout(settleOnTimeout, settings.maximumReadingCollectionTimeMs);

      const geoOpts = {
        enableHighAccuracy: settings.enableHighAccuracy,
        timeout: settings.timeout,
        maximumAge: settings.maximumAge,
      };

      watchId = navigator.geolocation.watchPosition(onPos, onErr, geoOpts);
      navigator.geolocation.getCurrentPosition(onPos, onErr, geoOpts);
    });
  }

  global.GpsReadingCollector = {
    DEFAULT_GPS_SETTINGS,
    collectAccurateGpsReadings,
    haversineMeters,
  };
})(typeof window !== "undefined" ? window : globalThis);
