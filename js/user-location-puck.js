/**
 * Marcador visual de posição do usuário — seta de navegação + círculo de precisão.
 */
(function (global) {
  "use strict";

  const GT = () => (typeof GeoTransform !== "undefined" ? GeoTransform : null);
  const Icons = () => global.MapNavIcons;

  function createUserLocationPuck(overlayEl, opts = {}) {
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

    const arrowHost = document.createElementNS("http://www.w3.org/2000/svg", "g");
    arrowHost.setAttribute("class", "ulp-arrow");
    const puckScale = opts.markerScale ?? (Icons()?.puckScaleForViewBox?.(1011, 862) ?? 0.037);
    arrowHost.setAttribute("transform", `scale(${puckScale})`);
    if (Icons()?.appendInnerArrow) {
      Icons().appendInnerArrow(arrowHost, {
        className: "ulp-arrow-icon",
        pathClass: "ulp-arrow__shape",
      });
    } else {
      const inner = document.createElementNS("http://www.w3.org/2000/svg", "g");
      inner.setAttribute("transform", "translate(-12 -12)");
      const fallback = document.createElementNS("http://www.w3.org/2000/svg", "path");
      fallback.setAttribute("class", "ulp-arrow__shape");
      fallback.setAttribute("d", "M11 4h2v7h3.2L12 18 7.8 11H11V4z");
      fallback.setAttribute("fill", "#0f3054");
      inner.appendChild(fallback);
      arrowHost.appendChild(inner);
    }

    body.appendChild(arrowHost);
    root.appendChild(accuracy);
    root.appendChild(body);
    if (overlayEl) overlayEl.appendChild(root);

    let visible = false;
    let x = 0;
    let y = 0;
    let displayHeading = 0;

    function ensureInOverlay(host) {
      const parent = host || overlayEl;
      if (!parent) return;
      if (root.parentNode !== parent) parent.appendChild(root);
    }

    function show() {
      visible = true;
      root.setAttribute("data-visible", "true");
      root.setAttribute("visibility", "visible");
      root.style.removeProperty("display");
      root.removeAttribute("hidden");
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
      hasCone: () => true,
    };
  }

  global.UserLocationPuck = { create: createUserLocationPuck };
})(typeof window !== "undefined" ? window : globalThis);
