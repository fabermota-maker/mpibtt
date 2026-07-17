/**
 * Marcador visual de posição do usuário (ponto azul + cone + precisão).
 * Estilo Google Maps: círculo azul, borda branca, cone de heading.
 */
(function (global) {
  "use strict";

  const GT = () => (typeof GeoTransform !== "undefined" ? GeoTransform : null);

  function buildConePath(openingDeg, radius) {
    const half = (openingDeg * Math.PI) / 360;
    const r = radius;
    const x1 = Math.sin(-half) * -r;
    const y1 = Math.cos(-half) * -r;
    const x2 = Math.sin(half) * -r;
    const y2 = Math.cos(half) * -r;
    return `M0,0 L${x1.toFixed(2)},${y1.toFixed(2)} A${r},${r} 0 0 1 ${x2.toFixed(2)},${y2.toFixed(2)} Z`;
  }

  function createUserLocationPuck(overlayEl, opts = {}) {
    const openingDeg = opts.coneOpeningDeg ?? 56;
    const coneRadius = opts.coneRadius ?? 48;

    const root = document.createElementNS("http://www.w3.org/2000/svg", "g");
    root.setAttribute("id", "userLocationPuck");
    root.setAttribute("class", "user-location-puck");
    root.setAttribute("hidden", "");
    root.setAttribute("visibility", "hidden");

    const accuracy = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    accuracy.setAttribute("class", "ulp-accuracy");
    accuracy.setAttribute("cx", "0");
    accuracy.setAttribute("cy", "0");
    accuracy.setAttribute("r", "0");

    const body = document.createElementNS("http://www.w3.org/2000/svg", "g");
    body.setAttribute("class", "ulp-body");

    const cone = document.createElementNS("http://www.w3.org/2000/svg", "path");
    cone.setAttribute("class", "ulp-cone");
    cone.setAttribute("d", buildConePath(openingDeg, coneRadius));
    cone.setAttribute("hidden", "");

    const ring = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    ring.setAttribute("class", "ulp-ring");
    ring.setAttribute("r", "10");

    const dot = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    dot.setAttribute("class", "ulp-dot");
    dot.setAttribute("r", "7");

    body.appendChild(cone);
    body.appendChild(ring);
    body.appendChild(dot);
    root.appendChild(accuracy);
    root.appendChild(body);
    overlayEl.appendChild(root);

    let visible = false;
    let x = 0;
    let y = 0;
    let displayHeading = 0;
    let coneVisible = false;

    function show() {
      visible = true;
      root.removeAttribute("hidden");
      root.setAttribute("visibility", "visible");
      root.style.display = "";
    }

    function hide() {
      visible = false;
      root.setAttribute("hidden", "");
      root.setAttribute("visibility", "hidden");
      root.style.display = "none";
    }

    function setPosition(svgX, svgY, accuracyMeters, metersToSvgUnits) {
      if (!isFinite(svgX) || !isFinite(svgY)) return;
      x = svgX;
      y = svgY;
      accuracy.setAttribute("cx", String(svgX));
      accuracy.setAttribute("cy", String(svgY));
      body.setAttribute("transform", `translate(${svgX} ${svgY}) rotate(${displayHeading})`);
      if (isFinite(accuracyMeters) && accuracyMeters > 0 && typeof metersToSvgUnits === "function") {
        const r = Math.max(6, metersToSvgUnits(accuracyMeters));
        accuracy.setAttribute("r", String(r));
        accuracy.removeAttribute("hidden");
      } else {
        accuracy.setAttribute("r", "0");
      }
      if (!visible) show();
    }

    function setHeading(mapHeading, cameraBearing) {
      if (mapHeading == null || !isFinite(mapHeading)) {
        coneVisible = false;
        cone.setAttribute("hidden", "");
        return;
      }
      coneVisible = true;
      cone.removeAttribute("hidden");
      const cam = cameraBearing || 0;
      displayHeading = GT()?.normalizeAngle(mapHeading - cam) ?? ((mapHeading - cam) % 360 + 360) % 360;
      body.setAttribute("transform", `translate(${x} ${y}) rotate(${displayHeading})`);
    }

    return {
      root,
      show,
      hide,
      setPosition,
      setHeading,
      getPosition: () => ({ x, y }),
      isVisible: () => visible,
      hasCone: () => coneVisible,
    };
  }

  global.UserLocationPuck = { create: createUserLocationPuck, buildConePath };
})(typeof window !== "undefined" ? window : globalThis);
