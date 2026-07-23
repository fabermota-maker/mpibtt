/**
 * Controle da câmera do mapa (seguir posição / direção).
 */
(function (global) {
  "use strict";

  function createMapCameraController(ctx) {
    const {
      getState,
      setState,
      apply,
      clamp,
      getViewBox,
    } = ctx;

    function getNav() {
      return getState().userNav || {};
    }

    function patchNav(p) {
      const cur = getNav();
      setState({ userNav: { ...cur, ...p } });
    }

    function setFollowMode(mode) {
      if (mode === "off") {
        patchNav({
          isFollowingLocation: false,
          isFollowingHeading: false,
          followMode: "off",
          cameraBearing: 0,
        });
        apply();
        return;
      }
      const free = mode === "free";
      patchNav({
        isFollowingLocation: mode === "follow" || mode === "follow-heading",
        isFollowingHeading: mode === "follow-heading",
        followMode: mode,
        cameraBearing: mode === "follow-heading" ? getNav().cameraBearing || 0 : 0,
      });
      apply();
    }

    function exitFollow() {
      if (!getNav().isFollowingLocation && !getNav().isFollowingHeading) return;
      setFollowMode("free");
    }

    function cycleFollowMode() {
      const cur = getNav().followMode || "free";
      if (cur === "follow") setFollowMode("follow-heading");
      else if (cur === "follow-heading") setFollowMode("free");
      else if (cur === "free") return "off";
      else setFollowMode("follow");
      return getNav().followMode || "free";
    }

    function centerOnPoint(svgX, svgY) {
      const state = getState();
      const vb = getViewBox();
      const r = ctx.viewport.getBoundingClientRect();
      const cx = r.width / 2;
      const cy = r.height / 2;

      if (state.userNav?.isFollowingHeading && isFinite(state.userNav.cameraBearing)) {
        const rad = (state.userNav.cameraBearing * Math.PI) / 180;
        const cos = Math.cos(rad);
        const sin = Math.sin(rad);
        const dx = svgX - vb.w / 2;
        const dy = svgY - vb.h / 2;
        const rx = dx * cos - dy * sin;
        const ry = dx * sin + dy * cos;
        state.panX = cx - (vb.w / 2 + rx) * state.scale;
        state.panY = cy - (vb.h / 2 + ry) * state.scale;
      } else {
        state.panX = cx - svgX * state.scale;
        state.panY = cy - svgY * state.scale;
      }
      clamp();
      apply();
    }

    function updateCameraHeading(deviceHeading, geoTransform) {
      const nav = getNav();
      if (!nav.isFollowingHeading || deviceHeading == null) return;
      const mapHeading = geoTransform?.gpsBearingToMapHeading
        ? geoTransform.gpsBearingToMapHeading(deviceHeading)
        : deviceHeading;
      const GT = global.GeoTransform;
      const cur = nav.cameraBearing || 0;
      const smoothed = GT?.interpolateAngle
        ? GT.interpolateAngle(cur, mapHeading, 0.14)
        : mapHeading;
      patchNav({ cameraBearing: smoothed });
      apply();
    }

    return {
      setFollowMode,
      exitFollow,
      cycleFollowMode,
      centerOnPoint,
      updateCameraHeading,
      getFollowMode: () => getNav().followMode || "free",
    };
  }

  global.MapCameraController = { create: createMapCameraController };
})(typeof window !== "undefined" ? window : globalThis);
