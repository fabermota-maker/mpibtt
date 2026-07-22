/**
 * Calibração de escala do mapa (unidades SVG ↔ metros).
 * Referência: largura real do Batistério = 6,80 m.
 */
(function (global) {
  "use strict";

  const DEFAULT_WALKING_SPEED_MPS = 1.2;
  const REAL_BATISTERIO_WIDTH_M = 6.8;

  function getDigitalDistance(pointA, pointB) {
    const dx = pointB.x - pointA.x;
    const dy = pointB.y - pointA.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  function createMapCalibration(referenceName, pointA, pointB, realDistanceMeters, opts = {}) {
    if (realDistanceMeters <= 0) {
      throw new Error("A distância real deve ser maior que zero.");
    }
    const digitalDistance = getDigitalDistance(pointA, pointB);
    if (digitalDistance <= 0) {
      throw new Error("Os pontos de calibração não podem ser iguais.");
    }
    return {
      referenceId: opts.referenceId || "CALIBRATION_BATISTERIO",
      referenceName: referenceName || "Largura do Batistério",
      realDistanceMeters,
      startPoint: { x: pointA.x, y: pointA.y },
      endPoint: { x: pointB.x, y: pointB.y },
      digitalDistance,
      unitsPerMeter: digitalDistance / realDistanceMeters,
      metersPerUnit: realDistanceMeters / digitalDistance,
      source: opts.source || "svg",
      accuracy: opts.accuracy || "estimated", // estimated | confirmed
      criterion: opts.criterion || "external-face", // internal | external-face | wall-axis
    };
  }

  function unitsToMeters(units, calibration) {
    return units * calibration.metersPerUnit;
  }

  function metersToUnits(meters, calibration) {
    return meters * calibration.unitsPerMeter;
  }

  function calculatePathLengthUnits(path) {
    if (!path || path.length < 2) return 0;
    let total = 0;
    for (let i = 1; i < path.length; i++) {
      total += getDigitalDistance(path[i - 1], path[i]);
    }
    return total;
  }

  function calculatePathLengthMeters(path, calibration) {
    return unitsToMeters(calculatePathLengthUnits(path), calibration);
  }

  function calculateStraightEdgeDistanceMeters(from, to, calibration) {
    return unitsToMeters(getDigitalDistance(from, to), calibration);
  }

  function calculateRoomDimensionsMeters(widthUnits, heightUnits, calibration) {
    return {
      widthMeters: unitsToMeters(widthUnits, calibration),
      heightMeters: unitsToMeters(heightUnits, calibration),
    };
  }

  function calculateRectangleAreaMeters(widthUnits, heightUnits, calibration) {
    const d = calculateRoomDimensionsMeters(widthUnits, heightUnits, calibration);
    return d.widthMeters * d.heightMeters;
  }

  function calculatePolygonAreaUnits(polygon) {
    if (!polygon || polygon.length < 3) return 0;
    let sum = 0;
    for (let i = 0; i < polygon.length; i++) {
      const a = polygon[i];
      const b = polygon[(i + 1) % polygon.length];
      sum += a.x * b.y - b.x * a.y;
    }
    return Math.abs(sum) / 2;
  }

  function calculatePolygonAreaSquareMeters(polygon, calibration) {
    const areaUnits = calculatePolygonAreaUnits(polygon);
    return areaUnits * calibration.metersPerUnit * calibration.metersPerUnit;
  }

  function calculateRouteDistanceMeters(edges) {
    return (edges || []).reduce((total, edge) => total + (edge.distanceMeters || 0), 0);
  }

  function calculateWalkingTimeSeconds(distanceMeters, speedMetersPerSecond = DEFAULT_WALKING_SPEED_MPS) {
    if (speedMetersPerSecond <= 0) {
      throw new Error("A velocidade deve ser maior que zero.");
    }
    return distanceMeters / speedMetersPerSecond;
  }

  function formatWalkingTime(seconds) {
    if (!isFinite(seconds) || seconds < 0) return "—";
    if (seconds < 60) return `${Math.max(1, Math.round(seconds))} s`;
    const mins = Math.round(seconds / 60);
    if (mins < 60) return `${mins} min`;
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return m ? `${h} h ${m} min` : `${h} h`;
  }

  function calculateAverageUnitsPerMeter(references) {
    if (!references || !references.length) {
      throw new Error("Nenhuma referência de calibração foi fornecida.");
    }
    const total = references.reduce((sum, r) => sum + r.unitsPerMeter, 0);
    return total / references.length;
  }

  function validateCalibration(calibration, viewBox) {
    const issues = [];
    if (!calibration) {
      issues.push({ code: "missing", message: "Escala ausente." });
      return { ok: false, issues };
    }
    if (calibration.realDistanceMeters <= 0) {
      issues.push({ code: "real-distance", message: "Distância real deve ser maior que zero." });
    }
    if (calibration.digitalDistance <= 0) {
      issues.push({ code: "digital-distance", message: "Pontos de calibração iguais ou inválidos." });
    }
    if (!isFinite(calibration.metersPerUnit) || calibration.metersPerUnit <= 0) {
      issues.push({ code: "scale", message: "Escala incompatível." });
    }
    // escala absurda: < 0.001 m/u ou > 5 m/u
    if (calibration.metersPerUnit < 0.001 || calibration.metersPerUnit > 5) {
      issues.push({
        code: "scale-range",
        message: "Escala fora da faixa esperada (verifique os pontos do Batistério).",
      });
    }
    if (viewBox) {
      const inBox = (p) =>
        p.x >= viewBox.x - 1 && p.x <= viewBox.x + viewBox.width + 1 &&
        p.y >= viewBox.y - 1 && p.y <= viewBox.y + viewBox.height + 1;
      if (!inBox(calibration.startPoint) || !inBox(calibration.endPoint)) {
        issues.push({ code: "viewbox", message: "Referência fora do viewBox." });
      }
    }
    return { ok: issues.length === 0, issues };
  }

  /**
   * Tenta detectar automaticamente a largura do Batistério no SVG renderizado.
   * Usa o rótulo "Batistério" e paredes verticais próximas (getBBox).
   */
  function detectBatisterioWidth(svg) {
    if (!svg) return null;
    const texts = [...svg.querySelectorAll("text")];
    const label = texts.find((t) => /batist[eé]rio/i.test((t.textContent || "").replace(/\s+/g, "")));
    if (!label) return null;

    let tb;
    try { tb = label.getBBox(); } catch { return null; }
    const cx = tb.x + tb.width / 2;
    const cy = tb.y + tb.height / 2;

    const verticalBars = [];
    const shapes = [...svg.querySelectorAll("path, rect, line, polygon, polyline")];
    for (const el of shapes) {
      let b;
      try { b = el.getBBox(); } catch { continue; }
      if (!isFinite(b.width) || !isFinite(b.height)) continue;
      // barra vertical espessa (parede lateral)
      const isVerticalBar = b.height > 8 && b.width > 0.8 && b.width < 12 && b.height / b.width > 1.8;
      if (!isVerticalBar) continue;
      // perto do rótulo
      const barCx = b.x + b.width / 2;
      const barCy = b.y + b.height / 2;
      if (Math.abs(barCy - cy) > 40) continue;
      if (Math.abs(barCx - cx) > 80) continue;
      verticalBars.push({
        el,
        xLeft: b.x,
        xRight: b.x + b.width,
        cx: barCx,
        cy: barCy,
        w: b.width,
        h: b.height,
      });
    }

    const lefts = verticalBars.filter((b) => b.cx < cx).sort((a, b) => b.cx - a.cx);
    const rights = verticalBars.filter((b) => b.cx > cx).sort((a, b) => a.cx - b.cx);

    if (lefts.length && rights.length) {
      // pares mais externos das paredes internas ao redor do texto
      // preferir barras com altura similar e imediatamente ao redor do texto
      let best = null;
      for (const L of lefts.slice(0, 6)) {
        for (const R of rights.slice(0, 6)) {
          const width = R.xRight - L.xLeft; // face externa
          if (width < 12 || width > 90) continue;
          const hDiff = Math.abs(L.h - R.h);
          const score = -hDiff + Math.min(L.h, R.h) - Math.abs(width - tb.width * 1.6);
          if (!best || score > best.score) {
            best = {
              score,
              startPoint: { x: L.xLeft, y: cy },
              endPoint: { x: R.xRight, y: cy },
              digitalDistance: width,
              left: L,
              right: R,
            };
          }
        }
      }
      if (best) {
        return createMapCalibration(
          "Largura do Batistério",
          best.startPoint,
          best.endPoint,
          REAL_BATISTERIO_WIDTH_M,
          { source: "svg", accuracy: "estimated", criterion: "external-face" }
        );
      }
    }

    // fallback: bbox de um grupo/path que contenha o texto e tenha proporção de sala
    let bestRoom = null;
    for (const el of shapes) {
      let b;
      try { b = el.getBBox(); } catch { continue; }
      if (b.width < 18 || b.width > 90 || b.height < 10 || b.height > 70) continue;
      if (cx < b.x || cx > b.x + b.width) continue;
      if (cy < b.y - 5 || cy > b.y + b.height + 5) continue;
      const d = Math.hypot(b.x + b.width / 2 - cx, b.y + b.height / 2 - cy);
      if (!bestRoom || d < bestRoom.d) {
        bestRoom = { d, b };
      }
    }
    if (bestRoom) {
      const b = bestRoom.b;
      return createMapCalibration(
        "Largura do Batistério",
        { x: b.x, y: cy },
        { x: b.x + b.width, y: cy },
        REAL_BATISTERIO_WIDTH_M,
        { source: "svg", accuracy: "estimated", criterion: "external-face" }
      );
    }

    // último recurso: largura visual do texto * fator (só para não ficar sem escala)
    const approx = Math.max(tb.width * 1.55, 28);
    return createMapCalibration(
      "Largura do Batistério (aprox. pelo rótulo)",
      { x: cx - approx / 2, y: cy },
      { x: cx + approx / 2, y: cy },
      REAL_BATISTERIO_WIDTH_M,
      { source: "manual", accuracy: "estimated", criterion: "external-face" }
    );
  }

  global.MapCalibration = {
    REAL_BATISTERIO_WIDTH_M,
    DEFAULT_WALKING_SPEED_MPS,
    getDigitalDistance,
    createMapCalibration,
    unitsToMeters,
    metersToUnits,
    calculatePathLengthUnits,
    calculatePathLengthMeters,
    calculateStraightEdgeDistanceMeters,
    calculateRoomDimensionsMeters,
    calculateRectangleAreaMeters,
    calculatePolygonAreaUnits,
    calculatePolygonAreaSquareMeters,
    calculateRouteDistanceMeters,
    calculateWalkingTimeSeconds,
    formatWalkingTime,
    calculateAverageUnitsPerMeter,
    validateCalibration,
    detectBatisterioWidth,
  };
})(typeof window !== "undefined" ? window : globalThis);
