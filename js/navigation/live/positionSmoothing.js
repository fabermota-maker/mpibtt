/**
 * Suavização leve de posição GPS (média ponderada por recência e accuracy).
 */
(function (global) {
  "use strict";

  const CFG = () => global.LiveNavigationConfig?.LIVE_NAVIGATION_CONFIG || {};

  function rejectImpossibleJump(prev, next, metersPerUnit = 0.35) {
    if (!prev || !next) return false;
    const prevTs = prev.timestamp ?? 0;
    const nextTs = next.timestamp ?? 0;
    const dt = Math.max(0.2, (nextTs - prevTs) / 1000);
    const px = prev.point?.x ?? prev.x;
    const py = prev.point?.y ?? prev.y;
    const distM = Math.hypot(next.x - px, next.y - py) * metersPerUnit;
    const maxSpeed = 2.5;
    return distM / dt > maxSpeed;
  }

  function smoothPosition(history, metersPerUnit = 0.35) {
    const cfg = CFG();
    const maxHist = cfg.maximumPositionHistory ?? 10;
    const windowSize = cfg.smoothingWindowSize ?? 4;
    const list = (history || []).slice(-maxHist);
    if (!list.length) return null;
    if (list.length === 1) return { ...list[0].point, timestamp: list[0].timestamp };

    const slice = list.slice(-windowSize);
    let wx = 0;
    let wy = 0;
    let wSum = 0;

    for (let i = 0; i < slice.length; i++) {
      const item = slice[i];
      const recency = i + 1;
      const accW = 1 / Math.max(1, item.accuracy || 20);
      const w = recency * accW;
      wx += item.point.x * w;
      wy += item.point.y * w;
      wSum += w;
    }

    const last = slice[slice.length - 1];
    const prev = slice.length > 1 ? slice[slice.length - 2] : null;
    const smoothed = {
      x: wx / wSum,
      y: wy / wSum,
      timestamp: last.timestamp,
    };

    if (prev && rejectImpossibleJump(prev, smoothed, metersPerUnit)) {
      return { ...last.point, timestamp: last.timestamp, suspicious: true };
    }

    return smoothed;
  }

  global.LivePositionSmoothing = {
    smoothPosition,
    rejectImpossibleJump,
  };
})(typeof window !== "undefined" ? window : globalThis);
