/**
 * Botão “Orientar pelo GPS” — estados e orquestração do fluxo inicial.
 * Reutiliza GeofenceService, GpsReadingCollector, NearestGraphPoint e rotas do app.
 */
(function (global) {
  "use strict";

  const BUTTON_STATES = {
    IDLE: "Orientar pelo GPS",
    LOCATING: "Obtendo…",
    LOW_ACCURACY: "Precisão baixa",
    FOUND: "Localizado",
    OUTSIDE: "Fora da área",
    ROUTING: "Traçando…",
    ACTIVE: "GPS ativo",
    CANCEL: "Cancelar",
  };

  const MESSAGES = {
    PERMISSION_DENIED:
      "A localização não foi autorizada.\nEscolha sua posição no mapa ou escaneie um QR Code.",
    LOW_ACCURACY:
      "Não foi possível determinar sua posição com precisão.\nAproxime-se de uma entrada ou vá para uma área aberta.",
    OUTSIDE:
      "Você ainda não está dentro da área mapeada da PIB Curitiba.\nAproxime-se de uma das entradas para iniciar a orientação.",
    OUTSIDE_SHORT:
      "Você está fora da área mapeada.\nA navegação interna será liberada ao chegar à PIB Curitiba.",
    NO_ANCHOR:
      "Localização aproximada encontrada.\nSelecione a entrada mais próxima para continuar.",
    NO_DEST:
      "Sua localização foi encontrada.\nAgora selecione para onde deseja ir.",
    NO_GRAPH:
      "Não foi possível conectar sua localização ao mapa.",
    NO_ROUTE: "Não foi encontrada uma rota válida.",
    AMBIGUOUS: "Encontramos duas entradas próximas. Onde você está?",
  };

  function createGpsOrientation(ctx) {
    const {
      buttonEl,
      cancelEl,
      accuracyEl,
      confirmModal,
      toast,
      getState,
      setField,
      drawRoute,
      enterNav,
      exitNav,
      getMetersPerUnit,
      ensureGeoTransform,
      ensureGeofence,
      ensureUserLocationStarted,
      onTrackingSnap,
      onNeedManualEntrance,
      onAmbiguousEntrances,
    } = ctx;

    let buttonState = "IDLE";
    let tracking = null;
    let geofence = null;
    let geo = null;
    let lastUserLocation = null;
    let running = false;

    function setGpsButtonState(key) {
      buttonState = key;
      const label = BUTTON_STATES[key] || BUTTON_STATES.IDLE;
      if (buttonEl) {
        buttonEl.textContent = label;
        buttonEl.dataset.state = key;
        buttonEl.classList.toggle("is-active", key === "ACTIVE");
        buttonEl.classList.toggle("is-busy", key === "LOCATING" || key === "ROUTING");
        buttonEl.setAttribute("aria-busy", key === "LOCATING" || key === "ROUTING" ? "true" : "false");
      }
      if (cancelEl) {
        const show = key === "ACTIVE" || key === "ROUTING" || key === "FOUND";
        cancelEl.hidden = !show;
      }
    }

    function setAccuracyHint(accuracy, label) {
      if (!accuracyEl) return;
      if (accuracy == null || !isFinite(accuracy)) {
        accuracyEl.hidden = true;
        return;
      }
      accuracyEl.hidden = false;
      accuracyEl.textContent =
        label ||
        `Precisão GPS: ±${Math.round(accuracy)} m` +
          (accuracy > 20 ? " (aproximada)" : "");
    }

    function buildHerePoi(nodeId, node, reference, position) {
      return {
        id: "__here__",
        name: "Você está aqui (GPS)",
        searchLabel: reference?.name
          ? `Você está aqui · ${reference.name}`
          : "Você está aqui (GPS)",
        x: node.x,
        y: node.y,
        anchor: nodeId,
        snap: { x: node.x, y: node.y },
        cat: "acesso",
        level: node.level || reference?.floorId || "L00",
        navNodeIds: [nodeId],
        gps: {
          source: "GPS",
          latitude: position.latitude,
          longitude: position.longitude,
          accuracy: position.accuracy,
          floorId: reference?.floorId || "L00",
          navNodeId: nodeId,
          referenceId: reference?.id || null,
        },
      };
    }

    async function prepareServices() {
      geo = await ensureGeoTransform?.();
      geofence = ensureGeofence?.() || geofence;
      if (!geofence && global.GeofenceService?.createFromPibConfig) {
        geofence = global.GeofenceService.createFromPibConfig(
          global.PIB_CURITIBA_LOCATION_CONFIG,
        );
      }
      return !!(geo?.latLngToSvg || geo?.transform);
    }

    async function startGpsOrientation(destinationOverride) {
      if (running) return;
      running = true;

      try {
        if (typeof navigator === "undefined" || !navigator.geolocation) {
          toast("Geolocalização não suportada neste navegador.");
          setGpsButtonState("IDLE");
          return;
        }

        setGpsButtonState("LOCATING");
        setAccuracyHint(null);

        const ok = await prepareServices();
        if (!ok) {
          toast("Georreferência do mapa indisponível.");
          setGpsButtonState("IDLE");
          return;
        }

        const locationResult =
          await global.GpsReadingCollector.collectAccurateGpsReadings(
            global.GpsReadingCollector.DEFAULT_GPS_SETTINGS,
          );

        if (!locationResult.success) {
          if (locationResult.reason === "PERMISSION_DENIED") {
            toast(locationResult.message || MESSAGES.PERMISSION_DENIED);
            setGpsButtonState("IDLE");
          } else {
            toast(locationResult.message || MESSAGES.LOW_ACCURACY);
            setGpsButtonState("LOW_ACCURACY");
            setTimeout(() => setGpsButtonState("IDLE"), 3500);
          }
          return;
        }

        const { latitude, longitude, accuracy } = locationResult.position;
        setAccuracyHint(accuracy);
        setGpsButtonState("FOUND");

        const isInside = global.NearestGraphPoint.checkUserInsideGeofence(
          latitude,
          longitude,
          geofence,
        );

        if (!isInside) {
          setGpsButtonState("OUTSIDE");
          toast(MESSAGES.OUTSIDE);
          setTimeout(() => setGpsButtonState("IDLE"), 4000);
          return;
        }

        const state = getState();
        const navGraph = state.navGraph;
        const mpu = getMetersPerUnit?.() || navGraph?.metersPerUnit || 0.35;

        const initial = global.NearestGraphPoint.findBestInitialReference({
          latitude,
          longitude,
          accuracy,
          navGraph,
          latLngToSvg: (lat, lng) => geo.latLngToSvg(lat, lng),
          metersPerUnit: mpu,
        });

        if (initial.ambiguous && initial.options?.length >= 2) {
          setGpsButtonState("FOUND");
          const choice = await requestAmbiguousChoice(initial.options);
          if (!choice) {
            setGpsButtonState("IDLE");
            return;
          }
          await finishWithReference(choice, locationResult.position, destinationOverride);
          return;
        }

        if (!initial.reference || initial.needsManual) {
          toast(MESSAGES.NO_ANCHOR);
          onNeedManualEntrance?.(locationResult.position);
          setGpsButtonState("IDLE");
          return;
        }

        // Destinos internos sem vínculo: pede seleção manual se for DESTINATION
        const ref = initial.reference;
        if (
          (ref.category === "DESTINATION" ||
            ref.category === "CORRIDOR" ||
            ref.category === "VERTICAL_CONNECTOR") &&
          !ref.navNodeId
        ) {
          toast(MESSAGES.NO_ANCHOR);
          onNeedManualEntrance?.(locationResult.position, ref);
          setGpsButtonState("IDLE");
          return;
        }

        await finishWithReference(ref, locationResult.position, destinationOverride);
      } catch (err) {
        console.warn("startGpsOrientation:", err);
        toast("Falha ao orientar pelo GPS.");
        setGpsButtonState("IDLE");
      } finally {
        running = false;
      }
    }

    function requestAmbiguousChoice(options) {
      if (onAmbiguousEntrances) {
        return onAmbiguousEntrances(options, MESSAGES.AMBIGUOUS);
      }
      if (confirmModal?.ask) {
        return confirmModal.ask(MESSAGES.AMBIGUOUS, options);
      }
      // fallback: escolhe a mais próxima
      return Promise.resolve(options[0]);
    }

    async function finishWithReference(reference, position, destinationOverride) {
      const state = getState();
      const navGraph = state.navGraph;
      if (!navGraph) {
        toast(MESSAGES.NO_GRAPH);
        setGpsButtonState("IDLE");
        return;
      }

      const svgHint =
        isFinite(reference.svgX) && isFinite(reference.svgY)
          ? { x: reference.svgX, y: reference.svgY }
          : geo.latLngToSvg(position.latitude, position.longitude);

      let startNodeId = global.NearestGraphPoint.resolveStartNodeId(
        reference,
        navGraph,
        svgHint,
      );

      if (!startNodeId && svgHint) {
        const hit = global.NearestGraphPoint.findNearestValidNavNode(
          svgHint,
          navGraph,
          { level: reference.floorId || "L00", preferOutdoor: true },
        );
        startNodeId = hit?.id || null;
      }

      if (!startNodeId) {
        toast(MESSAGES.NO_GRAPH);
        setGpsButtonState("IDLE");
        return;
      }

      const node = navGraph.nodesById.get(startNodeId);
      if (!node) {
        toast(MESSAGES.NO_GRAPH);
        setGpsButtonState("IDLE");
        return;
      }

      lastUserLocation = {
        source: "GPS",
        latitude: position.latitude,
        longitude: position.longitude,
        accuracy: position.accuracy,
        floorId: reference.floorId || "L00",
        navNodeId: startNodeId,
        referenceId: reference.id,
      };

      const herePoi = buildHerePoi(startNodeId, node, reference, position);
      setField("origin", herePoi);

      const dest = destinationOverride || state.dest;
      if (!dest) {
        toast(MESSAGES.NO_DEST);
        setGpsButtonState("FOUND");
        ensureUserLocationStarted?.();
        return;
      }

      setGpsButtonState("ROUTING");
      drawRoute();

      if (!getState().route) {
        toast(MESSAGES.NO_ROUTE);
        setGpsButtonState("IDLE");
        return;
      }

      enterNav?.();
      ensureUserLocationStarted?.();
      startRouteTracking(getState().route, reference.floorId || "L00");
      setGpsButtonState("ACTIVE");

      const nearName = reference.name || "a área mapeada";
      toast(
        `Você está próximo à ${nearName}.\nSiga pela rota destacada.`,
      );
    }

    function startRouteTracking(currentRoute, floorId) {
      tracking?.stop();
      tracking = global.RouteTrackingService.create({
        latLngToSvg: (lat, lng) => geo?.latLngToSvg(lat, lng),
        getNavGraph: () => getState().navGraph,
        getMetersPerUnit,
        geofenceContains: (lat, lng) =>
          global.NearestGraphPoint.checkUserInsideGeofence(lat, lng, geofence),
        onSnap: (valid, snap) => {
          setAccuracyHint(valid.accuracy);
          onTrackingSnap?.(valid, snap);
        },
        onOffRouteConfirmed: () => {
          toast("Desvio confirmado — recalculando rota…");
          setGpsButtonState("ROUTING");
          // recálculo: origem permanece o último nó válido / here
          drawRoute();
          tracking?.updateRoute(getState().route, getState().activeLevel || floorId);
          setGpsButtonState("ACTIVE");
        },
        onOutside: () => toast(MESSAGES.OUTSIDE_SHORT),
        onLowAccuracy: (r) => setAccuracyHint(r.accuracy, `Precisão baixa: ±${Math.round(r.accuracy)} m`),
      });
      tracking.start(currentRoute, floorId);
    }

    function cancelOrientation() {
      tracking?.stop();
      tracking = null;
      exitNav?.("Orientação GPS encerrada.");
      setGpsButtonState("IDLE");
      setAccuracyHint(null);
    }

    function bind() {
      if (buttonEl && !buttonEl._gpsOrientBound) {
        buttonEl._gpsOrientBound = true;
        buttonEl.addEventListener("click", (e) => {
          e.preventDefault();
          if (buttonState === "ACTIVE") {
            // recentraliza / reafirma
            ensureUserLocationStarted?.();
            toast("GPS ativo — acompanhando sua posição na rota.");
            return;
          }
          startGpsOrientation().catch((err) => console.warn(err));
        });
      }
      if (cancelEl && !cancelEl._gpsOrientBound) {
        cancelEl._gpsOrientBound = true;
        cancelEl.addEventListener("click", (e) => {
          e.preventDefault();
          cancelOrientation();
        });
      }
      setGpsButtonState("IDLE");
    }

    bind();

    return {
      startGpsOrientation,
      cancelOrientation,
      setGpsButtonState,
      finishWithReference,
      getLastUserLocation: () => lastUserLocation,
      getTracking: () => tracking,
      MESSAGES,
      BUTTON_STATES,
    };
  }

  global.GpsOrientation = {
    create: createGpsOrientation,
    BUTTON_STATES,
    MESSAGES,
  };
})(typeof window !== "undefined" ? window : globalThis);
