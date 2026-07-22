/**
 * Configuração e helpers — brilho animado na rota (CSS only).
 */
(function (global) {
  "use strict";

  const ROUTE_ANIMATION_CONFIG = {
    enabled: true,
    durationSeconds: 3,
    glowLength: 18,
    gapLength: 120,
    baseWidth: 8,
    glowWidth: 4,
    glowOpacity: 0.75,
    routeColor: "#00AEEF",
    baseOpacity: 0.85,
    completedOpacity: 0.35,
  };

  function dashTotal(cfg) {
    return (cfg.glowLength || 18) + (cfg.gapLength || 120);
  }

  function applyRouteAnimationVars(layerEl, cfg = ROUTE_ANIMATION_CONFIG) {
    if (!layerEl) return;
    layerEl.style.setProperty("--route-color", cfg.routeColor || "#00AEEF");
    layerEl.style.setProperty("--route-base-width", String(cfg.baseWidth ?? 8));
    layerEl.style.setProperty("--route-glow-width", String(cfg.glowWidth ?? 4));
    layerEl.style.setProperty("--route-glow-opacity", String(cfg.glowOpacity ?? 0.75));
    layerEl.style.setProperty("--route-base-opacity", String(cfg.baseOpacity ?? 0.85));
    layerEl.style.setProperty("--route-completed-opacity", String(cfg.completedOpacity ?? 0.35));
    layerEl.style.setProperty("--route-glow-length", String(cfg.glowLength ?? 18));
    layerEl.style.setProperty("--route-gap-length", String(cfg.gapLength ?? 120));
    layerEl.style.setProperty("--route-glow-dash-total", String(dashTotal(cfg)));
    layerEl.style.setProperty("--route-glow-duration", `${cfg.durationSeconds ?? 3}s`);
    layerEl.classList.toggle("route-animation-off", cfg.enabled === false);
  }

  /** Aplica a mesma geometria nos dois paths (base + brilho). */
  function paintRoutePaths(layerEl, baseNode, glowNode, pathD) {
    const d = pathD || "";
    if (baseNode) baseNode.setAttribute("d", d);
    if (glowNode) glowNode.setAttribute("d", d);
    if (!layerEl) return;
    if (d) {
      layerEl.style.display = "";
      layerEl.removeAttribute("hidden");
      layerEl.setAttribute("visibility", "visible");
    } else {
      layerEl.style.display = "none";
      layerEl.setAttribute("visibility", "hidden");
    }
  }

  function clearRoutePaths(layerEl, baseNode, glowNode) {
    paintRoutePaths(layerEl, baseNode, glowNode, "");
    if (layerEl) layerEl.classList.remove("route-path-completed");
  }

  function setRouteCompleted(layerEl, completed) {
    if (!layerEl) return;
    layerEl.classList.toggle("route-path-completed", !!completed);
  }

  global.ROUTE_ANIMATION_CONFIG = ROUTE_ANIMATION_CONFIG;
  global.RouteAnimation = {
    ROUTE_ANIMATION_CONFIG,
    applyRouteAnimationVars,
    paintRoutePaths,
    clearRoutePaths,
    setRouteCompleted,
    dashTotal,
  };
})(typeof window !== "undefined" ? window : globalThis);
