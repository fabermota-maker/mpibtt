/**
 * Conversão GPS (WGS84) ↔ coordenadas SVG do mapa L00.
 * Suporta calibração multi-ponto (mínimos quadrados / similaridade).
 */
(function (global) {
  "use strict";

  const DEG = Math.PI / 180;

  function normalizeAngle(deg) {
    return ((deg % 360) + 360) % 360;
  }

  function interpolateAngle(from, to, factor) {
    from = normalizeAngle(from);
    to = normalizeAngle(to);
    let delta = to - from;
    if (delta > 180) delta -= 360;
    if (delta < -180) delta += 360;
    return normalizeAngle(from + delta * factor);
  }

  function localMeters(lat, lng, refLat, refLng) {
    const mPerLat = 110540;
    const mPerLng = 111320 * Math.cos(refLat * DEG);
    return {
      x: (lng - refLng) * mPerLng,
      y: (lat - refLat) * mPerLat,
    };
  }

  /** Similaridade 2-pontos (legado). */
  function buildTransformTwoPoint(a, b) {
    const gpsB = localMeters(b.latitude, b.longitude, a.latitude, a.longitude);
    const svgDx = b.svgX - a.svgX;
    const svgDy = b.svgY - a.svgY;
    const gpsDist = Math.hypot(gpsB.x, gpsB.y);
    const svgDist = Math.hypot(svgDx, svgDy);
    if (gpsDist < 1 || svgDist < 1) return null;

    const gpsAngle = Math.atan2(gpsB.x, gpsB.y);
    const svgAngle = Math.atan2(svgDx, -svgDy);
    const rotation = svgAngle - gpsAngle;
    const scale = svgDist / gpsDist;

    return {
      kind: "similarity",
      originLat: a.latitude,
      originLng: a.longitude,
      originSvgX: a.svgX,
      originSvgY: a.svgY,
      rotation,
      scale,
      mapNorthOffset: normalizeAngle((rotation * 180) / Math.PI),
      affine: null,
    };
  }

  /**
   * Ajuste afim ponderado com N≥3 pontos:
   * svgX = a*gx + b*gy + c
   * svgY = d*gx + e*gy + f
   */
  function buildTransformAffine(controlPoints) {
    const pts = (controlPoints || []).filter(
      (p) => isFinite(p.latitude) && isFinite(p.longitude) && isFinite(p.svgX) && isFinite(p.svgY),
    );
    if (pts.length < 3) return null;

    const origin = pts.reduce(
      (acc, p) => {
        const w = p.weight || 1;
        acc.lat += p.latitude * w;
        acc.lng += p.longitude * w;
        acc.w += w;
        return acc;
      },
      { lat: 0, lng: 0, w: 0 },
    );
    const originLat = origin.lat / origin.w;
    const originLng = origin.lng / origin.w;

    // Monta sistema normal 3x3 para cada eixo (X e Y)
    const ATA = [
      [0, 0, 0],
      [0, 0, 0],
      [0, 0, 0],
    ];
    const ATx = [0, 0, 0];
    const ATy = [0, 0, 0];

    for (const p of pts) {
      const w = Math.sqrt(p.weight || 1);
      const g = localMeters(p.latitude, p.longitude, originLat, originLng);
      const gx = g.x * w;
      const gy = g.y * w;
      const row = [gx, gy, w];
      for (let i = 0; i < 3; i++) {
        for (let j = 0; j < 3; j++) ATA[i][j] += row[i] * row[j];
        ATx[i] += row[i] * (p.svgX * w);
        ATy[i] += row[i] * (p.svgY * w);
      }
    }

    const cx = solve3(ATA, ATx);
    const cy = solve3(ATA, ATy);
    if (!cx || !cy) return null;

    // derivar escala/rotação aproximadas para heading
    const a = cx[0], b = cx[1], d = cy[0], e = cy[1];
    const scale = Math.sqrt((a * a + b * b + d * d + e * e) / 2) || 1;
    const rotation = Math.atan2(d - b, a + e);

    return {
      kind: "affine",
      originLat,
      originLng,
      originSvgX: cx[2],
      originSvgY: cy[2],
      rotation,
      scale,
      mapNorthOffset: normalizeAngle((rotation * 180) / Math.PI),
      affine: { a: cx[0], b: cx[1], c: cx[2], d: cy[0], e: cy[1], f: cy[2] },
      controlCount: pts.length,
    };
  }

  function solve3(M, v) {
    // Cópia + Gauss-Jordan
    const A = M.map((row, i) => row.slice().concat([v[i]]));
    const n = 3;
    for (let col = 0; col < n; col++) {
      let pivot = col;
      for (let r = col + 1; r < n; r++) {
        if (Math.abs(A[r][col]) > Math.abs(A[pivot][col])) pivot = r;
      }
      if (Math.abs(A[pivot][col]) < 1e-12) return null;
      if (pivot !== col) {
        const tmp = A[col];
        A[col] = A[pivot];
        A[pivot] = tmp;
      }
      const div = A[col][col];
      for (let j = col; j <= n; j++) A[col][j] /= div;
      for (let r = 0; r < n; r++) {
        if (r === col) continue;
        const f = A[r][col];
        for (let j = col; j <= n; j++) A[r][j] -= f * A[col][j];
      }
    }
    return [A[0][3], A[1][3], A[2][3]];
  }

  function buildTransform(controlPoints) {
    const pts = (controlPoints || []).filter(
      (p) => isFinite(p.latitude) && isFinite(p.longitude) && isFinite(p.svgX) && isFinite(p.svgY),
    );
    if (pts.length >= 3) {
      const affine = buildTransformAffine(pts);
      if (affine) return affine;
    }
    if (pts.length >= 2) return buildTransformTwoPoint(pts[0], pts[1]);
    return null;
  }

  function latLngToSvg(lat, lng, transform) {
    if (!transform || !isFinite(lat) || !isFinite(lng)) return null;
    const local = localMeters(lat, lng, transform.originLat, transform.originLng);

    if (transform.affine) {
      const { a, b, c, d, e, f } = transform.affine;
      return {
        x: a * local.x + b * local.y + c,
        y: d * local.x + e * local.y + f,
      };
    }

    const cos = Math.cos(transform.rotation);
    const sin = Math.sin(transform.rotation);
    const rx = (local.x * cos - local.y * sin) * transform.scale;
    const ry = (local.x * sin + local.y * cos) * transform.scale;
    return {
      x: transform.originSvgX + rx,
      y: transform.originSvgY + ry,
    };
  }

  function isInsideCampus(lat, lng, transform, marginMeters) {
    const pt = latLngToSvg(lat, lng, transform);
    if (!pt) return false;
    const m = marginMeters || 120;
    const units = metersToSvgUnits(m, transform);
    return pt.x >= -units && pt.y >= -units && pt.x <= 1011.56 + units && pt.y <= 862.63 + units;
  }

  function metersToSvgUnits(meters, transform) {
    if (!transform?.scale) return meters;
    return meters * transform.scale;
  }

  function bearingFromMovement(prev, next) {
    if (!prev || !next) return null;
    const a = localMeters(next.latitude, next.longitude, prev.latitude, prev.longitude);
    if (Math.hypot(a.x, a.y) < 0.5) return null;
    return normalizeAngle((Math.atan2(a.x, a.y) * 180) / Math.PI);
  }

  function gpsBearingToMapHeading(gpsBearing, transform) {
    if (gpsBearing == null || !transform) return null;
    return normalizeAngle(gpsBearing + transform.mapNorthOffset);
  }

  function createFromGeoReference(geoRef) {
    const transform = buildTransform(geoRef?.controlPoints);
    return {
      transform,
      geoRef,
      mapCenter: geoRef?.mapCenter || null,
      latLngToSvg: (lat, lng) => latLngToSvg(lat, lng, transform),
      isInsideCampus: (lat, lng, marginMeters) => isInsideCampus(lat, lng, transform, marginMeters),
      metersToSvgUnits: (meters) => metersToSvgUnits(meters, transform),
      gpsBearingToMapHeading: (bearing) => gpsBearingToMapHeading(bearing, transform),
    };
  }

  global.GeoTransform = {
    normalizeAngle,
    interpolateAngle,
    buildTransform,
    buildTransformAffine,
    latLngToSvg,
    createFromGeoReference,
    bearingFromMovement,
  };
})(typeof window !== "undefined" ? window : globalThis);
