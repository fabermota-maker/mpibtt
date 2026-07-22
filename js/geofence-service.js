/**
 * Geofence PIB Curitiba — perímetro GPS + regras de estabilidade.
 * Sem Google Maps: point-in-polygon próprio (ray casting).
 * Aceita config legada (latitude/longitude) ou PIB_CURITIBA_* (lat/lng).
 */
(function (global) {
  "use strict";

  const DEFAULT_RULES = {
    maximumAccuracyMeters: 30,
    outsideReadingsRequired: 3,
    keepLastValidPosition: true,
    requireInsideGeofence: true,
    snapToNearestEntrance: true,
    allowIndoorGpsPositioning: false,
    useGpsReferencePoints: true,
    maximumGpsReferenceDistanceMeters: 25,
    snapToNearestNavEdge: true,
    maximumNavEdgeSnapDistanceMeters: 10,
    allowFreeMovementOverSvg: false,
  };

  function normPoint(p) {
    if (!p) return null;
    const latitude = isFinite(p.latitude) ? p.latitude : p.lat;
    const longitude = isFinite(p.longitude) ? p.longitude : p.lng;
    if (!isFinite(latitude) || !isFinite(longitude)) return null;
    return {
      ...p,
      latitude,
      longitude,
      lat: latitude,
      lng: longitude,
      nome: p.nome || p.name || p.id,
      name: p.name || p.nome || p.id,
    };
  }

  function containsLocation(lat, lng, ring) {
    if (!ring || ring.length < 3 || !isFinite(lat) || !isFinite(lng)) return false;
    let inside = false;
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
      const yi = ring[i].latitude;
      const xi = ring[i].longitude;
      const yj = ring[j].latitude;
      const xj = ring[j].longitude;
      if (pointOnSegment(lng, lat, xj, yj, xi, yi)) return true;
      const intersect =
        yi > lat !== yj > lat &&
        lng < ((xj - xi) * (lat - yi)) / (yj - yi + 1e-15) + xi;
      if (intersect) inside = !inside;
    }
    return inside;
  }

  function pointOnSegment(px, py, x1, y1, x2, y2, eps = 1e-9) {
    const cross = (py - y1) * (x2 - x1) - (px - x1) * (y2 - y1);
    if (Math.abs(cross) > 1e-7) return false;
    const dot = (px - x1) * (x2 - x1) + (py - y1) * (y2 - y1);
    if (dot < 0) return false;
    const len2 = (x2 - x1) ** 2 + (y2 - y1) ** 2;
    return dot <= len2 + eps;
  }

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

  function nearestPoint(lat, lng, list) {
    let best = null;
    let bestD = Infinity;
    for (const p of list || []) {
      const d = haversineMeters(lat, lng, p.latitude, p.longitude);
      if (d < bestD) {
        bestD = d;
        best = p;
      }
    }
    return best ? { point: best, distanceMeters: bestD } : null;
  }

  function mapRules(raw = {}) {
    return {
      ...DEFAULT_RULES,
      ...raw,
      maximumAccuracyMeters:
        raw.maximumAccuracyMeters ??
        raw.maximumAcceptedAccuracyMeters ??
        DEFAULT_RULES.maximumAccuracyMeters,
    };
  }

  function createGeofenceService(config = {}) {
    const perimeterSrc = config.perimeter || config.geofence || [];
    const perimeter = perimeterSrc.map(normPoint).filter(Boolean);
    const gpsReferencePoints = (config.gpsReferencePoints || [])
      .map(normPoint)
      .filter(Boolean);
    const gpsAreas = (config.gpsAreas || [])
      .map((area) => {
        const base = normPoint(area);
        if (!base) return null;
        const polygon = (area.polygon || []).map(normPoint).filter(Boolean);
        if (polygon.length < 3) return null;
        return { ...base, ...area, polygon, latitude: base.latitude, longitude: base.longitude };
      })
      .filter(Boolean);
    const rules = mapRules(config.rules || {});
    const centerRaw = config.mapCenter || null;
    const mapCenter = centerRaw
      ? {
          latitude: isFinite(centerRaw.latitude) ? centerRaw.latitude : centerRaw.lat,
          longitude: isFinite(centerRaw.longitude) ? centerRaw.longitude : centerRaw.lng,
        }
      : null;

    let consecutiveOutside = 0;
    let lastValid = null;
    let lastStatus = "CHECKING";

    function findGpsArea(lat, lng) {
      for (const area of gpsAreas) {
        if (area.useForGpsSync === false) continue;
        if (containsLocation(lat, lng, area.polygon)) {
          return {
            point: area,
            distanceMeters: 0,
            inArea: true,
          };
        }
      }
      return null;
    }

    function nearestGpsReference(lat, lng) {
      // Áreas (polígonos) têm prioridade — ex.: palco do Templo
      const areaHit = findGpsArea(lat, lng);
      if (areaHit) return areaHit;

      if (!rules.useGpsReferencePoints) return null;
      const refs = gpsReferencePoints.filter((p) => p.useForGpsSync !== false);
      const hit = nearestPoint(lat, lng, refs);
      if (!hit) return null;
      const maxD = rules.maximumGpsReferenceDistanceMeters ?? 25;
      if (hit.distanceMeters > maxD) return null;
      return hit;
    }

    function evaluate(reading) {
      if (!reading || !isFinite(reading.latitude) || !isFinite(reading.longitude)) {
        return {
          status: "CHECKING",
          message: "Aguardando localização.",
          accepted: false,
          position: lastValid,
          accuracy: null,
          isInside: false,
        };
      }

      const accuracy = reading.accuracy;
      const isInside = containsLocation(reading.latitude, reading.longitude, perimeter);
      const nearestRef = nearestGpsReference(reading.latitude, reading.longitude);

      if (isFinite(accuracy) && accuracy > rules.maximumAccuracyMeters) {
        lastStatus = "LOW_ACCURACY";
        return {
          status: "LOW_ACCURACY",
          message: "Aguardando uma localização mais precisa.",
          accepted: false,
          position: rules.keepLastValidPosition ? lastValid : null,
          accuracy,
          isInside,
          nearestReference: nearestRef,
        };
      }

      if (isInside) {
        consecutiveOutside = 0;
        lastValid = {
          latitude: reading.latitude,
          longitude: reading.longitude,
          accuracy: reading.accuracy,
          speed: reading.speed,
          locationBearing: reading.locationBearing,
          timestamp: reading.timestamp,
        };
        lastStatus = "INSIDE";
        return {
          status: "INSIDE",
          message: "Você está dentro da área da PIB Curitiba.",
          accepted: true,
          position: lastValid,
          accuracy,
          isInside: true,
          nearestReference: nearestRef,
        };
      }

      if (!rules.requireInsideGeofence) {
        lastValid = { ...reading };
        lastStatus = "OUTSIDE";
        return {
          status: "OUTSIDE",
          message: "Você está fora da área mapeada.",
          accepted: true,
          position: lastValid,
          accuracy,
          isInside: false,
          nearestReference: nearestRef,
        };
      }

      consecutiveOutside += 1;
      if (consecutiveOutside < rules.outsideReadingsRequired) {
        lastStatus = "CHECKING";
        return {
          status: "CHECKING",
          message: "Confirmando sua localização.",
          accepted: false,
          position: rules.keepLastValidPosition ? lastValid : null,
          accuracy,
          isInside: false,
          nearestReference: nearestRef,
        };
      }

      lastStatus = "OUTSIDE";
      const entrances = gpsReferencePoints.filter((p) => p.category === "ENTRANCE");
      const snap = rules.snapToNearestEntrance
        ? nearestPoint(reading.latitude, reading.longitude, entrances.length ? entrances : perimeter)
        : nearestPoint(reading.latitude, reading.longitude, perimeter);

      return {
        status: "OUTSIDE",
        message: "Você está fora da área mapeada.",
        accepted: false,
        position: rules.keepLastValidPosition
          ? lastValid
          : {
              latitude: reading.latitude,
              longitude: reading.longitude,
              accuracy: reading.accuracy,
              speed: reading.speed,
              locationBearing: reading.locationBearing,
              timestamp: reading.timestamp,
            },
        accuracy,
        isInside: false,
        nearest: snap,
        nearestReference: nearestRef,
      };
    }

    function reset() {
      consecutiveOutside = 0;
      lastValid = null;
      lastStatus = "CHECKING";
    }

    return {
      perimeter,
      rules,
      mapCenter,
      gpsReferencePoints,
      gpsAreas,
      contains: (lat, lng) => containsLocation(lat, lng, perimeter),
      evaluate,
      reset,
      nearestGpsReference,
      findGpsArea,
      getLastValid: () => (lastValid ? { ...lastValid } : null),
      getStatus: () => lastStatus,
      nearestEntrance: (lat, lng) =>
        nearestPoint(
          lat,
          lng,
          gpsReferencePoints.filter((p) => p.category === "ENTRANCE"),
        ),
    };
  }

  /** Cria o serviço a partir de PIB_CURITIBA_LOCATION_CONFIG. */
  function createFromPibConfig(cfg) {
    const config = cfg || global.PIB_CURITIBA_LOCATION_CONFIG;
    if (!config) throw new Error("PIB_CURITIBA_LOCATION_CONFIG indisponível.");
    return createGeofenceService({
      geofence: config.geofence,
      gpsReferencePoints: config.gpsReferencePoints,
      gpsAreas: config.gpsAreas,
      mapCenter: config.mapCenter,
      rules: config.rules,
    });
  }

  async function loadFromUrl(url) {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) throw new Error(`Geofence HTTP ${res.status}`);
    const data = await res.json();
    return createGeofenceService(data);
  }

  global.GeofenceService = {
    create: createGeofenceService,
    createFromPibConfig,
    loadFromUrl,
    containsLocation,
    DEFAULT_RULES,
  };
})(typeof window !== "undefined" ? window : globalThis);
