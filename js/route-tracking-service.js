/**
 * Acompanhamento GPS durante navegação: snap à rota, desvio e recálculo.
 */
(function (global) {
  "use strict";

  const ROUTE_TRACKING_RULES = {
    maximumAcceptedAccuracyMeters: 30,
    maximumSnapDistanceMeters: 12,
    offRouteReadingsRequired: 3,
    keepLastValidPosition: true,
    rejectImpossibleJumps: true,
    maxWalkingSpeedMps: 2.5,
  };

  function createRouteTrackingService(opts = {}) {
    const rules = { ...ROUTE_TRACKING_RULES, ...(opts.rules || {}) };
    let watchId = null;
    let active = false;
    let route = null;
    let floorId = "L00";
    let lastValid = null;
    let offRouteCount = 0;
    let lastSvg = null;
    let lastAt = 0;
    const listeners = new Set();

    const {
      latLngToSvg,
      getNavGraph,
      getMetersPerUnit,
      geofenceContains,
      onSnap,
      onOffRouteConfirmed,
      onOutside,
      onLowAccuracy,
      /** Opcional: map matching antes do snap à rota (LiveNavigation). */
      enhancePosition,
      onMapMatched,
    } = opts;

    function emit(evt) {
      listeners.forEach((fn) => {
        try {
          fn(evt);
        } catch (e) {
          console.warn("RouteTracking:", e);
        }
      });
    }

    function impossibleJump(svgPt, now) {
      if (!rules.rejectImpossibleJumps || !lastSvg || !lastAt) return false;
      const mpu = getMetersPerUnit?.() || 0.35;
      const distM = Math.hypot(svgPt.x - lastSvg.x, svgPt.y - lastSvg.y) * mpu;
      const dt = Math.max(0.2, (now - lastAt) / 1000);
      return distM / dt > rules.maxWalkingSpeedMps;
    }

    function onPosition(pos) {
      if (!active || !pos?.coords) return;
      const c = pos.coords;
      const reading = {
        latitude: c.latitude,
        longitude: c.longitude,
        accuracy: c.accuracy,
        heading: isFinite(c.heading) && c.heading >= 0 ? c.heading : null,
        speed: c.speed,
        timestamp: pos.timestamp || Date.now(),
      };

      if (
        !isFinite(reading.accuracy) ||
        reading.accuracy > rules.maximumAcceptedAccuracyMeters
      ) {
        onLowAccuracy?.(reading);
        emit({ type: "LOW_ACCURACY", reading, position: lastValid });
        return;
      }

      if (geofenceContains && !geofenceContains(reading.latitude, reading.longitude)) {
        onOutside?.(reading);
        emit({ type: "OUTSIDE", reading, position: lastValid });
        return;
      }

      let svgRaw = latLngToSvg?.(reading.latitude, reading.longitude);
      if (!svgRaw) return;

      let mapMatch = null;
      if (typeof enhancePosition === "function") {
        const enhanced = enhancePosition(reading, svgRaw, {
          floorId,
          route,
          navGraph: getNavGraph?.(),
        });
        if (enhanced?.held) {
          onLowAccuracy?.(reading);
          emit({ type: "LOW_ACCURACY", reading, position: lastValid, held: true });
          return;
        }
        if (enhanced?.svg) svgRaw = enhanced.svg;
        mapMatch = enhanced?.matchResult || null;
        if (mapMatch) onMapMatched?.(mapMatch, reading);
      }

      if (impossibleJump(svgRaw, reading.timestamp)) {
        emit({ type: "JUMP_REJECTED", reading, position: lastValid });
        return;
      }

      const snap = global.RouteSnapService?.snapGpsPositionToRoute({
        svgPoint: svgRaw,
        accuracy: reading.accuracy,
        currentRoute: route,
        currentFloorId: floorId,
        navGraph: getNavGraph?.(),
        metersPerUnit: getMetersPerUnit?.() || 0.35,
        maximumSnapDistanceMeters: rules.maximumSnapDistanceMeters,
      });

      if (!snap?.snappedPosition) {
        offRouteCount += 1;
        if (offRouteCount >= rules.offRouteReadingsRequired) {
          onOffRouteConfirmed?.(reading, { ...snap, mapMatch });
          emit({ type: "OFF_ROUTE", reading, snap, mapMatch });
          offRouteCount = 0;
        }
        return;
      }

      if (snap.offRoute) {
        offRouteCount += 1;
        if (rules.keepLastValidPosition && lastValid) {
          onSnap?.(lastValid, { ...snap, held: true, mapMatch });
        }
        if (offRouteCount >= rules.offRouteReadingsRequired) {
          onOffRouteConfirmed?.(reading, { ...snap, mapMatch });
          emit({ type: "OFF_ROUTE", reading, snap, mapMatch });
          offRouteCount = 0;
        }
        return;
      }

      offRouteCount = 0;
      lastValid = {
        ...reading,
        svg: snap.snappedPosition,
        edgeId: mapMatch?.matchedEdgeId || snap.edgeId,
        routeProgress: snap.routeProgress,
        mapMatch,
      };
      lastSvg = snap.snappedPosition;
      lastAt = reading.timestamp;
      onSnap?.(lastValid, { ...snap, mapMatch });
      emit({ type: "SNAP", reading: lastValid, snap, mapMatch });
    }

    function onError(err) {
      emit({ type: "ERROR", error: err });
    }

    function start(nextRoute, nextFloorId = "L00") {
      stop();
      route = nextRoute;
      floorId = nextFloorId || "L00";
      offRouteCount = 0;
      active = true;
      if (!navigator.geolocation) return false;
      watchId = navigator.geolocation.watchPosition(onPosition, onError, {
        enableHighAccuracy: true,
        maximumAge: 2000,
        timeout: 15000,
      });
      return true;
    }

    function updateRoute(nextRoute, nextFloorId) {
      route = nextRoute;
      if (nextFloorId) floorId = nextFloorId;
      offRouteCount = 0;
    }

    function stop() {
      active = false;
      if (watchId != null) {
        navigator.geolocation.clearWatch(watchId);
        watchId = null;
      }
    }

    function subscribe(fn) {
      listeners.add(fn);
      return () => listeners.delete(fn);
    }

    return {
      start,
      stop,
      updateRoute,
      subscribe,
      getLastValid: () => (lastValid ? { ...lastValid } : null),
      isActive: () => active,
      rules,
    };
  }

  global.RouteTrackingService = {
    create: createRouteTrackingService,
    ROUTE_TRACKING_RULES,
  };
})(typeof window !== "undefined" ? window : globalThis);
