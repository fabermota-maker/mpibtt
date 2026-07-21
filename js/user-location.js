/**
 * Orquestrador: localização GPS em tempo real + heading + puck + câmera.
 */
(function (global) {
  "use strict";

  const GT = () => (typeof GeoTransform !== "undefined" ? GeoTransform : null);

  /** Fallback se data/geo-reference.json não carregar (GitHub Pages / path). */
  const FALLBACK_GEO = {
    id: "pib-curitiba-campus",
    level: "L00",
    mapCenter: { latitude: -25.442099, longitude: -49.284715 },
    controlPoints: [
      { id: "C", latitude: -25.441556, longitude: -49.284917, svgX: 21.5, svgY: 347, weight: 1.4 },
      { id: "D", latitude: -25.44125, longitude: -49.284222, svgX: 100, svgY: 140, weight: 1.1 },
      { id: "J", latitude: -25.442488, longitude: -49.284353, svgX: 739.48, svgY: 513.26, weight: 1.2 },
      { id: "K", latitude: -25.442753, longitude: -49.284258, svgX: 860.56, svgY: 513.26, weight: 1.1 },
      { id: "N", latitude: -25.442469, longitude: -49.285246, svgX: 591.08, svgY: 826.85, weight: 1.4 },
      { id: "O", latitude: -25.442106, longitude: -49.285379, svgX: 514.38, svgY: 846.6, weight: 1.3 },
      { id: "M", latitude: -25.443038, longitude: -49.284959, svgX: 940.95, svgY: 830, weight: 1 },
      { id: "A", latitude: -25.441694, longitude: -49.285528, svgX: 40, svgY: 780, weight: 1 },
    ],
  };

  function createUserLocationSystem(ctx) {
    const {
      overlay,
      viewport,
      canvas,
      locBtn,
      gpsCompass,
      gpsCompassArrow,
      getState,
      setState,
      apply,
      clamp,
      getViewBox,
      getMetersPerUnit,
      toast,
      ensureCampusView,
      getOverlay,
    } = ctx;

    let geo = null;
    let geofence = null;
    let permissions = null;
    let location = null;
    let heading = null;
    let puck = null;
    let camera = null;
    let animId = null;
    let started = false;
    let starting = false;
    let startPromise = null;
    let targetSvg = { x: null, y: null };
    let displaySvg = { x: null, y: null };
    let lastGeofenceToast = "";
    let lastGeofenceToastAt = 0;
    let lastAreaId = null;

    const defaultNav = {
      latitude: null,
      longitude: null,
      accuracy: null,
      deviceHeading: null,
      locationBearing: null,
      speed: null,
      isFollowingLocation: false,
      isFollowingHeading: false,
      followMode: "free",
      permissionStatus: "prompt",
      orientationStatus: "prompt",
      cameraBearing: 0,
      gpsAvailable: false,
      headingAvailable: false,
      geofenceStatus: "CHECKING",
    };

    function initState() {
      const s = getState();
      if (!s.userNav) setState({ userNav: { ...defaultNav } });
    }

    function patchNav(p) {
      const cur = getState().userNav || defaultNav;
      setState({ userNav: { ...cur, ...p } });
      updateLocBtn();
    }

    function metersToSvgUnits(meters) {
      const mpu = getMetersPerUnit?.() || 0.01;
      if (geo?.metersToSvgUnits) return geo.metersToSvgUnits(meters);
      return meters / mpu;
    }

    function updateLocBtn() {
      if (!locBtn) return;
      const nav = getState().userNav || {};
      const mode = nav.followMode || "free";
      locBtn.dataset.mode = mode;
      locBtn.dataset.gps = (started || nav.gpsAvailable || starting) ? "on" : "off";
      locBtn.classList.toggle("is-follow", mode === "follow");
      locBtn.classList.toggle("is-follow-heading", mode === "follow-heading");
      locBtn.classList.toggle("is-busy", !!starting);
      const labels = {
        free: "Ativar minha localização",
        follow: "Seguindo localização (toque p/ seguir direção)",
        "follow-heading": "Seguindo localização e direção (toque p/ liberar)",
      };
      locBtn.title = labels[mode] || labels.free;
      locBtn.setAttribute("aria-pressed", mode !== "free" || started ? "true" : "false");
      updateGpsCompass();
    }

    function showGpsCompass(on) {
      if (!gpsCompass) return;
      if (on) {
        gpsCompass.hidden = false;
        gpsCompass.removeAttribute("hidden");
        gpsCompass.setAttribute("aria-hidden", "false");
      } else {
        gpsCompass.hidden = true;
        gpsCompass.setAttribute("hidden", "");
        gpsCompass.setAttribute("aria-hidden", "true");
      }
    }

    function updateGpsCompass() {
      const nav = getState().userNav || {};
      const active = started && (nav.gpsAvailable || nav.headingAvailable);
      showGpsCompass(active);
      if (!active || !gpsCompassArrow) return;
      // seta aponta para a direção do aparelho (0 = Norte no anel)
      const h = nav.deviceHeading;
      if (h == null || !isFinite(h)) return;
      gpsCompassArrow.style.transform = `rotate(${h}deg)`;
    }

    function animateFrame() {
      if (targetSvg.x != null && displaySvg.x != null) {
        const f = 0.2;
        displaySvg.x += (targetSvg.x - displaySvg.x) * f;
        displaySvg.y += (targetSvg.y - displaySvg.y) * f;
        const nav = getState().userNav || {};
        puck?.setPosition(displaySvg.x, displaySvg.y, nav.accuracy, metersToSvgUnits);
        if (nav.isFollowingLocation) {
          camera?.centerOnPoint(displaySvg.x, displaySvg.y);
        }
      }

      const nav = getState().userNav || {};
      if (puck && (targetSvg.x != null || puck.isVisible())) {
        // Cone sempre visível com GPS ativo: heading do aparelho ou norte do mapa
        let mapHeading = 0;
        if (nav.deviceHeading != null && isFinite(nav.deviceHeading)) {
          mapHeading = geo?.gpsBearingToMapHeading
            ? geo.gpsBearingToMapHeading(nav.deviceHeading)
            : nav.deviceHeading;
          if (nav.locationBearing != null && (nav.speed || 0) > 1.5) {
            mapHeading = GT()?.interpolateAngle(mapHeading, nav.locationBearing, 0.25) ?? mapHeading;
          }
        } else if (nav.locationBearing != null && isFinite(nav.locationBearing)) {
          mapHeading = nav.locationBearing;
        }
        puck.setHeading(mapHeading, nav.cameraBearing || 0);
      }
      updateGpsCompass();

      animId = requestAnimationFrame(animateFrame);
    }

    function toastGeofence(msg) {
      if (!msg) return;
      const now = Date.now();
      if (msg === lastGeofenceToast && now - lastGeofenceToastAt < 5000) return;
      lastGeofenceToast = msg;
      lastGeofenceToastAt = now;
      toast(msg);
    }

    /**
     * Prende o puck às áreas caminháveis (NAV_NODES).
     * allowFreeMovementOverSvg: false → nunca posiciona o marcador livre no SVG.
     */
    function snapToWalkableSvg(svgPt, pos) {
      const rules = geofence?.rules || global.PIB_CURITIBA_LOCATION_RULES || {};
      if (rules.allowFreeMovementOverSvg) return svgPt;

      const graph = getState()?.navGraph;
      const NR = global.NavigationRouter;
      if (!graph || !NR?.nearestNodeId) return svgPt;

      const level = getState()?.activeLevel || "L00";

      // Sempre o nó amarelo (NAV) mais próximo da posição GPS no SVG —
      // áreas/refs GPS só nomeiam o local (Templo etc.), não forçam entrada fixa.
      const nid = NR.nearestNodeId(svgPt, graph, { level });
      if (!nid) return svgPt;
      const node = graph.nodesById?.get?.(nid) || graph.nodes?.[nid];
      if (!node || !isFinite(node.x) || !isFinite(node.y)) return svgPt;
      return { x: node.x, y: node.y };
    }

    function resolveOverlay() {
      return (typeof getOverlay === "function" ? getOverlay() : null) || overlay;
    }

    function showSearchingPuck() {
      ensureServices();
      puck?.ensureInOverlay?.(resolveOverlay());
      let pt = null;
      if (displaySvg.x != null && displaySvg.y != null) {
        pt = { x: displaySvg.x, y: displaySvg.y };
      } else if (geo?.mapCenter) {
        pt = geo.latLngToSvg(geo.mapCenter.latitude, geo.mapCenter.longitude);
      }
      if (!pt || !isFinite(pt.x) || !isFinite(pt.y)) {
        const vb = getViewBox?.() || {};
        pt = { x: (vb.w || 600) / 2, y: (vb.h || 400) / 2 };
      }
      targetSvg = { ...pt };
      displaySvg = { ...pt };
      puck?.setSearching?.(pt.x, pt.y, metersToSvgUnits(40));
      puck?.setHeading?.(0, getState().userNav?.cameraBearing || 0);
      puck?.show?.();
      showGpsCompass(true);
      patchNav({ gpsAvailable: false });
      updateLocBtn();
    }

    function applyAcceptedPosition(pos) {
      if (!geo?.transform && !geo?.latLngToSvg) return;
      const rawSvg = geo.latLngToSvg(pos.latitude, pos.longitude);
      if (!rawSvg || !isFinite(rawSvg.x) || !isFinite(rawSvg.y)) return;

      // GPS vive no campus (L00). Se o usuário estiver em outro andar, volta ao térreo.
      const level = getState()?.activeLevel || "L00";
      if (level !== "L00") {
        try {
          ensureCampusView?.();
        } catch (err) {
          console.warn("ensureCampusView:", err);
        }
      }

      ensureServices();
      puck?.ensureInOverlay?.(resolveOverlay());

      const svgPt = snapToWalkableSvg(rawSvg, pos);

      targetSvg = { x: svgPt.x, y: svgPt.y };
      if (displaySvg.x == null) displaySvg = { ...targetSvg };

      let locationBearing = pos.locationBearing;
      if (locationBearing != null && geo.gpsBearingToMapHeading) {
        locationBearing = geo.gpsBearingToMapHeading(locationBearing);
      }

      patchNav({
        latitude: pos.latitude,
        longitude: pos.longitude,
        accuracy: pos.accuracy,
        speed: pos.speed,
        locationBearing,
        permissionStatus: "granted",
        gpsAvailable: true,
      });

      puck?.setPosition(displaySvg.x, displaySvg.y, pos.accuracy, metersToSvgUnits);
      puck?.setSearching?.(null);
      // Cone imediato (norte do mapa até a bússola responder)
      let mapHeading = 0;
      const nav = getState().userNav || {};
      if (nav.deviceHeading != null && isFinite(nav.deviceHeading)) {
        mapHeading = geo?.gpsBearingToMapHeading
          ? geo.gpsBearingToMapHeading(nav.deviceHeading)
          : nav.deviceHeading;
      } else if (locationBearing != null && isFinite(locationBearing)) {
        mapHeading = locationBearing;
      }
      puck?.setHeading(mapHeading, nav.cameraBearing || 0);
      puck?.show?.();
    }

    function onLocationUpdate(pos, err) {
      if (err || !pos) {
        if (err?.code === 1) patchNav({ permissionStatus: "denied", gpsAvailable: false });
        else patchNav({ permissionStatus: "unavailable", gpsAvailable: false });
        return;
      }

      // Sempre tenta visualizar o puck; a geofence só restringe navegação interna.
      if (geofence) {
        const verdict = geofence.evaluate(pos);
        patchNav({ geofenceStatus: verdict.status });

        const areaRef = verdict.nearestReference?.inArea
          ? verdict.nearestReference
          : geofence.findGpsArea?.(pos.latitude, pos.longitude);
        const areaId = areaRef?.point?.id || null;
        if (areaId && areaId !== lastAreaId) {
          lastAreaId = areaId;
          const label = areaRef.point.name || "área mapeada";
          toastGeofence(`Você está na área: ${label}.`);
        } else if (!areaId) {
          lastAreaId = null;
        }

        if (verdict.status === "LOW_ACCURACY") {
          // Mostra posição aproximada mesmo com precisão ruim (até ~120 m)
          if (isFinite(pos.accuracy) && pos.accuracy <= 120) {
            applyAcceptedPosition(pos);
          } else if (verdict.position) {
            applyAcceptedPosition(verdict.position);
          }
          return;
        }

        if (verdict.status === "CHECKING") {
          applyAcceptedPosition(verdict.position || pos);
          return;
        }

        if (verdict.status === "OUTSIDE") {
          toastGeofence(verdict.message);
          // Visualiza no mapa (snap à entrada/nó) mesmo fora — não some o puck
          if (verdict.nearest?.point) {
            const p = verdict.nearest.point;
            if (isFinite(p.latitude) && isFinite(p.longitude)) {
              applyAcceptedPosition({
                latitude: p.latitude,
                longitude: p.longitude,
                accuracy: pos.accuracy,
                speed: 0,
                locationBearing: null,
                timestamp: pos.timestamp,
              });
            } else if (isFinite(p.svgX) && isFinite(p.svgY)) {
              ensureServices();
              targetSvg = { x: p.svgX, y: p.svgY };
              if (displaySvg.x == null) displaySvg = { ...targetSvg };
              puck?.setPosition(displaySvg.x, displaySvg.y, pos.accuracy, metersToSvgUnits);
              patchNav({ gpsAvailable: true, accuracy: pos.accuracy });
            } else {
              applyAcceptedPosition(pos);
            }
          } else {
            applyAcceptedPosition(pos);
          }
          return;
        }

        // INSIDE
        applyAcceptedPosition(verdict.position || pos);
        return;
      }

      applyAcceptedPosition(pos);
    }

    function onHeadingUpdate(h) {
      if (h == null) {
        patchNav({ headingAvailable: false });
        return;
      }
      patchNav({ deviceHeading: h, headingAvailable: true, orientationStatus: "granted" });
      if (getState().userNav?.isFollowingHeading) {
        camera?.updateCameraHeading(h, geo);
      }
    }

    async function ensurePermissions() {
      permissions = permissions || global.PermissionService?.create?.();
      if (!permissions) return { ok: false };

      await permissions.probeGeolocation();
      const loc = await permissions.requestLocationPermission();
      patchNav({ permissionStatus: loc.status });

      if (!loc.ok) {
        toast(loc.error || (
          loc.status === "denied"
            ? "Permissão de localização negada. Ative nas configurações do navegador."
            : "Localização indisponível. Ative o GPS do aparelho e tente de novo."
        ));
        return { ok: false };
      }

      // Bússola em paralelo — não atrasa o puck
      permissions.requestOrientationPermission().then((ori) => {
        patchNav({ orientationStatus: ori.status });
        if (!ori.ok) {
          toast("Bússola indisponível — exibindo o ponto azul com cone fixo.");
        }
      }).catch(() => {});

      return { ok: true, position: loc.position || null };
    }

    async function loadGeo() {
      if (geo?.transform) return true;
      let data = null;
      try {
        const base = document.querySelector('script[src*="user-location"]')?.src;
        const url = base
          ? new URL("../data/geo-reference.json", base).href
          : "data/geo-reference.json";
        const res = await fetch(url, { cache: "no-store" });
        if (res.ok) data = await res.json();
      } catch (err) {
        console.warn("geo-reference.json:", err);
      }
      if (!data) data = FALLBACK_GEO;
      geo = GT()?.createFromGeoReference?.(data) || null;

      // geofence: fonte canônica = PIB_CURITIBA_LOCATION_CONFIG (js/pib-curitiba-location-config.js)
      try {
        if (typeof GeofenceService !== "undefined") {
          if (global.PIB_CURITIBA_LOCATION_CONFIG) {
            geofence = GeofenceService.createFromPibConfig(
              global.PIB_CURITIBA_LOCATION_CONFIG,
            );
          } else {
            const base = document.querySelector('script[src*="user-location"]')?.src;
            const gUrl = base
              ? new URL("../data/pib-geofence.json", base).href
              : "data/pib-geofence.json";
            geofence = await GeofenceService.loadFromUrl(gUrl);
          }
        }
      } catch (err) {
        console.warn("geofence / PIB_CURITIBA_LOCATION_CONFIG:", err);
        geofence = null;
      }

      return !!geo?.transform;
    }

    function ensureServices() {
      const host = resolveOverlay();
      if (!puck) puck = global.UserLocationPuck?.create?.(host);
      else puck.ensureInOverlay?.(host);
      if (!camera) {
        camera = global.MapCameraController?.create?.({
          viewport,
          canvas,
          getState,
          setState,
          apply,
          clamp,
          getViewBox,
        });
      }
      if (!location) {
        location = global.LocationService?.create?.({
          positionSmoothing: 0.28,
          maximumAge: 2000,
          timeout: 12000,
        });
        location?.subscribe(onLocationUpdate);
      }
      if (!heading) {
        heading = global.HeadingService?.create?.({ smoothingFactor: 0.18, targetHz: 30 });
        heading?.subscribe(onHeadingUpdate);
      }
      if (!animId) animId = requestAnimationFrame(animateFrame);

      // centraliza tracking interno no centro, sem exibir o puck ainda
      if (geo?.mapCenter && displaySvg.x == null) {
        const c = geo.latLngToSvg(geo.mapCenter.latitude, geo.mapCenter.longitude);
        if (c) {
          // guarda alvo interno, mas NÃO chama setPosition (puck permanece oculto)
          targetSvg = { x: null, y: null };
          displaySvg = { x: null, y: null };
        }
      }
    }

    async function start({ silent = false } = {}) {
      if (started) return true;
      if (startPromise) return startPromise;

      startPromise = (async () => {
        starting = true;
        initState();
        updateLocBtn();
        showSearchingPuck();

        try {
          if (typeof navigator === "undefined" || !navigator.geolocation) {
            if (!silent) toast("Geolocalização não suportada neste navegador.");
            puck?.hide?.();
            return false;
          }

          const campusPromise = Promise.resolve(ensureCampusView?.()).catch((err) => {
            console.warn("ensureCampusView:", err);
          });
          const geoPromise = geo?.transform ? Promise.resolve(true) : loadGeo();

          await Promise.all([campusPromise, geoPromise]);

          if (!geo?.transform) {
            if (!silent) toast("Georreferência do mapa indisponível.");
            puck?.hide?.();
            return false;
          }

          ensureServices();

          const perm = await ensurePermissions();
          if (!perm.ok) {
            puck?.hide?.();
            showGpsCompass(false);
            return false;
          }

          if (perm.position) {
            applyAcceptedPosition(perm.position);
            if (displaySvg.x != null) camera?.centerOnPoint(displaySvg.x, displaySvg.y);
          }

          location?.start();
          heading?.start();

          document.addEventListener("visibilitychange", onVisibility);
          started = true;
          updateLocBtn();
          showGpsCompass(true);
          if (!silent && !perm.position) toast("Buscando sua localização…");
          return true;
        } finally {
          starting = false;
          updateLocBtn();
        }
      })();

      try {
        return await startPromise;
      } finally {
        startPromise = null;
      }
    }

    /** Força exibir o puck numa lat/lng (após coleta / orientação). */
    function showAtLatLng(latitude, longitude, accuracy) {
      if (!isFinite(latitude) || !isFinite(longitude)) return false;
      try {
        ensureCampusView?.();
      } catch (err) {
        console.warn("ensureCampusView:", err);
      }
      ensureServices();
      applyAcceptedPosition({
        latitude,
        longitude,
        accuracy: accuracy ?? 30,
        speed: 0,
        locationBearing: null,
        timestamp: Date.now(),
      });
      if (displaySvg.x != null) {
        camera?.centerOnPoint(displaySvg.x, displaySvg.y);
      }
      return puck?.isVisible?.() || targetSvg.x != null;
    }

    async function onLocBtnClick() {
      // 1) ainda não iniciou → feedback imediato + permissão/GPS
      if (!started) {
        showSearchingPuck();
        const ok = await start();
        if (!ok) return;
        camera?.setFollowMode("follow");
        updateLocBtn();
        if (displaySvg.x != null) camera?.centerOnPoint(displaySvg.x, displaySvg.y);
        toast("Seguindo sua localização.");
        return;
      }

      // 2) GPS ligado mas ainda sem fix → tenta de novo
      if (!getState().userNav?.gpsAvailable) {
        showSearchingPuck();
        location?.start();
        const perm = await ensurePermissions();
        if (perm.ok && perm.position) {
          applyAcceptedPosition(perm.position);
          camera?.centerOnPoint(displaySvg.x, displaySvg.y);
        } else if (perm.ok) {
          toast("Buscando sua localização…");
        }
        return;
      }

      // 3) cicla livre → seguir → seguir+direção
      camera?.cycleFollowMode();
      updateLocBtn();
      const mode = getState().userNav?.followMode;
      if (mode === "follow") {
        if (displaySvg.x != null) camera?.centerOnPoint(displaySvg.x, displaySvg.y);
        toast("Seguindo sua localização.");
      } else if (mode === "follow-heading") {
        toast("Seguindo localização e direção.");
      } else {
        toast("Mapa livre — arraste para navegar.");
      }
    }

    function bindLocBtn() {
      if (!locBtn || locBtn._bound) return;
      locBtn._bound = true;
      locBtn.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        onLocBtnClick().catch((err) => console.warn("locBtn:", err));
      });
    }

    function onVisibility() {
      if (document.hidden) heading?.pause();
      else heading?.resume();
    }

    function onMapDragged() {
      camera?.exitFollow();
      updateLocBtn();
    }

    function stop() {
      location?.stop();
      heading?.stop();
      if (animId) cancelAnimationFrame(animId);
      animId = null;
      document.removeEventListener("visibilitychange", onVisibility);
      puck?.hide();
      showGpsCompass(false);
      started = false;
      updateLocBtn();
    }

    function getNavigationState() {
      return { ...(getState().userNav || defaultNav) };
    }

    // botão sempre funcional, mesmo se o auto-start falhar
    initState();
    bindLocBtn();
    updateLocBtn();
    loadGeo().catch(() => {});

    return {
      start,
      stop,
      onMapDragged,
      getNavigationState,
      updateLocBtn,
      onLocBtnClick,
      showAtLatLng,
      isStarted: () => started,
      setFollowMode: (mode) => {
        camera?.setFollowMode(mode);
        updateLocBtn();
      },
      startFollowing: async () => {
        const ok = await start({ silent: true });
        if (ok) {
          camera?.setFollowMode("follow");
          updateLocBtn();
        }
        return ok;
      },
    };
  }

  global.UserLocationSystem = { create: createUserLocationSystem };
})(typeof window !== "undefined" ? window : globalThis);
