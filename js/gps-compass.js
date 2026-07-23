/**
 * Rotação visual do puck GPS — consome heading suavizado do HeadingService.
 * Não registra DeviceOrientation (evita duplicidade e conflitos de permissão iOS).
 */
(function (global) {
  "use strict";

  const GT = () => (typeof GeoTransform !== "undefined" ? GeoTransform : null);

  let tracking = false;
  let rotateEl = null;

  function normalizeAngle(deg) {
    if (deg == null || !isFinite(deg)) return null;
    if (GT()?.normalizeAngle) return GT().normalizeAngle(deg);
    return ((deg % 360) + 360) % 360;
  }

  function resolveRotateEl() {
    if (rotateEl && rotateEl.isConnected) return rotateEl;
    rotateEl =
      document.querySelector("#userLocationPuck .ulp-arrow-rotate") ||
      document.querySelector("#userLocationPuck .ulp-arrow");
    return rotateEl;
  }

  async function requestCompassPermission() {
    if (typeof DeviceOrientationEvent === "undefined") return false;
    try {
      if (typeof DeviceOrientationEvent.requestPermission === "function") {
        const result = await DeviceOrientationEvent.requestPermission();
        return result === "granted";
      }
      return true;
    } catch (err) {
      console.warn("requestCompassPermission:", err);
      return false;
    }
  }

  function startCompassTracking() {
    tracking = true;
    return true;
  }

  function stopCompassTracking() {
    tracking = false;
    updateGpsIconRotation(0);
  }

  function updateGpsIconRotation(heading) {
    const el = resolveRotateEl();
    if (!el) return;

    if (heading == null || !isFinite(heading) || !tracking) {
      el.setAttribute("transform", "rotate(0)");
      return;
    }

    const h = normalizeAngle(heading);
    el.setAttribute("transform", `rotate(${h.toFixed(2)})`);
  }

  /**
   * @param {number} deviceHeading — graus magnéticos/geográficos do aparelho (0 = norte)
   * @param {object|null} geoTransform — calibração SVG↔GPS
   * @param {number} cameraBearing — rotação do mapa em follow-heading
   */
  function updateFromDeviceHeading(deviceHeading, geoTransform, cameraBearing = 0) {
    if (!tracking || deviceHeading == null || !isFinite(deviceHeading)) return;

    let mapHeading = deviceHeading;
    if (geoTransform?.gpsBearingToMapHeading) {
      mapHeading = geoTransform.gpsBearingToMapHeading(deviceHeading);
    }
    mapHeading = normalizeAngle(mapHeading);

    const cam = isFinite(cameraBearing) ? cameraBearing : 0;
    const puckHeading = normalizeAngle(mapHeading - cam);
    updateGpsIconRotation(puckHeading);
  }

  global.GpsCompass = {
    requestCompassPermission,
    startCompassTracking,
    stopCompassTracking,
    updateGpsIconRotation,
    updateFromDeviceHeading,
  };
})(typeof window !== "undefined" ? window : globalThis);
