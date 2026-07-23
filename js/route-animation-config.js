/**
 * Configuração e helpers — brilho animado na rota (CSS only).
 */
(function (global) {
  "use strict";

  const ROUTE_ANIMATION_CONFIG = {
    enabled: true,
    durationSeconds: 3.2,
    glowLength: 24,
    gapLength: 120,
    baseWidth: 8,
    glowWidth: 4.5,
    glowOpacity: 0.78,
    routeColor: "#00AEEF",
    /** Brilho claro — legível no campus escuro e nos mapas de andar claros */
    glowColor: "rgba(175, 238, 255, 0.92)",
    baseOpacity: 0.88,
    completedOpacity: 0.35,
  };

  function dashTotal(cfg) {
    return (cfg.glowLength || 18) + (cfg.gapLength || 120);
  }

  function applyRouteAnimationVars(layerEl, cfg = ROUTE_ANIMATION_CONFIG) {
    if (!layerEl) return;
    layerEl.style.setProperty("--route-color", cfg.routeColor || "#00AEEF");
    layerEl.style.setProperty("--route-glow-color", cfg.glowColor || "rgba(255, 255, 255, 0.95)");
    layerEl.style.setProperty("--route-base-width", String(cfg.baseWidth ?? 8));
    layerEl.style.setProperty("--route-glow-width", String(cfg.glowWidth ?? 5));
    layerEl.style.setProperty("--route-glow-opacity", String(cfg.glowOpacity ?? 0.92));
    layerEl.style.setProperty("--route-base-opacity", String(cfg.baseOpacity ?? 0.88));
    layerEl.style.setProperty("--route-completed-opacity", String(cfg.completedOpacity ?? 0.35));
    layerEl.style.setProperty("--route-glow-length", String(cfg.glowLength ?? 28));
    layerEl.style.setProperty("--route-gap-length", String(cfg.gapLength ?? 110));
    layerEl.style.setProperty("--route-glow-dash-total", String(dashTotal(cfg)));
    layerEl.style.setProperty("--route-glow-duration", `${cfg.durationSeconds ?? 2.8}s`);
    layerEl.classList.toggle("route-animation-off", cfg.enabled === false);
    layerEl.classList.remove("route-path-completed");
  }

  /** Ajusta o espaçamento do dash conforme o comprimento do path (fluxo contínuo). */
  function syncGlowDashToPath(glowNode, cfg = ROUTE_ANIMATION_CONFIG) {
    if (!glowNode || cfg.enabled === false) return;
    try {
      const len = glowNode.getTotalLength?.() || 0;
      if (len < 40) return;
      const gap = Math.max(cfg.gapLength || 120, Math.round(len * 0.42));
      const total = (cfg.glowLength || 24) + gap;
      glowNode.style.setProperty("--route-gap-length", String(gap));
      glowNode.style.setProperty("--route-glow-dash-total", String(total));
      if (glowNode.closest?.(".route-layer")) {
        glowNode.closest(".route-layer").style.setProperty("--route-gap-length", String(gap));
        glowNode.closest(".route-layer").style.setProperty("--route-glow-dash-total", String(total));
      }
    } catch { /* ignore */ }
  }

  /** Reinicia o keyframe do traço luminoso quando a geometria da rota muda. */
  function restartRouteGlowAnimation(glowNode) {
    if (!glowNode || ROUTE_ANIMATION_CONFIG.enabled === false) return;
    glowNode.style.animation = "none";
    void glowNode.getBoundingClientRect();
    requestAnimationFrame(() => {
      glowNode.style.removeProperty("animation");
    });
  }

  /** Aplica geometria na linha base + camada animada (brilho em fluxo via CSS). */
  function paintRoutePaths(layerEl, baseNode, glowNode, pathD) {
    const d = pathD || "";
    const cfg = ROUTE_ANIMATION_CONFIG;
    const stroke = cfg.routeColor || "#00AEEF";
    const baseW = String(cfg.baseWidth ?? 8);

    if (baseNode) {
      baseNode.setAttribute("d", d);
      baseNode.setAttribute("fill", "none");
      baseNode.setAttribute("stroke", stroke);
      baseNode.setAttribute("stroke-width", baseW);
      baseNode.setAttribute("stroke-linecap", "round");
      baseNode.setAttribute("stroke-linejoin", "round");
      baseNode.style.fill = "none";
      baseNode.style.stroke = stroke;
      baseNode.style.strokeWidth = baseW;
      baseNode.style.opacity = String(cfg.baseOpacity ?? 0.88);
      baseNode.style.visibility = d ? "visible" : "hidden";
      baseNode.style.display = d ? "" : "none";
    }

    if (glowNode) {
      glowNode.setAttribute("d", d);
      glowNode.setAttribute("fill", "none");
      glowNode.setAttribute("stroke-linecap", "round");
      glowNode.setAttribute("stroke-linejoin", "round");
      glowNode.removeAttribute("stroke");
      glowNode.removeAttribute("stroke-width");
      glowNode.style.fill = "none";
      glowNode.style.visibility = d ? "visible" : "hidden";
      glowNode.style.display = d ? "" : "none";
      glowNode.style.removeProperty("stroke");
      glowNode.style.removeProperty("stroke-width");
      glowNode.style.removeProperty("opacity");
      if (d) {
        syncGlowDashToPath(glowNode, cfg);
        restartRouteGlowAnimation(glowNode);
      }
    }

    if (!layerEl) return;
    if (d) {
      layerEl.style.display = "";
      layerEl.removeAttribute("hidden");
      layerEl.setAttribute("visibility", "visible");
      layerEl.classList.remove("route-path-completed");
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
    restartRouteGlowAnimation,
    syncGlowDashToPath,
    dashTotal,
  };
})(typeof window !== "undefined" ? window : globalThis);
