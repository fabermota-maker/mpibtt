/**
 * Bússola em tempo real — rotação somente do ícone GPS (DeviceOrientation).
 */
(function (global) {
  "use strict";

  const GT = () => (typeof GeoTransform !== "undefined" ? GeoTransform : null);
  const SMOOTHING = 0.18;

  let tracking = false;
  let permissionGranted = false;
  let eventsBound = false;
  let targetHeading = null;
  let displayHeading = null;
  let rafId = null;
  let rotateEl = null;

  function normalizeAngle(deg) {
    if (deg == null || !isFinite(deg)) return null;
    if (GT()?.normalizeAngle) return GT().normalizeAngle(deg);
    return ((deg % 360) + 360) % 360;
  }

  function interpolateAngle(from, to, t) {
    if (GT()?.interpolateAngle) return GT().interpolateAngle(from, to, t);
    let delta = ((to - from + 540) % 360) - 180;
    return normalizeAngle(from + delta * t);
  }

  function resolveRotateEl() {
    if (rotateEl && rotateEl.isConnected) return rotateEl;
    rotateEl =
      document.querySelector("#userLocationPuck .ulp-arrow-rotate") ||
      document.querySelector("#userLocationPuck .ulp-arrow");
    return rotateEl;
  }

  function readCompassHeading(ev) {
    if (ev.webkitCompassHeading != null && isFinite(ev.webkitCompassHeading)) {
      return normalizeAngle(ev.webkitCompassHeading);
    }
    if (ev.alpha != null && isFinite(ev.alpha)) {
      return normalizeAngle(360 - ev.alpha);
    }
    return null;
  }

  function resolveDisplayHeading(rawHeading) {
    const puckEl = document.getElementById("userLocationPuck");
    if (!puckEl) return rawHeading;

    let h = rawHeading;
    const northOffset = parseFloat(puckEl.getAttribute("data-map-north-offset") || "0");
    if (isFinite(northOffset) && northOffset !== 0) h = normalizeAngle(h + northOffset);

    const cam = parseFloat(puckEl.getAttribute("data-camera-bearing") || "0");
    if (isFinite(cam) && cam !== 0) h = normalizeAngle(h - cam);

    return h;
  }

  function onOrientation(ev) {
    if (!tracking || !permissionGranted) return;
    const h = readCompassHeading(ev);
    if (h == null) return;
    targetHeading = h;
  }

  function bindOrientationEvents() {
    if (eventsBound) return;
    eventsBound = true;
    addEventListener("deviceorientationabsolute", onOrientation, true);
    addEventListener("deviceorientation", onOrientation, true);
  }

  function unbindOrientationEvents() {
    if (!eventsBound) return;
    eventsBound = false;
    removeEventListener("deviceorientationabsolute", onOrientation, true);
    removeEventListener("deviceorientation", onOrientation, true);
  }

  function compassFrame() {
    if (!tracking) return;

    if (targetHeading != null) {
      if (displayHeading == null) {
        displayHeading = targetHeading;
      } else {
        displayHeading = interpolateAngle(displayHeading, targetHeading, SMOOTHING);
      }
      updateGpsIconRotation(resolveDisplayHeading(displayHeading));
    }

    rafId = requestAnimationFrame(compassFrame);
  }

  async function requestCompassPermission() {
    if (typeof DeviceOrientationEvent === "undefined") {
      permissionGranted = false;
      return false;
    }

    try {
      if (typeof DeviceOrientationEvent.requestPermission === "function") {
        const result = await DeviceOrientationEvent.requestPermission();
        permissionGranted = result === "granted";
        return permissionGranted;
      }
      permissionGranted = true;
      return true;
    } catch (err) {
      console.warn("requestCompassPermission:", err);
      permissionGranted = false;
      return false;
    }
  }

  function startCompassTracking() {
    if (tracking) return permissionGranted;

    if (!permissionGranted) {
      updateGpsIconRotation(0);
      return false;
    }

    tracking = true;
    targetHeading = displayHeading;
    bindOrientationEvents();

    if (rafId) cancelAnimationFrame(rafId);
    rafId = requestAnimationFrame(compassFrame);
    return true;
  }

  function stopCompassTracking() {
    tracking = false;
    targetHeading = null;
    displayHeading = null;
    unbindOrientationEvents();
    if (rafId) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
  }

  function updateGpsIconRotation(heading) {
    const el = resolveRotateEl();
    if (!el) return;

    if (heading == null || !isFinite(heading) || !permissionGranted) {
      el.setAttribute("transform", "rotate(0)");
      return;
    }

    const h = normalizeAngle(heading);
    el.setAttribute("transform", `rotate(${h.toFixed(2)})`);
  }

  global.GpsCompass = {
    requestCompassPermission,
    startCompassTracking,
    stopCompassTracking,
    updateGpsIconRotation,
  };
})(typeof window !== "undefined" ? window : globalThis);
