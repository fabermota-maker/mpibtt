/**
 * Pan / zoom do mapa (viewport SVG).
 */
(function (global) {
  "use strict";

  function create(ctx) {
    const { state, G, el } = ctx;

    function apply() {
      const w = G.vbW * state.scale;
      const h = G.vbH * state.scale;
      const svg = el.svgHost.querySelector("svg");
      if (svg) {
        svg.setAttribute("width", w);
        svg.setAttribute("height", h);
      }
      el.overlay.setAttribute("width", w);
      el.overlay.setAttribute("height", h);
      el.canvas.style.width = `${w}px`;
      el.canvas.style.height = `${h}px`;
      const followHeading = state.userNav?.isFollowingHeading && isFinite(state.userNav.cameraBearing);
      if (followHeading) {
        const ox = w / 2;
        const oy = h / 2;
        el.canvas.style.transformOrigin = `${ox}px ${oy}px`;
        el.canvas.style.transform =
          `translate(${state.panX}px, ${state.panY}px) rotate(${state.userNav.cameraBearing}deg)`;
      } else {
        el.canvas.style.transformOrigin = "";
        el.canvas.style.transform = `translate(${state.panX}px, ${state.panY}px)`;
      }
      ctx.refreshRouteMarkerScales?.();
      state.userLocation?.refreshPuckScale?.();
    }

    function clamp() {
      const r = el.viewport.getBoundingClientRect();
      const w = G.vbW * state.scale;
      const h = G.vbH * state.scale;
      const m = 120;
      state.panX = w <= r.width ? (r.width - w) / 2 : Math.min(m, Math.max(r.width - w - m, state.panX));
      state.panY = h <= r.height ? (r.height - h) / 2 : Math.min(m, Math.max(r.height - h - m, state.panY));
    }

    function fit() {
      const r = el.viewport.getBoundingClientRect();
      if (!r.width || !r.height || !G.vbW || !G.vbH) return;
      const mobile = innerWidth <= 860;
      const mp = ctx.mobileMapPadding?.() || { padLeft: 36, padRight: 36, padTop: 36, padBottom: 36 };
      const padLeft = mobile ? mp.padLeft : 36;
      const padRight = mobile ? mp.padRight : 36;
      const padTop = mobile ? mp.padTop : 36;
      const padBottom = mobile ? mp.padBottom : 36;
      const availW = Math.max(40, r.width - padLeft - padRight);
      const availH = Math.max(40, r.height - padTop - padBottom);
      const sc = Math.min(availW / G.vbW, availH / G.vbH);
      state.minScale = Math.max(0.08, sc * 0.55);
      state.maxScale = Math.max(state.maxScale || 8, sc * 12, 10);
      state.scale = sc;
      state.panX = padLeft + (availW - G.vbW * sc) / 2;
      state.panY = padTop + (availH - G.vbH * sc) / 2;
      apply();
    }

    function fitSoon(fn) {
      const run = typeof fn === "function" ? fn : fit;
      requestAnimationFrame(() => requestAnimationFrame(run));
    }

    function zoomAt(factor, cx, cy) {
      const r = el.viewport.getBoundingClientRect();
      cx = cx ?? r.width / 2;
      cy = cy ?? r.height / 2;
      const mx = (cx - state.panX) / state.scale;
      const my = (cy - state.panY) / state.scale;
      state.scale = Math.min(state.maxScale, Math.max(state.minScale, state.scale * factor));
      state.panX = cx - mx * state.scale;
      state.panY = cy - my * state.scale;
      clamp();
      apply();
    }

    function viewportPoint(e) {
      const r = el.viewport.getBoundingClientRect();
      const x = (e.clientX - r.left - state.panX) / state.scale + (G.vbX || 0);
      const y = (e.clientY - r.top - state.panY) / state.scale + (G.vbY || 0);
      return { x, y };
    }

    return { apply, clamp, fit, fitSoon, zoomAt, viewportPoint };
  }

  global.PIBMapMapController = { create };
})(typeof window !== "undefined" ? window : globalThis);
