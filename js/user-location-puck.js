/**
 * Marcador visual de posição do usuário — seta de navegação + círculo de precisão.
 */
(function (global) {
  "use strict";

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

    const arrowRotate = document.createElementNS("http://www.w3.org/2000/svg", "g");
    arrowRotate.setAttribute("class", "ulp-arrow-rotate");
    arrowRotate.setAttribute("transform", "rotate(0)");

    const arrowScale = document.createElementNS("http://www.w3.org/2000/svg", "g");
    arrowScale.setAttribute("class", "ulp-arrow-scale");

    if (Icons()?.appendInnerArrow) {
      Icons().appendInnerArrow(arrowScale, {
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
      arrowScale.appendChild(inner);
    }

    arrowRotate.appendChild(arrowScale);
    arrowHost.appendChild(arrowRotate);
    body.appendChild(arrowHost);
    root.appendChild(accuracy);
    root.appendChild(body);
    if (overlayEl) overlayEl.appendChild(root);

    let visible = false;
    let x = 0;
    let y = 0;

    function bodyTransform() {
      return `translate(${x} ${y})`;
    }

    function applyBodyTransform() {
      body.setAttribute("transform", bodyTransform());
    }

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
        accuracy.setAttribute("r", "0");
        return;
      }
      root.setAttribute("data-searching", "true");
      x = svgX;
      y = svgY;
      // Sem círculo azul de precisão durante a busca — só o ícone de seta
      accuracy.setAttribute("cx", String(svgX));
      accuracy.setAttribute("cy", String(svgY));
      accuracy.setAttribute("r", "0");
      body.setAttribute("transform", bodyTransform());
      updateArrowScale();
      show();
    }

    function resolveArrowScale() {
      const mapScale = typeof opts.getMapScale === "function" ? opts.getMapScale() : 1;
      const vb = typeof opts.getViewBox === "function" ? opts.getViewBox() : { w: 1011, h: 862 };
      const icons = Icons();
      if (icons?.puckScreenFixedScale) {
        return icons.puckScreenFixedScale(mapScale, vb.w, vb.h);
      }
      const base = opts.markerScale ?? icons?.puckScaleForViewBox?.(vb.w, vb.h) ?? 0.037;
      return base / Math.max(0.08, mapScale || 1);
    }

    function updateArrowScale() {
      const compensated = resolveArrowScale();
      arrowScale.setAttribute("transform", `scale(${compensated.toFixed(5)})`);
    }

    function setPosition(svgX, svgY, accuracyMeters, metersToSvgUnits) {
      if (!isFinite(svgX) || !isFinite(svgY)) return;
      root.removeAttribute("data-searching");
      x = svgX;
      y = svgY;
      accuracy.setAttribute("cx", String(svgX));
      accuracy.setAttribute("cy", String(svgY));
      applyBodyTransform();
      updateArrowScale();
      if (isFinite(accuracyMeters) && accuracyMeters > 0 && typeof metersToSvgUnits === "function") {
        const raw = metersToSvgUnits(accuracyMeters);
        const maxR = typeof opts.maxAccuracyRadiusSvg === "function"
          ? opts.maxAccuracyRadiusSvg()
          : 36;
        const r = Math.min(maxR, Math.max(6, raw));
        accuracy.setAttribute("r", String(r));
      } else {
        accuracy.setAttribute("r", "0");
      }
      show();
    }

    /** Mantido para compatibilidade — rotação real fica em GpsCompass.updateGpsIconRotation. */
    function setHeading(_mapHeading, _cameraBearing) {
      applyBodyTransform();
      if (visible) updateArrowScale();
      if (visible) {
        root.setAttribute("data-visible", "true");
        root.setAttribute("visibility", "visible");
        root.style.removeProperty("display");
      }
    }

    return {
      root,
      arrowRotate,
      show,
      hide,
      setPosition,
      setSearching,
      setHeading,
      updateArrowScale,
      ensureInOverlay,
      getPosition: () => ({ x, y }),
      isVisible: () => visible,
      hasCone: () => true,
    };
  }

  global.UserLocationPuck = { create: createUserLocationPuck };
})(typeof window !== "undefined" ? window : globalThis);
