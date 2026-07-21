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
    root.setAttribute("data-visible", "false");
    root.setAttribute("visibility", "hidden");
    root.style.display = "none";

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
    // Cone sempre no DOM (sem atributo HTML hidden — CSS do overlay escondia o cone)

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
    if (overlayEl) overlayEl.appendChild(root);

    let visible = false;
    let x = 0;
    let y = 0;
    let displayHeading = 0;
    let coneVisible = true;

    function ensureInOverlay(host) {
      const parent = host || overlayEl;
      if (!parent) return;
      if (root.parentNode !== parent) parent.appendChild(root);
    }

    function show() {
      visible = true;
      coneVisible = true;
      root.setAttribute("data-visible", "true");
      root.setAttribute("visibility", "visible");
      root.style.removeProperty("display");
      root.removeAttribute("hidden");
      cone.style.removeProperty("display");
      cone.removeAttribute("hidden");
      ensureInOverlay();
    }

    function hide() {
      visible = false;
      root.setAttribute("data-visible", "false");
      root.setAttribute("visibility", "hidden");
      root.style.display = "none";
    }

    function setSearching(svgX, svgY, radiusSvg) {
      if (svgX == null || svgY == null) {
        root.removeAttribute("data-searching");
        return;
      }
      root.setAttribute("data-searching", "true");
      x = svgX;
      y = svgY;
      accuracy.setAttribute("cx", String(svgX));
      accuracy.setAttribute("cy", String(svgY));
      accuracy.setAttribute("r", String(Math.max(12, radiusSvg || 24)));
      body.setAttribute("transform", `translate(${svgX} ${svgY}) rotate(${displayHeading})`);
      show();
    }

    function setPosition(svgX, svgY, accuracyMeters, metersToSvgUnits) {
      if (!isFinite(svgX) || !isFinite(svgY)) return;
      root.removeAttribute("data-searching");
      x = svgX;
      y = svgY;
      accuracy.setAttribute("cx", String(svgX));
      accuracy.setAttribute("cy", String(svgY));
      body.setAttribute("transform", `translate(${svgX} ${svgY}) rotate(${displayHeading})`);
      if (isFinite(accuracyMeters) && accuracyMeters > 0 && typeof metersToSvgUnits === "function") {
        const r = Math.max(6, metersToSvgUnits(accuracyMeters));
        accuracy.setAttribute("r", String(r));
      } else {
        accuracy.setAttribute("r", "0");
      }
      show();
    }

    function setHeading(mapHeading, cameraBearing) {
      const cam = cameraBearing || 0;
      const heading =
        mapHeading == null || !isFinite(mapHeading) ? 0 : mapHeading;
      coneVisible = true;
      cone.style.removeProperty("display");
      cone.removeAttribute("hidden");
      displayHeading = GT()?.normalizeAngle(heading - cam) ?? ((heading - cam) % 360 + 360) % 360;
      body.setAttribute("transform", `translate(${x} ${y}) rotate(${displayHeading})`);
      if (visible) {
        root.setAttribute("data-visible", "true");
        root.setAttribute("visibility", "visible");
        root.style.removeProperty("display");
      }
    }

    return {
      root,
      show,
      hide,
      setPosition,
      setSearching,
      setHeading,
      ensureInOverlay,
      getPosition: () => ({ x, y }),
      isVisible: () => visible,
      hasCone: () => coneVisible,
    };
  }

  global.UserLocationPuck = { create: createUserLocationPuck, buildConePath };
})(typeof window !== "undefined" ? window : globalThis);
