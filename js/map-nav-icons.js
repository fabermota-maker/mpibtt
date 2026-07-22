/**
 * Ícones oficiais PIB — Navigation Arrow + Map Pin (SVG export Illustrator).
 * Fonte: Map location PIBCuritiba/*.svg
 */
(function (global) {
  "use strict";

  const SVG_NS = "http://www.w3.org/2000/svg";

  const COLORS = {
    dark: "#000c2d",
    light: "#243354",
  };

  const ARROW = {
    width: 146.19,
    height: 177.68,
    pivotX: 73.1,
    pivotY: 94.015,
    paths: [
      {
        fill: COLORS.dark,
        d: "M1.1,155.91L57.03,10.44c5.33-13.86,25.46-13.95,30.92-.13l57.09,144.6c5.39,13.65-9.24,26.63-22.73,20.19l-43.34-20.71c-4.83-2.31-10.52-2.19-15.25.33l-39.2,20.92c-13.44,7.17-28.81-5.76-23.44-19.72Z",
      },
      {
        fill: COLORS.light,
        d: "M134.01,134.75L85.68,8.96c-2.23-5.81-7.36-8.78-12.58-8.96v132.92c1.71.15,3.4.6,4.98,1.38l36.69,18.02c11.42,5.61,23.8-5.69,19.24-17.56Z",
      },
      {
        fill: COLORS.dark,
        d: "M73.1,75.57v36.89c10.19,0,18.44-8.26,18.44-18.44s-8.26-18.44-18.44-18.44Z",
      },
      {
        fill: COLORS.light,
        d: "M73.1,112.45v-36.89c-10.19,0-18.44,8.26-18.44,18.44s8.26,18.44,18.44,18.44Z",
      },
    ],
  };

  const PIN = {
    width: 120.86,
    height: 179.52,
    tipX: 60.43,
    tipY: 163,
    paths: [
      {
        fill: COLORS.dark,
        d: "M60.43,42.32v36.89c10.19,0,18.44-8.26,18.44-18.44s-8.26-18.44-18.44-18.44Z",
      },
      {
        fill: COLORS.light,
        d: "M60.43,79.21v-36.89c-10.19,0-18.44,8.26-18.44,18.44s8.26,18.44,18.44,18.44Z",
      },
      {
        fill: COLORS.dark,
        d: "M70.57,162.65c-4.79,7.2-15.34,7.31-20.27.21l-1.92-2.76C29.05,132.27,9.42,102.52,1.52,69.03-7.66,30.13,26.18-1.11,61.82.03c38.29,1.23,69.24,36.53,55.87,75.66-10.91,31.94-28.18,58.49-47.12,86.97ZM53.84,34.33c-16.27,4.45-24.71,20.07-19.04,36.36,4.21,12.09,19.62,21.27,35.91,16.08,11.65-3.71,20.19-20.39,16.06-33.49-4.46-14.13-17.37-23.2-32.92-18.94Z",
      },
      {
        fill: COLORS.light,
        d: "M114.84,75.69C128.37,36.09,99.36.4,60.43,0v33.3c12.54-.48,22.53,7.89,26.34,19.97,4.13,13.1-4.41,29.78-16.06,33.49-3.5,1.12-6.96,1.56-10.28,1.47v70.45c0,5.65,7.35,7.84,10.44,3.11,13.96-21.42,35.11-60.18,43.97-86.11Z",
      },
      {
        fill: COLORS.dark,
        d: "M58.86,179.52c-8.57,0-24.76-.89-24.76-4.26s16.2-4.26,24.76-4.26,24.76.89,24.76,4.26-16.2,4.26-24.76,4.26ZM58.86,172.31c-14.8,0-22.88,1.95-22.88,2.95s8.08,2.95,22.88,2.95,22.88-1.95,22.88-2.95-8.08-2.95-22.88-2.95Z",
      },
    ],
  };

  /** Fator global de tamanho no mapa (1 = referência original). */
  const MARKER_SIZE_FACTOR = 0.25;

  function markerTargetSize(vbW, vbH) {
    const base = Math.min(vbW || 1011, vbH || 862);
    return Math.max(11, Math.min(16, base * 0.013));
  }

  /** Escala proporcional ao viewBox — ícone ~3–4 unidades no mapa. */
  function markerScaleForViewBox(vbW, vbH) {
    return (markerTargetSize(vbW, vbH) / ARROW.height) * MARKER_SIZE_FACTOR;
  }

  function puckScaleForViewBox(vbW, vbH) {
    return markerScaleForViewBox(vbW, vbH) * 1.05;
  }

  function bearingDeg(from, to) {
    if (!from || !to) return 0;
    return (Math.atan2(to.y - from.y, to.x - from.x) * 180) / Math.PI + 90;
  }

  function appendPathGroup(parent, paths, className) {
    paths.forEach((spec, i) => {
      const path = document.createElementNS(SVG_NS, "path");
      path.setAttribute("d", spec.d);
      path.setAttribute("fill", spec.fill);
      if (className) path.setAttribute("class", `${className}${i > 0 ? ` ${className}--${i}` : ""}`);
      parent.appendChild(path);
    });
  }

  function appendInnerArrow(parent, opts = {}) {
    const inner = document.createElementNS(SVG_NS, "g");
    inner.setAttribute("class", "nav-marker__gfx nav-marker__gfx--arrow");
    inner.setAttribute("transform", `translate(${-ARROW.pivotX} ${-ARROW.pivotY})`);
    appendPathGroup(inner, ARROW.paths, opts.pathClass || "nav-arrow__part");
    parent.appendChild(inner);
    return inner;
  }

  function appendInnerPin(parent) {
    const inner = document.createElementNS(SVG_NS, "g");
    inner.setAttribute("class", "nav-marker__gfx nav-marker__gfx--pin");
    inner.setAttribute("transform", `translate(${-PIN.tipX} ${-PIN.tipY})`);
    appendPathGroup(inner, PIN.paths, "nav-pin__part");
    parent.appendChild(inner);
    return inner;
  }

  function createNavigationArrow(opts = {}) {
    const g = document.createElementNS(SVG_NS, "g");
    g.setAttribute("class", opts.className || "nav-icon nav-icon--arrow");
    appendInnerArrow(g, opts);
    return g;
  }

  function createMapPin(opts = {}) {
    const g = document.createElementNS(SVG_NS, "g");
    g.setAttribute("class", opts.className || "nav-icon nav-icon--pin");
    appendInnerPin(g);
    return g;
  }

  function applyRouteStartTransform(node, x, y, bearing, scale) {
    if (!node) return;
    const s = scale ?? markerScaleForViewBox(1011, 862);
    const rot = isFinite(bearing) ? bearing : 0;
    node.setAttribute("transform", `translate(${x} ${y}) rotate(${rot.toFixed(2)}) scale(${s.toFixed(5)})`);
  }

  function applyRouteEndTransform(node, x, y, scale) {
    if (!node) return;
    const s = scale ?? markerScaleForViewBox(1011, 862);
    node.setAttribute("transform", `translate(${x} ${y}) scale(${s.toFixed(5)})`);
  }

  global.MapNavIcons = {
    COLORS,
    ARROW,
    PIN,
    MARKER_SIZE_FACTOR,
    markerScaleForViewBox,
    puckScaleForViewBox,
    bearingDeg,
    createNavigationArrow,
    createMapPin,
    appendInnerArrow,
    appendInnerPin,
    applyRouteStartTransform,
    applyRouteEndTransform,
  };
})(typeof window !== "undefined" ? window : globalThis);
