/**
 * Orquestrador — navegação ao vivo (map matching + progresso + reroute).
 */
(function (global) {
  "use strict";

  const CFG = () => global.LiveNavigationConfig?.LIVE_NAVIGATION_CONFIG || {};
  const AVAIL = () => global.LiveNavigationConfig?.MAP_MATCHING_AVAILABILITY || {};
  const PERF = () => global.LiveNavigationConfig?.PERFORMANCE_CONFIG || {};

  const UI_MESSAGES = {
    idle: "Usar minha localização",
    requesting_permission: "Obtendo localização...",
    locating: "Obtendo localização...",
    matched: "Localização encontrada",
    navigating: "Você está na rota",
    low_accuracy: "Precisão reduzida",
    off_route: "Verificando sua posição...",
    rerouting: "Recalculando rota...",
    arrived: "Você chegou ao destino",
    error: "Não foi possível obter localização",
  };

  function createLiveNavigationController(opts = {}) {
    const listeners = new Set();
    let state = {
      status: "idle",
      userPosition: null,
      snappedPosition: null,
      matchedEdgeId: null,
      accuracyMeters: null,
      confidence: 0,
      routeProgress: 0,
      remainingDistanceMeters: 0,
      remainingTimeSeconds: 0,
      isOffRoute: false,
      currentInstruction: null,
    };

    let navGraph = null;
    let edgeCache = null;
    let spatialIndex = null;
    let currentLevel = "L00";
    let currentRoute = null;
    let destinationNodeIds = [];
    let routePreferences = {};
    let coordTransform = null;
    let positionHistory = [];
    let lastReliableMatch = null;
    let lastMarkerAt = 0;
    let lastRouteCalcAt = 0;
    let pendingLevelChange = null;

    const geo = global.LiveGeolocationService?.create?.();
    const edgeHysteresis = global.LiveMapMatching?.createEdgeHysteresis?.(
      PERF().edgeChangeConfirmationsRequired ?? 2,
    );
    const offRouteDetector = global.LiveOffRouteDetection?.createOffRouteDetector?.(
      PERF().offRouteConfirmationsRequired ?? 3,
    );
    const rerouter = global.LiveRerouting?.createRerouteController?.();

    const {
      getMetersPerUnit = () => 0.35,
      onMarkerUpdate,
      onRouteReplace,
      onStatusMessage,
      geofenceContains,
    } = opts;

    function emit() {
      listeners.forEach((fn) => {
        try {
          fn({ ...state });
        } catch (e) {
          console.warn("LiveNavigation:", e);
        }
      });
    }

    function setStatus(status, extra = {}) {
      state = { ...state, status, ...extra };
      const msg = UI_MESSAGES[status] || status;
      onStatusMessage?.(msg, state);
      emit();
    }

    function rebuildIndexes(level) {
      if (!navGraph) return;
      currentLevel = level || currentLevel;
      edgeCache = global.LiveEdgeCache?.buildEdgeCache?.(navGraph, {
        level: currentLevel,
        metersPerUnit: getMetersPerUnit(),
      });
      if (PERF().spatialGridEnabled !== false) {
        spatialIndex = global.LiveSpatialIndex?.buildSpatialIndex?.(
          edgeCache?.list,
          CFG().spatialGridCellSize ?? 50,
        );
      }
    }

    function init(context) {
      navGraph = context.navGraph || navGraph;
      coordTransform = context.coordTransform || coordTransform;
      rebuildIndexes(context.level || currentLevel);
    }

    function isOutdoorLevel(level) {
      return level === "L00" || /^B0/.test(level || "");
    }

    function mapMatchingEnabledForLevel(level) {
      if (AVAIL().outdoor && isOutdoorLevel(level)) return true;
      if (AVAIL().indoor && !isOutdoorLevel(level)) return true;
      return false;
    }

    function processGpsReading(reading) {
      if (!reading || !coordTransform?.ready) {
        setStatus("error");
        return;
      }

      const acc = reading.accuracy;
      state.accuracyMeters = acc;

      if (acc > (CFG().maximumAcceptedAccuracyMeters ?? 35)) {
        setStatus("low_accuracy", {
          userPosition: lastReliableMatch?.snappedPosition || state.userPosition,
          snappedPosition: lastReliableMatch?.snappedPosition || state.snappedPosition,
        });
        return;
      }

      if (geofenceContains && !geofenceContains(reading.latitude, reading.longitude)) {
        setStatus("error");
        return;
      }

      const raw = coordTransform.latLngToMap(reading.latitude, reading.longitude, currentLevel);
      if (!raw) return;

      positionHistory.push({
        point: raw,
        accuracy: acc,
        timestamp: reading.timestamp,
      });
      const maxHist = CFG().maximumPositionHistory ?? 10;
      if (positionHistory.length > maxHist) positionHistory.shift();

      const smoothed =
        global.LivePositionSmoothing?.smoothPosition?.(
          positionHistory,
          getMetersPerUnit(),
        ) || raw;

      if (!mapMatchingEnabledForLevel(currentLevel)) {
        state.userPosition = { x: smoothed.x, y: smoothed.y, level: currentLevel };
        setStatus("low_accuracy");
        return;
      }

      const routeEdgeIds = new Set(currentRoute?.edgeIds || []);
      const candidate = global.LiveMapMatching?.findNearestNavigableEdge?.(
        smoothed,
        {
          edgeCache,
          spatialIndex,
          level: currentLevel,
          heading: reading.heading,
          previousEdgeId: state.matchedEdgeId,
          routeEdgeIds,
          accuracyMeters: acc,
          metersPerUnit: getMetersPerUnit(),
          outdoorOnly: AVAIL().outdoor && !AVAIL().indoor,
        },
      );

      if (!candidate) {
        setStatus("error");
        onStatusMessage?.(
          "Não foi possível associar sua localização a uma rota segura.",
          state,
        );
        return;
      }

      const stillOnPrev =
        state.matchedEdgeId &&
        candidate.matchedEdgeId !== state.matchedEdgeId &&
        candidate.distanceToEdgeMeters <= (CFG().maximumSnapDistanceOutdoorMeters ?? 30);

      const stableEdgeId = edgeHysteresis?.resolve?.(
        candidate.matchedEdgeId,
        stillOnPrev,
      );

      const matchedEdgeId = stableEdgeId || candidate.matchedEdgeId;
      const matchResult = { ...candidate, matchedEdgeId, rawGeoPosition: reading };

      if (candidate.isReliable) {
        lastReliableMatch = matchResult;
      }

      state.userPosition = matchResult.rawMapPosition;
      state.snappedPosition = matchResult.snappedPosition;
      state.matchedEdgeId = matchedEdgeId;
      state.confidence = matchResult.confidence;

      const now = Date.now();
      if (now - lastMarkerAt >= (PERF().markerUpdateIntervalMs ?? 500)) {
        lastMarkerAt = now;
        onMarkerUpdate?.(matchResult, reading);
      }

      if (currentRoute) {
        const off = offRouteDetector?.detect?.(
          matchResult,
          currentRoute,
          currentLevel,
          navGraph,
          getMetersPerUnit(),
        );

        if (off?.lowAccuracy) {
          setStatus("low_accuracy");
          return;
        }

        state.routeProgress = off?.routeProgress ?? state.routeProgress;
        state.remainingDistanceMeters =
          off?.remainingDistanceMeters ?? state.remainingDistanceMeters;
        state.remainingTimeSeconds = off?.remainingTimeSeconds ?? state.remainingTimeSeconds;
        state.currentInstruction = off?.instruction ?? state.currentInstruction;

        if (off?.offRoute && !off.confirmed) {
          state.isOffRoute = true;
          setStatus("off_route");
        } else if (off?.confirmed) {
          setStatus("rerouting");
          rerouter?.requestReroute?.({
            matchResult,
            destinationNodeIds,
            baseGraph: navGraph,
            edgeCache,
            routePreferences,
            onRoute: (route) => {
              currentRoute = route;
              offRouteDetector?.reset?.();
              onRouteReplace?.(route);
              setStatus("navigating");
            },
            onError: () => setStatus("off_route"),
          });
        } else {
          state.isOffRoute = false;
          const remain = state.remainingDistanceMeters;
          if (remain <= (CFG().arrivalThresholdMeters ?? 5)) {
            setStatus("arrived");
          } else {
            setStatus("navigating");
          }
        }
      } else {
        setStatus("matched");
      }

      if (global.LiveNavigationConfig?.isDebugNavigation?.()) {
        state._debug = {
          raw,
          smoothed,
          candidate,
          rerouteStats: rerouter?.getStats?.(),
        };
      }
    }

    async function startNavigation({ route, destinations, preferences, level }) {
      currentRoute = route;
      destinationNodeIds = destinations || [];
      routePreferences = preferences || {};
      if (level) rebuildIndexes(level);

      setStatus("requesting_permission");
      try {
        await geo?.requestLocationPermission?.();
      } catch (e) {
        setStatus("error");
        onStatusMessage?.(
          "Permissão negada. Marque sua posição no mapa para continuar.",
          state,
        );
        return false;
      }

      const started = geo?.startLocationTracking?.(
        processGpsReading,
        () => setStatus("error"),
      );
      if (started) setStatus("locating");
      return started;
    }

    function stopNavigation() {
      geo?.stopLocationTracking?.();
      currentRoute = null;
      positionHistory = [];
      edgeHysteresis?.reset?.(null);
      offRouteDetector?.reset?.();
      setStatus("idle");
    }

    /** Troca de nível — só após confirmação manual. */
    function confirmLevelChange(newLevel, elevatorNodeId) {
      if (global.LiveNavigationConfig?.GRAPH_SAFETY?.ALLOW_AUTOMATIC_LEVEL_CHANGE) {
        throw new Error("Troca automática de nível não permitida");
      }
      pendingLevelChange = null;
      rebuildIndexes(newLevel);
      if (elevatorNodeId && navGraph?.nodesById?.has(elevatorNodeId)) {
        const n = navGraph.nodesById.get(elevatorNodeId);
        state.snappedPosition = { x: n.x, y: n.y, level: newLevel };
        state.userPosition = { ...state.snappedPosition };
        edgeHysteresis?.reset?.(null);
      }
      setStatus(currentRoute ? "navigating" : "matched");
    }

    function requestLevelChangePrompt(targetLevel, instruction) {
      pendingLevelChange = targetLevel;
      state.currentInstruction = instruction || `Confirme quando chegar ao ${targetLevel}.`;
      emit();
    }

    function subscribe(fn) {
      listeners.add(fn);
      return () => listeners.delete(fn);
    }

    /**
     * Integração com RouteTrackingService — map matching sem segundo watchPosition.
     * @returns {(reading, svgRaw, ctx) => { svg, matchResult, held? }}
     */
    function createMapMatchEnhancer() {
      let localHistory = [];

      return function enhancePosition(reading, svgRaw, ctx) {
        if (!navGraph || !AVAIL().outdoor) {
          return { svg: svgRaw, matchResult: null };
        }

        const floorId = ctx?.floorId || currentLevel;
        if (!mapMatchingEnabledForLevel(floorId)) {
          return { svg: svgRaw, matchResult: null, held: true };
        }

        if (ctx?.floorId && ctx.floorId !== currentLevel) {
          rebuildIndexes(ctx.floorId);
        }

        const acc = reading.accuracy;
        if (acc > (CFG().maximumAcceptedAccuracyMeters ?? 35)) {
          if (lastReliableMatch?.snappedPosition) {
            return {
              svg: lastReliableMatch.snappedPosition,
              matchResult: lastReliableMatch,
              held: true,
            };
          }
          return { svg: svgRaw, matchResult: null, held: true };
        }

        localHistory.push({
          point: svgRaw,
          accuracy: acc,
          timestamp: reading.timestamp,
        });
        const maxHist = CFG().maximumPositionHistory ?? 10;
        if (localHistory.length > maxHist) localHistory.shift();

        const smoothed =
          global.LivePositionSmoothing?.smoothPosition?.(
            localHistory,
            getMetersPerUnit(),
          ) || svgRaw;

        if (smoothed.suspicious && lastReliableMatch?.snappedPosition) {
          return {
            svg: lastReliableMatch.snappedPosition,
            matchResult: lastReliableMatch,
            held: true,
          };
        }

        const routeEdgeIds = new Set(ctx?.route?.edgeIds || currentRoute?.edgeIds || []);
        const candidate = global.LiveMapMatching?.findNearestNavigableEdge?.(
          smoothed,
          {
            edgeCache,
            spatialIndex,
            level: floorId,
            heading: reading.heading,
            previousEdgeId: state.matchedEdgeId,
            routeEdgeIds,
            accuracyMeters: acc,
            metersPerUnit: getMetersPerUnit(),
            outdoorOnly: AVAIL().outdoor && !AVAIL().indoor,
          },
        );

        if (!candidate?.snappedPosition) {
          return { svg: svgRaw, matchResult: null };
        }

        const stillOnPrev =
          state.matchedEdgeId &&
          candidate.matchedEdgeId !== state.matchedEdgeId;
        const stableId = edgeHysteresis?.resolve?.(
          candidate.matchedEdgeId,
          stillOnPrev &&
            candidate.distanceToEdgeMeters <=
              (CFG().maximumSnapDistanceOutdoorMeters ?? 30),
        );
        const matchResult = {
          ...candidate,
          matchedEdgeId: stableId || candidate.matchedEdgeId,
          rawGeoPosition: reading,
        };

        if (matchResult.isReliable) lastReliableMatch = matchResult;

        state.snappedPosition = matchResult.snappedPosition;
        state.matchedEdgeId = matchResult.matchedEdgeId;
        state.confidence = matchResult.confidence;
        state.accuracyMeters = acc;

        return { svg: matchResult.snappedPosition, matchResult };
      };
    }

    return {
      init,
      rebuildIndexes,
      startNavigation,
      stopNavigation,
      confirmLevelChange,
      requestLevelChangePrompt,
      processGpsReading,
      createMapMatchEnhancer,
      getState: () => ({ ...state }),
      subscribe,
      UI_MESSAGES,
    };
  }

  global.LiveNavigationController = {
    create: createLiveNavigationController,
    UI_MESSAGES,
  };
})(typeof window !== "undefined" ? window : globalThis);
