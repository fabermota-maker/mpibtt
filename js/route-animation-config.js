/**
 * Configuração e helpers — brilho animado na rota (fluxo → destino).
 * Camada glow acima da linha base; movimento via Web Animations API (leve e confiável em SVG).
 */
(function (global) {
  "use strict";

  const ROUTE_ANIMATION_CONFIG = {
    enabled: true,
    durationSeconds: 2.6,
    glowLength: 30,
    gapLength: 88,
    baseWidth: 8,
    glowWidth: 5,
    glowOpacity: 0.9,
    routeColor: "#00AEEF",
    /** Faixa luminosa clara — legível no campus e nos andares claros */
    glowColor: "rgba(255, 255, 255, 0.95)",
    baseOpacity: 0.88,
    completedOpacity: 0.35,
  };

  const glowAnimStore = new WeakMap();

  function dashTotal(cfg) {
    return (cfg.glowLength || 30) + (cfg.gapLength || 88);
  }

  function applyRouteAnimationVars(layerEl, cfg = ROUTE_ANIMATION_CONFIG) {
    if (!layerEl) return;
    layerEl.style.setProperty("--route-color", cfg.routeColor || "#00AEEF");
    layerEl.style.setProperty("--route-glow-color", cfg.glowColor || "rgba(255, 255, 255, 0.95)");
    layerEl.style.setProperty("--route-base-width", String(cfg.baseWidth ?? 8));
    layerEl.style.setProperty("--route-glow-width", String(cfg.glowWidth ?? 5));
    layerEl.style.setProperty("--route-glow-opacity", String(cfg.glowOpacity ?? 0.9));
    layerEl.style.setProperty("--route-base-opacity", String(cfg.baseOpacity ?? 0.88));
    layerEl.style.setProperty("--route-completed-opacity", String(cfg.completedOpacity ?? 0.35));
    layerEl.style.setProperty("--route-glow-length", String(cfg.glowLength ?? 30));
    layerEl.style.setProperty("--route-gap-length", String(cfg.gapLength ?? 88));
    layerEl.style.setProperty("--route-glow-dash-total", String(dashTotal(cfg)));
    layerEl.style.setProperty("--route-glow-duration", `${cfg.durationSeconds ?? 2.6}s`);
    layerEl.classList.toggle("route-animation-off", cfg.enabled === false);
    layerEl.classList.remove("route-path-completed");
  }

  function stopRouteGlowFlow(glowNode) {
    if (!glowNode) return;
    const anim = glowAnimStore.get(glowNode);
    if (anim) {
      anim.cancel();
      glowAnimStore.delete(glowNode);
    }
    glowNode.classList?.remove("is-flow-animated");
  }

  /** Brilho percorrendo o path no sentido origem → destino (stroke-dashoffset). */
  function startRouteGlowFlow(glowNode, cfg = ROUTE_ANIMATION_CONFIG) {
    if (!glowNode || cfg.enabled === false) {
      stopRouteGlowFlow(glowNode);
      return;
    }

    stopRouteGlowFlow(glowNode);

    const glowLen = cfg.glowLength ?? 30;
    let gap = cfg.gapLength ?? 88;
    try {
      const len = glowNode.getTotalLength?.() || 0;
      if (len >= 40) {
        gap = Math.max(cfg.gapLength ?? 88, Math.round(len * 0.26));
      }
    } catch { /* ignore */ }

    const total = glowLen + gap;
    const dash = `${glowLen} ${gap}`;

    glowNode.setAttribute("stroke-dasharray", dash);
    glowNode.style.strokeDasharray = dash;
    glowNode.style.strokeDashoffset = "0";
    glowNode.style.setProperty("--route-gap-length", String(gap));
    glowNode.style.setProperty("--route-glow-dash-total", String(total));

    const layer = glowNode.closest?.(".route-layer");
    if (layer) {
      layer.style.setProperty("--route-gap-length", String(gap));
      layer.style.setProperty("--route-glow-dash-total", String(total));
    }

    if (global.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches) return;

    if (typeof glowNode.animate !== "function") return;

    glowNode.classList.add("is-flow-animated");
    const anim = glowNode.animate(
      [{ strokeDashoffset: 0 }, { strokeDashoffset: -total }],
      {
        duration: (cfg.durationSeconds ?? 2.6) * 1000,
        iterations: Infinity,
        easing: "linear",
      }
    );
    glowAnimStore.set(glowNode, anim);
  }

  function syncGlowDashToPath(glowNode, cfg = ROUTE_ANIMATION_CONFIG) {
    startRouteGlowFlow(glowNode, cfg);
  }

  function restartRouteGlowAnimation(glowNode, cfg = ROUTE_ANIMATION_CONFIG) {
    startRouteGlowFlow(glowNode, cfg);
  }

  /** Aplica geometria na linha base + camada animada (brilho em fluxo). */
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
        requestAnimationFrame(() => startRouteGlowFlow(glowNode, cfg));
      } else {
        stopRouteGlowFlow(glowNode);
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
    if (completed) {
      layerEl.querySelectorAll?.(".route-path-glow").forEach(stopRouteGlowFlow);
    }
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
    startRouteGlowFlow,
    stopRouteGlowFlow,
    dashTotal,
  };
})(typeof window !== "undefined" ? window : globalThis);
