/**
 * Calibração de escala do mapa (metros ↔ unidades SVG).
 */
(function (global) {
  "use strict";

  function create(ctx) {
    const {
      state,
      CONFIG,
      G,
      el,
      Cal,
      updateScaleHint,
      fmtMeters,
      fmtRouteTime,
      saveCalibrationPayload,
    } = ctx;

    function applyCalibration(calibration, { persist = false } = {}) {
      if (!calibration) return;
      const vb = { x: 0, y: 0, width: G.vbW, height: G.vbH };
      const cal = Cal?.();
      if (cal) {
        const check = cal.validateCalibration(calibration, vb);
        if (!check.ok) console.warn("Calibração com avisos:", check.issues);
      }
      state.calibration = calibration;
      CONFIG.metersPerUnit = calibration.metersPerUnit;
      updateScaleHint?.();
      if (state.route && el.summaryDist) {
        el.summaryDist.textContent = fmtMeters(state.route.length);
        if (el.summaryTime) el.summaryTime.textContent = fmtRouteTime(state.route.length);
      }
      if (persist) saveCalibrationPayload?.();
    }

    function buildCalibrationPayload() {
      return {
        map: {
          id: "pib-curitiba",
          version: "1.0.0",
          viewBox: { x: 0, y: 0, width: G.vbW, height: G.vbH },
        },
        calibration: state.calibration,
        references: state.calibration ? [{
          id: state.calibration.referenceId,
          name: state.calibration.referenceName,
          pointA: state.calibration.startPoint,
          pointB: state.calibration.endPoint,
          realDistanceMeters: state.calibration.realDistanceMeters,
          digitalDistance: state.calibration.digitalDistance,
          unitsPerMeter: state.calibration.unitsPerMeter,
        }] : [],
        walkingSpeedMetersPerSecond: state.walkingSpeedMps,
      };
    }

    async function loadCalibration() {
      try {
        const raw = localStorage.getItem("pib-map-calibration");
        if (raw) {
          const data = JSON.parse(raw);
          if (data?.calibration?.metersPerUnit) {
            if (data.walkingSpeedMetersPerSecond) state.walkingSpeedMps = data.walkingSpeedMetersPerSecond;
            applyCalibration(data.calibration);
            return true;
          }
        }
      } catch { /* ignore */ }

      try {
        const res = await fetch(CONFIG.calibrationUrl, { cache: "no-store" });
        if (res.ok) {
          const data = await res.json();
          if (data?.walkingSpeedMetersPerSecond) state.walkingSpeedMps = data.walkingSpeedMetersPerSecond;
          if (data?.calibration?.metersPerUnit) {
            applyCalibration(data.calibration);
            return true;
          }
        }
      } catch { /* ignore */ }
      return false;
    }

    return { applyCalibration, buildCalibrationPayload, loadCalibration };
  }

  global.PIBMapCalibrationController = { create };
})(typeof window !== "undefined" ? window : globalThis);
