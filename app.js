(() => {
  "use strict";

  const CONFIG = globalThis.PIBMapConfig;
  /* ============================================================ ELEMENTOS */
  const $ = (id) => document.getElementById(id);
  const el = {
    app: $("app"), panel: $("panel"), panelToggle: $("panelToggle"),
    originInput: $("originInput"), destInput: $("destInput"),
    originList: $("originList"), destList: $("destList"),
    swapBtn: $("swapBtn"), hereBtn: $("hereBtn"), routeBtn: $("routeBtn"),
    summary: $("summary"), summaryDist: $("summaryDist"), summaryMeta: $("summaryMeta"),
    summaryTime: $("summaryTime"),
    routeOptions: $("routeOptions"), routePick: $("routePick"),
    routePickLabel: $("routePickLabel"),
    routePickCount: $("routePickCount"), themeBtn: $("themeBtn"),
    floorBtn: $("floorBtn"), floorMenu: $("floorMenu"), floorPicker: $("floorPicker"),
    areaBtn: $("areaBtn"), areaMenu: $("areaMenu"), areaPicker: $("areaPicker"),
    areaBadge: $("areaBadge"),
    floorHint: $("floorHint"), floorBanner: $("floorBanner"),
    floorBannerTitle: $("floorBannerTitle"), floorBannerMsg: $("floorBannerMsg"),
    mapTools: $("mapTools"), mapToolsExtras: $("mapToolsExtras"),
    panelActionsHost: $("panelActionsHost"), panelGrab: $("panelGrab"),
    searchLevelSelect: $("searchLevelSelect"),
    browseBar: $("browseBar"),
    steps: $("steps"), clearBtn: $("clearBtn"), navBtn: $("navBtn"), navBtnLabel: $("navBtnLabel"),
    summaryTop: $("summaryTop"), summaryStats: $("summaryStats"), summaryBody: $("summaryBody"),
    statusHint: $("statusHint"), scaleHint: $("scaleHint"), svgName: $("svgName"),
    calibBtn: $("calibBtn"), calibPanel: $("calibPanel"), calibHelp: $("calibHelp"),
    calibRealInput: $("calibRealInput"), calibResult: $("calibResult"),
    calibCancel: $("calibCancel"), calibSave: $("calibSave"),
    stage: $("stage"), viewport: $("viewport"), canvas: $("canvas"),
    svgHost: $("svgHost"), overlay: $("overlay"),
    routeLayer: $("routeLayer"),
    routePathBase: $("routePathBase"),
    routePathGlow: $("routePathGlow"),
    routeStart: $("routeStart"), routeEnd: $("routeEnd"), hereMarker: $("hereMarker"),
    zoomIn: $("zoomIn"), zoomOut: $("zoomOut"), fitBtn: $("fitBtn"), locBtn: $("locBtn"),
    gpsOrientBtn: $("gpsOrientBtn"), gpsOrientCancel: $("gpsOrientCancel"),
    gpsAccuracyHint: $("gpsAccuracyHint"),
    gpsConfirmModal: $("gpsConfirmModal"), gpsConfirmTitle: $("gpsConfirmTitle"),
    gpsConfirmActions: $("gpsConfirmActions"), gpsConfirmDismiss: $("gpsConfirmDismiss"),
    gpsCompass: $("gpsCompass"), gpsCompassArrow: $("gpsCompassArrow"),
    navOverlay: $("navOverlay"), compassArrow: $("compassArrow"),
    navStepText: $("navStepText"), navDistText: $("navDistText"),
    navDirArrow: $("navDirArrow"), navProgressFill: $("navProgressFill"),
    navTimeRemain: $("navTimeRemain"), navDistRemain: $("navDistRemain"),
    navPrev: $("navPrev"), navNext: $("navNext"), navExit: $("navExit"), navHint: $("navHint"),
    toast: $("toast"),
  };

  /* ============================================================ ESTADO */
  const G = { nodes: {}, adj: {}, pois: [], walls: [], main: null, vbW: 1000, vbH: 720, autoN: 0 };
  const state = {
    origin: null, dest: null, route: null, routeOptions: [], routeIdx: 0, routePickOpen: false,
    scale: 1, minScale: 0.2, maxScale: 8, panX: 0, panY: 0,
    drag: false, sx: 0, sy: 0, px: 0, py: 0, moved: false,
    placingHere: false, here: null,
    activeField: null, navIdx: 0, heading: 0,
    calibration: null,
    navGraph: null,
    navGraphError: null,
    navLoader: null,
    calibMode: false, calibStep: 0, calibPoints: [],
    walkingSpeedMps: CONFIG.walkingSpeedMps || 1.2,
    activeLevel: "L00",
    floorMenuOpen: false,
    areaMenuOpen: false,
    searchGroup: "all",
    searchLevel: "all", // padrão: todos os níveis
    floorViews: {}, // { L00: SVGElement, L01: SVGElement, ... }
    floorMeta: {},  // { L00: { vbW, vbH }, ... }
    floorWalls: {}, // { B01: [poly[]], B02: [poly[]], L01: ... }
    userNav: null,
    userLocation: null,
    gpsOrientation: null,
    liveNav: null,
    liveMapMatchEnhancer: null,
  };

  const CAT_LABEL = {
    acesso: "Entrada/Acesso", apoio: "Apoio", servico: "Serviço",
    ambiente: "Ambiente", alimentacao: "Alimentação", estacionamento: "Estacionamento",
  };

  /* ============================================================ UTIL */
  const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
  const norm = (s = "") => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  /** Normaliza texto de busca (sem acentos, pontuação vira espaço). */
  const normSearch = (s = "") => norm(s).replace(/[.\-_/]+/g, " ").replace(/\s+/g, " ").trim();

  /** Correções ortográficas comuns (chave sem acento → forma correta). */
  const PT_SPELLING = {
    oracao: "oração",
    formacao: "formação",
    comunicacao: "comunicação",
    transmicao: "transmissão",
    transmissao: "transmissão",
    ministerio: "ministério",
    espaco: "espaço",
    recepcao: "recepção",
    refeitorio: "refeitório",
    ginasio: "ginásio",
    auditorio: "auditório",
    banisterio: "batistério",
    batisterio: "batistério",
    conexao: "conexão",
    elevacao: "elevação",
    estacao: "estação",
    acolher: "acolher",
    jardim: "jardim",
    capela: "capela",
    templo: "templo",
    esportes: "esportes",
    albert: "Albert",
    encomun: "Encomun",
  };

  const POI_ACRONYMS = new Set(["cf", "rgo", "abasc", "wc", "ti", "rh", "adm"]);

  const PT_LOWER_WORDS = new Set([
    "de", "da", "do", "das", "dos", "e", "em", "na", "no", "nas", "nos",
    "a", "o", "as", "os", "por", "com", "sem",
  ]);

  function editDistance(a, b) {
    if (a === b) return 0;
    if (!a?.length) return b?.length || 0;
    if (!b?.length) return a.length;
    let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
    for (let i = 1; i <= a.length; i++) {
      const cur = [i];
      for (let j = 1; j <= b.length; j++) {
        cur[j] = a[i - 1] === b[j - 1]
          ? prev[j - 1]
          : 1 + Math.min(prev[j], cur[j - 1], prev[j - 1]);
      }
      prev = cur;
    }
    return prev[b.length];
  }

  function formatPoiWord(word, isFirst) {
    if (word === "·" || word === "|") return word;
    const bare = word.replace(/([.,;:!?]+)$/, "");
    const punct = word.slice(bare.length);
    const lower = bare.toLowerCase();
    if (POI_ACRONYMS.has(lower)) return lower.toUpperCase() + punct;
    if (PT_SPELLING[lower]) {
      const fixed = PT_SPELLING[lower];
      if (isFirst) return fixed.charAt(0).toUpperCase() + fixed.slice(1) + punct;
      return fixed + punct;
    }
    if (!isFirst && PT_LOWER_WORDS.has(lower)) return lower + punct;
    if (/^[A-ZÁÉÍÓÚÂÊÔÃÕÇ]{2,}$/.test(bare) && !POI_ACRONYMS.has(lower)) {
      const cased = lower.charAt(0).toUpperCase() + lower.slice(1);
      return (isFirst ? cased : lower) + punct;
    }
    if (!isFirst) return lower + punct;
    return lower.charAt(0).toUpperCase() + lower.slice(1) + punct;
  }

  function formatPoiDisplayName(text) {
    if (!text) return text;
    const parts = String(text).trim().split(/\s+/).filter(Boolean);
    return parts.map((w, i) => formatPoiWord(w, i === 0)).join(" ");
  }

  function fixPortugueseAccents(text) {
    if (!text) return text;
    return String(text).replace(/\b([A-Za-zÀ-ÿ]+)\b/g, (word) => {
      const key = norm(word);
      const fix = PT_SPELLING[key];
      if (!fix) return word;
      if (word === word.toUpperCase() && word.length > 2) {
        return fix.charAt(0).toUpperCase() + fix.slice(1);
      }
      if (word[0] === word[0].toUpperCase()) {
        return fix.charAt(0).toUpperCase() + fix.slice(1);
      }
      return fix;
    });
  }

  function searchQueryCorrection(query) {
    const q = normSearch(query);
    if (q.length < 3) return null;
    let best = null;
    let bestDist = Infinity;
    for (const [key, value] of Object.entries(PT_SPELLING)) {
      if (key === q) return value;
      const d = editDistance(q, key);
      const maxLen = Math.max(q.length, key.length);
      if (maxLen < 4) continue;
      if (d <= 1 && d < bestDist) {
        bestDist = d;
        best = value;
      } else if (d <= 2 && maxLen >= 6 && d / maxLen <= 0.34 && d < bestDist) {
        bestDist = d;
        best = value;
      }
    }
    return best;
  }

  const Cal = () => (typeof MapCalibration !== "undefined" ? MapCalibration : null);

  function poiSearchHaystacks(poi) {
    if (!poi) return [];
    const raw = poiRawKey(poi);
    const aliases = (CONFIG.poiSearchAliases || {})[raw]
      || (CONFIG.poiSearchAliases || {})[poi.rawId]
      || [];
    return [
      poi.name,
      poi.searchLabel,
      poi.building,
      poi.level,
      poi.code,
      raw,
      poi.rawId,
      CAT_LABEL[poi.cat] || "",
      ...aliases,
    ].filter(Boolean).map((s) => normSearch(String(s)));
  }

  function poiSearchScore(poi, query) {
    const q = normSearch(String(query || "").trim());
    if (!q) return 1;
    let best = 0;
    for (const h of poiSearchHaystacks(poi)) {
      if (!h) continue;
      if (h === q) best = Math.max(best, 100);
      else if (h.startsWith(q)) best = Math.max(best, 85);
      else if (h.split(/\s+/).some((w) => w === q)) best = Math.max(best, 78);
      else if (h.split(/\s+/).some((w) => w.startsWith(q))) best = Math.max(best, 68);
      else if (h.includes(q)) best = Math.max(best, 50);
      else {
        for (const w of h.split(/\s+/)) {
          if (w.length < 3 || q.length < 3) continue;
          const d = editDistance(q, w);
          const maxLen = Math.max(q.length, w.length);
          if (d <= 1 && q.length >= 4) best = Math.max(best, 72);
          else if (d <= 2 && q.length >= 5 && d / maxLen <= 0.35) best = Math.max(best, 58);
        }
      }
    }
    return best;
  }

  function poiMatchesSearch(poi, query) {
    return poiSearchScore(poi, query) > 0;
  }

  function applyPoiDisplayName(poi) {
    if (!poi) return poi;
    const raw = poiRawKey(poi);
    const display = (CONFIG.poiDisplayNames || {})[raw]
      || (CONFIG.poiDisplayNames || {})[poi.rawId];
    if (display) poi.name = display;
    poi.name = fixPortugueseAccents(formatPoiDisplayName(poi.name || ""));
    return poi;
  }

  function getMetersPerUnit() {
    if (state.calibration?.metersPerUnit > 0) return state.calibration.metersPerUnit;
    return CONFIG.metersPerUnit;
  }

  const fmtMeters = (u) => {
    const m = u * getMetersPerUnit();
    return m < 1000 ? `${Math.round(m)} m` : `${(m / 1000).toFixed(1)} km`;
  };

  function fmtRouteTime(lengthUnits) {
    const cal = Cal();
    const meters = lengthUnits * getMetersPerUnit();
    const secs = cal
      ? cal.calculateWalkingTimeSeconds(meters, state.walkingSpeedMps)
      : meters / state.walkingSpeedMps;
    const label = cal ? cal.formatWalkingTime(secs) : `${Math.max(1, Math.round(secs / 60))} min`;
    const accuracy = state.calibration?.accuracy === "confirmed" ? "" : " · estimado";
    return `≈ ${label}${accuracy}`;
  }

  function fmtNavTimeShort(lengthUnits) {
    const meters = lengthUnits * getMetersPerUnit();
    const cal = Cal();
    const secs = cal
      ? cal.calculateWalkingTimeSeconds(meters, state.walkingSpeedMps)
      : meters / state.walkingSpeedMps;
    return `${Math.max(1, Math.round(secs / 60))} min`;
  }

  function navRemainingLength(fromIdx) {
    const route = state.route;
    const p = navViewPoints(route);
    if (!p || p.length < 2) return 0;
    let len = 0;
    const start = Math.max(0, Math.min(fromIdx, p.length - 2));
    for (let j = start; j < p.length - 1; j++) len += dist(p[j], p[j + 1]);
    const legs = route?.legs || [];
    if (legs.length > 1) {
      const cur = navLegIndex(route);
      for (let i = cur + 1; i < legs.length; i++) {
        const pts = legs[i].points || [];
        for (let j = 1; j < pts.length; j++) len += dist(pts[j - 1], pts[j]);
      }
    }
    return len;
  }

  function toast(msg) {
    clearTimeout(toast._t);
    el.toast.textContent = msg;
    el.toast.classList.add("show");
    toast._t = setTimeout(() => el.toast.classList.remove("show"), 2400);
  }

  function updateScaleHint() {
    if (!el.scaleHint) return;
    const c = state.calibration;
    if (!CONFIG.isDev || !c) {
      el.scaleHint.hidden = true;
      el.scaleHint.textContent = "";
      return;
    }
    el.scaleHint.hidden = false;
    const kind = c.accuracy === "confirmed" ? "confirmada" : "estimada (escala gráfica)";
    el.scaleHint.textContent =
      `Escala ${kind}: ${c.unitsPerMeter.toFixed(2)} un/m · ${c.metersPerUnit.toFixed(4)} m/un` +
      ` · ref. ${c.referenceName} (${c.realDistanceMeters.toFixed(2)} m)`;
  }

  function setupDevUi() {
    if (CONFIG.isDev) document.body.classList.add("is-dev");
    else document.body.classList.remove("is-dev");
    const box = $("calibBox");
    const foot = $("devFoot");
    if (box) box.hidden = !CONFIG.isDev;
    if (foot) foot.hidden = !CONFIG.isDev;
  }

  function applyCalibration(calibration, { persist = false } = {}) {
    if (!calibration) return;
    const vb = { x: 0, y: 0, width: G.vbW, height: G.vbH };
    const cal = Cal();
    if (cal) {
      const check = cal.validateCalibration(calibration, vb);
      if (!check.ok) {
        console.warn("Calibração com avisos:", check.issues);
      }
    }
    state.calibration = calibration;
    CONFIG.metersPerUnit = calibration.metersPerUnit;
    updateScaleHint();
    if (state.route) {
      el.summaryDist.textContent = fmtMeters(state.route.length);
      if (el.summaryTime) el.summaryTime.textContent = fmtRouteTime(state.route.length);
    }
    if (persist) saveCalibrationPayload();
  }

  function buildCalibrationPayload() {
    return {
      map: {
        id: "pib-curitiba",
        version: "1.0.0",
        viewBox: { x: 0, y: 0, width: G.vbW, height: G.vbH },
      },
      calibration: state.calibration,
      references: state.calibration ? [{
        id: state.calibration.referenceId,
        name: state.calibration.referenceName,
        pointA: state.calibration.startPoint,
        pointB: state.calibration.endPoint,
        realDistanceMeters: state.calibration.realDistanceMeters,
        digitalDistance: state.calibration.digitalDistance,
        unitsPerMeter: state.calibration.unitsPerMeter,
      }] : [],
      walkingSpeedMetersPerSecond: state.walkingSpeedMps,
      notes: "Medidas estimadas por escala gráfica (Batistério 6,80 m) até múltiplas referências confirmadas.",
    };
  }

  async function saveCalibrationPayload() {
    const payload = buildCalibrationPayload();
    try {
      localStorage.setItem("pib-map-calibration", JSON.stringify(payload));
    } catch { /* ignore */ }
    try {
      const res = await fetch("/api/calibration", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.ok) toast("Calibração salva.");
      else toast("Calibração aplicada (salvamento local).");
    } catch {
      toast("Calibração aplicada (navegador).");
    }
  }

  async function loadCalibration() {
    // 1) localStorage
    try {
      const raw = localStorage.getItem("pib-map-calibration");
      if (raw) {
        const data = JSON.parse(raw);
        if (data?.calibration?.metersPerUnit) {
          if (data.walkingSpeedMetersPerSecond) state.walkingSpeedMps = data.walkingSpeedMetersPerSecond;
          applyCalibration(data.calibration);
          return true;
        }
      }
    } catch { /* ignore */ }

    // 2) arquivo JSON
    try {
      const res = await fetch(CONFIG.calibrationUrl, { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        if (data?.walkingSpeedMetersPerSecond) state.walkingSpeedMps = data.walkingSpeedMetersPerSecond;
        if (data?.calibration?.metersPerUnit) {
          applyCalibration(data.calibration);
          return true;
        }
      }
    } catch { /* ignore */ }
    return false;
  }

  async function loadNavigation() {
    state.navGraph = null;
    state.navGraphError = null;
    if (!globalThis.NavigationRouter) {
      console.warn("NavigationRouter não carregado");
      return false;
    }

    function getNavLoader() {
      if (!state.navLoader && globalThis.NavigationGraphLoader) {
        state.navLoader = NavigationGraphLoader.create({ baseUrl: "data/navigation/" });
      }
      return state.navLoader;
    }

    async function ensureNavGraphFloors(...levels) {
      const loader = getNavLoader();
      const ids = [...new Set(levels.filter(Boolean))];
      if (!loader || !ids.length) return state.navGraph;
      try {
        await loader.ensureFloors(ids);
        state.navGraph = loader.getGraph();
        syncPoisFromNavigation(loader.getMeta()?.poiCatalog || [], { injectAllFloors: true });
      } catch (err) {
        console.error("ensureNavGraphFloors:", err);
        state.navGraphError = String(err.message || err);
      }
      return state.navGraph;
    }
    state.ensureNavGraphFloors = ensureNavGraphFloors;
    state.ensureNavGraphForTrip = ensureNavGraphForTrip;

    function syncPoisFromNavigation(poiSource, { injectAllFloors = false } = {}) {
      const list = poiSource || [];
      for (const poi of G.pois) {
        const match = list.find((p) =>
          p.rawId === poi.rawId
          || p.id === poi.rawId
          || (p.id && poi.rawId && p.id.endsWith(poi.rawId))
        );
        if (match?.nodeIds?.length) {
          poi.navNodeIds = match.nodeIds.slice();
          poi.navId = match.id;
          if (match.level) poi.level = match.level;
          if (match.mapLevel) poi.mapLevel = match.mapLevel;
          if (match.building) poi.building = match.building;
          if (match.accessNote) poi.accessNote = match.accessNote;
          const nid = match.nodeIds[0];
          const node = state.navGraph?.nodesById?.get(nid);
          if (node) {
            poi.anchor = nid;
            poi.snap = { x: node.x, y: node.y };
            if (poi.iconX == null && poi.iconY == null) {
              poi.iconX = node.x;
              poi.iconY = node.y;
            }
          } else if (nid && G.nodes[nid]) {
            poi.anchor = nid;
            poi.snap = { x: G.nodes[nid].x, y: G.nodes[nid].y };
          }
        }
        enrichPoiMeta(poi);
        applyInjectedPoiIcon(poi);
      }

      for (const jp of list) {
        const already = G.pois.some((p) =>
          p.navId === jp.id || p.rawId === jp.rawId || p.id === jp.rawId
        );
        if (already || !jp.nodeIds?.length) continue;
        const nid = jp.nodeIds[0];
        const node = state.navGraph?.nodesById?.get(nid);
        const lvl = jp.level || node?.level || "L00";
        const isOtherFloor = lvl !== "L00";
        if (!node && !injectAllFloors) continue;
        if (!node && injectAllFloors) {
          const raw = jp.rawId || jp.id;
          G.pois.push(enrichPoiMeta({
            id: String(raw).startsWith(lvl) ? raw : (isOtherFloor ? `${lvl}_${raw}` : raw),
            rawId: raw,
            name: jp.name || decodePoiName(jp.rawId || jp.id),
            x: 0,
            y: 0,
            level: lvl,
            mapLevel: jp.mapLevel,
            building: jp.building,
            group: jp.group,
            cat: jp.cat || "acesso",
            accessNote: jp.accessNote || null,
            navNodeIds: jp.nodeIds.slice(),
            navId: jp.id,
            anchor: nid,
            iconHidden: true,
          }));
          continue;
        }
        if (!node) continue;
        if (!isOtherFloor && !jp.inject) continue;
        const raw = jp.rawId || jp.id;
        const poi = enrichPoiMeta({
          id: String(raw).startsWith(node.level) ? raw : (isOtherFloor ? `${node.level}_${raw}` : raw),
          rawId: raw,
          name: jp.name || decodePoiName(jp.rawId || jp.id),
          x: node.x,
          y: node.y,
          iconX: node.x,
          iconY: node.y,
          level: jp.level || node.level || "L00",
          mapLevel: jp.mapLevel || (floorById(jp.level || node.level)?.mapUrl ? (jp.level || node.level) : undefined),
          building: jp.building,
          group: jp.group,
          cat: jp.cat || "acesso",
          accessNote: jp.accessNote || null,
          navNodeIds: jp.nodeIds.slice(),
          navId: jp.id,
          anchor: nid,
          snap: { x: node.x, y: node.y },
          iconHidden: true,
        });
        G.pois.push(poi);
        applyInjectedPoiIcon(poi);
      }
      G.pois.forEach((p) => applyInjectedPoiIcon(p));
      G.pois.sort((a, b) => (a.searchLabel || a.name).localeCompare(b.searchLabel || b.name, "pt-BR"));
    }

    try {
      const loader = getNavLoader();
      let result;
      try {
        result = await loader.loadInitialLevel();
      } catch (lazyErr) {
        console.warn("Navigation lazy load — fallback monolito:", lazyErr.message);
        result = await loader.loadMonolith(CONFIG.navigationUrl);
      }

      state.navGraph = result.graph;
      const meta = result.meta || {};
      if (meta.metersPerUnit > 0 && !state.calibration) {
        CONFIG.metersPerUnit = meta.metersPerUnit;
      }
      if (meta.walkingSpeedMetersPerSecond) {
        state.walkingSpeedMps = meta.walkingSpeedMetersPerSecond;
      }

      syncPoisFromNavigation(result.poiCatalog || result.graph?.raw?.pois || [], {
        injectAllFloors: !!result.poiCatalog,
      });
      try {
        await globalThis.PIBMapDeferred?.loadLiveNavStack?.();
      } catch (liveErr) {
        console.warn("Live nav defer:", liveErr);
      }
      initLiveNavigation();
      return true;
    } catch (err) {
      state.navGraphError = err;
      console.error("Falha ao carregar navegação:", err);
      return false;
    }
  }

  /** Navegação ao vivo — map matching sobre o grafo (outdoor na fase inicial). */
  function initLiveNavigation() {
    if (state.liveNav || typeof LiveNavigationController === "undefined") return null;
    if (!state.navGraph) return null;

    state.liveNav = LiveNavigationController.create({
      getMetersPerUnit,
      onRouteReplace: (route) => {
        if (!route) return;
        state.route = route;
        paintActiveRouteLeg();
        updateNav();
      },
      onStatusMessage: (msg) => {
        if (el.navHint && state.userNav) el.navHint.textContent = msg;
        if (LiveNavigationConfig?.isDebugNavigation?.() && el.gpsAccuracyHint) {
          el.gpsAccuracyHint.textContent = `[debug] ${msg}`;
        }
      },
    });
    state.liveNav.init({ navGraph: state.navGraph, level: state.activeLevel });
    state.liveMapMatchEnhancer = state.liveNav.createMapMatchEnhancer();
    return state.liveNav;
  }

  async function rerouteFromVirtualNode(matchResult) {
    if (
      !matchResult?.matchedEdgeId ||
      !state.navGraph ||
      !state.dest ||
      typeof LiveVirtualNode === "undefined"
    ) {
      return false;
    }
    const destIds = resolveNavNodeIds(state.dest);
    if (!destIds.length) return false;

    const edgeCache = LiveEdgeCache.buildEdgeCache(state.navGraph, {
      level: state.activeLevel,
      metersPerUnit: getMetersPerUnit(),
    });

    const route = LiveVirtualNode.calculateRouteFromVirtualNode({
      baseGraph: state.navGraph,
      matchResult,
      destinationNodeIds: destIds,
      routePreferences: routeOptionsFromJson(),
      edgeCache,
    });

    if (!route) return false;
    state.route = route;
    paintActiveRouteLeg();
    updateNav();
    return true;
  }

  /** Contagem de locais pesquisáveis por andar (após navigation.json). */
  function countLocaisForFloor(floorId) {
    return (G.pois || []).filter((p) => {
      enrichPoiMeta(p);
      return isSearchablePoi(p) && (p.level || "L00") === floorId;
    }).length;
  }

  /** Indicador por área: T | N locais · L01 | … · L05 | em breve */
  function renderFloorLocaisHint(overrideText) {
    if (!el.statusHint) return;
    if (overrideText) {
      el.statusHint.classList.remove("hint--floors");
      el.statusHint.textContent = overrideText;
      return;
    }
    el.statusHint.classList.add("hint--floors");
    const rows = visibleFloors().map((f) => {
      const tag = f.id === "L00" ? "T" : f.label;
      const n = countLocaisForFloor(f.id);
      const ready = !!f.ready && n > 0;
      const val = ready ? `${n} ${n === 1 ? "local" : "locais"}` : "em breve";
      return `<div class="floor-stat"><span class="floor-stat__id">${tag}</span><span class="floor-stat__sep">|</span><span class="floor-stat__val">${val}</span></div>`;
    });
    el.statusHint.innerHTML = rows.join("");
  }

  function poiLevel(poi) {
    if (!poi) return "L00";
    // Roteamento: nível do grafo (B01/B02/L01…), não o mapa onde o ícone aparece (mapLevel)
    if (poi.level) return poi.level;
    if (poi.anchor && state.navGraph?.nodesById.has(poi.anchor)) {
      return state.navGraph.nodesById.get(poi.anchor).level || "L00";
    }
    const fromId = levelFromId(poi.rawId || poi.id);
    if (fromId) return fromId;
    if (poi.mapLevel) return poi.mapLevel;
    return "L00";
  }

  /** Nível exibido ao usuário (ex.: B01 Subsolo), independente do mapa L00. */
  function poiDisplayLevel(poi) {
    if (!poi) return "L00";
    return poi.level || poi.mapLevel || poiLevel(poi);
  }

  /** Título curto na lista/campo: "Área Kids · L01" (sem "2º andar · ADM — Administrativo"). */
  function poiSuggestTitle(poi) {
    if (!poi) return "";
    if (poi.id === "__here__") return poi.searchLabel || poi.name || "Estou aqui";
    const name = poi.name || "Local";
    const lvl = poiDisplayLevel(poi);
    if (!lvl || lvl === "L00") return name;
    return `${name} · ${lvl}`;
  }

  /** Área Kids é destino só no L01 (demais andares / L00 não entram na busca). */
  function isAreaKidsDestination(poi) {
    if (!poi) return false;
    const id = norm(poi.rawId || poi.id || "");
    const n = norm(poi.name || "");
    return /area[_ ]?kids/.test(id) || n === "area kids";
  }

  /** Elevador ginásio (ícone no mapa) — busca usa “Min. Esportes” na entrada lateral. */
  function isElevadorGinasioSearchHidden(poi) {
    if (!poi) return false;
    const id = norm(poi.rawId || poi.id || "");
    return id === "p026_elevador_ginasio";
  }

  function isSearchablePoi(poi) {
    if (!poi || poi.active === false) return false;
    if (isElevadorGinasioSearchHidden(poi)) return false;
    if (isAreaKidsDestination(poi) && (poi.level || "L00") !== "L01") return false;
    return true;
  }

  /** Linha secundária da lista: só o código do andar. */
  function poiSuggestMeta(poi) {
    if (!poi) return "";
    const lvl = poiDisplayLevel(poi);
    if (poi.accessNote) return `${lvl} · acesso pelo L00`;
    return lvl;
  }

  function poiLevelOverride(rawId) {
    if (!rawId) return null;
    const key = String(rawId).replace(/^L00_P_/i, "").replace(/^B0\d_P_/i, "");
    return (CONFIG.poiLevels || {})[key] || (CONFIG.poiLevels || {})[rawId] || null;
  }

  function floorTitle(levelId) {
    const f = floorById(levelId);
    if (!f) return levelId || "andar";
    return `${f.id} — ${f.title}`;
  }

  function floorMenuMeta(f) {
    if (f.mapUrl || (f.ready && countLocaisForFloor(f.id) > 0)) return "";
    if (f.ready) return "";
    return "em breve";
  }

  function elevatorHub(levelId) {
    return (CONFIG.elevatorHubs || {})[levelId] || null;
  }

  function stairHub(levelId) {
    return (CONFIG.stairHubs || {})[levelId] || null;
  }

  function isAdmFloor(levelId) {
    return /^L0[1-6]$/.test(String(levelId || ""));
  }

  /** Andares com mapa publicado T (L00) … L06 e subsolos B01/B02. */
  function isCampusFloor(levelId) {
    return /^(L0[0-6]|B0[12])$/.test(String(levelId || ""));
  }

  function isCrossCampusFloorPair(oLvl, dLvl) {
    return isCampusFloor(oLvl) && isCampusFloor(dLvl) && oLvl !== dLvl;
  }

  /** Campus L00 mesmo andar: polyline global. Andares ADM/subsolo: sempre malha por edges. */
  function preferGraphRoutePaint(levelId, oLvl, dLvl) {
    if (isAdmFloor(levelId) || isBasementFloor(levelId)) return true;
    if (oLvl !== dLvl) return true;
    return false;
  }

  /** Só o campus L00 usa polyline completa de route.points na pintura (malha outdoor). */
  function shouldUseFullRoutePolyline(levelId, oLvl, dLvl) {
    return levelId === "L00" && oLvl === dLvl && oLvl === "L00";
  }

  /** Nós do elevador ADM entre dois andares (inclui origem e destino). */
  function elevatorHubWaypoints(fromLvl, toLvl) {
    const order = ["L00", "L01", "L02", "L03", "L04", "L05", "L06"];
    const i = order.indexOf(fromLvl);
    const j = order.indexOf(toLvl);
    if (i < 0 || j < 0 || i === j) return [];
    const lo = Math.min(i, j);
    const hi = Math.max(i, j);
    const ids = [];
    for (let k = lo; k <= hi; k++) {
      const hub = elevatorHub(order[k]);
      if (!hub?.nodeId) return [];
      if (!state.navGraph?.nodesById?.has(hub.nodeId)) return [];
      ids.push(hub.nodeId);
    }
    if (i > j) ids.reverse();
    return ids;
  }

  /** Rotas entre andares T…L06: elevador ou escada lateral do andar de origem. */
  function buildCrossCampusFloorRoutes(NR, startIds, endIds, origin, dest) {
    const oLvl = poiLevel(origin);
    const dLvl = poiLevel(dest);
    if (!isCrossCampusFloorPair(oLvl, dLvl)) return [];

    const out = [];
    const elevVia = elevatorHubWaypoints(oLvl, dLvl);
    if (elevVia.length >= 2) {
      const elevRoute = buildNamedExternalRoute(NR, startIds, endIds, origin, dest, {
        via: elevVia,
        label: "Pelo elevador",
        avoidParking: false,
        allowParking: true,
        bannedTypes: ["stairs"],
      });
      if (elevRoute) {
        elevRoute.kind = "elevator";
        elevRoute.label = "Pelo elevador";
        pushUniqueRoute(out, elevRoute, MAX_ROUTE_OPTIONS);
      }
    }

    if (isStairRoutePair(oLvl, dLvl)) {
      const stairVia = stairHubWaypoints(oLvl, dLvl);
      if (stairVia.length >= 2) {
        const stairRoute = buildNamedExternalRoute(NR, startIds, endIds, origin, dest, {
          via: stairVia,
          label: "Pela escada lateral",
          avoidParking: false,
          allowParking: true,
          bannedTypes: ["elevator"],
        });
        if (stairRoute) {
          stairRoute.viaStairs = true;
          stairRoute.kind = "stairs";
          stairRoute.label = "Pela escada lateral";
          stairRoute.namedExternal = true;
          pushUniqueRoute(out, stairRoute, MAX_ROUTE_OPTIONS);
        }
      }
    }

    return out;
  }

  /** Par elegível à alternativa “Pela escada lateral” (L00↔L01…L06). */
  function isStairRoutePair(oLvl, dLvl) {
    if (!oLvl || !dLvl || oLvl === dLvl) return false;
    const oOk = oLvl === "L00" || isAdmFloor(oLvl);
    const dOk = dLvl === "L00" || isAdmFloor(dLvl);
    return oOk && dOk && (isAdmFloor(oLvl) || isAdmFloor(dLvl));
  }

  /** Nós da escada lateral entre dois andares (inclui L00 e destino). */
  function stairHubWaypoints(fromLvl, toLvl) {
    const order = ["L00", "L01", "L02", "L03", "L04", "L05", "L06"];
    const i = order.indexOf(fromLvl);
    const j = order.indexOf(toLvl);
    if (i < 0 || j < 0 || i === j) return [];
    const lo = Math.min(i, j);
    const hi = Math.max(i, j);
    const ids = [];
    for (let k = lo; k <= hi; k++) {
      const hub = stairHub(order[k]);
      if (!hub?.nodeId) return [];
      if (!state.navGraph?.nodesById?.has(hub.nodeId)) return [];
      ids.push(hub.nodeId);
    }
    if (i > j) ids.reverse();
    return ids;
  }

  function isBasementFloor(levelId) {
    return /^B0[12]$/.test(String(levelId || ""));
  }

  /** Rota envolve subsolo B01 e/ou B02 em andares diferentes. */
  function routeInvolvesBasementTransfer(oLvl, dLvl) {
    if (!oLvl || !dLvl || oLvl === dLvl) return false;
    return isBasementFloor(oLvl) || isBasementFloor(dLvl);
  }

  function narniaHubNode(levelId) {
    return (CONFIG.narniaHub || {})[levelId] || null;
  }

  function narniaGateIcon(levelId) {
    return (CONFIG.narniaGateIcons || {})[levelId] || null;
  }

  function isNarniaEntrancePoi(poi) {
    if (!poi) return false;
    const raw = norm(poi.rawId || poi.id || "");
    const name = norm(poi.name || "");
    const ids = CONFIG.narniaPoiRawIds || [];
    if (ids.some((id) => raw === norm(id))) return true;
    return /entrada.*narnia|narnia.*entrada|porta.*narnia/.test(raw + name);
  }

  /** Andar do ícone da Porta de Nárnia para este POI. */
  function narniaLevelForPoi(poi) {
    if (!poi || !isNarniaEntrancePoi(poi)) return null;
    const raw = norm(poi.rawId || poi.id || "");
    if (raw === "b01_entrada_narnia") return "B01";
    if (raw === "b02_entrada_narnia_map") return "B02";
    if (/b02_entrada_narnia|p028_b02_entrada_narnia/.test(raw)) return "L00";
    return poiLevel(poi);
  }

  function applyNarniaGateIconToPoi(poi) {
    if (!isNarniaEntrancePoi(poi)) return poi;
    const lvl = narniaLevelForPoi(poi) || poiLevel(poi);
    const gate = narniaGateIcon(isBasementFloor(lvl) ? lvl : "L00");
    if (!gate) return poi;
    poi.iconX = gate.x;
    poi.iconY = gate.y;
    poi.x = gate.x;
    poi.y = gate.y;
    return poi;
  }

  /** Ajusta o fim/início da polyline ao lampião — sem criar diagonal longa fora do grafo. */
  function refineNarniaEndpoint(pts, levelId, which) {
    const gate = narniaGateIcon(levelId);
    const hub = narniaHubNode(levelId);
    if (!gate || !hub || !pts?.length) return pts;
    const out = pts.map((p) => ({ x: p.x, y: p.y }));
    const hubNode = state.navGraph?.nodesById?.get(hub);
    const hubPt = hubNode ? { x: hubNode.x, y: hubNode.y } : { x: gate.x, y: gate.y };
    const g = { x: gate.x, y: gate.y };
    const idx = which === "start" ? 0 : out.length - 1;
    const tip = out[idx];
    const nearHub = dist(tip, hubPt) <= 48 || dist(tip, g) <= 48;
    if (!nearHub) return out;
    if (dist(tip, g) <= 1.5) return out;
    if (dist(tip, g) > 28 && crossesWall(tip, g, levelId)) return out;
    out[idx] = g;
    return out;
  }

  function basementExitLegEnd(levelId, oLvl, dLvl) {
    if (!isBasementFloor(oLvl) || isBasementFloor(dLvl)) return false;
    if (levelId === oLvl) return true;
    if (oLvl === "B02" && levelId === "B01") return true;
    return false;
  }

  function basementEntryLegStart(levelId, oLvl, dLvl) {
    if (!isBasementFloor(dLvl) || isBasementFloor(oLvl)) return false;
    if (levelId === dLvl) return true;
    if (dLvl === "B02" && levelId === "B01" && oLvl !== "B01") return true;
    return false;
  }

  function shouldRefineNarniaAtBasementGate(levelId, oLvl, dLvl, which) {
    if (!routeInvolvesBasementTransfer(oLvl, dLvl)) return false;
    if (levelId === "L00") {
      if (which === "end") return isBasementFloor(dLvl) && !isBasementFloor(oLvl);
      if (which === "start") return isBasementFloor(oLvl) && !isBasementFloor(dLvl);
    }
    if (isBasementFloor(levelId)) {
      if (which === "end") return basementExitLegEnd(levelId, oLvl, dLvl);
      if (which === "start") return basementEntryLegStart(levelId, oLvl, dLvl);
    }
    return false;
  }

  function isCrossFloorTrip(oLvl, dLvl) {
    return !!(oLvl && dLvl && oLvl !== dLvl);
  }

  /** Nó do elevador ou escada lateral no andar, conforme a rota escolhida. */
  function verticalHubNodeForLevel(levelId, route = state.route) {
    if (!levelId) return null;
    const useStairs = !!(route?.viaStairs || route?.kind === "stairs");
    const cfg = useStairs ? stairHub(levelId) : elevatorHub(levelId);
    const id = cfg?.nodeId;
    return id && state.navGraph?.nodesById?.has(id) ? id : null;
  }

  function crossFloorExitLeg(levelId, oLvl, dLvl) {
    return isCrossFloorTrip(oLvl, dLvl) && levelId === oLvl && !routeInvolvesBasementTransfer(oLvl, dLvl);
  }

  function crossFloorEntryLeg(levelId, oLvl, dLvl) {
    return isCrossFloorTrip(oLvl, dLvl) && levelId === dLvl && !routeInvolvesBasementTransfer(oLvl, dLvl);
  }

  function crossFloorTransitLeg(levelId, oLvl, dLvl) {
    if (!isCrossFloorTrip(oLvl, dLvl) || routeInvolvesBasementTransfer(oLvl, dLvl)) return false;
    if (levelId === oLvl || levelId === dLvl) return false;
    return isAdmFloor(levelId) || levelId === "L00";
  }

  function refineVerticalHubEndpoint(pts, levelId, route, which) {
    const hubId = verticalHubNodeForLevel(levelId, route);
    if (!hubId || !pts?.length || !state.navGraph) return pts;
    const n = state.navGraph.nodesById.get(hubId);
    if (!n) return pts;
    const out = pts.map((p) => ({ x: p.x, y: p.y }));
    const hubPt = { x: n.x, y: n.y };
    const idx = which === "start" ? 0 : out.length - 1;
    if (dist(out[idx], hubPt) <= 55) out[idx] = hubPt;
    return out;
  }

  /** Trecho de saída do subsolo: só ajusta o fim ao lampião da Porta de Nárnia (sem spur da origem). */
  function finalizeBasementExitLegPoints(pts, levelId) {
    let out = (pts || []).map((p) => ({ x: p.x, y: p.y }));
    if (out.length < 2) return out;
    out = refineNarniaEndpoint(out, levelId, "end");
    const gate = narniaGateIcon(levelId);
    if (gate && out.length >= 1) {
      const tip = out[out.length - 1];
      const g = { x: gate.x, y: gate.y };
      if (dist(tip, g) > 1.5 && dist(tip, g) <= 55 && !crossesWall(tip, g, levelId)) {
        out[out.length - 1] = g;
      }
    }
    return out;
  }

  function isBasementExitActiveLeg(levelId, oLvl, dLvl) {
    return isBasementFloor(oLvl) && !isBasementFloor(dLvl) && basementExitLegEnd(levelId, oLvl, dLvl);
  }

  /** Reconstrói polyline do trecho no andar quando legs/points falham (lazy load, etc.). */
  function buildFloorLegFallbackPoints(levelId, origin, dest) {
    const NR = globalThis.NavigationRouter;
    if (!NR || !state.navGraph || !origin || !dest) return null;
    const oLvl = poiLevel(origin);
    const dLvl = poiLevel(dest);
    const opts = { blockedEdges: narniaForbiddenEdgeSet() };

    const astarLeg = (startId, endId) => {
      if (!startId || !endId || !state.navGraph.nodesById.has(startId) || !state.navGraph.nodesById.has(endId)) {
        return null;
      }
      const leg = NR.astar(startId, [endId], state.navGraph, opts);
      if (!leg?.points?.length) return null;
      return {
        points: leg.points.map((p) => ({ x: p.x, y: p.y })),
        edgeIds: leg.edgeIds || [],
        nodeIds: leg.nodeIds || [],
      };
    };

    if (isBasementExitActiveLeg(levelId, oLvl, dLvl)) {
      const hub = narniaHubNode(levelId);
      const startIds = resolveNavNodeIds(origin, "origin");
      const mesh = hub && startIds[0] ? astarLeg(startIds[0], hub) : null;
      if (mesh?.points?.length >= 2) {
        return { ...mesh, points: finalizeBasementExitLegPoints(mesh.points, levelId) };
      }
    }

    if (isBasementFloor(dLvl) && !isBasementFloor(oLvl) && basementEntryLegStart(levelId, oLvl, dLvl)) {
      const hub = narniaHubNode(levelId);
      const endIds = resolveNavNodeIds(dest, "dest");
      const mesh = hub && endIds[0] ? astarLeg(hub, endIds[0]) : null;
      if (mesh?.points?.length >= 2) return mesh;
    }

    if (levelId === "L00" && routeInvolvesBasementTransfer(oLvl, dLvl)) {
      const hub = narniaHubNode("L00");
      if (isBasementFloor(oLvl) && !isBasementFloor(dLvl) && hub) {
        const endIds = resolveNavNodeIds(dest, "dest");
        const mesh = endIds[0] ? astarLeg(hub, endIds[0]) : null;
        if (mesh?.points?.length >= 2) {
          return { ...mesh, points: refineNarniaEndpoint(mesh.points, "L00", "start") };
        }
      }
      if (isBasementFloor(dLvl) && !isBasementFloor(oLvl) && hub) {
        const startIds = resolveNavNodeIds(origin, "origin");
        const mesh = startIds[0] ? astarLeg(startIds[0], hub) : null;
        if (mesh?.points?.length >= 2) {
          return { ...mesh, points: refineNarniaEndpoint(mesh.points, "L00", "end") };
        }
      }
    }

    if (levelId === oLvl && oLvl === dLvl) {
      const startIds = resolveNavNodeIds(origin, "origin");
      const endIds = resolveNavNodeIds(dest, "dest");
      return astarLeg(startIds[0], endIds[0]);
    }

    if (crossFloorExitLeg(levelId, oLvl, dLvl)) {
      const hubId = verticalHubNodeForLevel(levelId, state.route);
      const startIds = resolveNavNodeIds(origin, "origin");
      const mesh = hubId && startIds[0] ? astarLeg(startIds[0], hubId) : null;
      if (mesh?.points?.length >= 2) return mesh;
    }

    if (crossFloorEntryLeg(levelId, oLvl, dLvl)) {
      const hubId = verticalHubNodeForLevel(levelId, state.route);
      const endIds = resolveNavNodeIds(dest, "dest");
      const mesh = hubId && endIds[0] ? astarLeg(hubId, endIds[0]) : null;
      if (mesh?.points?.length >= 2) return mesh;
    }

    if (crossFloorTransitLeg(levelId, oLvl, dLvl)) {
      const hubId = verticalHubNodeForLevel(levelId, state.route);
      const n = hubId && state.navGraph?.nodesById?.get(hubId);
      if (n) {
        return {
          points: [{ x: n.x, y: n.y }, { x: n.x + 0.8, y: n.y + 0.4 }],
          nodeIds: [hubId],
          edgeIds: [],
        };
      }
    }

    return null;
  }

  /** Ponto no grafo ou ícone do POI para desenhar rota. */
  function poiGraphPoint(poi) {
    if (!poi) return null;
    const ids = resolveNavNodeIds(poi, "origin");
    if (ids[0] && state.navGraph?.nodesById?.has(ids[0])) {
      const n = state.navGraph.nodesById.get(ids[0]);
      return { x: n.x, y: n.y };
    }
    const icon = poiIcon(poi) || poi.snap;
    if (icon && isFinite(icon.x) && isFinite(icon.y)) return { x: icon.x, y: icon.y };
    if (isFinite(poi.x) && isFinite(poi.y)) return { x: poi.x, y: poi.y };
    return null;
  }

  function syncMapViewBeforeRoutePaint() {
    const lvl = state.activeLevel || "L00";
    const meta = state.floorMeta[lvl] || state.floorMeta.L00;
    const svg = el.svgHost?.querySelector("svg");
    if (svg) {
      const vb = (svg.getAttribute("viewBox") || "").split(/[\s,]+/).map(Number);
      if (vb.length >= 4 && vb[2] > 0 && vb[3] > 0) {
        setMapViewBox(vb[2], vb[3], vb[0] || 0, vb[1] || 0);
        apply();
        return;
      }
    }
    if (meta?.vbW) {
      setMapViewBox(meta.vbW, meta.vbH, meta.vbX || 0, meta.vbY || 0);
    }
    apply();
  }

  /** Pontos para pintar — ADM/subsolo/multi-andar: malha; L00 campus: polyline global. */
  function collectRoutePaintPoints(route, levelId) {
    if (!route) return { leg: null, points: [] };
    const oLvl = poiLevel(state.origin);
    const dLvl = poiLevel(state.dest);

    if (preferGraphRoutePaint(levelId, oLvl, dLvl)) {
      const view = resolveRoutePaintPoints(route, levelId);
      if (view.points?.length >= 2) return view;
    }

    if (shouldUseFullRoutePolyline(levelId, oLvl, dLvl) && route.points?.length >= 2) {
      const direct = route.points
        .map((p) => ({ x: p.x, y: p.y }))
        .filter((p) => isFinite(p.x) && isFinite(p.y));
      if (direct.length >= 2) return { leg: null, points: direct };
    }

    return resolveRoutePaintPoints(route, levelId);
  }

  /** Pontos finais para pintar no andar — nunca aborta se a rota calculada tem geometria. */
  function resolveRoutePaintPoints(route, levelId) {
    if (!route) return { leg: null, points: [] };

    let { leg, points: pts } = routePointsForLevel(route, levelId);
    if (!pts?.length || pts.length < 2) {
      rebuildRouteLegs(route);
      hydrateRouteLegPoints(route, levelId);
      ({ leg, points: pts } = routePointsForLevel(route, levelId));
    }
    if (!pts?.length || pts.length < 2) {
      const fb = buildFloorLegFallbackPoints(levelId, state.origin, state.dest);
      if (fb?.points?.length >= 2) {
        pts = fb.points.map((p) => ({ x: p.x, y: p.y }));
        if (!leg) {
          leg = {
            level: levelId,
            nodeIds: fb.nodeIds || [],
            edgeIds: fb.edgeIds || [],
            points: pts,
          };
        }
      }
    }

    const oLvl = poiLevel(state.origin);
    const dLvl = poiLevel(state.dest);
    if ((!pts?.length || pts.length < 2) && route.points?.length >= 2) {
      const sliced = sliceRoutePointsForLevel(route, levelId);
      if (sliced?.length >= 2) {
        pts = sliced.map((p) => ({ x: p.x, y: p.y }));
      } else if (shouldUseFullRoutePolyline(levelId, oLvl, dLvl)) {
        pts = route.points
          .map((p) => ({ x: p.x, y: p.y }))
          .filter((p) => isFinite(p.x) && isFinite(p.y));
      }
    }

    return { leg, points: pts?.length >= 2 ? pts : [] };
  }

  function getMapRoutePaintTargets(svg) {
    if (!svg) return { layer: null, base: null, glow: null };
    const layer = svg.querySelector("#mapRouteLayer");
    if (!layer) return { layer: null, base: null, glow: null };
    return {
      layer,
      base: layer.querySelector("#mapRoutePathBase"),
      glow: layer.querySelector("#mapRoutePathGlow"),
    };
  }

  /** Garante camada + paths no SVG do mapa (campus L00 ou andar). */
  function resolveMapRoutePaintTargets(svg) {
    if (!svg) return { layer: null, base: null, glow: null };
    const layer = ensureRouteLayer(svg);
    return {
      layer,
      base: layer.querySelector("#mapRoutePathBase"),
      glow: layer.querySelector("#mapRoutePathGlow"),
    };
  }

  function forceRoutePathVisible(baseNode, glowNode, pathD) {
    if (!pathD) return;
    const stroke = "#00AEEF";
    [baseNode, glowNode].forEach((node) => {
      if (!node) return;
      node.setAttribute("fill", "none");
      node.style.fill = "none";
      node.style.visibility = "visible";
      node.style.display = "";
      node.removeAttribute("hidden");
    });
    if (baseNode) {
      baseNode.setAttribute("stroke", stroke);
      baseNode.setAttribute("stroke-width", "10");
      baseNode.style.stroke = stroke;
      baseNode.style.strokeWidth = "10";
      baseNode.style.opacity = "1";
    }
    /* Brilho animado: fluxo origem → destino (WAAPI em route-animation-config.js) */
    if (glowNode) {
      globalThis.RouteAnimation?.startRouteGlowFlow?.(glowNode);
    }
  }

  /** Reidrata pernas vazias (lazy load / legs obsoletos) antes de pintar. */
  function hydrateRouteLegPoints(route, levelId) {
    if (!route?.nodeIds?.length || !state.navGraph) return route?.legs || [];
    let legs = route.legs;
    const stale = !legs?.length || legs.some((l) =>
      l.level === levelId
      && (l.edgeIds?.length || 0) >= 1
      && (l.points?.length || 0) < 2,
    );
    if (stale) {
      route.legs = routeLegsFromGraph(route);
      patchBasementLegPoints(route);
      patchCrossFloorLegPoints(route);
      legs = route.legs;
    }
    for (const leg of legs || []) {
      if ((leg.points?.length || 0) >= 2 || !(leg.edgeIds?.length || 0)) continue;
      const stitched = stitchEdgePaths(leg.edgeIds);
      if (stitched?.length >= 2) leg.points = stitched;
    }
    return legs;
  }

  /** Trecho de saída/entrada entre andares: liga ícone do POI ao hub vertical. */
  function extendCrossFloorLegPoints(pts, levelId, oLvl, dLvl, route = state.route) {
    let out = (pts || []).map((p) => ({ x: p.x, y: p.y }));
    if (out.length < 2) return out;

    if (crossFloorExitLeg(levelId, oLvl, dLvl)) {
      out = refineVerticalHubEndpoint(out, levelId, route, "end");
      const o = poiIcon(state.origin);
      const maxSpur = tol("spurTol", poiToleranceZone(state.origin));
      if (o && dist(o, out[0]) > 0.8 && dist(o, out[0]) <= maxSpur && !crossesWall(o, out[0], levelId)) {
        out.unshift({ x: o.x, y: o.y });
      }
      return out;
    }

    if (crossFloorEntryLeg(levelId, oLvl, dLvl)) {
      out = refineVerticalHubEndpoint(out, levelId, route, "start");
      const d = poiIcon(state.dest);
      const maxSpur = tol("spurTol", poiToleranceZone(state.dest));
      const tip = out[out.length - 1];
      if (d && dist(tip, d) > 0.8 && dist(tip, d) <= maxSpur && !crossesWall(tip, d, levelId)) {
        out.push({ x: d.x, y: d.y });
      }
      return out;
    }

    return out;
  }

  function wallsForLevel(levelId) {
    if (levelId && state.floorWalls?.[levelId]?.length) return state.floorWalls[levelId];
    return G.walls || [];
  }

  function routePolylineCrossesWall(pts, levelId) {
    if (!pts || pts.length < 2) return false;
    for (let i = 1; i < pts.length; i++) {
      if (crossesWall(pts[i - 1], pts[i], levelId)) return true;
    }
    return false;
  }

  /** Spur sintético: 2 pontos longos sem nenhuma edge do grafo. */
  function isSyntheticStraightSpur(pts, leg, route) {
    if (!pts || pts.length !== 2) return false;
    const edges = (leg?.edgeIds?.length || 0) + (route?.edgeIds?.length || 0);
    if (edges >= 1) return false;
    return dist(pts[0], pts[1]) > 25;
  }

  /** Monta polyline só pelos paths oficiais das edges (sem linha reta inventada). */
  function stitchEdgePaths(edgeIds) {
    if (!edgeIds?.length || !state.navGraph) return null;
    const stitched = [];
    for (const eid of edgeIds) {
      const edge = state.navGraph.edgesById.get(eid);
      for (const p of edge?.path || []) {
        const pt = { x: p.x, y: p.y };
        const last = stitched[stitched.length - 1];
        if (!last || dist(last, pt) > 0.05) stitched.push(pt);
      }
    }
    return stitched.length >= 2 ? stitched : null;
  }

  /** Pontos do trecho no andar — prioriza malha (edges/nodes), nunca diagonal artificial. */
  function routePointsForLevel(route, levelId) {
    if (!route) return { leg: null, points: [] };

    const legs = hydrateRouteLegPoints(route, levelId);

    let leg = pickBestRouteLeg(legs.filter((l) => l.level === levelId));
    if (!leg && legs.length === 1 && legs[0]?.level === levelId) leg = legs[0];

    let points = (leg?.points || [])
      .map((p) => ({ x: p.x, y: p.y }))
      .filter((p) => isFinite(p.x) && isFinite(p.y));

    if (points.length < 2) {
      const sliced = sliceRoutePointsForLevel(route, levelId);
      if (sliced?.length >= 2) points = sliced;
    }

    if (points.length < 2 && leg?.edgeIds?.length >= 1) {
      const stitched = stitchEdgePaths(leg.edgeIds);
      if (stitched) {
        points = stitched;
        leg.points = stitched.map((p) => ({ x: p.x, y: p.y }));
      }
    }

    const oLvl = poiLevel(state.origin);
    const dLvl = poiLevel(state.dest);
    if (points.length < 2 && oLvl !== dLvl && (levelId === oLvl || levelId === dLvl)) {
      const fb = buildFloorLegFallbackPoints(levelId, state.origin, state.dest);
      if (fb?.points?.length >= 2) {
        points = fb.points.map((p) => ({ x: p.x, y: p.y }));
        if (!leg) {
          leg = {
            level: levelId,
            nodeIds: fb.nodeIds || [],
            edgeIds: fb.edgeIds || [],
            points,
          };
        } else {
          leg.points = points.map((p) => ({ x: p.x, y: p.y }));
          if (fb.edgeIds?.length) leg.edgeIds = fb.edgeIds.slice();
          if (fb.nodeIds?.length) leg.nodeIds = fb.nodeIds.slice();
        }
      }
    }
    if (points.length < 2 && shouldUseFullRoutePolyline(levelId, oLvl, dLvl) && route.points?.length >= 2) {
      points = route.points
        .map((p) => ({ x: p.x, y: p.y }))
        .filter((p) => isFinite(p.x) && isFinite(p.y));
    }

    if (points.length < 2 && state.origin && state.dest) {
      const fb = buildFloorLegFallbackPoints(levelId, state.origin, state.dest);
      if (fb?.points?.length >= 2) {
        points = fb.points.map((p) => ({ x: p.x, y: p.y }));
        if (!leg) {
          leg = {
            level: levelId,
            nodeIds: fb.nodeIds || [],
            edgeIds: fb.edgeIds || [],
            points,
          };
        } else {
          if (fb.edgeIds?.length) leg.edgeIds = fb.edgeIds.slice();
          if (fb.nodeIds?.length) leg.nodeIds = fb.nodeIds.slice();
        }
      }
    }

    if (points.length < 2 && route.nodeIds?.length >= 2 && state.navGraph) {
      let start = -1;
      let end = -1;
      for (let i = 0; i < route.nodeIds.length; i++) {
        const lvl = state.navGraph.nodesById.get(route.nodeIds[i])?.level;
        if (lvl !== levelId) continue;
        if (start < 0) start = i;
        end = i;
      }
      if (start >= 0 && end > start) {
        const stitched = stitchEdgePaths((route.edgeIds || []).slice(start, end));
        if (stitched) points = stitched;
      }
    }

    if (points.length < 2 && route.points?.length >= 2) {
      const sliced = sliceRoutePointsForLevel(route, levelId);
      if (sliced?.length >= 2) {
        points = sliced.map((p) => ({ x: p.x, y: p.y }));
      } else if (oLvl === dLvl && oLvl === levelId) {
        points = route.points
          .map((p) => ({ x: p.x, y: p.y }))
          .filter((p) => isFinite(p.x) && isFinite(p.y));
      }
    }

    return { leg, points };
  }

  /** Pontos do trecho no andar ativo. */
  function ensureActiveFloorRoutePoints() {
    if (!state.route || !state.origin || !state.dest) return [];
    const { points } = routePointsForLevel(state.route, state.activeLevel);
    return points.length >= 2 ? points : [];
  }

  function patchCrossFloorLegPoints(route) {
    if (!route?.legs?.length || !state.origin || !state.dest) return;
    const oLvl = poiLevel(state.origin);
    const dLvl = poiLevel(state.dest);
    if (!isCrossFloorTrip(oLvl, dLvl)) return;
    for (const leg of route.legs) {
      if ((leg.points?.length || 0) >= 2) continue;
      const fb = buildFloorLegFallbackPoints(leg.level, state.origin, state.dest);
      if (!fb?.points?.length || fb.points.length < 2) continue;
      if (isSyntheticStraightSpur(fb.points, fb, route)) continue;
      leg.points = fb.points.map((p) => ({ x: p.x, y: p.y }));
      if (fb.edgeIds?.length) leg.edgeIds = fb.edgeIds.slice();
      if (fb.nodeIds?.length) leg.nodeIds = fb.nodeIds.slice();
    }
  }

  function patchBasementLegPoints(route) {
    if (!route?.legs?.length || !state.origin || !state.dest) return;
    for (const leg of route.legs) {
      if ((leg.points?.length || 0) >= 2 && (leg.edgeIds?.length || 0) >= 1) continue;
      const fb = buildFloorLegFallbackPoints(leg.level, state.origin, state.dest);
      if (!fb?.points?.length || fb.points.length < 2) continue;
      if (isSyntheticStraightSpur(fb.points, fb, route)) continue;
      leg.points = fb.points.map((p) => ({ x: p.x, y: p.y }));
      if (fb.edgeIds?.length) leg.edgeIds = fb.edgeIds.slice();
      if (fb.nodeIds?.length) leg.nodeIds = fb.nodeIds.slice();
    }
  }

  function mergeWaypointIds(...chains) {
    const out = [];
    for (const chain of chains) {
      for (const id of chain || []) {
        if (!id) continue;
        if (out.length && out[out.length - 1] === id) continue;
        out.push(id);
      }
    }
    return out;
  }

  /** Cadeia obrigatória pela entrada de Nárnia (T → B01 → B02). */
  function narniaBasementChain(fromLvl, toLvl) {
    const L00 = narniaHubNode("L00");
    const B01 = narniaHubNode("B01");
    const B02 = narniaHubNode("B02");
    if (!L00 || !B01 || !B02) return [];
    if (fromLvl === "B01" && toLvl === "B02") return [B01, B02];
    if (fromLvl === "B02" && toLvl === "B01") return [B02, B01];
    if (fromLvl === "B01" && toLvl === "L00") return [B01, L00];
    if (fromLvl === "L00" && toLvl === "B01") return [L00, B01];
    if (fromLvl === "B02" && toLvl === "L00") return [B02, B01, L00];
    if (fromLvl === "L00" && toLvl === "B02") return [L00, B01, B02];
    return [];
  }

  /** Waypoints entre andares quando B01/B02 participam — sempre pelo poste/T (L00_N0014). */
  function narniaHubWaypoints(fromLvl, toLvl) {
    if (!fromLvl || !toLvl || fromLvl === toLvl) return [];

    const direct = narniaBasementChain(fromLvl, toLvl);
    if (direct.length >= 2) return direct;

    if (isBasementFloor(fromLvl) && isAdmFloor(toLvl)) {
      const down = narniaBasementChain(fromLvl, "L00");
      const up = elevatorHubWaypoints("L00", toLvl);
      if (down.length < 2 || up.length < 2) return [];
      return mergeWaypointIds(down, up);
    }

    if (isAdmFloor(fromLvl) && isBasementFloor(toLvl)) {
      const down = elevatorHubWaypoints(fromLvl, "L00");
      const basement = narniaBasementChain("L00", toLvl);
      if (down.length < 2 || basement.length < 2) return [];
      return mergeWaypointIds(down, basement);
    }

    if (fromLvl === "L00" && isBasementFloor(toLvl)) {
      return narniaBasementChain("L00", toLvl);
    }
    if (isBasementFloor(fromLvl) && toLvl === "L00") {
      return narniaBasementChain(fromLvl, "L00");
    }

    return [];
  }

  function narniaForbiddenEdgeSet() {
    const ids = CONFIG.narniaForbiddenEdges || [];
    const blocked = new Set();
    for (const id of ids) {
      if (state.navGraph?.edgesById?.has(id)) blocked.add(id);
    }
    return blocked;
  }

  /** Rotas B01/B02: único corredor vertical pela entrada de Nárnia no mapa T. */
  function buildBasementNarniaRoutes(NR, startIds, endIds, origin, dest) {
    const oLvl = poiLevel(origin);
    const dLvl = poiLevel(dest);
    if (!routeInvolvesBasementTransfer(oLvl, dLvl)) return [];

    const via = narniaHubWaypoints(oLvl, dLvl).filter((id) => state.navGraph?.nodesById?.has(id));
    if (via.length < 2) return [];

    const route = buildNamedExternalRoute(NR, startIds, endIds, origin, dest, {
      via,
      label: "Pela entrada de Nárnia",
      avoidParking: false,
      allowParking: true,
      blockedEdges: narniaForbiddenEdgeSet(),
    });
    if (!route) return [];

    route.kind = "narnia";
    route.label = "Pela entrada de Nárnia";
    route.namedExternal = true;
    return [route];
  }

  function routeUsesLateralStairs(route) {
    if (!route?.edgeIds?.length || !state.navGraph) return false;
    return route.edgeIds.some((id) => {
      if (/escada_lateral/i.test(id)) return true;
      const e = state.navGraph.edgesById.get(id);
      return e && e.type === "stairs" && /L0[0-6]-L0[1-6]|L00-L01/.test(e.level || "");
    });
  }

  function narniaGateLabel(levelId) {
    const labels = CONFIG.narniaGateLabels || {};
    if (labels[levelId]) return labels[levelId];
    return `Porta de Nárnia (${floorTitle(levelId)})`;
  }

  function narniaFloorLabel(levelId) {
    if (levelId === "L00") return "Térreo";
    const f = floorById(levelId);
    return f?.title || levelId;
  }

  function basementLevelRank(levelId) {
    return ({ L00: 0, B01: 1, B02: 2 })[levelId] ?? -1;
  }

  /** Sequência L00 ↔ B01 ↔ B02 entre origem e destino (inclusive). */
  function basementLevelsBetween(fromLvl, toLvl) {
    const order = ["L00", "B01", "B02"];
    const from = isBasementFloor(fromLvl) ? fromLvl : "L00";
    const to = isBasementFloor(toLvl) ? toLvl : "L00";
    const i = order.indexOf(from);
    const j = order.indexOf(to);
    if (i < 0 || j < 0) return [];
    if (i === j) return [from];
    if (i < j) return order.slice(i, j + 1);
    return order.slice(j, i + 1).reverse();
  }

  function campusLevelsBetween(oLvl, dLvl) {
    const order = ["L00", "L01", "L02", "L03", "L04", "L05", "L06"];
    const i = order.indexOf(oLvl);
    const j = order.indexOf(dLvl);
    const out = new Set([oLvl, dLvl].filter(Boolean));
    if (i < 0 || j < 0) return [...out];
    const lo = Math.min(i, j);
    const hi = Math.max(i, j);
    for (let k = lo; k <= hi; k++) out.add(order[k]);
    return [...out];
  }

  /** Andares do grafo necessários para rotas entre origem e destino. */
  function floorsRequiredForTrip(oLvl, dLvl) {
    const required = new Set([oLvl, dLvl].filter(Boolean));
    if (isCrossCampusFloorPair(oLvl, dLvl) || (isAdmFloor(oLvl) && isAdmFloor(dLvl))) {
      for (const id of campusLevelsBetween(oLvl, dLvl)) required.add(id);
    }
    if (routeInvolvesBasementTransfer(oLvl, dLvl)) {
      required.add("L00");
      required.add("B01");
      if (isBasementFloor(oLvl) || isBasementFloor(dLvl) || oLvl === "B02" || dLvl === "B02") {
        required.add("B02");
      }
    }
    return [...required];
  }

  async function ensureNavGraphForTrip(oLvl, dLvl) {
    if (!state.ensureNavGraphFloors) return state.navGraph;
    const levels = floorsRequiredForTrip(oLvl, dLvl);
    await state.ensureNavGraphFloors(...levels);
    return state.navGraph;
  }

  function rebuildRouteLegs(route = state.route) {
    if (!route?.nodeIds?.length || !state.navGraph) return route?.legs || [];
    route.legs = routeLegsFromGraph(route);
    patchBasementLegPoints(route);
    patchCrossFloorLegPoints(route);
    return route.legs;
  }

  function routeViaLabel(route, oLvl, dLvl) {
    if (routeInvolvesBasementTransfer(oLvl, dLvl)) return "via Porta de Nárnia";
    if (routeUsesLateralStairs(route)) return "via escada lateral";
    return "via elevador";
  }

  /** Andar exibido ao traçar rota — sempre começa no andar de origem (caminho até elevador/escada). */
  function routeInitialViewLevel(route, oLvl, dLvl) {
    if (oLvl === dLvl) return oLvl;

    if (routeInvolvesBasementTransfer(oLvl, dLvl)) {
      if (isBasementFloor(oLvl)) return oLvl;
      if (isAdmFloor(oLvl)) return oLvl;
      return "L00";
    }

    return oLvl;
  }

  /** Trecho da rota no andar ativo (navegação passo a passo). */
  function activeRouteLeg(route = state.route) {
    if (!route) return null;
    return resolveRouteLegForView(route, state.activeLevel).leg;
  }

  /** Pontos da rota visíveis no andar atual — evita misturar coordenadas B01/B02/L00. */
  function navViewPoints(route = state.route) {
    if (!route) return [];
    const { points } = routePointsForLevel(route, state.activeLevel);
    return points.length >= 2 ? points : [];
  }

  function navLegIndex(route = state.route) {
    const legs = route?.legs || [];
    if (!legs.length) return 0;
    const idx = legs.findIndex((l) => l.level === state.activeLevel);
    return idx >= 0 ? idx : 0;
  }

  /** Trecho da rota correspondente ao índice de navegação (por perna/andar). */
  function routeLegForNavIdx(route, navIdx) {
    const legs = route?.legs || [];
    if (!legs.length) return null;
    let offset = 0;
    for (const leg of legs) {
      const segs = Math.max(0, (leg.points?.length || 0) - 1);
      if (segs <= 0) continue;
      if (navIdx < offset + segs) return leg;
      offset += segs;
    }
    return legs[legs.length - 1];
  }

  /** Ao avançar na navegação, troca o mapa para o andar do trecho (L00 → L05, subsolo, etc.). */
  function syncRouteFloorToNavProgress(navIdx) {
    const route = state.route;
    if (!route) return;
    const oLvl = poiLevel(state.origin);
    const dLvl = poiLevel(state.dest);
    if (oLvl === dLvl) return;

    const leg = routeLegForNavIdx(route, navIdx);
    if (!leg?.level || leg.level === state.activeLevel) return;

    setActiveLevel(leg.level, { silent: true, keepTrip: true }).then(() => {
      state.navIdx = 0;
      paintActiveRouteLeg();
      fitRouteInView(route, {
        navMode: document.body.classList.contains("is-navigating"),
        preferActiveLeg: true,
        fillWidth: isMobileLayout(),
      });
    });
  }

  /** Avança para a próxima perna da rota (troca de andar), pulando trechos só de elevador. */
  function advanceToNextRouteLeg() {
    const route = state.route;
    if (!route) return false;
    const legs = route.legs || routeLegsFromGraph(route);
    route.legs = legs;
    let idx = navLegIndex(route) + 1;
    while (idx < legs.length) {
      const next = legs[idx];
      const drawable = (next?.edgeIds?.length || 0) > 0 || (next?.points?.length || 0) >= 2;
      if (next?.level && drawable) {
        state.navIdx = 0;
        setActiveLevel(next.level, { silent: true, keepTrip: true }).then(() => {
          paintActiveRouteLeg();
          updateNav({ fitCamera: true, fitFullRoute: isMobileLayout() });
        });
        return true;
      }
      idx += 1;
    }
    return false;
  }

  /** Passos explícitos pela Porta de Nárnia entre Térreo, B01 e B02. */
  function buildBasementNarniaSteps(oLvl, dLvl) {
    const steps = [];
    steps.push({ ico: "S", txt: `Início: ${state.origin.name}`, dist: "" });

    const origBasement = isBasementFloor(oLvl);
    const destBasement = isBasementFloor(dLvl);

    if (isAdmFloor(oLvl) && routeInvolvesBasementTransfer(oLvl, dLvl)) {
      const hub = elevatorHub(oLvl);
      steps.push({
        ico: "U",
        txt: `Siga ao elevador${hub ? ` (${hub.label})` : ""} e desça ao Térreo`,
        dist: "",
      });
    }

    const chain = basementLevelsBetween(
      origBasement ? oLvl : "L00",
      destBasement ? dLvl : "L00",
    );

    if (!origBasement && chain.includes("L00")) {
      steps.push({
        ico: "U",
        txt: `Siga até a ${narniaGateLabel("L00")}`,
        dist: "",
      });
    }

    if (origBasement) {
      steps.push({
        ico: "U",
        txt: `Dirija-se à ${narniaGateLabel(oLvl)} — ponto de saída do ${narniaFloorLabel(oLvl)}`,
        dist: "",
      });
    }

    for (let i = 0; i < chain.length - 1; i++) {
      const from = chain[i];
      const to = chain[i + 1];
      const descending = basementLevelRank(to) > basementLevelRank(from);
      steps.push({
        ico: "U",
        txt: descending
          ? `Desça pela ${narniaGateLabel(from)} e entre na ${narniaGateLabel(to)}`
          : `Suba pela ${narniaGateLabel(from)} e saia na ${narniaGateLabel(to)}`,
        dist: "",
      });
    }

    if (destBasement) {
      steps.push({
        ico: "U",
        txt: `Da ${narniaGateLabel(dLvl)}, siga até ${state.dest.name}`,
        dist: "",
      });
    } else if (isAdmFloor(dLvl)) {
      const hub = elevatorHub(dLvl);
      steps.push({
        ico: "U",
        txt: `Use o elevador${hub ? ` (${hub.label})` : ""} até ${floorTitle(dLvl)}`,
        dist: "",
      });
      steps.push({
        ico: "U",
        txt: `Do elevador, siga até ${state.dest.name}`,
        dist: "",
      });
    } else if (dLvl === "L00") {
      steps.push({
        ico: "U",
        txt: `Siga até ${state.dest.name}`,
        dist: "",
      });
    }

    steps.push({ ico: "F", txt: `Chegada: ${state.dest.name}`, dist: "" });
    return steps;
  }

  /** POI virtual do elevador do andar (para origem automática / busca). */
  function elevatorPoiForLevel(levelId) {
    const hub = elevatorHub(levelId);
    if (!hub || !state.navGraph?.nodesById.has(hub.nodeId)) return null;
    const node = state.navGraph.nodesById.get(hub.nodeId);
    const existing = G.pois.find((p) =>
      p.navNodeIds?.includes(hub.nodeId) || p.anchor === hub.nodeId || p.rawId === hub.nodeId
    );
    if (existing) return enrichPoiMeta(existing);
    return enrichPoiMeta({
      id: hub.nodeId,
      rawId: hub.nodeId,
      name: hub.label,
      x: node.x,
      y: node.y,
      iconX: node.x,
      iconY: node.y,
      level: levelId,
      cat: "acesso",
      group: "elevadores",
      navNodeIds: [hub.nodeId],
      anchor: hub.nodeId,
      snap: { x: node.x, y: node.y },
      iconHidden: true,
    });
  }

  /** Resolve IDs de nós de origem/destino a partir do JSON de navegação. */
  function resolveNavNodeIds(poi, role) {
    if (!poi) return [];
    if (poi.navNodeIds?.length) return poi.navNodeIds.filter((id) => state.navGraph?.nodesById.has(id));
    if (poi.anchor && state.navGraph?.nodesById.has(poi.anchor)) return [poi.anchor];
    const lvl = poiLevel(poi) || state.activeLevel || "L00";
    if (poi.id === "__here__" || role === "here") {
      const id = NavigationRouter.nearestNodeId(poi, state.navGraph, {
        avoidParking: true,
        level: lvl,
      });
      return id ? [id] : [];
    }
    // fallback: snap visual → node do JSON (mesmo andar)
    const id = NavigationRouter.nearestNodeId(poiIcon(poi) || poi, state.navGraph, { level: lvl });
    return id ? [id] : [];
  }

  /** Coordenadas do ícone do POI (nunca o nó da malha). */
  function poiIcon(poi) {
    if (!poi) return null;
    if (poi.iconX != null && poi.iconY != null) return { x: poi.iconX, y: poi.iconY };
    if (poi.x != null && poi.y != null) return { x: poi.x, y: poi.y };
    return null;
  }

  /** Planta ADM (L01–L07): coordenada local → campus (viewBox do mapa de andar). */
  function localAdmToCampus(local) {
    const TX = 37.53;
    const TY = 401.3;
    const SCALE = 1.57;
    return {
      x: +(TX + local.x * SCALE).toFixed(3),
      y: +(TY + local.y * SCALE).toFixed(3),
    };
  }

  /** Pin visual de POIs injetados (rota continua ancorada no nodeIds). */
  function applyInjectedPoiIcon(poi) {
    if (!poi) return poi;
    const raw = poi.rawId || poi.id || "";
    const local = CONFIG.poiIconLocal?.[raw];
    if (!local) return poi;
    const c = localAdmToCampus(local);
    poi.iconX = c.x;
    poi.iconY = c.y;
    poi.x = c.x;
    poi.y = c.y;
    return poi;
  }

  function syncFloorPoiIconsFromSvg(svg, iconMap, floorId) {
    if (!svg || !iconMap) return;
    const useLocal = floorId === "B01" || floorId === "B02";
    Object.entries(iconMap).forEach(([elId, rawId]) => {
      const el = svg.getElementById(elId);
      const poi = (G.pois || []).find((p) => p.rawId === rawId);
      if (!el || !poi) return;
      const c = poiCenter(el);
      if (!isFinite(c.x) || !isFinite(c.y)) return;
      const pos = useLocal ? c : localAdmToCampus(c);
      poi.iconX = pos.x;
      poi.iconY = pos.y;
      poi.x = pos.x;
      poi.y = pos.y;
    });
  }

  function isTemplePoi(poi) {
    if (!poi) return false;
    const raw = poi.rawId || "";
    const name = poi.name || "";
    if (/elevador|estacionamento|toldo|narnia/i.test(raw + name)) return false;
    return raw === "P000_templo" || /^templo$/i.test(name.trim());
  }

  function poiRawKey(poi) {
    if (!poi) return "";
    let s = String(poi.rawId || poi.id || "")
      .replace(/_x5F_/g, "_")
      .replace(/^poi-\d+-/i, "");
    // nós já canônicos (não stripar L01_node_0001_elevador → "elevador")
    if (/^(escada_mesanino_|L0[0-7]_elevador)/i.test(s)) return s;
    // L00_P_P027_… / L00_P027_… → P027_…
    s = s.replace(/^L0[0-7]_P_/i, "").replace(/^L0[0-7]_/i, "");
    return s;
  }

  function isTempleHubPoi(poi) {
    if (!poi) return false;
    const k = poiRawKey(poi);
    return /P027_elevador_templo|P000_templo|escada_mesanino|L01_node_0001_elevador|L02_node_0001_elevador|L03_node_0001|L04_node_0001_elevador|L05_node_0001_elevador|L06_node_0033_elevador/i.test(k);
  }

  function namedExternalSpecsForPair(origin, dest) {
    const a = poiRawKey(origin);
    const b = poiRawKey(dest);
    const matchSide = (spec, key) => {
      if (Array.isArray(spec)) {
        return spec.some((item) => {
          const t = String(item);
          return t === key || t.toLowerCase() === key.toLowerCase()
            || key.endsWith(t) || t.endsWith(key);
        });
      }
      return spec === key;
    };
    const matched = (CONFIG.namedExternalRoutes || []).filter((r) =>
      (matchSide(r.a, a) && matchSide(r.b, b)) ||
      (matchSide(r.a, b) && matchSide(r.b, a))
    );
    // Se envolve elevador/templo/mezanino e ainda não há "pelo jardim", força a opção
    if ((isTempleHubPoi(origin) || isTempleHubPoi(dest))
      && !matched.some((r) => /pelo jardim|fora do templo/i.test(r.label || ""))) {
      matched.push({
        via: ["L00_N0027", "L00_N0030"],
        endNodes: ["L00_N0029"],
        label: "Pelo jardim",
        avoidParking: false,
      });
    }
    return matched;
  }

  function namedExternalForPair(origin, dest) {
    return namedExternalSpecsForPair(origin, dest)[0] || null;
  }

  const MAX_ROUTE_OPTIONS = 4;
  const DEFAULT_ROUTE_OPTIONS = 3;

  function normRouteLabel(label) {
    return normSearch(String(label || "").replace(/^rota\s+\d+\s*[—–-]\s*/i, ""));
  }

  /** Máx. rotas exibidas para um par (CONFIG.routeOptionCaps). */
  function maxRouteOptionsForPair(origin, dest) {
    const specs = CONFIG.routeOptionCaps || [];
    const a = poiRawKey(origin);
    const b = poiRawKey(dest);
    const matchSide = (spec, key) => {
      if (Array.isArray(spec)) {
        return spec.some((item) => {
          const t = String(item);
          return t === key || t.toLowerCase() === key.toLowerCase()
            || key.endsWith(t) || t.endsWith(key);
        });
      }
      return spec === key;
    };
    for (const spec of specs) {
      if ((matchSide(spec.a, a) && matchSide(spec.b, b))
        || (matchSide(spec.a, b) && matchSide(spec.b, a))) {
        return Math.max(1, Math.min(MAX_ROUTE_OPTIONS, spec.max || DEFAULT_ROUTE_OPTIONS));
      }
    }
    if (isTemplePoi(origin) || isTemplePoi(dest)) return MAX_ROUTE_OPTIONS;
    return DEFAULT_ROUTE_OPTIONS;
  }

  /** Remove alternativas absurdamente longas no mesmo andar (ex.: desvio pelo jardim). */
  function pruneAbsurdSameFloorRoutes(routes, origin, dest) {
    const list = (routes || []).filter((r) => r?.points?.length >= 2);
    if (list.length < 2) return list;
    if (poiLevel(origin) !== poiLevel(dest)) return list;
    const mpu = getMetersPerUnit();
    const meters = (r) => r.distanceMeters || (r.length || 0) * mpu;
    const sorted = [...list].sort((a, b) => meters(a) - meters(b));
    const best = meters(sorted[0]);
    if (best <= 0) return list;
    const maxRatio = 2.35;
    const cap = maxRouteOptionsForPair(origin, dest);
    return sorted.filter((r, i) => i === 0 || meters(r) <= best * maxRatio).slice(0, cap);
  }
  const ROUTE_DUPE_EDGE = 0.72;
  const ROUTE_DUPE_POINTS = 0.78;

  function polylineLength(pts) {
    let total = 0;
    for (let i = 1; i < (pts || []).length; i++) total += dist(pts[i - 1], pts[i]);
    return total;
  }

  function samplePolyline(pts, count) {
    if (!pts?.length) return [];
    if (pts.length === 1) return Array(count).fill({ x: pts[0].x, y: pts[0].y });
    const total = polylineLength(pts);
    if (total < 0.01) return Array(count).fill({ x: pts[0].x, y: pts[0].y });
    const out = [];
    let seg = 0;
    let acc = 0;
    let segLen = dist(pts[0], pts[1]);
    const n = Math.max(2, count);
    for (let i = 0; i < n; i++) {
      const target = (total * i) / (n - 1);
      while (seg < pts.length - 2 && acc + segLen < target - 1e-6) {
        acc += segLen;
        seg++;
        segLen = dist(pts[seg], pts[seg + 1]);
      }
      const t = segLen > 1e-6 ? Math.min(1, Math.max(0, (target - acc) / segLen)) : 0;
      out.push({
        x: pts[seg].x + (pts[seg + 1].x - pts[seg].x) * t,
        y: pts[seg].y + (pts[seg + 1].y - pts[seg].y) * t,
      });
    }
    return out;
  }

  function routePointSimilarity(ptsA, ptsB) {
    if (!ptsA?.length || !ptsB?.length) return 0;
    const lenA = polylineLength(ptsA);
    const lenB = polylineLength(ptsB);
    if (lenA < 1 || lenB < 1) return ptsA.length === ptsB.length ? 1 : 0;
    const lenRatio = Math.min(lenA, lenB) / Math.max(lenA, lenB);
    if (lenRatio < 0.82) return 0;
    const sa = samplePolyline(ptsA, 20);
    const sb = samplePolyline(ptsB, 20);
    let sum = 0;
    for (let i = 0; i < sa.length; i++) sum += dist(sa[i], sb[i]);
    const avg = sum / sa.length;
    return Math.max(0, 1 - avg / 22) * lenRatio;
  }

  function routeEdgeSimilarity(a, b) {
    const NR = globalThis.NavigationRouter;
    if (NR?.calculateEdgeSimilarity && a?.edgeIds?.length && b?.edgeIds?.length) {
      return NR.calculateEdgeSimilarity(a, b);
    }
    const sigA = (a?.edgeIds || []).join(">") || String(a?.sig || "");
    const sigB = (b?.edgeIds || []).join(">") || String(b?.sig || "");
    if (sigA && sigA === sigB) return 1;
    return 0;
  }

  function nodeSetSimilarity(a, b) {
    const na = a?.nodeIds || [];
    const nb = b?.nodeIds || [];
    if (!na.length || !nb.length) return 0;
    const setA = new Set(na);
    const setB = new Set(nb);
    let inter = 0;
    for (const id of setA) if (setB.has(id)) inter++;
    const union = new Set([...na, ...nb]).size;
    return union ? inter / union : 0;
  }

  /** Pontos usados para comparar rotas (perna do andar ativo quando disponível). */
  function routeComparePoints(route) {
    if (!route) return [];
    const legs = route.legs;
    if (legs?.length) {
      const leg = legs.find((l) => l.level === state.activeLevel) || legs[0];
      if (leg?.points?.length >= 2) return leg.points;
    }
    if (route.nodeIds?.length && state.navGraph && globalThis.NavigationRouter) {
      try {
        const built = routeLegsFromGraph(route);
        route.legs = built;
        const leg = built.find((l) => l.level === state.activeLevel) || built[0];
        if (leg?.points?.length >= 2) return leg.points;
      } catch { /* usa pontos completos */ }
    }
    return route.points || [];
  }

  /** Rotas visualmente iguais ou quase iguais (edgeIds diferentes mas mesmo caminho). */
  function isDuplicateRoute(a, b) {
    if (!a || !b || a === b) return !!a && a === b;
    const la = normRouteLabel(a.label);
    const lb = normRouteLabel(b.label);
    if (la && lb && la === lb && la.length > 4) return true;
    if (a.entranceId && b.entranceId && a.entranceId === b.entranceId) return true;
    const sigA = (a.edgeIds || []).join(">");
    const sigB = (b.edgeIds || []).join(">");
    if (sigA && sigA === sigB) return true;
    const NR = globalThis.NavigationRouter;
    if (NR?.isTooSimilarRoute?.(a, b)) return true;
    const nodeA = (a.nodeIds || []).join(">");
    const nodeB = (b.nodeIds || []).join(">");
    if (nodeA && nodeA === nodeB) return true;
    if (routeEdgeSimilarity(a, b) >= ROUTE_DUPE_EDGE) return true;
    const ptsA = routeComparePoints(a);
    const ptsB = routeComparePoints(b);
    if (routePointSimilarity(ptsA, ptsB) >= ROUTE_DUPE_POINTS) return true;
    if (routePointSimilarity(a.points, b.points) >= ROUTE_DUPE_POINTS) return true;
    if (nodeSetSimilarity(a, b) >= 0.88) return true;
    const lenA = a.length || polylineLength(a.points);
    const lenB = b.length || polylineLength(b.points);
    if (lenA > 0 && lenB > 0) {
      const lenRatio = Math.min(lenA, lenB) / Math.max(lenA, lenB);
      const ptSim = routePointSimilarity(ptsA, ptsB);
      if (lenRatio >= 0.9 && ptSim >= 0.68) return true;
      if (lenRatio >= 0.94 && routeEdgeSimilarity(a, b) >= 0.62) return true;
    }
    return false;
  }

  function listHasDuplicateRoute(list, candidate) {
    return (list || []).some((r) => isDuplicateRoute(r, candidate));
  }

  function pushUniqueRoute(list, route, max = MAX_ROUTE_OPTIONS) {
    if (!route?.points || route.points.length < 2) return false;
    if (list.length >= max) return false;
    if (listHasDuplicateRoute(list, route)) return false;
    list.push(route);
    return true;
  }

  function relabelRouteOptions(routes, NR) {
    const isStair = (r) => !!r.viaStairs;
    routes.forEach((r, i) => {
      r.rank = i + 1;
      if (isStair(r)) {
        r.kind = "stairs";
        r.namedExternal = true;
        r.viaStairs = true;
        r.label = "Pela escada lateral";
      } else if (r.kind === "elevator") {
        r.label = r.label || "Pelo elevador";
      } else if (r.namedExternal) {
        r.kind = "fora";
        r.label = r.label || "Por fora da igreja";
      } else if (!r.entranceId) {
        r.label = (NR && NR.rankLabel) ? NR.rankLabel(i + 1, routes.length) : `Rota ${i + 1}`;
        r.kind = i === 0 ? "best" : "alt";
      }
    });
    return routes;
  }

  /** Remove duplicatas preservando ordem; máx. 4 opções distintas. */
  function dedupeRouteOptionsStrict(routes, NR, origin, dest) {
    const cap = origin && dest ? maxRouteOptionsForPair(origin, dest) : MAX_ROUTE_OPTIONS;
    const isStair = (r) => !!r.viaStairs;
    const unique = [];
    for (const r of (routes || [])) {
      if (!r?.points || r.points.length < 2) continue;
      if (unique.length >= cap) break;
      if (listHasDuplicateRoute(unique, r)) continue;
      unique.push(r);
    }
    const stair = unique.find(isStair) || (routes || []).find(isStair);
    let core = unique.filter((r) => !isStair(r));
    if (stair) {
      core = core.filter((r) => !isDuplicateRoute(r, stair));
      if (!core.some(isStair) && !listHasDuplicateRoute(core, stair)) {
        if (core.length >= cap) core = core.slice(0, cap - 1);
        core.push(stair);
      }
    }
    const final = [];
    for (const r of core) {
      if (final.length >= cap) break;
      if (listHasDuplicateRoute(final, r)) continue;
      final.push(r);
    }
    return relabelRouteOptions(final, NR);
  }

  /** Garante rotas distintas (máx. 4) — sem alternativas repetidas. */
  function finalizePackedRoutes(packed, NR, origin, dest) {
    let list = (packed || []).filter((r) => r && r.points && r.points.length >= 2);
    if (origin && dest) list = pruneAbsurdSameFloorRoutes(list, origin, dest);
    list.sort((a, b) => (a.length || 0) - (b.length || 0));
    const isStair = (r) => !!r.viaStairs;
    const stair = list.find(isStair) || null;
    const named = list.filter((r) => r.namedExternal && !isStair(r));
    const rest = list.filter((r) => !r.namedExternal && !isStair(r));
    const maxRoutes = origin && dest ? maxRouteOptionsForPair(origin, dest) : MAX_ROUTE_OPTIONS;

    const out = [];
    if (rest[0]) out.push(rest[0]);

    const namedBudget = Math.max(0, maxRoutes - out.length - (stair ? 1 : 0));
    let namedAdded = 0;
    for (const n of named) {
      if (namedAdded >= namedBudget) break;
      if (pushUniqueRoute(out, n, maxRoutes)) namedAdded++;
    }

    for (const r of rest.slice(1)) {
      const room = maxRoutes - out.length - (stair ? 1 : 0);
      if (room <= 0) break;
      pushUniqueRoute(out, r, maxRoutes);
    }

    if (stair && !out.some((r) => isStair(r) || isDuplicateRoute(r, stair))) {
      if (out.length >= maxRoutes) out[maxRoutes - 1] = stair;
      else out.push(stair);
    } else if (stair && out.some(isStair)) {
      const idx = out.findIndex(isStair);
      if (idx >= 0 && idx < out.length - 1) {
        const [s] = out.splice(idx, 1);
        out.push(s);
      }
    }

    const deduped = [];
    for (const r of out) {
      if (deduped.length >= maxRoutes) break;
      pushUniqueRoute(deduped, r, maxRoutes);
    }

    return dedupeRouteOptionsStrict(deduped, NR, origin, dest);
  }

  /** Concatena pernas A* (via um ou mais nós) numa única rota. */
  function concatNavLegs(...legs) {
    const list = legs.filter(Boolean);
    if (list.length < 2) return list[0] || null;
    let merged = {
      nodeIds: list[0].nodeIds.slice(),
      edgeIds: list[0].edgeIds.slice(),
      points: (list[0].points || []).slice(),
      distanceMeters: list[0].distanceMeters || 0,
    };
    for (let i = 1; i < list.length; i++) {
      const leg = list[i];
      merged.nodeIds = merged.nodeIds.concat(leg.nodeIds.slice(1));
      merged.edgeIds = merged.edgeIds.concat(leg.edgeIds);
      merged.points = merged.points.concat((leg.points || []).slice(1));
      merged.distanceMeters += leg.distanceMeters || 0;
    }
    return merged;
  }

  /** Rota opcional externa forçada por via (string ou lista de waypoints). */
  function buildNamedExternalRoute(NR, startIds, endIds, origin, dest, spec) {
    if (!NR?.astar || !state.navGraph || !spec?.via) return null;
    let vias = (Array.isArray(spec.via) ? spec.via : [spec.via])
      .filter((id) => state.navGraph.nodesById.has(id));
    if (!vias.length) return null;
    const preferredEnds = (Array.isArray(spec.endNodes) ? spec.endNodes : [])
      .filter((id) => state.navGraph.nodesById.has(id));
    let ends = preferredEnds.length ? preferredEnds : endIds;
    const allowPark = spec.allowParking === true || spec.avoidParking === false;

    // Inverte waypoints quando origem/destino estão na ordem b→a do spec
    const aKey = poiRawKey(origin);
    const bKey = poiRawKey(dest);
    const sideMatch = (side, key) => {
      if (Array.isArray(side)) {
        return side.some((item) => {
          const t = String(item);
          return t === key || t.toLowerCase() === key.toLowerCase()
            || key.endsWith(t) || t.endsWith(key);
        });
      }
      return side === key;
    };
    const forward = sideMatch(spec.a, aKey) && sideMatch(spec.b, bKey);
    const reverse = sideMatch(spec.a, bKey) && sideMatch(spec.b, aKey);
    if (reverse && !forward) {
      vias = vias.slice().reverse();
      ends = endIds.filter((id) => state.navGraph.nodesById.has(id));
      if (!ends.length) return null;
    }

    const tryBuild = (avoidParking) => {
      const opts = {
        preference: "shortest",
        avoidParking: !!avoidParking,
        walkingSpeedMps: state.walkingSpeedMps || 1.2,
      };
      if (Array.isArray(spec.bannedTypes) && spec.bannedTypes.length) {
        opts.bannedTypes = spec.bannedTypes;
      }
      if (spec.blockedEdges instanceof Set) {
        opts.blockedEdges = spec.blockedEdges;
      } else if (Array.isArray(spec.blockedEdges) && spec.blockedEdges.length) {
        opts.blockedEdges = new Set(spec.blockedEdges);
      }
      let best = null;
      for (const s of startIds) {
        if (!s || !state.navGraph.nodesById.has(s)) continue;
        for (const e of ends) {
          if (!e || !state.navGraph.nodesById.has(e)) continue;
          const waypoints = [s, ...vias, e];
          const legs = [];
          let ok = true;
          for (let i = 0; i < waypoints.length - 1; i++) {
            const leg = NR.astar(waypoints[i], [waypoints[i + 1]], state.navGraph, opts);
            if (!leg) { ok = false; break; }
            legs.push(leg);
          }
          if (!ok) continue;
          const merged = concatNavLegs(...legs);
          if (!merged || !(merged.points || []).length) continue;
          if (!best || merged.distanceMeters < best.distanceMeters) {
            best = merged;
            best._endNode = e;
          }
        }
      }
      return best;
    };

    let best = allowPark ? tryBuild(false) : tryBuild(spec.avoidParking === true);
    if (!best) best = tryBuild(false);
    if (!best) return null;

    const points = appendPoiEndpoints(best.points, origin, dest);
    if (points.length < 2) return null;
    let length = 0;
    for (let i = 1; i < points.length; i++) length += dist(points[i - 1], points[i]);
    const mpu = getMetersPerUnit();
    const endGate = (CONFIG.templeEntrances || []).find((g) => g.id === best._endNode);
    return {
      points,
      length: mpu > 0 ? best.distanceMeters / mpu : length,
      distanceMeters: best.distanceMeters,
      nodeIds: best.nodeIds,
      edgeIds: best.edgeIds,
      label: spec.label || "Por fora (externa)",
      kind: "fora",
      fromJson: true,
      namedExternal: true,
      viaEndNode: best._endNode || null,
      entranceLabel: endGate?.label || null,
    };
  }

  function appendNamedExternalOptions(NR, startIds, endIds, origin, dest, packed) {
    const specs = namedExternalSpecsForPair(origin, dest);
    const list = packed ? packed.slice() : [];
    for (const spec of specs) {
      const external = buildNamedExternalRoute(NR, startIds, endIds, origin, dest, spec);
      if (!external) continue;
      const sig = (external.edgeIds || []).join(">");
      const dup = list.some((r) => (r.edgeIds || []).join(">") === sig || isDuplicateRoute(r, external));
      if (!dup) list.push(external);
    }
    return appendAdmStairOption(NR, startIds, endIds, origin, dest, list);
  }

  /** 4ª alternativa: sobe/desce pela escada lateral (L00 ↔ L01…L06). */
  function appendAdmStairOption(NR, startIds, endIds, origin, dest, packed) {
    const oLvl = poiLevel(origin);
    const dLvl = poiLevel(dest);
    if (!isStairRoutePair(oLvl, dLvl)) return packed;
    const via = stairHubWaypoints(oLvl, dLvl);
    if (via.length < 2) return packed;

    const stairRoute = buildNamedExternalRoute(NR, startIds, endIds, origin, dest, {
      via,
      label: "Pela escada lateral",
      avoidParking: false,
      allowParking: true,
      bannedTypes: ["elevator"],
      slot: 4,
    });
    if (!stairRoute) return packed;

    stairRoute.viaStairs = true;
    stairRoute.kind = "stairs";
    stairRoute.label = "Pela escada lateral";
    stairRoute.namedExternal = true;

    const list = packed ? packed.slice() : [];
    const sig = (stairRoute.edgeIds || []).join(">");
    if (!list.some((r) => (r.edgeIds || []).join(">") === sig || isDuplicateRoute(r, stairRoute))) list.push(stairRoute);
    return list;
  }

  /** Extende até o ícone só se o trecho for curto e NÃO atravessar parede. */
  function appendPoiEndpoints(points, origin, dest) {
    const pts = (points || []).map((p) => ({ x: p.x, y: p.y }));
    if (!pts.length) return pts;

    const maxSpurO = tol("spurTol", poiToleranceZone(origin));
    const maxSpurD = tol("spurTol", poiToleranceZone(dest));
    const o = poiIcon(origin);
    const d = poiIcon(dest);
    const oLvl = origin?.level || poiLevel(origin);
    const dLvl = dest?.level || poiLevel(dest);
    const sameFloor = oLvl && dLvl && oLvl === dLvl;

    if (isNarniaEntrancePoi(origin)) {
      const gateLvl = isBasementFloor(narniaLevelForPoi(origin) || oLvl) ? (narniaLevelForPoi(origin) || oLvl) : "L00";
      let out = refineNarniaEndpoint(pts, gateLvl, "start");
      if (sameFloor && d && !isNarniaEntrancePoi(dest)) {
        const tip = out[out.length - 1];
        if (dist(tip, d) > 0.8 && dist(tip, d) <= maxSpurD && !crossesWall(tip, d, dLvl)) {
          out.push({ x: d.x, y: d.y });
        }
      }
      return out;
    }
    if (isNarniaEntrancePoi(dest)) {
      const gateLvl = isBasementFloor(narniaLevelForPoi(dest) || dLvl) ? (narniaLevelForPoi(dest) || dLvl) : "L00";
      let out = pts;
      if (sameFloor && o && dist(o, out[0]) > 0.8 && dist(o, out[0]) <= maxSpurO && !crossesWall(o, out[0], oLvl)) {
        out = [{ x: o.x, y: o.y }, ...out];
      }
      return refineNarniaEndpoint(out, gateLvl, "end");
    }

    if (sameFloor && o && dist(o, pts[0]) > 0.8 && dist(o, pts[0]) <= maxSpurO) {
      if (!crossesWall(o, pts[0], oLvl)) pts.unshift({ x: o.x, y: o.y });
    }
    if (sameFloor && d && dist(pts[pts.length - 1], d) > 0.8) {
      if (isTemplePoi(dest)) return pts;
      const tip = pts[pts.length - 1];
      if (dist(tip, d) <= maxSpurD && !crossesWall(tip, d, dLvl)) {
        pts.push({ x: d.x, y: d.y });
      }
    }
    return pts;
  }

  /** Divide a rota em trechos por andar (corta em edges de elevador/escada). */
  function routeLegsFromGraph(route) {
    const NR = globalThis.NavigationRouter;
    if (!route?.nodeIds?.length || !state.navGraph || !NR) {
      return [{
        level: poiLevel(state.origin) || state.activeLevel || "L00",
        nodeIds: route?.nodeIds || [],
        edgeIds: route?.edgeIds || [],
        points: route?.points || [],
      }];
    }
    const TRANS = new Set(["elevator", "stairs", "ramp", "level_transition"]);
    const legs = [];
    let curLevel = state.navGraph.nodesById.get(route.nodeIds[0])?.level || "L00";
    let legNodes = [route.nodeIds[0]];
    let legEdges = [];

    for (let i = 0; i < (route.edgeIds || []).length; i++) {
      const eid = route.edgeIds[i];
      const edge = state.navGraph.edgesById.get(eid);
      const nextId = route.nodeIds[i + 1];
      const nextLevel = state.navGraph.nodesById.get(nextId)?.level || curLevel;
      const isVertical = edge && TRANS.has(edge.type) && nextLevel !== curLevel;

      if (isVertical) {
        legs.push({
          level: curLevel,
          nodeIds: legNodes.slice(),
          edgeIds: legEdges.slice(),
          transition: edge.type,
          toLevel: nextLevel,
        });
        curLevel = nextLevel;
        legNodes = [nextId];
        legEdges = [];
      } else {
        legEdges.push(eid);
        legNodes.push(nextId);
      }
    }
    legs.push({ level: curLevel, nodeIds: legNodes.slice(), edgeIds: legEdges.slice() });

    for (const leg of legs) {
      leg.points = [];
      if (leg.edgeIds.length >= 1 && leg.nodeIds.length >= 2 && NR?.buildRoutePoints) {
        try {
          const built = NR.buildRoutePoints(leg.edgeIds, leg.nodeIds, state.navGraph.edgesById);
          if (built?.length >= 2) leg.points = built;
        } catch { /* tenta montar pelos paths das edges */ }
        if ((leg.points?.length || 0) < 2) {
          const stitched = stitchEdgePaths(leg.edgeIds);
          if (stitched) leg.points = stitched;
        }
      }
      if ((leg.points?.length || 0) < 2) {
        const sliced = sliceRoutePointsForLevel(route, leg.level);
        if (sliced?.length >= 2) leg.points = sliced;
      }
    }
    return legs;
  }

  /** Escolhe a perna desenhável do andar (evita stub vazio quando há várias pernas no mesmo nível). */
  function sliceRoutePointsForLevel(route, levelId) {
    if (!route?.nodeIds?.length || !state.navGraph) return null;
    const NR = globalThis.NavigationRouter;
    let start = -1;
    let end = -1;
    for (let i = 0; i < route.nodeIds.length; i++) {
      const lvl = state.navGraph.nodesById.get(route.nodeIds[i])?.level;
      if (lvl !== levelId) continue;
      if (start < 0) start = i;
      end = i;
    }
    if (start < 0 || end <= start) return null;
    const nodeIds = route.nodeIds.slice(start, end + 1);
    const edgeIds = (route.edgeIds || []).slice(start, end);
    if (nodeIds.length >= 2 && edgeIds.length >= 1 && NR?.buildRoutePoints) {
      try {
        const built = NR.buildRoutePoints(edgeIds, nodeIds, state.navGraph.edgesById);
        if (built?.length >= 2) return built;
      } catch { /* tenta montar pelos paths das edges */ }
      const stitched = stitchEdgePaths(edgeIds);
      if (stitched) return stitched;
    }
    return null;
  }

  function pickBestRouteLeg(candidates) {
    if (!candidates?.length) return null;
    const drawable = candidates.filter((l) => (l.points?.length || 0) >= 2 || (l.edgeIds?.length || 0) > 0);
    const pool = drawable.length ? drawable : candidates;
    return pool.slice().sort((a, b) => {
      const ap = a.points?.length || 0;
      const bp = b.points?.length || 0;
      if (bp !== ap) return bp - ap;
      const ae = a.edgeIds?.length || 0;
      const be = b.edgeIds?.length || 0;
      return be - ae;
    })[0];
  }

  /** Perna + pontos para pintar/navegar no andar ativo. */
  function resolveRouteLegForView(route, activeLevel) {
    if (!route) return { leg: null, points: [] };

    let view = routePointsForLevel(route, activeLevel);
    if (view.points.length < 2 && route.nodeIds?.length >= 2 && state.navGraph) {
      rebuildRouteLegs(route);
      view = routePointsForLevel(route, activeLevel);
    }
    return view;
  }

  function paintActiveRouteLeg() {
    if (!state.route) {
      clearRoutePaint();
      return;
    }
    syncMapViewBeforeRoutePaint();
    const oLvl = poiLevel(state.origin);
    const dLvl = poiLevel(state.dest);
    const lvl = state.activeLevel;

    let { leg, points: pts } = collectRoutePaintPoints(state.route, lvl);

    if ((!pts?.length || pts.length < 2) && state.route) {
      rebuildRouteLegs(state.route);
      hydrateRouteLegPoints(state.route, lvl);
      ({ leg, points: pts } = routePointsForLevel(state.route, lvl));
    }

    if ((!pts?.length || pts.length < 2) && state.route?.points?.length >= 2) {
      const sliced = sliceRoutePointsForLevel(state.route, lvl);
      if (sliced?.length >= 2) {
        pts = sliced.map((p) => ({ x: p.x, y: p.y }));
      } else if (shouldUseFullRoutePolyline(lvl, oLvl, dLvl)) {
        pts = state.route.points
          .map((p) => ({ x: p.x, y: p.y }))
          .filter((p) => isFinite(p.x) && isFinite(p.y));
      } else {
        const fb = buildFloorLegFallbackPoints(lvl, state.origin, state.dest);
        if (fb?.points?.length >= 2) {
          pts = fb.points.map((p) => ({ x: p.x, y: p.y }));
        }
      }
    }
    if (!pts?.length || pts.length < 2) {
      clearRoutePaint();
      return;
    }
    if (pts.length === 1) {
      pts = [pts[0], { x: pts[0].x + 0.5, y: pts[0].y }];
    }

    if (isBasementExitActiveLeg(lvl, oLvl, dLvl)) {
      pts = finalizeBasementExitLegPoints(pts, lvl);
    } else if (crossFloorExitLeg(lvl, oLvl, dLvl) || crossFloorEntryLeg(lvl, oLvl, dLvl)) {
      pts = extendCrossFloorLegPoints(pts, lvl, oLvl, dLvl, state.route);
    } else if (oLvl === lvl || (isNarniaEntrancePoi(state.origin) && narniaLevelForPoi(state.origin) === lvl)) {
      pts = appendPoiEndpoints(pts, state.origin, {
        ...state.dest,
        level: dLvl,
        iconX: undefined,
        iconY: undefined,
        x: pts[pts.length - 1].x,
        y: pts[pts.length - 1].y,
      });
    } else if (dLvl === lvl || (isNarniaEntrancePoi(state.dest) && narniaLevelForPoi(state.dest) === lvl)) {
      pts = appendPoiEndpoints(pts, {
        ...state.origin,
        level: lvl,
        iconX: undefined,
        iconY: undefined,
        x: pts[0].x,
        y: pts[0].y,
      }, state.dest);
    }

    const hub = narniaHubNode(lvl);
    if (hub && leg?.nodeIds?.includes(hub)) {
      if (shouldRefineNarniaAtBasementGate(lvl, oLvl, dLvl, "start")) {
        pts = refineNarniaEndpoint(pts, lvl, "start");
      }
      if (shouldRefineNarniaAtBasementGate(lvl, oLvl, dLvl, "end")) {
        pts = refineNarniaEndpoint(pts, lvl, "end");
      }
    }
    if (isNarniaEntrancePoi(state.origin) && narniaLevelForPoi(state.origin) === lvl) {
      const gateLvl = isBasementFloor(lvl) ? lvl : "L00";
      pts = refineNarniaEndpoint(pts, gateLvl, "start");
    }
    if (isNarniaEntrancePoi(state.dest) && narniaLevelForPoi(state.dest) === lvl) {
      const gateLvl = isBasementFloor(lvl) ? lvl : "L00";
      pts = refineNarniaEndpoint(pts, gateLvl, "end");
    }

    const a = pts[0];
    const b = pts[pts.length - 1];
    paintRouteOnMap(pts.map((p) => `${p.x},${p.y}`).join(" "), a, b, pts);
    apply();
  }

  function templeEntranceList() {
    return (CONFIG.templeEntrances || []).filter((e) =>
      state.navGraph?.nodesById.has(e.id) || (G.nodes && G.nodes[e.id])
    );
  }

  /** Rotas até o templo: uma opção por entrada do estabelecimento. */
  function routesViaTempleEntrances(NR, startIds, origin, dest, allowParking) {
    const gates = templeEntranceList();
    if (!gates.length) return [];
    const collected = [];
    const seenSig = new Set();

    for (const gate of gates) {
      const node = state.navGraph.nodesById.get(gate.id);
      if (!node) continue;
      // dest “virtual” na porta — pin e fim da rota na entrada
      const destAtGate = {
        ...dest,
        anchor: gate.id,
        snap: { x: node.x, y: node.y },
        x: node.x,
        y: node.y,
        iconX: node.x,
        iconY: node.y,
        entranceLabel: gate.label,
      };

      let found = NR.findRoutesForPoiPair(startIds, [gate.id], state.navGraph, {
        preference: "shortest",
        avoidParking: !allowParking,
        walkingSpeedMps: state.walkingSpeedMps || 1.2,
      });
      // acessos sul do templo passam por zona marcada como estacionamento
      if (!found.length) {
        found = NR.findRoutesForPoiPair(startIds, [gate.id], state.navGraph, {
          preference: "shortest",
          avoidParking: false,
          walkingSpeedMps: state.walkingSpeedMps || 1.2,
        });
      }
      if (!found.length) continue;

      const best = found[0];
      const sig = (best.edgeIds || []).join(">");
      if (sig && seenSig.has(sig)) continue;
      if (sig) seenSig.add(sig);

      const points = appendPoiEndpoints(best.points?.length ? best.points : [{ x: node.x, y: node.y }], origin, destAtGate);
      if (points.length < 2) {
        const o = poiIcon(origin) || origin.snap || points[0];
        points.length = 0;
        if (o) points.push({ x: o.x, y: o.y });
        points.push({ x: node.x, y: node.y });
      }
      let length = 0;
      for (let i = 1; i < points.length; i++) length += dist(points[i - 1], points[i]);
      const mpu = getMetersPerUnit();
      collected.push({
        points,
        length: mpu > 0 ? (best.distanceMeters / mpu) + Math.max(0, length - (best.points || []).reduce((s, p, i, a) => (i ? s + dist(a[i - 1], p) : 0), 0)) : length,
        distanceMeters: best.distanceMeters,
        nodeIds: best.nodeIds,
        edgeIds: best.edgeIds,
        rank: collected.length + 1,
        label: gate.label,
        kind: "templo",
        entranceId: gate.id,
        fromJson: true,
      });
    }

    collected.sort((a, b) => a.length - b.length);
    collected.forEach((r, i) => { r.rank = i + 1; });
    return collected.slice(0, 4);
  }

  function routeOptionsFromJson(origin, dest) {
    const NR = globalThis.NavigationRouter;
    if (!NR || !state.navGraph) return null;

    let startIds = resolveNavNodeIds(origin, origin.id === "__here__" ? "here" : "origin");
    let endIds = resolveNavNodeIds(dest, "dest");

    // se o POI não tem nodeId no JSON, ancora no nó mais próximo do grafo
    if (!startIds.length) {
      const id = NR.nearestNodeId(poiIcon(origin) || origin, state.navGraph, { level: poiLevel(origin) });
      if (id) startIds = [id];
    }
    if (!endIds.length) {
      const id = NR.nearestNodeId(poiIcon(dest) || dest, state.navGraph, { level: poiLevel(dest) });
      if (id) endIds = [id];
    }
    if (!startIds.length || !endIds.length) return [];

    // sincroniza âncoras na UI
    if (startIds[0] && state.navGraph.nodesById.get(startIds[0])) {
      const n = state.navGraph.nodesById.get(startIds[0]);
      origin.anchor = startIds[0];
      origin.snap = { x: n.x, y: n.y };
    }
    if (endIds[0] && state.navGraph.nodesById.get(endIds[0])) {
      const n = state.navGraph.nodesById.get(endIds[0]);
      dest.anchor = endIds[0];
      dest.snap = { x: n.x, y: n.y };
    }

    const allowParking = tripAllowsParking(origin, dest);

    const oLvl = poiLevel(origin);
    const dLvl = poiLevel(dest);

    if (routeInvolvesBasementTransfer(oLvl, dLvl)) {
      const narnia = buildBasementNarniaRoutes(NR, startIds, endIds, origin, dest);
      if (narnia.length) return finalizePackedRoutes(narnia, NR, origin, dest);
    }

    if (isCrossCampusFloorPair(oLvl, dLvl)) {
      const cross = buildCrossCampusFloorRoutes(NR, startIds, endIds, origin, dest);
      if (cross.length) return finalizePackedRoutes(cross, NR, origin, dest);
    }

    // destino = Templo → opções por cada entrada + rota por fora (se houver)
    if (isTemplePoi(dest)) {
      let viaDoors = routesViaTempleEntrances(NR, startIds, origin, dest, allowParking);
      viaDoors = appendNamedExternalOptions(NR, startIds, endIds, origin, dest, viaDoors);
      if (viaDoors.length) return finalizePackedRoutes(viaDoors, NR, origin, dest);
    }
    // origem = Templo → sai por cada entrada
    if (isTemplePoi(origin)) {
      const gates = templeEntranceList();
      let flipped = [];
      for (const gate of gates) {
        if (!state.navGraph.nodesById.has(gate.id)) continue;
        const node = state.navGraph.nodesById.get(gate.id);
        const originAtGate = {
          ...origin,
          anchor: gate.id,
          snap: { x: node.x, y: node.y },
          x: node.x, y: node.y,
          iconX: node.x, iconY: node.y,
        };
        let found = NR.findRoutesForPoiPair([gate.id], endIds, state.navGraph, {
          preference: "shortest",
          avoidParking: !allowParking,
          walkingSpeedMps: state.walkingSpeedMps || 1.2,
        });
        if (!found.length) {
          found = NR.findRoutesForPoiPair([gate.id], endIds, state.navGraph, {
            preference: "shortest",
            avoidParking: false,
            walkingSpeedMps: state.walkingSpeedMps || 1.2,
          });
        }
        if (!found.length) continue;
        const best = found[0];
        const points = appendPoiEndpoints(best.points, originAtGate, dest);
        if (points.length < 2) continue;
        let length = 0;
        for (let i = 1; i < points.length; i++) length += dist(points[i - 1], points[i]);
        const mpu = getMetersPerUnit();
        flipped.push({
          points,
          length: mpu > 0 ? best.distanceMeters / mpu : length,
          distanceMeters: best.distanceMeters,
          nodeIds: best.nodeIds,
          edgeIds: best.edgeIds,
          label: `Saindo: ${gate.label}`,
          kind: "templo",
          entranceId: gate.id,
          fromJson: true,
        });
      }
      flipped = appendNamedExternalOptions(NR, startIds, endIds, origin, dest, flipped);
      if (flipped.length) return finalizePackedRoutes(flipped, NR, origin, dest);
    }

    const pack = (routes) => {
      const mpu = getMetersPerUnit();
      return routes.map((r) => {
        const points = appendPoiEndpoints(
          (r.points && r.points.length)
            ? r.points
            : [origin.snap || poiIcon(origin), dest.snap || poiIcon(dest)].filter(Boolean),
          origin,
          dest
        );
        let length = 0;
        for (let i = 1; i < points.length; i++) length += dist(points[i - 1], points[i]);
        const lengthUnits = mpu > 0 ? (r.distanceMeters / mpu) : length;
        const meshLen = (r.points && r.points.length >= 2)
          ? r.points.reduce((s, p, i, a) => (i ? s + dist(a[i - 1], p) : 0), 0)
          : 0;
        const spurExtra = Math.max(0, length - meshLen);
        return {
          points,
          length: lengthUnits + (mpu > 0 ? spurExtra : 0),
          distanceMeters: (r.distanceMeters || 0) + spurExtra * mpu,
          nodeIds: r.nodeIds,
          edgeIds: r.edgeIds,
          rank: r.rank,
          label: NR.rankLabel(r.rank || 1, routes.length),
          kind: (r.rank || 1) === 1 ? "best" : "alt",
          fromJson: true,
        };
      }).filter((r) => r.points && r.points.length >= 2 && (
        (r.edgeIds && r.edgeIds.length > 0) || (r.nodeIds && r.nodeIds.length === 1)
      ));
    };

    // mesmo nó de malha (POIs vizinhos): ainda assim mostra ícone→ícone
    if (startIds[0] === endIds[0]) {
      const n = state.navGraph.nodesById.get(startIds[0]);
      if (n) {
        return pack([{
          points: [{ x: n.x, y: n.y }],
          distanceMeters: 0,
          nodeIds: [startIds[0]],
          edgeIds: [],
          rank: 1,
        }]);
      }
    }

    let routes = NR.findRoutesForPoiPair(startIds, endIds, state.navGraph, {
      preference: "shortest",
      avoidParking: !allowParking,
      walkingSpeedMps: state.walkingSpeedMps || 1.2,
    });

    if (!routes.length && !allowParking) {
      routes = NR.findRoutesForPoiPair(startIds, endIds, state.navGraph, {
        preference: "shortest",
        avoidParking: false,
        walkingSpeedMps: state.walkingSpeedMps || 1.2,
      });
    }

    let packed = pack(routes);
    packed = appendNamedExternalOptions(NR, startIds, endIds, origin, dest, packed);
    return finalizePackedRoutes(packed, NR, origin, dest);
  }

  function autoCalibrateFromSvg(svg) {
    const cal = Cal();
    if (!cal) return;
    // se já tem calibração confirmada manualmente, não sobrescreve
    if (state.calibration?.accuracy === "confirmed") return;
    const detected = cal.detectBatisterioWidth(svg);
    if (!detected) return;
    applyCalibration(detected);
    if (CONFIG.isDev) drawCalibrationMarks(detected.startPoint, detected.endPoint);
  }

  function ensureCalibOverlay() {
    let g = el.overlay.querySelector("#calibOverlay");
    if (g) return g;
    g = document.createElementNS(NS, "g");
    g.setAttribute("id", "calibOverlay");
    g.setAttribute("pointer-events", "none");
    el.overlay.appendChild(g);
    return g;
  }

  function drawCalibrationMarks(a, b) {
    if (!CONFIG.isDev && !state.calibMode) {
      clearCalibrationMarks();
      return;
    }
    const g = ensureCalibOverlay();
    g.innerHTML = "";
    if (!a && !b) return;
    if (a && b) {
      const line = document.createElementNS(NS, "line");
      line.setAttribute("class", "calib-mark-line");
      line.setAttribute("x1", a.x); line.setAttribute("y1", a.y);
      line.setAttribute("x2", b.x); line.setAttribute("y2", b.y);
      g.appendChild(line);
    }
    [a, b].forEach((p) => {
      if (!p) return;
      const c = document.createElementNS(NS, "circle");
      c.setAttribute("class", "calib-mark");
      c.setAttribute("cx", p.x); c.setAttribute("cy", p.y); c.setAttribute("r", "5");
      g.appendChild(c);
    });
  }

  function clearCalibrationMarks() {
    const g = el.overlay.querySelector("#calibOverlay");
    if (g) g.innerHTML = "";
  }

  function enterCalibMode() {
    state.calibMode = true;
    state.calibStep = 0;
    state.calibPoints = [];
    el.app.classList.add("is-calibrating");
    if (el.calibPanel) el.calibPanel.hidden = false;
    if (el.calibSave) el.calibSave.disabled = true;
    if (el.calibResult) el.calibResult.hidden = true;
    if (el.calibHelp) {
      el.calibHelp.innerHTML = "Clique no extremo <strong>esquerdo</strong> da largura do Batistério (face da parede).";
    }
    clearCalibrationMarks();
    toast("Modo calibração: clique na parede esquerda do Batistério.");
  }

  function exitCalibMode() {
    state.calibMode = false;
    state.calibStep = 0;
    state.calibPoints = [];
    el.app.classList.remove("is-calibrating");
    if (el.calibPanel) el.calibPanel.hidden = true;
  }

  function finishCalibPreview() {
    const cal = Cal();
    if (!cal || state.calibPoints.length < 2) return;
    const real = Math.max(0.01, parseFloat(el.calibRealInput?.value || "6.8") || 6.8);
    try {
      const draft = cal.createMapCalibration(
        "Largura do Batistério",
        state.calibPoints[0],
        state.calibPoints[1],
        real,
        { source: "manual", accuracy: "confirmed", criterion: "external-face" }
      );
      state._calibDraft = draft;
      drawCalibrationMarks(draft.startPoint, draft.endPoint);
      if (el.calibResult) {
        el.calibResult.hidden = false;
        el.calibResult.innerHTML =
          `<strong>Referência:</strong> ${draft.referenceName}<br/>` +
          `<strong>Distância real:</strong> ${draft.realDistanceMeters.toFixed(2)} m<br/>` +
          `<strong>Distância SVG:</strong> ${draft.digitalDistance.toFixed(2)} unidades<br/>` +
          `<strong>Escala:</strong> ${draft.unitsPerMeter.toFixed(2)} un/m<br/>` +
          `<strong>Conversão:</strong> ${draft.metersPerUnit.toFixed(4)} m/un<br/>` +
          `<em>Medida confirmada por marcação manual (face externa).</em>`;
      }
      if (el.calibSave) el.calibSave.disabled = false;
      if (el.calibHelp) el.calibHelp.textContent = "Revise o resultado e clique em Salvar escala.";
    } catch (err) {
      toast(err.message || "Falha na calibração.");
    }
  }

  const NS = "http://www.w3.org/2000/svg";
  const layerById = (svg, id) => svg.getElementById(id) || svg.querySelector(`[id="${id}"]`);

  /**
   * Prefixa classes .cls-* da camada para não colidir no SVG composto.
   * Sem isso, edges outdoor (.cls-1 { stroke:#00c980 }) vazam contorno verde
   * para os ícones dos POIs (mesmo seletor .cls-1).
   */
  function scopeLayerClasses(root, defsNode, prefix) {
    if (!prefix || !root) return defsNode;
    const rename = (name) => (/^cls-\d+$/i.test(name) ? `${prefix}-${name}` : name);
    root.querySelectorAll("[class]").forEach((el) => {
      const next = el.getAttribute("class").split(/\s+/).filter(Boolean).map(rename).join(" ");
      el.setAttribute("class", next);
    });
    if (!defsNode) return null;
    const scoped = defsNode.cloneNode(true);
    scoped.querySelectorAll("style").forEach((styleEl) => {
      styleEl.textContent = String(styleEl.textContent || "").replace(
        /\.cls-(\d+)\b/g,
        `.${prefix}-cls-$1`
      );
    });
    return scoped;
  }

  /** Extrai camada: grupo interno OU o próprio <svg> raiz (arquivos 2026 limpos). */
  function extractLayer(sourceSvg, layerIds, classPrefix) {
    const ids = Array.isArray(layerIds) ? layerIds : [layerIds];
    for (const id of ids) {
      if (sourceSvg.getAttribute("id") === id) {
        const g = document.createElementNS(NS, "g");
        g.setAttribute("id", id);
        const dataName = sourceSvg.getAttribute("data-name");
        if (dataName) g.setAttribute("data-name", dataName);
        [...sourceSvg.children].forEach((child) => {
          if (child.tagName.toLowerCase() === "defs") return;
          g.appendChild(document.importNode(child, true));
        });
        const rawDefs = sourceSvg.querySelector("defs");
        g._sourceDefs = scopeLayerClasses(g, rawDefs, classPrefix);
        return g;
      }
      const found = layerById(sourceSvg, id);
      if (found) {
        const g = document.importNode(found, true);
        const rawDefs = sourceSvg.querySelector("defs");
        g._sourceDefs = scopeLayerClasses(g, rawDefs, classPrefix);
        return g;
      }
    }
    return null;
  }

  function mergeDefs(hostSvg, defsNode) {
    if (!defsNode) return;
    let hostDefs = hostSvg.querySelector("defs");
    if (!hostDefs) {
      hostDefs = document.createElementNS(NS, "defs");
      hostSvg.insertBefore(hostDefs, hostSvg.firstChild);
    }
    [...defsNode.children].forEach((c) => hostDefs.appendChild(document.importNode(c, true)));
  }

  /** Oculta nodes e edges (malha técnica) — o usuário não deve ver. */
  function hideTechnicalLayers(svg, { hard = true } = {}) {
    if (!svg) return;
    const ids = new Set([
      ...(CONFIG.layers.technical || []),
      CONFIG.replaceTargets.nodes,
      CONFIG.replaceTargets.edgeIndoor,
      CONFIG.replaceTargets.edgeOutdoor,
      ...(CONFIG.layers.nodes || []),
      ...(CONFIG.layers.edges || []),
    ]);
    ids.forEach((id) => {
      if (!id) return;
      const g = layerById(svg, id);
      if (!g) return;
      // soft: só visibility (permite getBBox no parse); hard: some de verdade
      if (hard) g.style.display = "none";
      else g.style.display = "";
      g.style.visibility = "hidden";
      g.style.pointerEvents = "none";
      g.setAttribute("aria-hidden", "true");
      if (hard) g.classList.add("layer-tech-hidden");
      else g.classList.remove("layer-tech-hidden");
    });
  }

  /* ============================================================ CARREGAR SVG */
  async function loadSVG() {
    try {
      const fileEntries = Object.entries(CONFIG.svgFiles);
      const loaded = await Promise.all(fileEntries.map(async ([key, url]) => {
        const res = await fetch(url, { cache: "no-store" });
        if (!res.ok) throw new Error(`Falha ao carregar ${url}: HTTP ${res.status}`);
        const text = await res.text();
        const doc = new DOMParser().parseFromString(text, "image/svg+xml");
        if (doc.querySelector("parsererror") || !doc.documentElement.matches("svg")) {
          throw new Error(`SVG inválido: ${url}`);
        }
        return [key, doc.documentElement];
      }));
      const sources = Object.fromEntries(loaded);

      const expectedViewBox = sources.background.getAttribute("viewBox");
      for (const [key, source] of loaded) {
        if (source.getAttribute("viewBox") !== expectedViewBox) {
          throw new Error(`O viewBox de ${key} difere do background`);
        }
      }

      const svg = document.importNode(sources.background, true);
      const T = CONFIG.replaceTargets;
      const replacements = [
        { key: "wall", targetId: T.wall, sourceIds: [T.wall], classPrefix: "wall" },
        {
          key: "edgeIndoor",
          targetId: T.edgeIndoor,
          sourceIds: [CONFIG.layers.edges[0], T.edgeIndoor],
          classPrefix: "edge-in",
        },
        {
          key: "edgeOutdoor",
          targetId: T.edgeOutdoor,
          sourceIds: [CONFIG.layers.edges[1], T.edgeOutdoor],
          classPrefix: "edge-out",
        },
        { key: "nodes", targetId: T.nodes, sourceIds: CONFIG.layers.nodes.concat([T.nodes]), classPrefix: "node" },
        { key: "pois", targetId: T.pois, sourceIds: CONFIG.layers.pois.concat([T.pois]), classPrefix: "poi" },
        { key: "infoTextos", targetId: T.infoTextos, sourceIds: ["_07_txt_info", T.infoTextos], classPrefix: "info" },
      ];
      for (const { key, targetId, sourceIds, classPrefix } of replacements) {
        const current = layerById(svg, targetId);
        const replacement = extractLayer(sources[key], sourceIds, classPrefix);
        if (!current || !replacement) {
          throw new Error(`Camada não encontrada: ${key} (${targetId})`);
        }
        // mantém o id esperado pelo host (compatível com layers.visible)
        replacement.setAttribute("id", targetId);
        if (replacement._sourceDefs) {
          mergeDefs(svg, replacement._sourceDefs);
          delete replacement._sourceDefs;
        }
        current.replaceWith(replacement);
      }

      const vbAttr = svg.getAttribute("viewBox") || "0 0 1011.56 862.63";
      const vb = vbAttr.split(/[\s,]+/).map(Number);
      G.vbW = vb[2] || 1000;
      G.vbH = vb[3] || 720;

      svg.querySelectorAll("symbol").forEach((sym) => {
        const svb = (sym.getAttribute("viewBox") || "").split(/[\s,]+/).map(Number);
        if (svb.some((n) => !isFinite(n) || n < 0)) sym.remove();
      });
      svg.querySelectorAll("use").forEach((u) => {
        const w = +u.getAttribute("width"), h = +u.getAttribute("height");
        if ((isFinite(w) && w < 0) || (isFinite(h) && h < 0)) u.remove();
      });

      svg.removeAttribute("width");
      svg.removeAttribute("height");
      svg.setAttribute("preserveAspectRatio", "xMidYMid meet");
      svg.style.display = "block";
      svg.style.shapeRendering = "geometricPrecision";
      svg.setAttribute("id", "mapaSVG");

      const L = CONFIG.layers;
      const setDisplay = (ids, value) => (ids || []).forEach((id) => {
        const g = layerById(svg, id);
        if (g) {
          g.style.display = value;
          g.classList.remove("st46");
        }
      });
      setDisplay(L.visible, "inline");
      // soft hide antes do parse (getBBox ainda funciona)
      hideTechnicalLayers(svg, { hard: false });

      el.svgHost.innerHTML = "";
      el.svgHost.appendChild(svg);
      el.svgHost.dataset.level = "L00";
      el.svgHost.classList.remove("svg-host--floor");
      state.floorViews.L00 = svg;
      state.floorMeta.L00 = { vbX: 0, vbY: 0, vbW: G.vbW, vbH: G.vbH };

      el.overlay.setAttribute("viewBox", `0 0 ${G.vbW} ${G.vbH}`);
      el.overlay.removeAttribute("width");
      el.overlay.removeAttribute("height");
      el.overlay.setAttribute("preserveAspectRatio", "xMidYMid meet");

      parseGraph(svg);
      bindPOIs(svg);
      hideNonPoiInfoTexts(svg);
      applyFloorVisibility();
      renderFloorMenu();
      updateFloorChrome();

      // nodes/edges ocultos de verdade para o usuário
      hideTechnicalLayers(svg, { hard: true });

      el.svgName.textContent = Object.values(CONFIG.svgFiles)
        .map((url) => url.split("/").pop())
        .join(" · ");
      el.statusHint.textContent = "Carregando locais por andar…";
      await loadCalibration();
      await loadNavigation();
      renderFloorLocaisHint();
      autoCalibrateFromSvg(svg);
      if (CONFIG.isDev && state.calibration) {
        drawCalibrationMarks(state.calibration.startPoint, state.calibration.endPoint);
      }
      fitSoon();
      initUserLocation();
    } catch (err) {
      el.statusHint.textContent = `Não foi possível montar o mapa: ${err.message}`;
      console.error(err);
    }
  }

  async function initUserLocation() {
    if (state.userLocation) return;
    try {
      await globalThis.PIBMapDeferred?.loadGpsStack?.();
    } catch (err) {
      console.warn("GPS stack defer:", err);
    }
    if (typeof UserLocationSystem === "undefined") {
      console.warn("UserLocationSystem não carregou (scripts js/ ausentes no deploy?).");
      if (el.locBtn && !el.locBtn._bound) {
        el.locBtn._bound = true;
        el.locBtn.addEventListener("click", (e) => {
          e.preventDefault();
          toast("Localização GPS não disponível neste deploy. Verifique se os arquivos js/ foram publicados.");
        });
      }
      initGpsOrientation();
      return;
    }
    initLiveNavigation();
    state.userLocation = UserLocationSystem.create({
      overlay: el.overlay,
      getOverlay: () => el.overlay,
      viewport: el.viewport,
      canvas: el.canvas,
      locBtn: el.locBtn,
      gpsCompass: el.gpsCompass,
      gpsCompassArrow: el.gpsCompassArrow,
      getState: () => state,
      setState: (patch) => { Object.assign(state, patch); },
      apply,
      clamp,
      getViewBox: () => ({ w: G.vbW, h: G.vbH }),
      getMetersPerUnit,
      getMapScale: () => state.scale || 1,
      toast,
      ensureCampusView: () => {
        if (state.activeLevel === "L00") return;
        // GPS / puck usam coordenadas do campus — força L00 sem limpar a viagem
        return setActiveLevel("L00", { keepTrip: true, silent: true });
      },
    });
    // Não auto-inicia: permissão de GPS/bússola precisa de gesto do usuário (clique no botão).
    initGpsOrientation();
  }

  function initGpsOrientation() {
    if (state.gpsOrientation || typeof GpsOrientation === "undefined") return;

    let cachedGeo = null;
    let cachedGeofence = null;

    async function ensureGeoTransform() {
      if (cachedGeo?.latLngToSvg) return cachedGeo;
      let data = null;
      try {
        const res = await fetch("data/geo-reference.json", { cache: "no-store" });
        if (res.ok) data = await res.json();
      } catch (err) {
        console.warn("geo-reference:", err);
      }
      if (!data) {
        data = {
          mapCenter: { latitude: -25.442099, longitude: -49.284715 },
          controlPoints: [
            { id: "C", latitude: -25.441556, longitude: -49.284917, svgX: 21.5, svgY: 347, weight: 1.4 },
            { id: "N", latitude: -25.442469, longitude: -49.285246, svgX: 591.08, svgY: 826.85, weight: 1.4 },
            { id: "A", latitude: -25.441694, longitude: -49.285528, svgX: 40, svgY: 780, weight: 1 },
            { id: "M", latitude: -25.443038, longitude: -49.284959, svgX: 940.95, svgY: 830, weight: 1 },
          ],
        };
      }
      cachedGeo = globalThis.GeoTransform?.createFromGeoReference?.(data) || null;
      return cachedGeo;
    }

    function ensureGeofence() {
      if (cachedGeofence) return cachedGeofence;
      if (typeof GeofenceService !== "undefined" && globalThis.PIB_CURITIBA_LOCATION_CONFIG) {
        cachedGeofence = GeofenceService.createFromPibConfig(
          globalThis.PIB_CURITIBA_LOCATION_CONFIG,
        );
      }
      return cachedGeofence;
    }

    function askAmbiguousEntrances(options, title) {
      return new Promise((resolve) => {
        const modal = el.gpsConfirmModal;
        const actions = el.gpsConfirmActions;
        if (!modal || !actions) {
          resolve(options[0] || null);
          return;
        }
        if (el.gpsConfirmTitle) el.gpsConfirmTitle.textContent = title;
        actions.innerHTML = "";
        options.forEach((opt) => {
          const btn = document.createElement("button");
          btn.type = "button";
          btn.className = "btn btn--primary btn--block";
          btn.textContent = opt.name || opt.id;
          btn.addEventListener("click", () => {
            modal.hidden = true;
            modal.setAttribute("aria-hidden", "true");
            resolve(opt);
          });
          actions.appendChild(btn);
        });
        const done = (val) => {
          modal.hidden = true;
          modal.setAttribute("aria-hidden", "true");
          resolve(val);
        };
        if (el.gpsConfirmDismiss) {
          el.gpsConfirmDismiss.onclick = () => done(null);
        }
        modal.hidden = false;
        modal.setAttribute("aria-hidden", "false");
      });
    }

    state.gpsOrientation = GpsOrientation.create({
      buttonEl: el.gpsOrientBtn,
      cancelEl: el.gpsOrientCancel,
      accuracyEl: el.gpsAccuracyHint,
      toast,
      getState: () => state,
      setField: (which, poi) => {
        setField(which, poi);
        // LP: não exibe o pin “Estou aqui” (ponto azul) — o puck GPS cuida da posição
        if (which === "origin" && poi?.id === "__here__" && el.hereMarker) {
          state.here = poi;
          el.hereMarker.hidden = true;
          el.hereMarker.setAttribute("hidden", "");
          el.hereMarker.setAttribute("visibility", "hidden");
          el.hereMarker.style.display = "none";
        }
      },
      drawRoute,
      enterNav,
      exitNav: (msg) => {
        state.gpsOrientation?.getTracking()?.stop();
        exitNav(msg);
      },
      getMetersPerUnit,
      ensureGeoTransform,
      ensureGeofence,
      ensureUserLocationStarted: async () => {
        if (!state.userLocation) return false;
        if (state.activeLevel !== "L00") {
          await setActiveLevel("L00", { keepTrip: true, silent: true });
        }
        if (state.userLocation.startFollowing) {
          return !!(await state.userLocation.startFollowing());
        }
        return !!(await state.userLocation.start?.({ silent: true }));
      },
      onTrackingSnap: (valid, snap) => {
        // LP: não desenha o ponto azul “hereMarker”; puck GPS com posição ajustada ao grafo
        if (el.hereMarker) {
          el.hereMarker.hidden = true;
          el.hereMarker.setAttribute("hidden", "");
          el.hereMarker.setAttribute("visibility", "hidden");
          el.hereMarker.style.display = "none";
        }
        const pt = valid?.svg || snap?.snappedPosition;
        if (pt && state.userLocation?.updateTrackedPosition) {
          state.userLocation.updateTrackedPosition(pt.x, pt.y, valid?.accuracy);
        }
        if (el.navHint && state.userNav) {
          const pct = isFinite(valid?.routeProgress)
            ? Math.round(valid.routeProgress * 100)
            : null;
          const acc = Math.round(valid?.accuracy || 0);
          const liveMsg = state.liveNav?.getState?.()?.status;
          const hint =
            liveMsg === "low_accuracy"
              ? `Precisão reduzida · ±${acc} m`
              : liveMsg === "rerouting"
                ? "Recalculando rota..."
                : pct != null
                  ? `Você está na rota · ~${pct}% · ±${acc} m`
                  : `±${acc} m`;
          el.navHint.textContent = hint;
        }
        if (LiveNavigationConfig?.isDebugNavigation?.() && valid?.mapMatch) {
          console.debug("[live-nav]", valid.mapMatch);
        }
      },
      onNeedManualEntrance: () => {
        toast(
          "Localização aproximada encontrada.\nSelecione a entrada mais próxima para continuar.",
        );
        startPlacingHere();
      },
      onAmbiguousEntrances: askAmbiguousEntrances,
      getLiveMapMatchEnhancer: () => state.liveMapMatchEnhancer,
      rerouteFromVirtualNode,
      getSelectedDestinationNodeId: () => {
        const ids = resolveNavNodeIds(state.dest, "dest");
        return ids[0] || null;
      },
      convertGpsToMapCoordinates: (latitude, longitude) => {
        const geoRef = cachedGeo || null;
        return geoRef?.latLngToSvg?.(latitude, longitude) || null;
      },
      updateGpsMarker: (pos) => {
        if (pos?.latitude != null && pos?.longitude != null) {
          state.userLocation?.showAtLatLng?.(pos.latitude, pos.longitude, pos.accuracy);
        } else if (pos?.x != null && pos?.y != null) {
          state.userLocation?.updateTrackedPosition?.(pos.x, pos.y, pos.accuracy);
        }
      },
      drawCalculatedRoute: async () => {
        await drawRoute();
      },
      applyGpsOrientedRoute: async (result) => {
        if (!result?.points?.length || !result.nodeIds?.length) return false;
        const route = {
          id: `gps-route-${result.destinationNodeId}`,
          nodeIds: result.nodeIds,
          edgeIds: result.edgeIds || [],
          points: result.points,
          length: result.lengthMeters || 0,
          label: "Rota 1 — Mais curta",
          kind: "best",
          fromJson: true,
        };
        route.legs = routeLegsFromGraph(route);
        state.routeOptions = [route];
        state.routeIdx = 0;
        state.route = route;
        state.routePickOpen = true;
        selectRoute(0, true);
        updateSummaryChrome();
        return !!state.route;
      },
      waitForDeviceHeading: (timeout = 1500) =>
        new Promise((resolve) => {
          const nav = state.userNav || {};
          if (nav.deviceHeading != null && isFinite(nav.deviceHeading)) {
            resolve(nav.deviceHeading);
            return;
          }
          const startedAt = Date.now();
          const tick = () => {
            const h = state.userNav?.deviceHeading;
            if (h != null && isFinite(h)) {
              resolve(h);
              return;
            }
            if (Date.now() - startedAt >= timeout) {
              resolve(null);
              return;
            }
            requestAnimationFrame(tick);
          };
          tick();
        }),
      ensureDeviceOrientation: async () => {
        await state.userLocation?.startFollowing?.({ silent: true })
          || state.userLocation?.start?.({ silent: true });
      },
      getMapNorthOffsetDeg: () => cachedGeo?.transform?.mapNorthOffset || 0,
      getActiveLevel: () => state.activeLevel || "L00",
    });
  }

  // centro geometrico de um elemento SVG (usa bbox quando disponivel)
  function centerOf(node) {
    const tag = node.tagName.toLowerCase();
    if (tag === "circle" || tag === "ellipse")
      return { x: +node.getAttribute("cx"), y: +node.getAttribute("cy") };
    if (tag === "rect")
      return { x: +node.getAttribute("x") + +node.getAttribute("width") / 2,
               y: +node.getAttribute("y") + +node.getAttribute("height") / 2 };
    try { const b = node.getBBox(); return { x: b.x + b.width / 2, y: b.y + b.height / 2 }; }
    catch { return { x: 0, y: 0 }; }
  }

  function edgeEndpoints(node) {
    const tag = node.tagName.toLowerCase();
    if (tag === "line")
      return [{ x: +node.getAttribute("x1"), y: +node.getAttribute("y1") },
              { x: +node.getAttribute("x2"), y: +node.getAttribute("y2") }];
    if (tag === "polyline" || tag === "polygon") {
      // Illustrator exporta "x y x y…" (espaços) OU "x,y x,y" — ambos válidos
      const nums = (node.getAttribute("points") || "")
        .trim()
        .split(/[\s,]+/)
        .map(Number)
        .filter((n) => isFinite(n));
      const pts = [];
      for (let i = 0; i + 1 < nums.length; i += 2) pts.push({ x: nums[i], y: nums[i + 1] });
      return pts;
    }
    if (tag === "path") {
      const len = node.getTotalLength ? node.getTotalLength() : 0;
      if (len) { const a = node.getPointAtLength(0), b = node.getPointAtLength(len); return [{ x: a.x, y: a.y }, { x: b.x, y: b.y }]; }
    }
    return [];
  }

  function nearestNode(p, tol = Infinity) {
    let best = null, d = Infinity;
    for (const id in G.nodes) {
      const nd = dist(p, G.nodes[id]);
      if (nd < d) { d = nd; best = id; }
    }
    return d <= tol ? best : null;
  }

  // cria nó no ponto exato da edge (ou reaproveita um já existente bem perto)
  function ensureNode(p, tol = CONFIG.snapTol) {
    const near = nearestNode(p, tol);
    if (near) return near;
    const id = `e${++G.autoN}`;
    G.nodes[id] = { id, x: p.x, y: p.y, official: false };
    G.adj[id] = [];
    return id;
  }

  /** Tolerância efetiva: zona (indoor/outdoor/parking) ou fallback global. */
  function tol(key, zone) {
    const z = zone && CONFIG.toleranceByZone?.[zone];
    if (z && z[key] != null) return z[key];
    return CONFIG[key];
  }

  /** Zona de tolerância do POI — indoor conservador; outdoor/parking mais folgado. */
  function poiToleranceZone(poi) {
    if (!poi) return "indoor";
    if (pointInParkingZone(poi) || isParkingPoi(poi)) return "parking";
    const id = norm(poi.rawId || poi.id || "");
    const n = norm(poi.name || "");
    const blob = `${id} ${n}`;
    if (/estacionamento|pedestre|batel|bento|patio|pátio|motos?/.test(blob)) return "parking";
    if (/jardim|externo|toldo|narnia|servir|refeitorio|capela|templo|batist|ginasio|seven_pass/.test(blob)) {
      return "outdoor";
    }
    return "indoor";
  }

  function edgeZonePenalty(poiZone, edgeZone) {
    if (!poiZone || !edgeZone || poiZone === edgeZone) return 0;
    if (poiZone === "indoor" && edgeZone === "outdoor") return 45;
    if (poiZone === "outdoor" && edgeZone === "indoor") return 22;
    if (poiZone === "parking") return edgeZone === "outdoor" ? 0 : 14;
    return 12;
  }

  // nó mais próximo que faça parte do grafo navegável (maior componente conectado)
  function nearestConnectedNode(p, officialOnly = false) {
    const pool = G.main && G.main.size
      ? G.main
      : new Set(Object.keys(G.nodes).filter((id) => (G.adj[id] || []).length));
    let best = null, d = Infinity;
    for (const id of pool) {
      if (!(G.adj[id] || []).length) continue;
      if (officialOnly && !(G.adj[id] || []).some((e) => e.official)) continue;
      const nd = dist(p, G.nodes[id]);
      if (nd < d) { d = nd; best = id; }
    }
    return best;
  }

  // identifica o maior componente conectado pela malha OFICIAL
  function computeMainComponent() {
    const seen = new Set();
    let best = new Set();
    for (const start in G.nodes) {
      if (seen.has(start)) continue;
      if (!(G.adj[start] || []).some((e) => e.official)) continue;
      const comp = new Set([start]);
      const stack = [start];
      seen.add(start);
      while (stack.length) {
        const cur = stack.pop();
        for (const nb of G.adj[cur] || []) {
          if (!nb.official) continue;
          if (seen.has(nb.id)) continue;
          seen.add(nb.id); comp.add(nb.id); stack.push(nb.id);
        }
      }
      if (comp.size > best.size) best = comp;
    }
    G.main = best;
  }

  /* ---------- geometria: paredes x trechos ---------- */
  function parsePointList(raw) {
    const nums = (raw || "").trim().split(/[\s,]+/).map(Number).filter((n) => isFinite(n));
    const pts = [];
    for (let i = 0; i + 1 < nums.length; i += 2) pts.push({ x: nums[i], y: nums[i + 1] });
    return pts;
  }

  function parsePathPoints(d) {
    // extrai vértices aproximados de um path (M/L/H/V/Z) — suficiente p/ paredes do AI
    const pts = [];
    if (!d) return pts;
    const re = /([MmLlHhVvZz])|(-?\d*\.?\d+(?:e[-+]?\d+)?)/g;
    let cmd = "M", x = 0, y = 0, start = null, m;
    const nums = [];
    const flush = () => {
      while (nums.length) {
        if (cmd === "H" || cmd === "h") {
          const nx = nums.shift();
          x = cmd === "h" ? x + nx : nx;
          pts.push({ x, y });
        } else if (cmd === "V" || cmd === "v") {
          const ny = nums.shift();
          y = cmd === "v" ? y + ny : ny;
          pts.push({ x, y });
        } else if ("ML".includes(cmd.toUpperCase())) {
          if (nums.length < 2) break;
          let nx = nums.shift(), ny = nums.shift();
          if (cmd === cmd.toLowerCase()) { nx += x; ny += y; }
          x = nx; y = ny;
          pts.push({ x, y });
          if (!start) start = { x, y };
          if (cmd.toUpperCase() === "M") cmd = cmd === "M" ? "L" : "l";
        } else {
          nums.shift(); // ignora comandos curvos complexos
        }
      }
    };
    while ((m = re.exec(d))) {
      if (m[1]) {
        flush();
        cmd = m[1];
        if (cmd === "Z" || cmd === "z") {
          if (start) { x = start.x; y = start.y; pts.push({ x, y }); start = null; }
        }
      } else nums.push(+m[2]);
    }
    flush();
    return pts;
  }

  function wallPolysFromEl(node) {
    const tag = node.tagName.toLowerCase();
    if (tag === "rect") {
      const x = +node.getAttribute("x") || 0, y = +node.getAttribute("y") || 0;
      const w = +node.getAttribute("width") || 0, h = +node.getAttribute("height") || 0;
      return [[{ x, y }, { x: x + w, y }, { x: x + w, y: y + h }, { x, y: y + h }]];
    }
    if (tag === "polygon" || tag === "polyline") {
      const pts = parsePointList(node.getAttribute("points"));
      return pts.length >= 2 ? [pts] : [];
    }
    if (tag === "path") {
      const pts = parsePathPoints(node.getAttribute("d") || "");
      return pts.length >= 2 ? [pts] : [];
    }
    if (tag === "line") {
      return [[{ x: +node.getAttribute("x1"), y: +node.getAttribute("y1") },
               { x: +node.getAttribute("x2"), y: +node.getAttribute("y2") }]];
    }
    return [];
  }

  function parseWalls(svg) {
    G.walls = [];
    const g = layerById(svg, "_x30_4_x5F__x5F_background_x5F_wall_x5F_paredes_x5F_tech");
    if (!g) return;
    g.querySelectorAll("rect, polygon, polyline, path, line").forEach((el) => {
      wallPolysFromEl(el).forEach((poly) => {
        if (poly.length >= 2) G.walls.push(poly);
      });
    });
  }

  function collectWallPolysFromNode(node, svg, out) {
    if (!node) return;
    const tag = node.tagName?.toLowerCase();
    if (tag === "use") {
      const href = node.getAttribute("href")
        || node.getAttributeNS("http://www.w3.org/1999/xlink", "href")
        || "";
      const refId = href.replace(/^#/, "");
      if (!refId) return;
      const ref = svg.getElementById(refId);
      if (!ref) return;
      ref.querySelectorAll("rect, polygon, polyline, path, line").forEach((el) => {
        wallPolysFromEl(el).forEach((poly) => {
          if (poly.length >= 2) out.push(poly);
        });
      });
      return;
    }
    wallPolysFromEl(node).forEach((poly) => {
      if (poly.length >= 2) out.push(poly);
    });
  }

  function parseFloorWalls(svg, levelId) {
    const walls = [];
    const root = svg.getElementById(`${levelId}_WALL`);
    if (root) {
      root.querySelectorAll("rect, polygon, polyline, path, line, use").forEach((el) => {
        collectWallPolysFromNode(el, svg, walls);
      });
    }
    state.floorWalls[levelId] = walls;
    return walls;
  }

  function orient(a, b, c) {
    const v = (b.y - a.y) * (c.x - b.x) - (b.x - a.x) * (c.y - b.y);
    if (Math.abs(v) < 1e-9) return 0;
    return v > 0 ? 1 : 2;
  }
  function onSeg(a, b, c) {
    return c.x <= Math.max(a.x, b.x) + 1e-6 && c.x >= Math.min(a.x, b.x) - 1e-6
      && c.y <= Math.max(a.y, b.y) + 1e-6 && c.y >= Math.min(a.y, b.y) - 1e-6;
  }
  function segmentsIntersect(p1, q1, p2, q2) {
    const o1 = orient(p1, q1, p2), o2 = orient(p1, q1, q2);
    const o3 = orient(p2, q2, p1), o4 = orient(p2, q2, q1);
    if (o1 !== o2 && o3 !== o4) return true;
    if (o1 === 0 && onSeg(p1, q1, p2)) return true;
    if (o2 === 0 && onSeg(p1, q1, q2)) return true;
    if (o3 === 0 && onSeg(p2, q2, p1)) return true;
    if (o4 === 0 && onSeg(p2, q2, q1)) return true;
    return false;
  }

  function pointInPoly(p, poly) {
    // ray casting; poly aberto ou fechado
    let inside = false;
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      const a = poly[i], b = poly[j];
      const hit = ((a.y > p.y) !== (b.y > p.y))
        && (p.x < ((b.x - a.x) * (p.y - a.y)) / ((b.y - a.y) || 1e-12) + a.x);
      if (hit) inside = !inside;
    }
    return inside;
  }

  // um trecho “atravessa parede” se cruza aresta de parede ou passa por dentro dela
  function distToSeg(p, a, b) {
    const dx = b.x - a.x, dy = b.y - a.y;
    const len2 = dx * dx + dy * dy;
    if (len2 < 1e-8) return dist(p, a);
    let t = ((p.x - a.x) * dx + (p.y - a.y) * dy) / len2;
    t = Math.max(0, Math.min(1, t));
    return dist(p, { x: a.x + t * dx, y: a.y + t * dy });
  }

  function crossesWall(a, b, levelId) {
    const walls = wallsForLevel(levelId);
    if (!a || !b || !walls.length) return false;
    // amostras ao longo do segmento (pega atravessamento de paredes finas)
    const samples = 9;
    for (let s = 1; s < samples; s++) {
      const t = s / samples;
      const pt = { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
      for (const poly of walls) {
        if (poly.length >= 3 && pointInPoly(pt, poly)) return true;
      }
    }
    for (const poly of walls) {
      const n = poly.length;
      for (let i = 0; i < n; i++) {
        const p = poly[i], q = poly[(i + 1) % n];
        if (n < 3 && i === n - 1) break;
        if (!segmentsIntersect(a, b, p, q)) continue;
        // permite raspar a parede; NÃO atravessar pelo meio
        if (distToSeg(a, p, q) < 1.0 || distToSeg(b, p, q) < 1.0) continue;
        return true;
      }
    }
    return false;
  }

  function addEdge(a, b, geom, trustEdge = false, meta = null) {
    if (!a || !b || a === b) return false;
    const points = geom && geom.length >= 2
      ? geom.map((p) => ({ x: p.x, y: p.y }))
      : [{ x: G.nodes[a].x, y: G.nodes[a].y }, { x: G.nodes[b].x, y: G.nodes[b].y }];
    // edges oficiais (trustEdge) do Illustrator já respeitam portas;
    // pontes/atalhos sintéticos NUNCA atravessam parede
    if (!trustEdge) {
      for (let i = 1; i < points.length; i++) {
        if (crossesWall(points[i - 1], points[i])) return false;
      }
    }
    let w = 0;
    for (let i = 1; i < points.length; i++) w += dist(points[i - 1], points[i]);
    if (w < 0.01) return false;
    const rev = points.slice().reverse();
    const zone = meta?.zone || null;
    const parking = !!meta?.parking;
    const existing = G.adj[a].find((e) => e.id === b);
    if (!existing) G.adj[a].push({ id: b, w, geom: points, official: !!trustEdge, zone, parking });
    else {
      if (w < existing.w) { existing.w = w; existing.geom = points; }
      existing.official = existing.official || !!trustEdge;
      if (zone && !existing.zone) existing.zone = zone;
      existing.parking = existing.parking || parking;
    }
    const existingR = G.adj[b].find((e) => e.id === a);
    if (!existingR) G.adj[b].push({ id: a, w, geom: rev, official: !!trustEdge, zone, parking });
    else {
      if (w < existingR.w) { existingR.w = w; existingR.geom = rev; }
      existingR.official = existingR.official || !!trustEdge;
      if (zone && !existingR.zone) existingR.zone = zone;
      existingR.parking = existingR.parking || parking;
    }
    return true;
  }

  // remove atalhos sintéticos (e edges oficiais que atravessem parede)
  function pruneIllegalEdges() {
    for (const a of Object.keys(G.adj)) {
      for (const e of [...(G.adj[a] || [])]) {
        const geom = e.geom && e.geom.length >= 2
          ? e.geom
          : [{ x: G.nodes[a].x, y: G.nodes[a].y }, { x: G.nodes[e.id].x, y: G.nodes[e.id].y }];
        let bad = false;
        for (let i = 1; i < geom.length; i++) {
          if (crossesWall(geom[i - 1], geom[i])) { bad = true; break; }
        }
        // oficiais: só remove se o segmento for longo E atravessar (ruído AI curto fica)
        if (e.official) {
          const span = geom.reduce((s, p, i) => (i ? s + dist(geom[i - 1], p) : 0), 0);
          if (!bad || span < 14) continue;
        } else if (!bad) continue;
        removeEdge(a, e.id);
      }
    }
  }

  /** Liga nodes oficiais órfãos à malha (porta sem edge colada). */
  function attachOrphanOfficialNodes() {
    for (const id of Object.keys(G.nodes)) {
      const n = G.nodes[id];
      if (!n?.official) continue;
      if ((G.adj[id] || []).length) continue;
      const hit = findNearestEdgeHit(n, CONFIG.snapTol * 3, false);
      if (!hit) continue;
      if (dist(n, G.nodes[hit.a]) <= CONFIG.snapTol) {
        addEdge(id, hit.a, null, true);
        continue;
      }
      if (dist(n, G.nodes[hit.b]) <= CONFIG.snapTol) {
        addEdge(id, hit.b, null, true);
        continue;
      }
      if (hit.d <= CONFIG.snapTol * 2) {
        splitEdgeAt(hit.a, hit.b, id, { x: n.x, y: n.y });
      }
    }
  }

  function poiSlug(poi) {
    const raw = String(poi.rawId || poi.id || "")
      .replace(/^poi-\d+-/i, "")
      .replace(/_x5F_/g, "_");
    const fromId = raw.replace(/^P\d+_?/i, "");
    const fromName = String(poi.name || "").replace(/\s+/g, "_");
    return norm(fromId || fromName);
  }

  function nodeSlug(id) {
    return norm(String(id || "").replace(/^L00_N\d+_?/i, "").replace(/^e\d+$/i, ""));
  }

  function nameMatchScore(poi, nodeId) {
    const STOP = new Set([
      "entrada", "intersection", "connection", "cintersection", "externo", "interno",
      "kids", "banheiro", "masculino", "feminino", "estacionamento", "templo",
      "principal", "lateral", "area", "espaco", "sala",
    ]);
    const ps = poiSlug(poi);
    const ns = nodeSlug(nodeId);
    if (!ps || !ns || ns.length < 5) return 0;
    if (ps === ns) return 120;
    if (ps.length >= 8 && (ps.includes(ns) || ns.includes(ps))) return 90;
    const pt = ps.split(/[_\s-]+/).filter((t) => t.length > 3 && !STOP.has(t));
    const nt = ns.split(/[_\s-]+/).filter((t) => t.length > 3 && !STOP.has(t));
    if (!pt.length || !nt.length) return 0;
    const hits = pt.filter((t) => nt.some((u) => u === t || (t.length > 5 && (u.includes(t) || t.includes(u)))));
    if (hits.length < 1) return 0;
    // exige pelo menos um token específico (não genérico)
    return 50 + hits.length * 20;
  }

  function configuredAnchor(poi) {
    const raw = String(poi.rawId || "").replace(/_x5F_/g, "_");
    const map = CONFIG.poiAnchors || {};
    const nodeId = map[raw] || map[raw.replace(/^poi-\d+-/i, "")];
    if (!nodeId || !G.nodes[nodeId]) return null;
    // garante que o node está ligado à malha
    if (!(G.adj[nodeId] || []).length) {
      const hit = findNearestEdgeHit(G.nodes[nodeId], CONFIG.snapTol * 4, false);
      if (hit) {
        if (dist(G.nodes[nodeId], G.nodes[hit.a]) <= CONFIG.snapTol) addEdge(nodeId, hit.a, null, true);
        else if (dist(G.nodes[nodeId], G.nodes[hit.b]) <= CONFIG.snapTol) addEdge(nodeId, hit.b, null, true);
        else if (hit.d <= CONFIG.snapTol * 2.5) splitEdgeAt(hit.a, hit.b, nodeId, { x: G.nodes[nodeId].x, y: G.nodes[nodeId].y });
      }
    }
    if (G.main) G.main.add(nodeId);
    return {
      id: nodeId,
      x: G.nodes[nodeId].x,
      y: G.nodes[nodeId].y,
      d: dist(poi, G.nodes[nodeId]),
      how: "config",
    };
  }

  /** Projeção na edge mais próxima (opcionalmente exigindo caminho livre de parede). */
  function findNearestEdgeHit(p, maxDist, requireClear, preferredZone) {
    let best = null;
    const seen = new Set();
    const lat = CONFIG.snapLateral || 0;
    for (const a of Object.keys(G.adj)) {
      for (const e of G.adj[a]) {
        if (!edgeInMain(a, e.id) && G.main && G.main.size) continue;
        const key = edgeKey(a, e.id);
        if (seen.has(key)) continue;
        seen.add(key);
        const geom = e.geom && e.geom.length >= 2
          ? e.geom
          : [{ x: G.nodes[a].x, y: G.nodes[a].y }, { x: G.nodes[e.id].x, y: G.nodes[e.id].y }];
        for (let i = 1; i < geom.length; i++) {
          const pr = projectOnSeg(p, geom[i - 1], geom[i]);
          if (pr.d > maxDist) continue;
          if (requireClear && crossesWall(p, { x: pr.x, y: pr.y })) continue;
          const score = pr.d
            + edgeZonePenalty(preferredZone, e.zone)
            + lat * Math.abs(pr.x - p.x)
            + lat * 0.25 * Math.abs(pr.y - p.y);
          if (!best || score < best.score) {
            best = { score, d: pr.d, proj: { x: pr.x, y: pr.y }, a, b: e.id, official: !!e.official };
          }
        }
      }
    }
    return best;
  }

  /**
   * Ancora o local na ENTRADA: mapa explícito → nome → node oficial livre → edge.
   */
  function snapToEntrance(p, excludeIds) {
    const banned = excludeIds instanceof Set ? excludeIds : new Set(excludeIds || []);
    const zone = poiToleranceZone(p);
    const maxD = tol("entranceTol", zone);

    const cfg = configuredAnchor(p);
    if (cfg && !banned.has(cfg.id)) return cfg;

    // 1) match por nome forte (ex.: banheiro_feminino_ginasio)
    if (p.rawId || p.name) {
      let named = null;
      for (const id of Object.keys(G.nodes)) {
        if (banned.has(id)) continue;
        const n = G.nodes[id];
        if (!n?.official) continue;
        const score = nameMatchScore(p, id);
        if (score < 70) continue;
        if (crossesWall(p, n)) continue;
        const d = dist(p, n);
        if (d > maxD * 1.25) continue;
        const rank = d - score;
        if (!named || rank < named.rank) named = { id, x: n.x, y: n.y, d, rank, how: "name" };
      }
      if (named) {
        if (G.main) G.main.add(named.id);
        return { id: named.id, x: named.x, y: named.y, d: named.d, how: named.how };
      }
    }

    // 2) node oficial mais próximo com segmento livre (entrada da sala)
    let bestNode = null;
    for (const id of Object.keys(G.nodes)) {
      if (banned.has(id)) continue;
      const n = G.nodes[id];
      if (!n?.official) continue;
      if (G.main && G.main.size && !G.main.has(id) && !(G.adj[id] || []).length) continue;
      const d = dist(p, n);
      if (d > maxD) continue;
      if (crossesWall(p, n)) continue;
      const linked = (G.adj[id] || []).length > 0 ? 0 : 18;
      const score = d + linked;
      if (!bestNode || score < bestNode.score) {
        bestNode = { score, id, x: n.x, y: n.y, d, how: "official" };
      }
    }
    if (bestNode) {
      if (G.main) G.main.add(bestNode.id);
      return { id: bestNode.id, x: bestNode.x, y: bestNode.y, d: bestNode.d, how: bestNode.how };
    }

    // 3) projeção na edge caminhável SEM atravessar parede
    const hit = findNearestEdgeHit(p, tol("edgeSnapTol", zone), true, zone);
    if (hit && !banned.has(hit.a) && !banned.has(hit.b)) {
      let door = null;
      for (const id of Object.keys(G.nodes)) {
        if (banned.has(id)) continue;
        const n = G.nodes[id];
        if (!n?.official) continue;
        const d = dist(hit.proj, n);
        if (d > CONFIG.snapTol * 2.5) continue;
        if (crossesWall(p, n)) continue;
        if (!door || d < door.d) door = { id, x: n.x, y: n.y, d };
      }
      if (door) {
        if (G.main) G.main.add(door.id);
        return { id: door.id, x: door.x, y: door.y, d: dist(p, door), how: "door-near-edge" };
      }

      const near = nearestNode(hit.proj, CONFIG.snapTol);
      if (near && !banned.has(near) && (near === hit.a || near === hit.b)) {
        if (G.main) G.main.add(near);
        return { id: near, x: hit.proj.x, y: hit.proj.y, d: hit.d, how: "edge-end" };
      }
      const snapId = ensureNode(hit.proj, 1.2);
      if (!banned.has(snapId)) {
        const linkedA = (G.adj[snapId] || []).some((e) => e.id === hit.a);
        const linkedB = (G.adj[snapId] || []).some((e) => e.id === hit.b);
        if (!(linkedA && linkedB) && snapId !== hit.a && snapId !== hit.b) {
          splitEdgeAt(hit.a, hit.b, snapId, hit.proj);
        }
        if (G.main) G.main.add(snapId);
        return { id: snapId, x: hit.proj.x, y: hit.proj.y, d: hit.d, how: "edge-split" };
      }
    }

    // 4) fallback
    let fallback = null;
    for (const id of Object.keys(G.nodes)) {
      if (banned.has(id)) continue;
      if (!(G.adj[id] || []).length) continue;
      if (G.main && G.main.size && !G.main.has(id)) continue;
      const n = G.nodes[id];
      if (crossesWall(p, n)) continue;
      const d = dist(p, n);
      if (!fallback || d < fallback.d) fallback = { id, x: n.x, y: n.y, d, how: "fallback" };
    }
    if (fallback) return fallback;

    const id = nearestConnectedNode(p);
    return { id, x: G.nodes[id]?.x, y: G.nodes[id]?.y, d: id ? dist(p, G.nodes[id]) : Infinity, how: "nearest" };
  }

  /** Dois locais não podem ficar no mesmo node se outro node livre estiver disponível. */
  function resolveAnchorConflicts() {
    const byAnchor = new Map();
    for (const poi of G.pois) {
      if (!poi.anchor) continue;
      if (!byAnchor.has(poi.anchor)) byAnchor.set(poi.anchor, []);
      byAnchor.get(poi.anchor).push(poi);
    }
    for (const [, group] of byAnchor) {
      if (group.length < 2) continue;
      group.sort((a, b) => dist(a, G.nodes[a.anchor] || a) - dist(b, G.nodes[b.anchor] || b));
      // o mais próximo fica; os demais reancora evitando os já usados
      const used = new Set([group[0].anchor]);
      for (let i = 1; i < group.length; i++) {
        const poi = group[i];
        const snap = snapToEntrance(poi, used);
        if (snap?.id) {
          poi.anchor = snap.id;
          poi.snap = { x: snap.x, y: snap.y };
          used.add(snap.id);
        }
      }
    }
  }

  // compat
  function snapToNetwork(p) {
    return snapToEntrance(p);
  }

  function titleCasePoiWords(text) {
    return formatPoiDisplayName(String(text || "").trim());
  }

  function applySlugAcronyms(text, rawId) {
    const m = String(rawId || "").match(/_([A-Z0-9]{2,})$/i);
    if (!m) return text;
    const ac = m[1].toUpperCase();
    const words = String(text || "").split(/\s+/);
    if (words.length && words[words.length - 1].toLowerCase() === ac.toLowerCase()) {
      words[words.length - 1] = ac;
      return words.join(" ");
    }
    return text;
  }

  // decodifica id: P002_capela / P002_x5F_capela -> "Capela"
  function decodePoiName(rawId, dataName) {
    let base;
    if (dataName && dataName.trim() && !/^P\d+/i.test(dataName) && !/^B\d+/i.test(dataName)) {
      base = applySlugAcronyms(formatPoiDisplayName(dataName.trim()), rawId);
    } else {
      let s = dataName || rawId || "";
      s = s.replace(/_x5F_/g, "_").replace(/_x([0-9a-fA-F]{2})_/g, (_, h) => String.fromCharCode(parseInt(h, 16)));
      s = s.replace(/^P\d+[_-]?/i, "").replace(/^B\d+[_-]?/i, "");
      s = s.replace(/[_-]+/g, " ").trim();
      if (!s) return rawId;
      base = applySlugAcronyms(formatPoiDisplayName(s), rawId);
    }
    return fixPortugueseAccents(base);
  }

  function guessCat(name) {
    const n = norm(name);
    if (/estacionamento|moto/.test(n)) return "estacionamento";
    if (/banheiro|wc|sanitario/.test(n)) return "servico";
    if (/entrada|acesso|portao|toldo|elevador|escada/.test(n)) return "acesso";
    if (/refeitorio|seven|pass|lanch|cafe|restaurante|aliment/.test(n)) return "alimentacao";
    if (/recepcao|livraria|bercario|bazar|abasc|apoio|conexao/.test(n)) return "apoio";
    return "ambiente";
  }

  /** Área / prédio do local (para searchLabel e desambiguação). */
  function buildingFromPoi(rawId, name) {
    const id = norm(rawId || "");
    const n = norm(name || "");
    if (/centro_de_formacao|formacao|sala_de_oracao_rgo|^p004_|^p005_/.test(id) || /centro de formacao|sala de oracao rgo/.test(n)) {
      return "Centro de Formação";
    }
    if (/^l01_|administrativo|1[ºo]\s*andar/.test(id) || /1[ºo]\s*andar|administrativo/.test(n)) {
      return "Administrativo";
    }
    if (/templo|capela|narnia|batister|^p000_|^p002_|^p027_|entrada_lateral_templo|entrada_0[12]_principal_templo/.test(id)
      || /templo|capela|narnia/.test(n)) {
      return "Templo";
    }
    if (/ginasio|seven_pass|^p014_|^p021_|^p022_|^p026_|elevador_ginasio|^min_esportes|min\. esportes|ministerio esportes|ministério esportes/.test(id)
      || /ginasio|seven pass|restaurante seven|min\. esportes|ministerio esportes|ministério esportes/.test(n)) {
      return "Ginásio";
    }
    if (/abasc|bazar|^p015_|^p018_/.test(id) || /abasc|bazar transforma/.test(n)) {
      return "ABASC";
    }
    if (/area_kids|refeitorio_externo|^p007_|^p008_/.test(id) || /area kids|refeitorio externo/.test(n)) {
      return "Área Kids";
    }
    if (/espaco_servir|^p020_/.test(id) || /espaco servir|espaço servir/.test(n)) {
      return "Subsolo 01";
    }
    if (/jardim|^p016_/.test(id) || /jardim/.test(n)) {
      return "Jardim";
    }
    if (/estacionamento|pedestre|batel|bento|^p003_|^p006_|^p028_|^p029_|^p030_|^p031_/.test(id)
      || /estacionamento|pedestre|batel|bento/.test(n)) {
      return "Acessos / Estacionamento";
    }
    if (/livraria|conexao|bercario|recepcao|oracao_cleusa|acolher|^p009_|^p010_|^p011_|^p012_|^p013_|^p017_/.test(id)) {
      return "Hall / Apoio";
    }
    return "Campus";
  }

  /** Grupo de filtro (salas, auditórios, banheiros, elevadores). */
  function searchGroupFromPoi(rawId, name, cat) {
    const id = norm(rawId || "");
    const n = norm(name || "");
    if (/elevador/.test(id) || /elevador/.test(n)) return "elevadores";
    if (/banheiro|wc|sanitario/.test(id) || /banheiro|wc|sanitario/.test(n)) return "banheiros";
    if (/templo|capela|auditorio/.test(id) || /templo|capela|auditorio/.test(n)) return "auditorios";
    if (/sala|oracao|bercario|recepcao|conexao|livraria|kids|acolher|servir|abasc|bazar|formacao|refeitorio|seven|narnia|jardim/.test(id)
      || /sala|oracao|bercario|recepcao|conexao|livraria|kids|acolher|servir|abasc|bazar|formacao|refeitorio|seven|narnia|jardim/.test(n)
      || cat === "ambiente" || cat === "apoio" || cat === "alimentacao") {
      return "salas";
    }
    return "salas";
  }

  function enrichPoiMeta(poi) {
    if (poi.rawId || poi.id) {
      poi.name = decodePoiName(poi.rawId || poi.id, poi.name);
    }
    applyPoiDisplayName(poi);
    const ov = poiLevelOverride(poi.rawId || poi.id);
    const level = ov?.level || poi.level || levelFromId(poi.rawId) || "L00";
    const floorForLevel = floorById(level);
    const mapLevel = ov?.mapLevel || poi.mapLevel
      || (floorForLevel?.mapUrl ? level : (level.startsWith("B") ? "L00" : level));
    const building = ov?.building || poi.building || buildingFromPoi(poi.rawId, poi.name);
    const group = poi.group || searchGroupFromPoi(poi.rawId, poi.name, poi.cat);
    const code = poi.code || `${level}_${poi.rawId || poi.id}`;
    const accessNote = ov?.accessNote || poi.accessNote || null;
    poi.level = level;
    poi.mapLevel = mapLevel;
    poi.building = building;
    poi.group = group;
    poi.code = code;
    poi.accessNote = accessNote;
    // Sempre rótulo curto (ignora searchLabel longo legado)
    poi.searchLabel = poiSuggestTitle(poi);
    applyNarniaGateIconToPoi(poi);
    return poi;
  }

  function parseGraph(svg) {
    G.nodes = {}; G.adj = {}; G.pois = []; G.walls = []; G.autoN = 0; G.main = null;
    const L = CONFIG.layers;
    const T = CONFIG.replaceTargets;
    // após o replace, as camadas usam os IDs do host (replaceTargets)
    const nodeLayerIds = [...new Set([...(L.nodes || []), T.nodes].filter(Boolean))];
    const edgeLayerIds = [...new Set([...(L.edges || []), T.edgeIndoor, T.edgeOutdoor].filter(Boolean))];
    const poiLayerIds = [...new Set([...(L.pois || []), T.pois].filter(Boolean))];

    parseWalls(svg);

    // NODES oficiais do Illustrator (= entradas / pontos de passagem)
    nodeLayerIds.forEach((layerId) => {
      const g = layerById(svg, layerId);
      if (!g) return;
      g.querySelectorAll("circle, ellipse, rect").forEach((c, i) => {
        const id = c.id || `${layerId}-n${i}`;
        const p = centerOf(c);
        if (isNaN(p.x) || isNaN(p.y)) return;
        G.nodes[id] = { id, x: p.x, y: p.y, official: true };
        G.adj[id] = [];
      });
    });

    // EDGES indoor + outdoor — line/polyline da camada técnica (filhos ou nested)
    edgeLayerIds.forEach((layerId) => {
      const g = layerById(svg, layerId);
      if (!g) return;
      const isOutdoor = /outdoor/i.test(layerId);
      const zone = isOutdoor ? "outdoor" : "indoor";
      const shapes = [...g.querySelectorAll("line, polyline")];
      shapes.forEach((c) => {
        const pts = edgeEndpoints(c);
        if (pts.length < 2) return;
        const epTol = tol("edgeEndpointTol", zone);
        const ids = pts.map((p) => ensureNode(p, epTol));
        for (let k = 1; k < ids.length; k++) {
          const a = ids[k - 1], b = ids[k];
          if (a === b) continue;
          addEdge(a, b, [pts[k - 1], pts[k]], true, { zone }); // oficial
        }
      });
    });

    // une só nós da malha já conectada com folga mínima de exportação
    bridgeNearbyNodes(CONFIG.bridgeTol);
    attachOrphanOfficialNodes();
    pruneIllegalEdges();
    computeMainComponent();
    connectComponentsToMain(CONFIG.componentBridgeTol || 22);
    computeMainComponent();

    // POIS — ancora na ENTRADA (mapa explícito + node oficial sem atravessar parede)
    poiLayerIds.forEach((layerId) => {
      const g = layerById(svg, layerId);
      if (!g) return;
      const els = [...g.querySelectorAll("[id]")].filter((el, i, arr) => {
        // POIs: P000_… ou códigos B02_…
        return /^(P\d+|B\d+_)/i.test(el.id) && arr.indexOf(el) === i;
      });
      els.forEach((c, i) => {
        const p = poiCenter(c);
        if (isNaN(p.x) || isNaN(p.y)) return;
        const rawId = c.id || `${layerId}-p${i}`;
        const name = decodePoiName(rawId, c.getAttribute("data-name"));
        const cat = c.getAttribute("data-cat") || guessCat(name);
        const ov = poiLevelOverride(rawId);
        const level = ov?.level || levelFromId(rawId) || levelFromId(c.id) || "L00";
        const mapLevel = ov?.mapLevel || "L00";
        const poiId = `${level}_${rawId}`;
        const poi = enrichPoiMeta({
          id: poiId, name, cat, x: p.x, y: p.y,
          iconX: p.x, iconY: p.y,
          rawId, anchor: null, snap: null,
          level,
          mapLevel,
        });
        G.pois.push(poi);
        if (!isSearchablePoi(poi)) {
          c.removeAttribute("data-poi");
          c.style.cursor = "default";
          c.style.pointerEvents = "none";
        } else {
          c.setAttribute("data-poi", poiId);
          c.style.cursor = "pointer";
          // área de clique maior (ícones minúsculos como Jardim)
          ensurePoiHitArea(c, p);
        }
      });
    });

    G.pois.forEach((poi) => {
      const snap = snapToEntrance(poi);
      poi.anchor = snap.id;
      poi.snap = { x: snap.x, y: snap.y };
    });
    resolveAnchorConflicts();
    G.pois.forEach((poi) => forcePoiOnMain(poi));
    markParkingZones();
    computeMainComponent();
    G.pois.forEach((poi) => enrichPoiMeta(poi));
    G.pois.sort((a, b) => (a.searchLabel || a.name).localeCompare(b.searchLabel || b.name, "pt-BR"));

    // camada de rota DENTRO do mapa (coordenadas iguais ao vetor)
    ensureRouteLayer(svg);
  }

  // liga nós quase coincidentes que JÁ pertencem à malha (folga do AI).
  // Não cria atalhos entre nós isolados ou distantes.
  function bridgeNearbyNodes(tol) {
    const ids = Object.keys(G.nodes).filter((id) => (G.adj[id] || []).length > 0);
    for (let i = 0; i < ids.length; i++) {
      for (let j = i + 1; j < ids.length; j++) {
        const a = ids[i], b = ids[j];
        const d = dist(G.nodes[a], G.nodes[b]);
        if (d > tol || d < 0.05) continue;
        if ((G.adj[a] || []).some((e) => e.id === b)) continue;
        addEdge(a, b, null, true);
      }
    }
  }

  /** Liga componentes menores à malha principal (evita POIs sem rota). */
  function connectComponentsToMain(maxDist) {
    computeMainComponent();
    if (!G.main || !G.main.size) return;

    const seen = new Set();
    for (const start of Object.keys(G.nodes)) {
      if (seen.has(start) || G.main.has(start)) continue;
      if (!(G.adj[start] || []).length) { seen.add(start); continue; }

      const comp = [];
      const stack = [start];
      seen.add(start);
      while (stack.length) {
        const cur = stack.pop();
        comp.push(cur);
        for (const nb of G.adj[cur] || []) {
          if (seen.has(nb.id) || G.main.has(nb.id)) continue;
          if (!(G.adj[nb.id] || []).length) continue;
          seen.add(nb.id);
          stack.push(nb.id);
        }
      }

      let best = null;
      for (const a of comp) {
        const pa = G.nodes[a];
        if (!pa) continue;
        for (const b of G.main) {
          const pb = G.nodes[b];
          if (!pb) continue;
          const d = dist(pa, pb);
          if (d > maxDist) continue;
          const wall = crossesWall(pa, pb);
          const score = d + (wall ? 50 : 0);
          if (!best || score < best.score) best = { score, a, b, wall };
        }
      }
      if (!best) continue;
      // só une componentes com micro-folga sem atravessar parede (não inventa atalho)
      if (best.wall || best.score > (CONFIG.bridgeTol || 6) * 3) continue;
      addEdge(best.a, best.b, null, true, { zone: null });
      for (const id of comp) G.main.add(id);
    }
  }

  /** Garante que o POI ancora em um nó da malha principal navegável. */
  function forcePoiOnMain(poi) {
    if (!poi) return;
    const ok = poi.anchor && G.nodes[poi.anchor]
      && (G.adj[poi.anchor] || []).some((e) => e.official)
      && (!G.main || !G.main.size || G.main.has(poi.anchor));
    if (ok) return;

    // node da malha principal mais próximo SEM atravessar parede
    let best = null;
    const pool = G.main && G.main.size ? G.main : new Set(Object.keys(G.nodes));
    const zone = poiToleranceZone(poi);
    const maxReach = tol("entranceTol", zone) * 1.5;
    for (const id of pool) {
      if (!(G.adj[id] || []).some((e) => e.official)) continue;
      const n = G.nodes[id];
      if (!n) continue;
      const d = dist(poi, n);
      if (d > maxReach) continue;
      if (crossesWall(poi, n)) continue;
      if (!best || d < best.d) best = { id, n, d };
    }
    if (!best) {
      const id = nearestConnectedNode(poi, true);
      if (id && G.nodes[id] && !crossesWall(poi, G.nodes[id])) {
        best = { id, n: G.nodes[id], d: dist(poi, G.nodes[id]) };
      }
    }
    if (!best) return;

    // âncora configurada órfã: só liga com micro-folga sem parede
    if (poi.anchor && G.nodes[poi.anchor] && poi.anchor !== best.id) {
      const orphan = G.nodes[poi.anchor];
      const d = dist(orphan, best.n);
      if (d <= (CONFIG.snapTol || 8) * 3 && !crossesWall(orphan, best.n)) {
        addEdge(poi.anchor, best.id, null, true);
        if (G.main) G.main.add(poi.anchor);
        poi.snap = { x: orphan.x, y: orphan.y };
        return;
      }
    }
    poi.anchor = best.id;
    poi.snap = { x: best.n.x, y: best.n.y };
    if (G.main) G.main.add(best.id);
  }

  function listComponents() {
    const seen = new Set();
    const comps = [];
    for (const start in G.nodes) {
      if (seen.has(start)) continue;
      if (!(G.adj[start] || []).length) { seen.add(start); continue; }
      const comp = new Set([start]);
      const stack = [start];
      seen.add(start);
      while (stack.length) {
        const cur = stack.pop();
        for (const nb of G.adj[cur] || []) {
          if (seen.has(nb.id)) continue;
          seen.add(nb.id); comp.add(nb.id); stack.push(nb.id);
        }
      }
      comps.push(comp);
    }
    return comps;
  }

  // ancora POI ao nó da malha cujo segmento até o POI NÃO atravessa parede
  function nearestReachableAnchor(p) {
    return snapToNetwork(p).id;
  }

  const edgeKey = (a, b) => (a < b ? `${a}|${b}` : `${b}|${a}`);

  /* Projeção ortogonal de p sobre o segmento a→b */
  function projectOnSeg(p, a, b) {
    const dx = b.x - a.x, dy = b.y - a.y;
    const len2 = dx * dx + dy * dy;
    if (len2 < 1e-8) return { x: a.x, y: a.y, t: 0, d: dist(p, a) };
    let t = ((p.x - a.x) * dx + (p.y - a.y) * dy) / len2;
    t = Math.max(0, Math.min(1, t));
    const q = { x: a.x + t * dx, y: a.y + t * dy };
    return { x: q.x, y: q.y, t, d: dist(p, q) };
  }

  function removeEdge(a, b) {
    G.adj[a] = (G.adj[a] || []).filter((e) => e.id !== b);
    G.adj[b] = (G.adj[b] || []).filter((e) => e.id !== a);
  }

  // divide a aresta a—b no ponto snap (para a rota passar exatamente ali)
  function splitEdgeAt(a, b, snapId, snapPt) {
    const e = (G.adj[a] || []).find((x) => x.id === b);
    if (!e) {
      addEdge(a, snapId, [{ x: G.nodes[a].x, y: G.nodes[a].y }, snapPt], true);
      addEdge(snapId, b, [snapPt, { x: G.nodes[b].x, y: G.nodes[b].y }], true);
      return;
    }
    const geom = e.geom && e.geom.length >= 2
      ? e.geom
      : [{ x: G.nodes[a].x, y: G.nodes[a].y }, { x: G.nodes[b].x, y: G.nodes[b].y }];

    // acha o segmento da geom mais próximo do snap e parte ali
    let cut = 1, bestD = Infinity;
    for (let i = 1; i < geom.length; i++) {
      const pr = projectOnSeg(snapPt, geom[i - 1], geom[i]);
      if (pr.d < bestD) { bestD = pr.d; cut = i; }
    }
    const g1 = geom.slice(0, cut).concat([snapPt]);
    const g2 = [snapPt].concat(geom.slice(cut));
    // limpa duplicatas consecutivas
    const clean = (arr) => {
      const o = [];
      for (const p of arr) if (!o.length || dist(o[o.length - 1], p) > 0.2) o.push(p);
      return o;
    };
    removeEdge(a, b);
    addEdge(a, snapId, clean(g1), true);
    addEdge(snapId, b, clean(g2), true);
  }

  function edgeInMain(a, b) {
    if (!G.main || !G.main.size) return true;
    return G.main.has(a) && G.main.has(b);
  }

  // snapToEntrance / snapToNetwork definidos junto ao parse do grafo


  function ensureRouteLayer(svg) {
    let layer = svg.querySelector("#mapRouteLayer");
    if (!layer) {
      layer = document.createElementNS(NS, "g");
      layer.setAttribute("id", "mapRouteLayer");
      svg.appendChild(layer);
    }
    upgradeMapRouteLayer(layer);
    layer.setAttribute("data-route-overlay", "true");
    svg.appendChild(layer);
    globalThis.RouteAnimation?.applyRouteAnimationVars?.(layer);
    return layer;
  }

  function upgradeMapRouteLayer(layer) {
    layer.setAttribute("class", "route-layer");
    layer.setAttribute("pointer-events", "none");
    ["mapRouteGlow", "mapRouteCasing", "mapRouteLine"].forEach((id) => {
      const old = layer.querySelector(`#${id}`);
      if (old) old.remove();
    });
    const mkPath = (id, className) => {
      let p = layer.querySelector(`#${id}`);
      if (!p) {
        p = document.createElementNS(NS, "path");
        p.setAttribute("id", id);
        p.setAttribute("fill", "none");
        p.setAttribute("d", "");
        p.setAttribute("vector-effect", "non-scaling-stroke");
        layer.appendChild(p);
      }
      p.setAttribute("class", className);
      return p;
    };
    /* Base embaixo, brilho animado por cima (stroke-dashoffset) */
    mkPath("mapRoutePathBase", "route-path route-path-base");
    mkPath("mapRoutePathGlow", "route-path route-path-glow");
    const base = layer.querySelector("#mapRoutePathBase");
    const glow = layer.querySelector("#mapRoutePathGlow");
    if (base && glow) layer.appendChild(glow);
    if (!layer.querySelector("#mapRouteStart")) {
      const pin = (id, kind) => {
        const g = document.createElementNS(NS, "g");
        g.setAttribute("id", id);
        g.setAttribute("class", `route-marker route-marker--${kind}`);
        g.setAttribute("visibility", "hidden");
        const Icons = globalThis.MapNavIcons;
        if (kind === "start" && Icons?.appendInnerArrow) Icons.appendInnerArrow(g);
        else if (kind === "end" && Icons?.appendInnerPin) Icons.appendInnerPin(g);
        layer.appendChild(g);
      };
      pin("mapRouteStart", "start");
      pin("mapRouteEnd", "end");
    }
  }

  function initRouteAnimationLayers() {
    if (el.routeLayer) globalThis.RouteAnimation?.applyRouteAnimationVars?.(el.routeLayer);
  }

  function setRouteVisualCompleted(completed) {
    state.routeVisualCompleted = !!completed;
    globalThis.RouteAnimation?.setRouteCompleted?.(el.routeLayer, completed);
    const mapSvg = el.svgHost.querySelector("#mapaSVG") || el.svgHost.querySelector("svg");
    const mapLayer = mapSvg?.querySelector?.("#mapRouteLayer");
    if (mapLayer) globalThis.RouteAnimation?.setRouteCompleted?.(mapLayer, completed);
  }

  function pointsToPathD(points) {
    if (!points || points.length < 1) return "";
    let d = `M${points[0].x} ${points[0].y}`;
    for (let i = 1; i < points.length; i++) d += ` L${points[i].x} ${points[i].y}`;
    return d;
  }

  // centro estável do ícone POI (prioriza bbox compacto / primeiro M absoluto)
  function poiCenter(el) {
    try {
      const b = el.getBBox();
      if (b.width > 0.5 && b.height > 0.5 && b.width < 90 && b.height < 90) {
        return { x: b.x + b.width / 2, y: b.y + b.height / 2 };
      }
    } catch { /* ignore */ }

    const kids = [...el.querySelectorAll("path, polygon, circle, ellipse, rect")];
    let sx = 0, sy = 0, n = 0;
    kids.forEach((s) => {
      try {
        const b = s.getBBox();
        if (b.width + b.height < 0.01) return;
        if (b.width > 60 || b.height > 60) return;
        sx += b.x + b.width / 2;
        sy += b.y + b.height / 2;
        n++;
      } catch { /* ignore */ }
    });
    if (n) return { x: sx / n, y: sy / n };

    const path = el.querySelector("path[d]") || (el.tagName.toLowerCase() === "path" ? el : null);
    if (path) {
      const m = (path.getAttribute("d") || "").match(/M\s*(-?\d+\.?\d*)[,\s]+(-?\d+\.?\d*)/i);
      if (m) return { x: +m[1], y: +m[2] };
    }
    try {
      const b = el.getBBox();
      return { x: b.x + b.width / 2, y: b.y + b.height / 2 };
    } catch {
      return centerOf(el);
    }
  }

  /** Círculo invisível para facilitar clique em ícones pequenos (ex.: Jardim). */
  function ensurePoiHitArea(el, center) {
    if (!el || !center || !isFinite(center.x)) return;
    const host = el.parentNode;
    if (!host) return;
    if (host.querySelector(`[data-poi-hit="${el.id}"]`)) return;
    const hit = document.createElementNS(NS, "circle");
    hit.setAttribute("data-poi-hit", el.id || "1");
    hit.setAttribute("cx", String(center.x));
    hit.setAttribute("cy", String(center.y));
    hit.setAttribute("r", "18");
    hit.setAttribute("fill", "transparent");
    hit.setAttribute("pointer-events", "all");
    hit.style.cursor = "pointer";
    const poiAttr = el.getAttribute("data-poi");
    if (poiAttr) hit.setAttribute("data-poi", poiAttr);
    // irmão (não filho de <path>) para hit-area válida no SVG
    if (el.nextSibling) host.insertBefore(hit, el.nextSibling);
    else host.appendChild(hit);
  }

  /* ============================================================ POIs clicaveis */
  /** Oculta rótulos da camada info que não sinalizam um POI (mantém o SVG intacto). */
  function hideNonPoiInfoTexts(svg) {
    const layer = layerById(svg, CONFIG.replaceTargets.infoTextos);
    if (!layer) return;

    const poiKeys = [];
    for (const p of G.pois || []) {
      const name = norm(p.name || "");
      const raw = norm(String(p.rawId || "").replace(/^(P|B)\d+_/i, "").replace(/_/g, " "));
      if (name) poiKeys.push(name);
      if (raw && raw !== name) poiKeys.push(raw);
    }

    // aliases curtos ↔ nomes do mapa
    const aliases = [
      "espaco servir", "area kids", "refeitorio externo", "espaco conexao",
      "livraria evangelica", "sala de oracao", "banheiro familia", "banheiro feminino",
      "banheiro masculino", "elevador ginasio", "elevadores", "seven pass", "sevenpass",
      "espaco acolher", "abasc", "estacionamento moto", "estacionamento motos",
      "entrada principal toldo", "entrada estacionamento", "entrada pedestre",
      "jardim", "templo", "capela", "bercario", "recepcao", "narnia",
      "centro de formacao", "centro de formacao cf", "centro de formacao | cf",
      "restaurante seven pass", "seven pass", "bazar transforma abasc",
      "bazar transforma", "bazar abasc", "abasc - acao social", "acao social",
      "entrada sevenpass", "entrada seven pass", "ginasio", "entrada ginasio",
      "min esportes", "min. esportes", "ministerio esportes", "ministério esportes",
    ];
    for (const a of aliases) poiKeys.push(a);

    const reject = (t) =>
      /^(escadas|fonte|batisterio|hall do templo)\b/.test(t)
      || /\bescadas\b/.test(t)
      || /estacionamento conveniado/.test(t)
      || /entrada lateral/.test(t)
      || /entrada 0[12] principal templo/.test(t)
      || /entrada e saida para pedestre/.test(t)
      || /entrada para pedestres 01\b/.test(t)
      || /entrada para pedestres principal/.test(t);

    const isPoiLabel = (raw) => {
      const t = norm(raw);
      if (!t || t.length < 3 || reject(t)) return false;
      for (const key of poiKeys) {
        if (!key || key.length < 3) continue;
        if (t === key || t.includes(key) || key.includes(t)) return true;
        const tt = t.split(/\s+/).filter((w) => w.length > 2);
        const kk = key.split(/\s+/).filter((w) => w.length > 2);
        if (!kk.length || !tt.length) continue;
        const hits = kk.filter((k) => tt.some((w) => w === k || (k.length >= 5 && w.includes(k)) || (w.length >= 5 && k.includes(w))));
        const need = Math.min(2, kk.length);
        if (hits.length >= need) return true;
        if (hits.length === 1 && ["jardim", "templo", "capela", "abasc", "kids", "narnia", "toldo", "bercario", "recepcao", "ginasio", "formacao", "sevenpass", "seven", "bazar", "cf", "esportes"].includes(hits[0])) {
          return true;
        }
      }
      return false;
    };

    const hide = (el) => {
      el.setAttribute("visibility", "hidden");
      el.setAttribute("aria-hidden", "true");
      el.style.pointerEvents = "none";
    };

    [...layer.children].forEach((child) => {
      const tag = (child.tagName || "").toLowerCase();
      // tipografia em path marcada como rótulo de POI (ex.: Centro de Formação CF)
      if (child.getAttribute("data-keep-label") === "true") {
        child.removeAttribute("visibility");
        child.removeAttribute("aria-hidden");
        child.style.visibility = "";
        child.style.display = "";
        return;
      }
      if (tag === "text") {
        const content = (child.textContent || "").replace(/\s+/g, " ").trim();
        if (!isPoiLabel(content)) hide(child);
        return;
      }
      // tipografia convertida em path perto de POIs prioritários
      if (tag === "g" && shouldKeepPathLabel(child)) {
        child.setAttribute("data-keep-label", "true");
        return;
      }
      // setas e tipografia em path — só poluem; POIs já têm ícone + texto mantido
      hide(child);
    });
  }

  /** Mantém grupos de tipografia (path) próximos a POIs que devem ficar legíveis. */
  function shouldKeepPathLabel(g) {
    const first = g.querySelector("path");
    if (!first) return false;
    const d = first.getAttribute("d") || "";
    const m = d.match(/^M\s*(-?[\d.]+)[,\s]+(-?[\d.]+)/i);
    if (!m) return false;
    const x = +m[1], y = +m[2];
    // âncoras aproximadas dos rótulos: Centro de Formação | CF, SEVEN PASS, Bazar abasc
    const anchors = [
      { x: 99, y: 108, r: 40 },   // Centro de Formação | CF
      { x: 742, y: 457, r: 40 },  // SEVEN PASS
      { x: 808, y: 457, r: 40 },  // Bazar abasc
    ];
    return anchors.some((a) => Math.hypot(x - a.x, y - a.y) <= a.r);
  }

  function bindPOIs(svg) {
    svg.querySelectorAll("[data-poi]").forEach((node) => {
      const poiId = node.getAttribute("data-poi");
      node.addEventListener("mouseenter", () => node.setAttribute("data-hover", "true"));
      node.addEventListener("mouseleave", () => node.removeAttribute("data-hover"));
      node.addEventListener("click", (e) => {
        e.stopPropagation();
        // Evita que o click após “Estou aqui” vire destino do POI sob o dedo
        if (state.placingHere || state._ignoreNextPoiClick) {
          state._ignoreNextPoiClick = false;
          return;
        }
        const poi = G.pois.find((p) => p.id === poiId);
        if (!poi || !isSearchablePoi(poi)) return;
        const lvl = poiLevel(poi);
        if (lvl !== state.activeLevel) setActiveLevel(lvl, { silent: true, keepTrip: true });
        if (!state.origin) setField("origin", poi);
        else setField("dest", poi);
        toast(`${poi.name} selecionado.`);
      });
    });
  }

  /** Associa ícones/áreas do SVG de andar (L02/L03) aos POIs do grafo. */
  function bindFloorPois(svg, levelId) {
    if (!svg || !levelId) return;
    const levelPois = (G.pois || []).filter((p) => (p.level || p.mapLevel) === levelId && isSearchablePoi(p));

    // Ícones de Área Kids fora do L01: só decorativos (sem clique / sem destino)
    if (levelId !== "L01") {
      [
        "P007_L01_area_kids",
        "L01_sala_019_p007_area_kids",
        "L02_POI0002_area_kids",
        "L03_POI0002_area_kids",
        "L04_poi_0014",
      ].forEach((id) => {
        const el = svg.getElementById(id);
        if (!el) return;
        el.removeAttribute("data-poi");
        el.style.pointerEvents = "none";
        el.style.cursor = "default";
      });
    }

    if (!levelPois.length) return;

    const iconMaps = {
      L01: {
        L01_sala_001: "L01_poi_0001",
        "L01_sala_001-2": "L01_poi_0001",
        L01_sala_002: "L01_poi_0002",
        L01_sala_003: "L01_poi_0013",
        L01_sala_004: "L01_poi_0015",
        L01_sala_005: "L01_poi_0017",
        L01_sala_006: "L01_poi_0018",
        L01_sala_007: "L01_poi_0019",
        L01_sala_008: "L01_poi_0021",
        L01_sala_009: "L01_poi_0022",
        L01_sala_012: "L01_poi_0010",
        L01_sala_020: "L01_poi_0009",
        L01_sala_000_sala_pastoral: "L01_poi_0005",
        L01_sala_011_secretaria_pastoral: "L01_poi_0011",
        L01_sala_014_salaequipe: "L01_poi_0012",
        L01_sala_019_p007_area_kids: "L01_poi_0024",
        L01_sala_021_l02_auditorio_01: "L01_poi_0023",
        L01_sala_010_p027_l01_elevador_templo: "L01_poi_0006",
        L01_sala_005_p023_l02_banheiro_feminino: "L01_poi_0003",
        L01_sala_004_p023_l02_banheiro_feminino: "L01_poi_0003",
        L01_sala_002_p024_l02_banheiro_masculino: "L01_poi_0004",
        L01_sala_003_p024_l02_banheiro_masculino: "L01_poi_0004",
      },
      L02: {
        L02_sala_001: "L02_POI0010_sala_01",
        L02_sala_002: "L02_POI0011_sala_02",
        L02_sala_003: "L02_POI0001_sala_03",
        L02_sala_004: "L02_POI0004_sala_04",
        L02_sala_005: "L02_POI0005_sala_05",
        L02_auditorio_01: "L02_POI0003_auditorio",
        P023_L02_banheiro_feminino: "L02_POI0008_banheiro_feminino",
        "P023_L02_banheiro_feminino-2": "L02_POI0008_banheiro_feminino",
        P024_L02_banheiro_masculino: "L02_POI0009_banheiro_masculino",
        P024__L02_banheiro_masculino: "L02_POI0009_banheiro_masculino",
        P027_L01_elevador_templo: "L02_POI0002_elevador",
      },
      L03: {
        L03_sala_001: "L03_POI0010_sala_01",
        L03_sala_002: "L03_POI0011_sala_02",
        L03_sala_003: "L03_POI0001_sala_03",
        L03_sala_004: "L03_POI0004_sala_04",
        L03_sala_005: "L03_POI0005_sala_05",
        L03_sala_006: "L03_POI0006_sala_06",
        L03_sala_007: "L03_POI0007_sala_07",
        L03_sala_008: "L03_POI0008_sala_08",
        L03_sala_009: "L03_POI0009_sala_09",
        L03_sala_010: "L03_POI0010_sala_10",
        L03_sala_011: "L03_POI0011_sala_11",
        L03_sala_012: "L03_POI0012_sala_12",
        "L03_sala_012-2": "L03_POI0013_sala_13",
        L03_sala_014: "L03_POI0014_sala_14",
        L03_sala_015: "L03_POI0015_sala_15",
        L03_sala_016: "L03_POI0016_sala_16",
        L03_auditorio_02: "L03_POI0003_auditorio",
        L03_cozinha: "L03_POI0027_copa",
        P023_L02_banheiro_feminino: "L03_POI0028_banheiro_feminino",
        "P023_L02_banheiro_feminino-2": "L03_POI0028_banheiro_feminino",
        P024_L02_banheiro_masculino: "L03_POI0009_banheiro_masculino",
        P024__L02_banheiro_masculino: "L03_POI0009_banheiro_masculino",
        P027_L01_elevador_templo: "L03_POI0002_elevador",
      },
      L04: {
        L04_sala_021_l04_auditorio_01: "L04_poi_0016",
        L01_sala_010_p027_l01_elevador_templo: "L04_poi_0003",
        L01_sala_020: "L04_poi_0006",
        L01_sala_004_sala_calma: "L04_poi_0002",
        L01_sala_003: "L04_poi_0001",
        L01_sala_009: "L04_poi_0009",
        L01_sala_008: "L04_poi_0008",
        L01_sala_005: "L04_poi_0013",
        L01_sala_007: "L04_poi_0007",
        L01_sala_006: "L04_poi_0015",
        L01_sala_005_p023_l02_banheiro_feminino: "L04_poi_0010",
        P023_L02_banheiro_feminino: "L04_poi_0010",
        P024__L02_banheiro_masculino: "L04_poi_0010",
        P024_L02_banheiro_masculino: "L04_poi_0010",
      },
      L05: {
        L04_sala_021_l04_auditorio_01: "L05_poi_0030",
        L01_sala_010_p027_l01_elevador_templo: "L05_poi_0001",
        L01_sala_019_p007_area_kids: "L05_poi_0021",
        L01_sala_005_p023_l02_banheiro_feminino: "L05_poi_0030_banheiro_01",
        P023_L02_banheiro_feminino: "L05_poi_0030_banheiro_01",
        "P023_L02_banheiro_feminino-2": "L05_poi_0007_banheiro_02",
        P024_L02_banheiro_masculino: "L05_poi_0008_banheiro_03",
        P024__L02_banheiro_masculino: "L05_poi_0008_banheiro_03",
      },
      L06: {
        L06_sala_0019_salao: "L06_poi_0005",
        L06_sala_0029_elevadores: "L06_poi_0033",
        L06_sala_0028_hall_l05: "L06_poi_0034_hall_l06",
        L06_sala_0024_escadas_laterais: "L06_poi_0035_escada_lateral_l05",
        L06_sala_0031_escadas_de_emergencia: "L06_poi_0026_escada_emerg",
        L06_sala_0030_recepcao_01: "L06_poi_0024",
        L06_sala_0022_copa_l06eating: "L06_poi_0024_copa",
        L06_sala_0020_banheiro_l06bathroom: "L06_poi_0028_banheiro_01",
        L06_sala_0026_banheiro_l06bathroom: "L06_poi_0011_banheiro_03",
        L06_sala_0027_banheiro_l06bathroom: "L06_poi_0012_banheiro_04",
        L01_sala_019_p007_area_kids: "L06_poi_0017",
        L01_sala_010_p027_l01_elevador_templo: "L06_poi_0033",
        P023_L02_banheiro_feminino: "L06_poi_0028_banheiro_01",
        "P023_L02_banheiro_feminino-2": "L06_poi_0011_banheiro_03",
        P024_L02_banheiro_masculino: "L06_poi_0012_banheiro_04",
        P024__L02_banheiro_masculino: "L06_poi_0012_banheiro_04",
      },
      B01: {
        B01_sala_0001_banheiro_masculino_b01bathroom: "B01_poi_0006",
        B01_sala_0002_banheiro_feminino_b01bathroom: "B01_poi_0001",
        B01_sala_0003_entrada_de_narnia_b1_e_b2banheiro_b1batisterio_tencomun_b2ensaio_b1pastoreo_b1: "B01_entrada_narnia",
        B01_sala_0004_sala_02_b01_estudio_ensaio: "B01_poi_0012",
        B01_sala_0005_sala_03_b01_pastoreo: "B01_poi_0002",
        B01_sala_0006_sala_03_b01_som_tec: "B01_som_tec",
        B01_sala_0007_acesso_palco_templo_t_batisterio_t_banheiros_b01_encomun_b02: "B01_poi_0007",
        B01_sala_0008_acesso_encomunestudioradiorede_super: "B01_poi_0009",
      },
      B02: {
        B02_sala_0001_sala_11_b02_almoxarifado: "B02_poi_almox",
        B02_sala_0002_sala_10_b02_radio: "B02_poi_0003",
        B02_sala_0003_sala_09_b02_acesso_ao_espaco_servir: "B02_poi_0006",
        B02_sala_0004_sala_08_b02_comunicacao_rede_super: "encomun",
        B02_sala_0005_sala_07_b02_cozinha: "B02_poi_0007",
        B02_sala_0006_sala_06_b02_sala_abert_m: "sala_albert",
        B02_sala_0007_sala_05_b01_estudio_de_video: "B01_poi_0006-2",
        B02_sala_0008_sala_04_b02_sala_de_vidro: "B02_poi_0013",
        B02_sala_0009_sala_03_b02_engenharia_ao_vivo: "B02_poi_eng_vivo",
        B02_sala_0010_sala_01_b02_transmicao_ao_vivo: "B02_poi_0011",
        B02_sala_0011_sala_02_b01_som_tec: "B02_poi_0010",
        B02_sala_0012_entrada_a_narniaencomun: "B02_entrada_narnia_map",
      },
    };
    const iconMap = iconMaps[levelId] || {};

    const byRaw = Object.fromEntries(levelPois.map((p) => [p.rawId, p]));
    const poiLayerId = `${levelId}_POI`;

    // áreas técnicas (retângulos) — clicáveis, invisíveis
    svg.querySelectorAll(`#${poiLayerId} [id^='${levelId}_POI'], #${poiLayerId} rect[id]`).forEach((el) => {
      const raw = el.id;
      const poi = byRaw[raw];
      if (!poi) return;
      el.setAttribute("data-poi", poi.id);
      el.style.cursor = "pointer";
      el.style.pointerEvents = "all";
    });

    // ícones visíveis
    Object.entries(iconMap).forEach(([elId, rawId]) => {
      const el = svg.getElementById(elId);
      const poi = byRaw[rawId];
      if (!el || !poi) return;
      el.setAttribute("data-poi", poi.id);
      el.style.cursor = "pointer";
      el.style.pointerEvents = "all";
    });

    // fallback: qualquer id que bata com rawId
    levelPois.forEach((poi) => {
      const el = svg.getElementById(poi.rawId);
      if (!el || el.hasAttribute("data-poi")) return;
      el.setAttribute("data-poi", poi.id);
      el.style.cursor = "pointer";
      el.style.pointerEvents = "all";
    });

    bindPOIs(svg);
    syncFloorPoiIconsFromSvg(svg, iconMaps[levelId] || {}, levelId);
  }

  /* ============================================================ DIJKSTRA */

  function isParkingPoi(poi) {
    if (!poi) return false;
    return poi.cat === "estacionamento"
      || /estacionamento/i.test(poi.rawId || "")
      || /estacionamento/i.test(poi.id || "")
      || /estacionamento/i.test(poi.name || "");
  }

  /** Só libera a malha do estacionamento se origem ou destino for o próprio estacionamento. */
  function tripAllowsParking(origin, dest) {
    return isParkingPoi(dest) || isParkingPoi(origin);
  }

  function pointInParkingZone(p) {
    if (!p || p.x == null) return false;
    const zones = CONFIG.parkingZones || [];
    for (const z of zones) {
      if (p.x >= z.x0 && p.x <= z.x1 && p.y >= z.y0 && p.y <= z.y1) return true;
    }
    return false;
  }

  function isParkingNodeId(id) {
    return /estacionamento|escacionamento|moto|entrada_pedestre_principal_bento|entrada_estacionamento|templo_estacionamento/i.test(String(id || ""));
  }

  /** Marca nós/edges dentro do pátio — rota NÃO atravessa, salvo destino/origem = estacionamento. */
  function markParkingZones() {
    const parkingPois = G.pois.filter(isParkingPoi);
    for (const id of Object.keys(G.nodes)) {
      const n = G.nodes[id];
      n.parking = false;
      if (isParkingNodeId(id) || pointInParkingZone(n)) {
        n.parking = true;
        continue;
      }
      for (const p of parkingPois) {
        if (dist(n, p) < 90) {
          n.parking = true;
          break;
        }
      }
    }
    for (const a of Object.keys(G.adj)) {
      for (const e of G.adj[a] || []) {
        const na = G.nodes[a], nb = G.nodes[e.id];
        let mid = null;
        if (e.geom && e.geom.length >= 2) {
          const g0 = e.geom[0], g1 = e.geom[e.geom.length - 1];
          mid = { x: (g0.x + g1.x) / 2, y: (g0.y + g1.y) / 2 };
        } else if (na && nb) {
          mid = { x: (na.x + nb.x) / 2, y: (na.y + nb.y) / 2 };
        }
        e.parking = !!(na?.parking && nb?.parking)
          || !!(mid && pointInParkingZone(mid))
          || !!(na?.parking || nb?.parking) && e.zone === "outdoor" && mid && pointInParkingZone(mid);
        // trecho outdoor com pelo menos uma ponta no pátio = trecho de estacionamento
        if (!e.parking && e.zone === "outdoor" && (na?.parking || nb?.parking)) {
          e.parking = true;
        }
      }
    }
  }

  /** Caminho passa por nó/edge de estacionamento (além da origem/destino)? */
  function pathCrossesParking(ids, startNode, endNode) {
    if (!ids || ids.length < 2) return false;
    for (let i = 0; i < ids.length; i++) {
      const id = ids[i];
      if (id === startNode || id === endNode) continue;
      if (G.nodes[id]?.parking) return true;
    }
    for (let i = 1; i < ids.length; i++) {
      const e = (G.adj[ids[i - 1]] || []).find((x) => x.id === ids[i]);
      if (e?.parking) {
        // edge de estacionamento entre nós que não são ambos extremos do trajeto
        const a = ids[i - 1], b = ids[i];
        if (a !== startNode && a !== endNode && b !== startNode && b !== endNode) return true;
        if ((G.nodes[a]?.parking && a !== startNode && a !== endNode)
          || (G.nodes[b]?.parking && b !== startNode && b !== endNode)) return true;
      }
    }
    return false;
  }

  function routeZoneMix(ids) {
    let indoor = 0, outdoor = 0;
    if (!ids || ids.length < 2) return { indoor, outdoor };
    for (let i = 1; i < ids.length; i++) {
      const e = (G.adj[ids[i - 1]] || []).find((x) => x.id === ids[i]);
      if (!e) continue;
      if (e.zone === "indoor") indoor += e.w;
      else if (e.zone === "outdoor") outdoor += e.w;
    }
    return { indoor, outdoor };
  }

  function classifyRouteKind(ids) {
    const { indoor, outdoor } = routeZoneMix(ids);
    if (indoor <= 0.01 && outdoor <= 0.01) return "mista";
    if (indoor >= outdoor * 1.15) return "templo";
    if (outdoor >= indoor * 1.15) return "fora";
    return "mista";
  }

  // penalty: Map(edgeKey -> vezes) | blocked: Set(edgeKey) | opts: { avoidParking, preferZone, officialOnly }
  function shortest(a, b, penalty, blocked, opts) {
    if (!a || !b || !G.nodes[a] || !G.nodes[b]) return [];
    if (a === b) return [a];
    const avoidParking = !!opts?.avoidParking;
    const preferZone = opts?.preferZone || null;
    // por padrão: só edges oficiais do mapa (nunca atalhos inventados)
    const officialOnly = opts?.officialOnly !== false;
    const distMap = {}, prev = {}, pending = new Set(Object.keys(G.nodes));
    for (const k of pending) distMap[k] = Infinity;
    distMap[a] = 0;
    while (pending.size) {
      let cur = null, min = Infinity;
      for (const k of pending) if (distMap[k] < min) { min = distMap[k]; cur = k; }
      if (cur === null || min === Infinity) break;
      pending.delete(cur);
      if (cur === b) break;
      for (const nb of G.adj[cur] || []) {
        if (!pending.has(nb.id)) continue;
        if (officialOnly && !nb.official) continue;
        const ek = edgeKey(cur, nb.id);
        if (blocked && blocked.has(ek)) continue;

        // bloqueio duro: não entra no estacionamento (exceto nós de origem/destino)
        if (avoidParking) {
          if (nb.parking && nb.id !== a && nb.id !== b) continue;
          const toN = G.nodes[nb.id];
          const fromN = G.nodes[cur];
          if (toN?.parking && nb.id !== a && nb.id !== b) continue;
          if (fromN?.parking && cur !== a && cur !== b) continue;
        }

        let w = nb.w;
        if (!nb.official) w *= 8;

        if (preferZone === "indoor") {
          if (nb.zone === "outdoor") w *= 4.2;
          else if (nb.zone === "indoor") w *= 0.82;
        } else if (preferZone === "outdoor") {
          if (nb.zone === "indoor") w *= 4.2;
          else if (nb.zone === "outdoor") w *= 0.82;
        }

        if (penalty) {
          const u = penalty.get(ek);
          if (u) w *= 1 + 1.4 * u;
        }
        const nd = distMap[cur] + w;
        if (nd < distMap[nb.id]) { distMap[nb.id] = nd; prev[nb.id] = cur; }
      }
    }
    if (!isFinite(distMap[b])) return [];
    const path = []; let c = b;
    while (c) { path.unshift(c); if (c === a) break; c = prev[c]; }
    return path[0] === a ? path : [];
  }

  /** Nó navegável mais próximo (malha oficial), preferindo fora do estacionamento. */
  function nearestRoutableNode(p, avoidParking, maxDist = 420) {
    if (!p) return null;
    const pool = G.main && G.main.size ? G.main : new Set(Object.keys(G.nodes));
    let best = null;
    for (const id of pool) {
      const n = G.nodes[id];
      if (!n) continue;
      if (!(G.adj[id] || []).some((e) => e.official)) continue;
      if (avoidParking && n.parking) continue;
      const d = dist(p, n);
      if (d > maxDist) continue;
      const score = d + (crossesWall(p, n) ? 55 : 0);
      if (!best || score < best.score) best = { id, score, d, n };
    }
    if (best) return best;
    let b = null;
    for (const id of Object.keys(G.nodes)) {
      const n = G.nodes[id];
      if (!n || !(G.adj[id] || []).some((e) => e.official)) continue;
      if (avoidParking && n.parking) continue;
      const d = dist(p, n);
      const score = d + (crossesWall(p, n) ? 80 : 0);
      if (!b || score < b.score) b = { id, score, d, n };
    }
    return b;
  }

  /** Liga nó órfão à malha principal com trecho curto sem atravessar parede. */
  function attachNodeToMeshSafe(nodeId, avoidParking) {
    const n = G.nodes[nodeId];
    if (!n) return false;
    if ((G.adj[nodeId] || []).some((e) => e.official && (!avoidParking || !G.nodes[e.id]?.parking))) {
      if (G.main) G.main.add(nodeId);
      return true;
    }
    let best = null;
    const pool = G.main && G.main.size ? G.main : new Set(Object.keys(G.nodes));
    for (const id of pool) {
      if (id === nodeId) continue;
      const m = G.nodes[id];
      if (!m || !(G.adj[id] || []).some((e) => e.official)) continue;
      if (avoidParking && m.parking) continue;
      const d = dist(n, m);
      if (d > 280) continue;
      if (crossesWall(n, m)) continue;
      if (!best || d < best.d) best = { id, d };
    }
    if (!best) return false;
    addEdge(nodeId, best.id, null, true);
    if (G.main) { G.main.add(nodeId); G.main.add(best.id); }
    return true;
  }

  /** Reancora na malha oficial — sem inventar linha reta pelas paredes. */
  function ensureLinked(startNode, endNode, routeOpts) {
    const opts = { officialOnly: true, ...(routeOpts || {}) };
    let ids = shortest(startNode, endNode, null, null, opts);
    if (ids.length) return { ids, startNode, endNode };

    const avoid = !!opts.avoidParking;
    const sNear = nearestRoutableNode(G.nodes[startNode] || { x: 0, y: 0 }, avoid);
    const eNear = nearestRoutableNode(G.nodes[endNode] || { x: 0, y: 0 }, avoid);
    const s2 = (sNear && sNear.id) || nearestConnectedNode(G.nodes[startNode] || { x: 0, y: 0 }, true) || startNode;
    const e2 = (eNear && eNear.id) || nearestConnectedNode(G.nodes[endNode] || { x: 0, y: 0 }, true) || endNode;
    ids = shortest(s2, e2, null, null, opts);
    if (ids.length) return { ids, startNode: s2, endNode: e2 };

    if (startNode) attachNodeToMeshSafe(startNode, avoid);
    if (endNode) attachNodeToMeshSafe(endNode, avoid);
    if (s2) attachNodeToMeshSafe(s2, avoid);
    if (e2) attachNodeToMeshSafe(e2, avoid);
    computeMainComponent();

    ids = shortest(startNode, endNode, null, null, opts);
    if (ids.length) return { ids, startNode, endNode };
    ids = shortest(s2, e2, null, null, opts);
    if (ids.length) return { ids, startNode: s2, endNode: e2 };

    const soft = { ...opts, officialOnly: false };
    ids = shortest(s2, e2, null, null, soft);
    if (ids.length) return { ids, startNode: s2, endNode: e2 };

    return { ids: [], startNode: s2 || startNode, endNode: e2 || endNode };
  }

  /** Sempre tenta rota pela malha (nunca mensagem de sem caminho / linha reta). */
  function emergencyRoute(origin, dest) {
    forcePoiOnMain(origin);
    forcePoiOnMain(dest);
    const allowParking = tripAllowsParking(origin, dest);
    const avoid = !allowParking;

    let startNode = origin.anchor;
    let endNode = dest.anchor;
    const sNear = nearestRoutableNode(origin, avoid) || nearestRoutableNode(origin, false);
    const eNear = nearestRoutableNode(dest, avoid) || nearestRoutableNode(dest, false);
    if (sNear) {
      startNode = sNear.id;
      origin.anchor = sNear.id;
      origin.snap = { x: sNear.n.x, y: sNear.n.y };
    }
    if (eNear) {
      endNode = eNear.id;
      dest.anchor = eNear.id;
      dest.snap = { x: eNear.n.x, y: eNear.n.y };
    }
    if (!startNode) startNode = nearestConnectedNode(origin, true);
    if (!endNode) endNode = nearestConnectedNode(dest, true);
    if (!startNode || !endNode || !G.nodes[startNode] || !G.nodes[endNode]) return null;

    attachNodeToMeshSafe(startNode, avoid);
    attachNodeToMeshSafe(endNode, avoid);

    if (startNode === endNode) {
      const n = G.nodes[startNode];
      origin.snap = { x: n.x, y: n.y };
      dest.snap = { x: n.x, y: n.y };
      const pts = [{ x: n.x, y: n.y }];
      if (canSpurTo(origin, n, origin)) pts.unshift({ x: origin.x, y: origin.y });
      if (canSpurTo(dest, n, dest)) pts.push({ x: dest.x, y: dest.y });
      if (pts.length < 2) pts.push({ x: n.x + 0.5, y: n.y });
      let len = 0;
      for (let i = 1; i < pts.length; i++) len += dist(pts[i - 1], pts[i]);
      return { points: pts, length: len, nodeIds: [startNode], label: "Rota mais próxima", kind: "best" };
    }

    let linked = ensureLinked(startNode, endNode, { avoidParking: avoid, officialOnly: true });
    let ids = linked.ids;

    if (!ids.length && avoid) {
      const altStarts = [];
      const altEnds = [];
      for (const id of (G.main || [])) {
        if (G.nodes[id]?.parking) continue;
        if (!(G.adj[id] || []).some((e) => e.official)) continue;
        const ds = dist(origin, G.nodes[id]);
        const de = dist(dest, G.nodes[id]);
        if (ds < 320) altStarts.push({ id, d: ds });
        if (de < 320) altEnds.push({ id, d: de });
      }
      altStarts.sort((a, b) => a.d - b.d);
      altEnds.sort((a, b) => a.d - b.d);
      outer: for (const s of altStarts.slice(0, 12)) {
        for (const e of altEnds.slice(0, 12)) {
          const path = shortest(s.id, e.id, null, null, { avoidParking: true, officialOnly: true });
          if (path.length) {
            ids = path;
            linked = { ids, startNode: s.id, endNode: e.id };
            break outer;
          }
        }
      }
    }

    if (!ids.length) {
      linked = ensureLinked(startNode, endNode, { avoidParking: avoid, officialOnly: false });
      ids = linked.ids;
    }
    if (!ids.length) return null;

    if (avoid && pathCrossesParking(ids, linked.startNode, linked.endNode)) {
      const clean = shortest(linked.startNode, linked.endNode, null, null, {
        avoidParking: true, officialOnly: true,
      });
      if (clean.length && !pathCrossesParking(clean, linked.startNode, linked.endNode)) ids = clean;
    }

    origin.anchor = linked.startNode;
    dest.anchor = linked.endNode;
    origin.snap = { x: G.nodes[linked.startNode].x, y: G.nodes[linked.startNode].y };
    dest.snap = { x: G.nodes[linked.endNode].x, y: G.nodes[linked.endNode].y };
    const r = assembleRoute(ids, origin, dest);
    if (r) { r.label = "Rota mais próxima"; r.kind = "best"; }
    return r;
  }

  // Spur ícone↔malha: curto e sem atravessar parede
  function canSpurTo(from, to, poiForTol) {
    const max = tol("spurTol", poiForTol ? poiToleranceZone(poiForTol) : "indoor");
    return from && to && from.x != null && to.x != null
      && dist(from, to) > 0.8
      && dist(from, to) <= max
      && !crossesWall(from, to);
  }

  function resolvePoi(which) {
    if (state[which]) return state[which];
    const raw = ((which === "origin" ? el.originInput : el.destInput).value || "").trim();
    if (!raw) return null;
    const q = normSearch(raw);
    const hits = (G.pois || [])
      .filter((p) => isSearchablePoi(p))
      .map((p) => ({ poi: p, score: poiSearchScore(p, raw) }))
      .filter((x) => x.score > 0)
      .sort((a, b) => b.score - a.score);
    if (!hits.length) return null;
    if (hits[0].score >= 100 || hits.length === 1) return hits[0].poi;
    if (hits[0].score >= 78 && hits[0].score > hits[1].score) return hits[0].poi;
    return null;
  }

  // até 3 rotas válidas — JSON primeiro; se vazio, malha SVG; se falhar, emergency
  function routeOptions(origin, dest) {
    const fromJson = routeOptionsFromJson(origin, dest);
    if (fromJson && fromJson.length) return fromJson;

    forcePoiOnMain(origin);
    forcePoiOnMain(dest);

    // reancora sempre pela tabela/entrada correta (não reaproveita snap antigo errado)
    const sSnap = snapToEntrance(origin);
    const eSnap = snapToEntrance(dest);
    if (sSnap.id) {
      origin.anchor = sSnap.id;
      origin.snap = { x: sSnap.x, y: sSnap.y };
      forcePoiOnMain(origin);
    }
    if (eSnap.id) {
      dest.anchor = eSnap.id;
      dest.snap = { x: eSnap.x, y: eSnap.y };
      forcePoiOnMain(dest);
    }

    let startNode = origin.anchor;
    let endNode = dest.anchor;
    if (!startNode || !endNode) {
      const er = emergencyRoute(origin, dest);
      if (!er) return [];
      er.label = "Rota mais próxima";
      er.kind = "best";
      return [er];
    }

    const allowParking = tripAllowsParking(origin, dest);
    const baseOpts = { avoidParking: !allowParking, officialOnly: true };

    const linked = ensureLinked(startNode, endNode, baseOpts);
    startNode = linked.startNode;
    endNode = linked.endNode;
    if (startNode !== origin.anchor && G.nodes[startNode]) {
      origin.anchor = startNode;
      origin.snap = { x: G.nodes[startNode].x, y: G.nodes[startNode].y };
    }
    if (endNode !== dest.anchor && G.nodes[endNode]) {
      dest.anchor = endNode;
      dest.snap = { x: G.nodes[endNode].x, y: G.nodes[endNode].y };
    }

    const seen = new Set();
    const out = [];

    const pushPath = (ids, kind) => {
      if (!ids || !ids.length) return false;
      if (ids.length >= 2 && !pathUsesOfficialEdges(ids)) return false;
      if (!allowParking && pathCrossesParking(ids, startNode, endNode)) return false;
      const sig = ids.join(">");
      if (seen.has(sig)) return false;
      const r = assembleRoute(ids, origin, dest);
      if (!r || r.points.length < 2) return false;
      if (out.some((x) => isDuplicateRoute(x, r))) return false;
      r.sig = sig;
      r.kind = kind || classifyRouteKind(ids);
      out.push(r);
      seen.add(sig);
      return true;
    };

    // 1) melhor rota (mais curta, só malha oficial, sem pátio)
    const bestIds = shortest(startNode, endNode, null, null, baseOpts);
    if (bestIds.length) pushPath(bestIds, "best");
    else if (linked.ids.length) pushPath(linked.ids, "best");

    // 2) se destino é o templo, gera opções pelas entradas do estabelecimento
    if (isTemplePoi(dest) && out.length < 4) {
      for (const gate of (CONFIG.templeEntrances || [])) {
        if (!G.nodes[gate.id]) continue;
        if (gate.id === startNode) continue;
        const ids = shortest(startNode, gate.id, null, null, { ...baseOpts, avoidParking: false });
        if (!ids.length) continue;
        const destGate = {
          ...dest,
          anchor: gate.id,
          snap: { x: G.nodes[gate.id].x, y: G.nodes[gate.id].y },
          x: G.nodes[gate.id].x,
          y: G.nodes[gate.id].y,
          iconX: G.nodes[gate.id].x,
          iconY: G.nodes[gate.id].y,
        };
        const r = assembleRoute(ids, origin, destGate);
        if (!r || r.points.length < 2) continue;
        const sig = ids.join(">");
        if (seen.has(sig)) continue;
        if (out.some((x) => isDuplicateRoute(x, r))) continue;
        r.sig = sig;
        r.kind = "templo";
        r.label = gate.label;
        r.entranceId = gate.id;
        out.push(r);
        seen.add(sig);
      }
    }

    // 3) alternativa pelo templo (prioriza edges indoor)
    const templeIds = shortest(startNode, endNode, null, null, { ...baseOpts, preferZone: "indoor" });
    pushPath(templeIds, "templo");

    // 4) alternativa por fora (prioriza edges outdoor — ainda sem estacionamento)
    const outdoorIds = shortest(startNode, endNode, null, null, { ...baseOpts, preferZone: "outdoor" });
    pushPath(outdoorIds, "fora");

    // 4b) rotas externas nomeadas (ex.: pelo jardim / Av. Batel)
    for (const extSpec of namedExternalSpecsForPair(origin, dest)) {
      if (out.length >= 5) break;
      const vias = (Array.isArray(extSpec.via) ? extSpec.via : [extSpec.via])
        .filter((id) => G.nodes[id]);
      if (!vias.length) continue;
      const preferredEnds = (Array.isArray(extSpec.endNodes) ? extSpec.endNodes : [])
        .filter((id) => G.nodes[id]);
      const targetEnd = preferredEnds[0] || endNode;
      const extOpts = {
        avoidParking: !(extSpec.allowParking === true || extSpec.avoidParking === false),
        officialOnly: true,
      };
      const chain = [startNode, ...vias, targetEnd];
      let ids = [chain[0]];
      let ok = true;
      for (let i = 0; i < chain.length - 1; i++) {
        let leg = shortest(chain[i], chain[i + 1], null, null, extOpts);
        if ((!leg || leg.length < 2) && extOpts.avoidParking) {
          leg = shortest(chain[i], chain[i + 1], null, null, { ...extOpts, avoidParking: false });
        }
        if (!leg || leg.length < 2) { ok = false; break; }
        ids = ids.concat(leg.slice(1));
      }
      if (!ok) continue;
      const sig = ids.join(">");
      if (seen.has(sig)) continue;
      const destGate = preferredEnds[0]
        ? { id: preferredEnds[0], x: G.nodes[preferredEnds[0]].x, y: G.nodes[preferredEnds[0]].y }
        : dest;
      const r = assembleRoute(ids, origin, destGate);
      if (r && r.points.length >= 2 && !out.some((x) => isDuplicateRoute(x, r))) {
        r.sig = sig;
        r.kind = "fora";
        r.label = extSpec.label || "Por fora (externa)";
        r.namedExternal = true;
        r.viaEndNode = preferredEnds[0] || null;
        out.push(r);
        seen.add(sig);
      }
    }

    // se ainda faltam opções distintas, passa por nós-chave indoor / outdoor
    if (out.length < 3 && G.main && G.main.size) {
      const viasTemplo = [];
      const viasFora = [];
      for (const id of G.main) {
        if (id === startNode || id === endNode) continue;
        if (!(G.adj[id] || []).some((e) => e.official)) continue;
        if (G.nodes[id]?.parking && !allowParking) continue;
        if (/templo|capela|toldo|entrada_lateral|oracao|recepcao/i.test(id)) viasTemplo.push(id);
        else if (/entrada|jardim|ginasio|externo|pedestre/i.test(id) && !/estacionamento|escacionamento/i.test(id)) viasFora.push(id);
      }
      const tryVia = (via, kind) => {
        if (out.length >= 3) return;
        const p1 = shortest(startNode, via, null, null, baseOpts);
        const p2 = shortest(via, endNode, null, null, baseOpts);
        if (p1.length < 2 || p2.length < 2) return;
        pushPath(p1.slice(0, -1).concat(p2), kind);
      };
      for (const via of viasTemplo) tryVia(via, "templo");
      for (const via of viasFora) tryVia(via, "fora");
    }

    if (!out.length) {
      const er = emergencyRoute(origin, dest);
      if (er) {
        er.label = "Rota mais próxima";
        er.kind = "best";
        out.push(er);
      }
    }

    if (!out.length) {
      // última garantia: ancora nos nós mais próximos e monta pela malha
      const er = emergencyRoute(origin, dest);
      if (er) out.push(er);
    }

    if (!out.length) return [];

    out.sort((a, b) => a.length - b.length);

    // templo com rotas nomeadas por entrada — preserva labels e até 4 opções
    if (isTemplePoi(dest) && out.some((r) => r.entranceId && r.label)) {
      const doors = [];
      const seenDoor = new Set();
      for (const r of out) {
        if (!r.entranceId || !r.label || r.namedExternal) continue;
        if (seenDoor.has(r.entranceId)) continue;
        seenDoor.add(r.entranceId);
        doors.push(r);
        if (doors.length >= 3) break;
      }
      for (const r of out) {
        if (!r.namedExternal) continue;
        if (doors.some((d) => (d.edgeIds || []).join(">") === (r.edgeIds || []).join(">"))) continue;
        doors.push(r);
        if (doors.length >= 4) break;
      }
      if (doors.length) return finalizePackedRoutes(doors, globalThis.NavigationRouter, origin, dest);
    }

    const namedAll = out.filter((r) => r.namedExternal);
    const maxPick = maxRouteOptionsForPair(origin, dest);

    // garante no máximo uma de cada perfil + a melhor sempre em 1º
    const picked = [];
    const usedKinds = new Set();
    for (const r of out) {
      if (picked.length >= maxPick) break;
      if (r.namedExternal) {
        r.kind = "fora";
        r.label = r.label || "Por fora (externa)";
        picked.push(r);
        usedKinds.add("fora-" + (r.label || picked.length));
        continue;
      }
      const kind = r.kind === "best" ? classifyRouteKind(r.nodeIds) : r.kind;
      if (picked.length === 0) {
        r.kind = "best";
        r.label = r.label && r.entranceId ? r.label : "Rota mais próxima";
        picked.push(r);
        usedKinds.add(classifyRouteKind(r.nodeIds));
        continue;
      }
      const profile = kind === "mista" ? classifyRouteKind(r.nodeIds) : kind;
      if (profile !== "mista" && usedKinds.has(profile) && !r.entranceId) continue;
      if (!r.label || !r.entranceId) {
        if (profile === "templo") r.label = "Pelo templo";
        else if (profile === "fora") r.label = "Por fora";
        else r.label = "Alternativa";
      }
      r.kind = profile;
      usedKinds.add(profile === "mista" ? `mista-${picked.length}` : profile);
      picked.push(r);
    }

    // se só sobrou 1 opção mas havia 2+ no out com labels genéricos, completa
    if (picked.length < 2) {
      for (const r of out) {
        if (picked.length >= maxPick) break;
        if (picked.includes(r)) continue;
        if (r.namedExternal) {
          r.kind = "fora";
          r.label = r.label || "Por fora (externa)";
          picked.push(r);
          continue;
        }
        const profile = classifyRouteKind(r.nodeIds);
        r.kind = profile;
        r.label = profile === "templo" ? "Pelo templo" : profile === "fora" ? "Por fora" : "Alternativa";
        picked.push(r);
      }
    }

    // garante todas as externas nomeadas (jardim + Batel) nas alternativas
    const namedExts = out.filter((r) => r.namedExternal);
    if (namedExts.length) {
      const without = picked.filter((r) => !r.namedExternal);
      const next = [];
      if (without[0]) next.push(without[0]);
      for (const n of namedExts) {
        if (next.length >= maxPick) break;
        if (next.some((r) => isDuplicateRoute(r, n))) continue;
        next.push(n);
      }
      for (const r of without.slice(1)) {
        if (next.length >= maxPick) break;
        if (next.some((x) => isDuplicateRoute(x, r))) continue;
        next.push(r);
      }
      return finalizePackedRoutes(next, globalThis.NavigationRouter, origin, dest);
    }

    return finalizePackedRoutes(picked, globalThis.NavigationRouter, origin, dest);
  }

  // geometria real da edge do grafo — NUNCA inventa segmento sem edge
  function geomBetween(a, b) {
    const e = (G.adj[a] || []).find((x) => x.id === b);
    if (!e) return [];
    if (e.geom?.length >= 2) return e.geom.map((p) => ({ x: p.x, y: p.y }));
    const pa = G.nodes[a], pb = G.nodes[b];
    if (!pa || !pb) return [];
    // edge existe sem polyline: só aceita se oficial (malha do mapa) ou sem parede
    if (e.official || !crossesWall(pa, pb)) {
      return [{ x: pa.x, y: pa.y }, { x: pb.x, y: pb.y }];
    }
    return [];
  }

  function appendGeom(out, geom) {
    for (const p of geom) {
      if (!out.length || dist(out[out.length - 1], p) > 0.35) out.push({ x: p.x, y: p.y });
    }
  }

  /** Verifica se o caminho só usa edges existentes no grafo. */
  function pathHasGraphEdges(ids) {
    if (!ids || ids.length < 2) return ids?.length === 1;
    for (let i = 1; i < ids.length; i++) {
      const e = (G.adj[ids[i - 1]] || []).find((x) => x.id === ids[i]);
      if (!e) return false;
    }
    return true;
  }

  function pathUsesOfficialEdges(ids) {
    if (!ids || ids.length < 2) return ids?.length === 1;
    for (let i = 1; i < ids.length; i++) {
      const e = (G.adj[ids[i - 1]] || []).find((x) => x.id === ids[i]);
      if (!e || !e.official) return false;
    }
    return true;
  }

  // polilinha = geometria das edges da malha + trecho EXATO até o ícone do POI
  function assembleRoute(ids, origin, dest) {
    if (!ids.length) return null;
    if (ids.length >= 2 && !pathHasGraphEdges(ids)) return null;

    const startNode = G.nodes[ids[0]];
    const endNode = G.nodes[ids[ids.length - 1]];
    if (!startNode || !endNode) return null;
    const startSnap = origin.snap || startNode;
    const endSnap = dest.snap || endNode;
    const pts = [];
    const oIcon = poiIcon(origin);
    const dIcon = poiIcon(dest);

    // origem: só começa no ícone se o trecho for curto e livre de parede
    const maxSpurO = tol("spurTol", poiToleranceZone(origin));
    const maxSpurD = tol("spurTol", poiToleranceZone(dest));
    if (oIcon && dist(oIcon, startSnap) > 0.8 && dist(oIcon, startSnap) <= maxSpurO && !crossesWall(oIcon, startSnap)) {
      appendGeom(pts, [{ x: oIcon.x, y: oIcon.y }]);
    }
    appendGeom(pts, [{ x: startSnap.x, y: startSnap.y }]);

    for (let i = 1; i < ids.length; i++) {
      const a = ids[i - 1], b = ids[i];
      const e = (G.adj[a] || []).find((x) => x.id === b);
      if (!e) return null;
      const g = geomBetween(a, b);
      if (g.length < 2) return null;
      if (!e.official) {
        let ok = true;
        for (let k = 1; k < g.length; k++) {
          if (crossesWall(g[k - 1], g[k])) { ok = false; break; }
        }
        if (!ok) return null;
      }
      appendGeom(pts, g);
    }

    const last = pts[pts.length - 1] || startSnap;
    if (dist(last, endSnap) > 0.8) {
      appendGeom(pts, [{ x: endSnap.x, y: endSnap.y }]);
    }

    // destino: ícone só se curto e sem parede (templo = fica na porta)
    if (dIcon && !isTemplePoi(dest)) {
      const tip = pts[pts.length - 1] || endSnap;
      if (dist(tip, dIcon) > 0.8 && dist(tip, dIcon) <= maxSpurD && !crossesWall(tip, dIcon)) {
        appendGeom(pts, [{ x: dIcon.x, y: dIcon.y }]);
      }
    }

    const cleaned = [];
    for (const p of pts) {
      if (!isFinite(p.x) || !isFinite(p.y)) continue;
      if (!cleaned.length || dist(cleaned[cleaned.length - 1], p) > 0.35) cleaned.push(p);
    }
    if (cleaned.length < 2) return null;

    let len = 0;
    for (let i = 1; i < cleaned.length; i++) len += dist(cleaned[i - 1], cleaned[i]);
    return { points: cleaned, length: len, nodeIds: ids };
  }

  function routeBetween(origin, dest) {
    const opts = routeOptions(origin, dest);
    return opts[0] || null;
  }

  /* ============================================================ PASSOS (turn-by-turn) */
  function angle(a, b) { return Math.atan2(b.y - a.y, b.x - a.x); }
  function turnLabel(prev, cur, next) {
    let d = angle(cur, next) - angle(prev, cur);
    while (d > Math.PI) d -= 2 * Math.PI;
    while (d < -Math.PI) d += 2 * Math.PI;
    const deg = (d * 180) / Math.PI;
    if (deg > 30) return { txt: "Vire à direita", ico: "R" };
    if (deg < -30) return { txt: "Vire à esquerda", ico: "L" };
    return { txt: "Siga em frente", ico: "U" };
  }
  const STEP_ICO = {
    U: '<path d="M12 20V6M6 12l6-6 6 6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>',
    R: '<path d="M6 18h6a4 4 0 0 0 4-4V7M12 3l4 4-4 4" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>',
    L: '<path d="M18 18h-6a4 4 0 0 1-4-4V7M12 3 8 7l4 4" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>',
    S: '<circle cx="12" cy="12" r="4" fill="currentColor"/>',
    F: '<path d="M12 2 4.5 20 12 16l7.5 4z" fill="currentColor"/>',
  };
  function buildSteps(route) {
    const oLvl = poiLevel(state.origin);
    const dLvl = poiLevel(state.dest);
    const legs = route.legs || routeLegsFromGraph(route);

    if (routeInvolvesBasementTransfer(oLvl, dLvl)) {
      return buildBasementNarniaSteps(oLvl, dLvl);
    }

    const steps = [];
    steps.push({ ico: "S", txt: `Início: ${state.origin.name}`, dist: "" });

    if (oLvl !== dLvl) {
      const viaStairs = routeUsesLateralStairs(route);
      const exitHub = viaStairs ? stairHub(oLvl) : elevatorHub(oLvl);
      const arriveHub = viaStairs ? stairHub(dLvl) : elevatorHub(dLvl);
      const accessLabel = viaStairs ? "escada lateral" : "elevador";
      const prep = viaStairs ? "a" : "o";
      const firstLeg = legs[0];
      if (firstLeg?.edgeIds?.length) {
        steps.push({
          ico: "U",
          txt: `Siga até ${prep} ${accessLabel}${exitHub ? ` (${exitHub.label})` : ""}`,
          dist: "",
        });
      } else {
        steps.push({
          ico: "U",
          txt: `Vá ${viaStairs ? "à" : "ao"} ${accessLabel}${exitHub ? ` — ${exitHub.label}` : ""}`,
          dist: "",
        });
      }
      steps.push({
        ico: "U",
        txt: `Use ${prep} ${accessLabel} até ${floorTitle(dLvl)}${arriveHub ? ` — ${arriveHub.label}` : ""}`,
        dist: "",
      });
      steps.push({
        ico: "U",
        txt: `${viaStairs ? "Da escada" : "Do elevador"}, siga até ${state.dest.name}`,
        dist: "",
      });
      steps.push({ ico: "F", txt: `Chegada: ${state.dest.name}`, dist: "" });
      return steps;
    }

    const p = route.points || [];
    let walk = 0;
    for (let i = 1; i < p.length - 1; i++) {
      const segLen = dist(p[i], p[i + 1]);
      walk += dist(p[i - 1], p[i]);
      const t = turnLabel(p[i - 1], p[i], p[i + 1]);
      if (t.ico === "U" && segLen < 12) continue;
      if (t.ico !== "U" || walk > 18) {
        steps.push({ ico: t.ico, txt: t.txt, dist: fmtMeters(Math.max(walk, segLen)) });
        walk = 0;
      }
    }
    steps.push({ ico: "F", txt: `Chegada: ${state.dest.name}`, dist: "" });
    return steps;
  }

  /* ============================================================ DESENHAR ROTA */

  function routeMarkerScale() {
    const Icons = globalThis.MapNavIcons;
    let base;
    if (Icons?.markerScaleForViewBox) {
      base = Icons.markerScaleForViewBox(G.vbW, G.vbH);
    } else {
      base = Math.max(0.105, Math.min(0.18, Math.min(G.vbW || 1011, G.vbH || 862) * 0.0001375));
    }
    // Compensa o zoom do SVG (width/height) — ícone mantém tamanho visual na tela
    return base / Math.max(0.08, state.scale || 1);
  }

  function refreshRouteMarkerScales() {
    const c = state._routeMarkerCache;
    if (!c || el.routeStart?.hasAttribute("hidden")) return;
    paintRouteMarker(el.routeStart, "start", c.start, c.bearing);
    paintRouteMarker(el.routeEnd, "end", c.end);
  }

  function paintRouteMarker(node, kind, pt, bearing) {
    if (!node || !pt) return;
    const s = routeMarkerScale();
    const Icons = globalThis.MapNavIcons;
    if (kind === "start" && Icons?.applyRouteStartTransform) {
      Icons.applyRouteStartTransform(node, pt.x, pt.y, bearing, s);
    } else if (kind === "end" && Icons?.applyRouteEndTransform) {
      Icons.applyRouteEndTransform(node, pt.x, pt.y, s);
    } else if (kind === "start") {
      node.setAttribute("transform", `translate(${pt.x} ${pt.y}) rotate(${bearing || 0}) scale(${s})`);
    } else {
      node.setAttribute("transform", `translate(${pt.x} ${pt.y}) scale(${s})`);
    }
  }

  function paintRoutePathNodes(layerEl, baseNode, glowNode, pathD) {
    const RA = globalThis.RouteAnimation;
    if (RA?.paintRoutePaths) {
      RA.applyRouteAnimationVars?.(layerEl);
      RA.paintRoutePaths(layerEl, baseNode, glowNode, pathD);
      return;
    }
    const stroke = "#00AEEF";
    if (baseNode) {
      baseNode.setAttribute("d", pathD);
      baseNode.setAttribute("fill", "none");
      baseNode.setAttribute("stroke", stroke);
      baseNode.setAttribute("stroke-width", "10");
      baseNode.setAttribute("stroke-linecap", "round");
      baseNode.setAttribute("stroke-linejoin", "round");
      baseNode.style.visibility = pathD ? "visible" : "hidden";
      baseNode.style.display = pathD ? "" : "none";
    }
    if (glowNode) {
      glowNode.setAttribute("d", pathD);
      glowNode.setAttribute("fill", "none");
      glowNode.setAttribute("stroke-linecap", "round");
      glowNode.setAttribute("stroke-linejoin", "round");
      glowNode.style.visibility = pathD ? "visible" : "hidden";
      glowNode.style.display = pathD ? "" : "none";
    }
    if (layerEl) {
      layerEl.style.display = pathD ? "" : "none";
      layerEl.style.visibility = pathD ? "visible" : "hidden";
      layerEl.removeAttribute("hidden");
    }
  }

  function paintRouteOnMap(ptsStr, a, b, points) {
    syncMapViewBeforeRoutePaint();
    const pts = (points || ptsStr.split(/\s+/).map((s) => {
      const [x, y] = s.split(",").map(Number);
      return { x, y };
    })).filter((p) => isFinite(p.x) && isFinite(p.y));
    if (pts.length < 2) return;
    const d = pointsToPathD(pts);
    const RA = globalThis.RouteAnimation;

    RA?.applyRouteAnimationVars?.(el.routeLayer);
    if (RA?.paintRoutePaths) {
      RA.paintRoutePaths(el.routeLayer, el.routePathBase, el.routePathGlow, d);
    } else {
      paintRoutePathNodes(el.routeLayer, el.routePathBase, el.routePathGlow, d);
    }
    forceRoutePathVisible(el.routePathBase, el.routePathGlow, d);
    if (el.routeLayer && d) {
      el.routeLayer.style.display = "";
      el.routeLayer.style.visibility = "visible";
      el.routeLayer.removeAttribute("hidden");
    }
    RA?.setRouteCompleted?.(el.routeLayer, !!state.routeVisualCompleted);

    const Icons = globalThis.MapNavIcons;
    const startBearing = Icons?.bearingDeg
      ? Icons.bearingDeg(a, pts[1] || b)
      : (Math.atan2((pts[1] || b).y - a.y, (pts[1] || b).x - a.x) * 180) / Math.PI + 90;

    el.routeStart.removeAttribute("hidden");
    el.routeStart.setAttribute("visibility", "visible");
    el.routeStart.style.display = "";
    paintRouteMarker(el.routeStart, "start", a, startBearing);

    el.routeEnd.removeAttribute("hidden");
    el.routeEnd.setAttribute("visibility", "visible");
    el.routeEnd.style.display = "";
    paintRouteMarker(el.routeEnd, "end", b);

    state._routeMarkerCache = { start: a, end: b, bearing: startBearing };

    const svg = el.svgHost.querySelector("svg");
    if (svg) {
      try {
        const { layer, base, glow } = resolveMapRoutePaintTargets(svg);
        RA?.applyRouteAnimationVars?.(layer);
        if (RA?.paintRoutePaths) {
          RA.paintRoutePaths(layer, base, glow, d);
        } else {
          paintRoutePathNodes(layer, base, glow, d);
        }
        forceRoutePathVisible(base, glow, d);
        RA?.setRouteCompleted?.(layer, !!state.routeVisualCompleted);
        ["mapRouteStart", "mapRouteEnd"].forEach((id) => {
          const n = svg.getElementById(id);
          if (n) n.setAttribute("visibility", "hidden");
        });
      } catch (err) {
        console.warn("mapRouteLayer:", err);
      }
    }
  }

  function clearRoutePaint() {
    const RA = globalThis.RouteAnimation;
    RA?.clearRoutePaths?.(el.routeLayer, el.routePathBase, el.routePathGlow);
    el.routeLayer?.querySelector("#routePolyline")?.setAttribute("points", "");
    state.routeVisualCompleted = false;
    el.routeStart.setAttribute("hidden", "");
    el.routeStart.setAttribute("visibility", "hidden");
    el.routeStart.style.display = "none";
    el.routeEnd.setAttribute("hidden", "");
    el.routeEnd.setAttribute("visibility", "hidden");
    el.routeEnd.style.display = "none";
    state._routeMarkerCache = null;
    const svg = el.svgHost.querySelector("#mapaSVG") || el.svgHost.querySelector("svg");
    if (svg) {
      const { layer, base, glow } = getMapRoutePaintTargets(svg);
      if (layer) RA?.clearRoutePaths?.(layer, base, glow);
    }
    if (!svg) return;
    ["mapRouteStart", "mapRouteEnd"].forEach((id) => {
      const n = svg.getElementById(id);
      if (n) n.setAttribute("visibility", "hidden");
    });
  }

  function isNavigating() {
    return document.body.classList.contains("is-navigating");
  }

  function canStartNavigation() {
    return !!(state.route?.points?.length && state.origin && state.dest);
  }

  function updateNavBtn() {
    if (!el.navBtn) return;
    const navigating = isNavigating();
    const ready = canStartNavigation();

    if (navigating) {
      el.navBtn.disabled = false;
      el.navBtn.setAttribute("aria-pressed", "true");
      el.navBtn.title = "Encerrar navegação passo a passo";
      if (el.navBtnLabel) el.navBtnLabel.textContent = "Sair da navegação";
      el.navBtn.classList.add("btn--nav-exit");
    } else {
      el.navBtn.disabled = !ready;
      el.navBtn.setAttribute("aria-pressed", "false");
      el.navBtn.title = ready
        ? "Iniciar navegação passo a passo"
        : "Trace uma rota com origem e destino";
      if (el.navBtnLabel) el.navBtnLabel.textContent = "Navegar";
      el.navBtn.classList.remove("btn--nav-exit");
    }
  }

  function updateSummaryChrome() {
    const hasRoute = !!state.route;
    if (el.summary) el.summary.hidden = !hasRoute;
    if (el.summaryBody) el.summaryBody.hidden = !hasRoute;
    updateNavBtn();
  }

  async function drawRoute() {
    const origin = resolvePoi("origin");
    const dest = resolvePoi("dest");
    if (origin) { state.origin = origin; el.originInput.value = origin.searchLabel || origin.name; }
    if (dest) { state.dest = dest; el.destInput.value = dest.searchLabel || dest.name; }

    await ensureNavGraphForTrip(poiLevel(state.origin), poiLevel(state.dest));

    // em outro andar sem origem: usa o elevador do andar atual
    if (!state.origin && state.dest && (poiLevel(state.dest) !== state.activeLevel)) {
      const hub = elevatorPoiForLevel(state.activeLevel);
      if (hub) {
        state.origin = hub;
        el.originInput.value = hub.searchLabel || hub.name;
      }
    }

    if (!state.origin) { toast("Escolha onde você está."); openField("origin"); return; }
    if (!state.dest) { toast("Escolha para onde você quer ir."); openField("dest"); return; }
    if (state.origin.id === state.dest.id) {
      toast("Origem e destino são iguais."); return;
    }

    let options = routeOptions(state.origin, state.dest);
    const NR = globalThis.NavigationRouter;
    // garantia: se o par tem rota nomeada, ela precisa aparecer (alt. 2)
    if (state.navGraph && NR) {
      const startIds = resolveNavNodeIds(state.origin, state.origin.id === "__here__" ? "here" : "origin");
      const endIds = resolveNavNodeIds(state.dest, "dest");
      if (startIds.length && endIds.length) {
        options = appendNamedExternalOptions(NR, startIds, endIds, state.origin, state.dest, options || []);
      }
    }
    options = dedupeRouteOptionsStrict(
      finalizePackedRoutes(options || [], NR, state.origin, state.dest),
      NR,
      state.origin,
      state.dest
    );
    // garantia: só malha (nodes/edges) — nunca linha reta
    if (!options.length) {
      const er = emergencyRoute(state.origin, state.dest);
      if (er && er.points && er.points.length >= 2 && (er.nodeIds?.length >= 2 || er.fromJson)) {
        er.label = er.label || "Rota 1 — Mais curta";
        er.kind = "best";
        options = [er];
      } else if (er && er.points && er.points.length >= 2 && er.nodeIds?.length === 1) {
        // mesmo nó: ok se tem spur curto
        options = [er];
      }
    }
    if (!options.length) {
      toast("Nenhuma rota disponível entre origem e destino.");
      return;
    }

    state.routeOptions = options;
    state.routePickOpen = true;
    // No celular: fecha o painel antes do zoom para a rota caber no viewport
    if (isMobileLayout()) setPanelOpen(false);
    await selectRoute(0, true);
    updateSummaryChrome();
    const n = state.routeOptions.length;
    toast(n > 1
      ? `${n} rotas — Rota 1 (mais curta) selecionada.`
      : "Rota traçada até o destino.");
  }

  async function selectRoute(idx, doFit) {
    const options = state.routeOptions || [];
    if (!options.length) return;
    idx = Math.max(0, Math.min(idx, options.length - 1));
    state.routeIdx = idx;
    const route = options[idx];
    state.route = route;
    setRouteVisualCompleted(false);

    const oLvl = poiLevel(state.origin);
    const dLvl = poiLevel(state.dest);
    const multi = oLvl !== dLvl;
    const viewLevel = routeInitialViewLevel(route, oLvl, dLvl);

    await setActiveLevel(viewLevel, { silent: true, keepTrip: true, force: true });

    const finish = () => {
      syncMapViewBeforeRoutePaint();
      rebuildRouteLegs(route);
      hydrateRouteLegPoints(route, state.activeLevel);
      paintActiveRouteLeg();
      el.summaryDist.textContent = fmtMeters(route.length);
      if (el.summaryTime) el.summaryTime.textContent = fmtRouteTime(route.length);
      el.summaryMeta.textContent = multi
        ? `${state.origin.name} → ${state.dest.name} · ${routeViaLabel(route, oLvl, dLvl)} (${oLvl}→${dLvl})`
        : `${state.origin.name} → ${state.dest.name}`;
      const steps = buildSteps(route);
      el.steps.innerHTML = steps.map((s) => `
      <li><span class="step-ico"><svg viewBox="0 0 24 24" width="16" height="16">${STEP_ICO[s.ico]}</svg></span>
      <span class="step-txt">${s.txt}${s.dist ? `<span class="step-dist"> · ${s.dist}</span>` : ""}</span></li>`).join("");

      renderRouteOptions();
      state.navIdx = 0;
      updateNavBtn();
      if (doFit) {
        fitSoon(() => {
          syncNavLayoutMetrics();
          paintActiveRouteLeg();
          fitRouteInView(route, {
            navMode: document.body.classList.contains("is-navigating"),
            preferActiveLeg: true,
            fillWidth: isMobileLayout(),
          });
        });
      }
      if (multi) {
        if (routeInvolvesBasementTransfer(oLvl, dLvl)) {
          const startHint = isBasementFloor(oLvl)
            ? `Comece em ${floorTitle(oLvl)}: siga até a ${narniaGateLabel(oLvl)} (saída do subsolo).`
            : !isAdmFloor(oLvl)
              ? "Comece pelo mapa do Térreo (L00)."
              : `Comece pelo mapa de ${floorTitle(oLvl)}.`;
          toast(`${startHint} Ao entrar na Porta de Nárnia, o mapa muda de andar. Troque o andar para ver cada trecho.`);
        } else if (routeUsesLateralStairs(route)) {
          const arrive = stairHub(dLvl);
          toast(`Via escada lateral: saia em ${arrive?.label || floorTitle(dLvl)} e siga até ${state.dest.name}. Troque o andar para ver cada trecho.`);
        } else {
          const arrive = elevatorHub(dLvl);
          toast(`Via elevador: comece em ${floorTitle(oLvl)} até ${elevatorHub(oLvl)?.label || "o elevador"}. Troque o andar para ver cada trecho.`);
        }
      }
    };

    finish();
  }

  function renderRouteOptions() {
    const NR = globalThis.NavigationRouter;
    let options = dedupeRouteOptionsStrict(state.routeOptions || [], NR, state.origin, state.dest);
    if (options.length !== (state.routeOptions || []).length) {
      state.routeOptions = options;
      if (state.routeIdx >= options.length) state.routeIdx = Math.max(0, options.length - 1);
    }
    if (!el.routePick) return;

    if (!options.length) {
      el.routePick.hidden = true;
      el.routeOptions.innerHTML = "";
      return;
    }

    el.routePick.hidden = false;
    if (el.routePickLabel) {
      el.routePickLabel.textContent = "Opções de rota";
    }
    if (el.routePickCount) {
      el.routePickCount.hidden = options.length <= 1;
      el.routePickCount.textContent = `${options.length} opções`;
    }

    el.routeOptions.hidden = false;
    el.routeOptions.innerHTML = options.map((r, i) => {
      const active = i === state.routeIdx ? " is-active" : "";
      const name = r.label
        || (i === 0 ? "Rota 1 — Mais curta"
          : i === 1 ? "Rota 2 — Alternativa"
          : i === 2 ? "Rota 3 — Alternativa"
          : "Rota 4 — Alternativa");
      return `<button type="button" class="route-opt${active}" data-idx="${i}">
        <span class="route-opt__badge">${i + 1}</span>
        <span class="route-opt__txt"><span class="route-opt__name">${name}</span>
        <span class="route-opt__dist">${fmtMeters(r.length)}</span></span>
      </button>`;
    }).join("");
    el.routeOptions.querySelectorAll(".route-opt").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.preventDefault();
        selectRoute(+btn.dataset.idx, true);
      });
    });
  }

  function clearRoute(silent) {
    if (isNavigating()) exitNav();
    state.route = null;
    state.routeOptions = [];
    state.routeIdx = 0;
    state.routePickOpen = false;
    clearRoutePaint();
    if (el.routePick) el.routePick.hidden = true;
    if (el.routeOptions) { el.routeOptions.hidden = true; el.routeOptions.innerHTML = ""; }
    updateSummaryChrome();
    if (!silent) toast("Rota removida.");
  }

  /* ============================================================ CAMPOS / AUTOCOMPLETE */
  function highlightSelected() {
    el.svgHost.querySelectorAll('[data-poi][data-selected="true"]').forEach((n) => n.removeAttribute("data-selected"));
    [state.origin, state.dest].forEach((poi) => {
      if (!poi || !poi.id) return;
      const node = el.svgHost.querySelector(`[data-poi="${poi.id}"]`);
      if (node) node.setAttribute("data-selected", "true");
    });
  }

  function setField(which, poi) {
    // destino em outro andar sem origem → elevador do andar atual
    if (which === "dest" && !state.origin && poi) {
      const destLvl = poiLevel(poi);
      if (destLvl !== state.activeLevel) {
        const hub = elevatorPoiForLevel(state.activeLevel);
        if (hub) {
          state.origin = hub;
          if (el.originInput) el.originInput.value = hub.searchLabel || hub.name;
        }
      }
    }

    state[which] = poi;
    const input = which === "origin" ? el.originInput : el.destInput;
    input.value = poi.searchLabel || poi.name;
    closeSuggest();
    exitMobileSearchMode();
    input.blur();
    highlightSelected();

    if (which === "dest" && poi?.accessNote) {
      toast(poi.accessNote);
    }

    if (state.origin && state.dest) {
      drawRoute();
      return;
    }
    if (poi && poiLevel(poi) !== state.activeLevel) {
      const poiLvl = poiLevel(poi);
      const originLvl = state.origin ? poiLevel(state.origin) : null;
      if (which === "dest" && isBasementFloor(poiLvl) && originLvl && !isBasementFloor(originLvl)) {
        setActiveLevel(originLvl, { silent: true, keepTrip: true });
      } else {
        setActiveLevel(poiLvl, { silent: true, keepTrip: true });
      }
    }
  }

  function openField(which) {
    (which === "origin" ? el.originInput : el.destInput).focus();
    renderSuggest(which, "");
  }

  function iconFor() {
    return '<svg viewBox="0 0 24 24" width="16" height="16"><path d="M12 21s7-5.5 7-11a7 7 0 1 0-14 0c0 5.5 7 11 7 11Z" fill="none" stroke="currentColor" stroke-width="1.7"/><circle cx="12" cy="10" r="2.4" fill="currentColor"/></svg>';
  }

  function filterPoisForSearch(query) {
    const rawQ = String(query || "").trim();
    const correction = searchQueryCorrection(rawQ);
    const effectiveQuery = (correction && normSearch(rawQ) !== normSearch(correction))
      ? correction
      : rawQ;
    const q = normSearch(effectiveQuery);
    // Sem texto: não monta centenas de sugestões (evita salto de scroll no mobile e cursor resetado).
    if (!q) return [];
    const onCampus = isCampusFloor(state.activeLevel);
    return (G.pois || []).filter((p) => {
      enrichPoiMeta(p);
      if (!isSearchablePoi(p)) return false;
      const poiLvl = p.level || "L00";
      // No campus (T…L06): lista todos os andares publicados, não só o andar atual
      if (onCampus && !isCampusFloor(poiLvl)) return false;
      if (state.searchLevel && state.searchLevel !== "all" && poiLvl !== state.searchLevel) {
        return false;
      }
      // filtro de grupo
      const g = state.searchGroup || "all";
      if (g === "floor") {
        if (poiLvl !== state.activeLevel) return false;
      } else if (g !== "all") {
        if ((p.group || searchGroupFromPoi(p.rawId, p.name, p.cat)) !== g) return false;
      }
      return poiMatchesSearch(p, effectiveQuery);
    })
      .map((p) => ({ p, score: poiSearchScore(p, effectiveQuery) }))
      .sort((a, b) => b.score - a.score || (a.p.searchLabel || a.p.name).localeCompare(b.p.searchLabel || b.p.name, "pt-BR"))
      .map((x) => x.p);
  }

  /** Preserva posição do cursor após re-render da lista (scroll/layout no mobile resetava o caret). */
  function withSearchInputCaret(input, fn) {
    if (!input) {
      fn();
      return;
    }
    const start = input.selectionStart;
    const end = input.selectionEnd;
    fn();
    if (document.activeElement !== input) return;
    requestAnimationFrame(() => {
      if (document.activeElement !== input) return;
      try {
        const len = input.value.length;
        const nextStart = Math.min(typeof start === "number" ? start : len, len);
        const nextEnd = Math.min(typeof end === "number" ? end : len, len);
        input.setSelectionRange(nextStart, nextEnd);
      } catch (_) {}
    });
  }

  function renderSuggest(which, query) {
    state.activeField = which;
    const listEl = which === "origin" ? el.originList : el.destList;
    const items = filterPoisForSearch(query);
    const correction = searchQueryCorrection(query);
    const showCorrection = correction
      && normSearch(query)
      && normSearch(query) !== normSearch(correction);

    let html = "";
    if (showCorrection) {
      html += `<li class="s-hint" role="presentation"><span class="s-cat">Você quis dizer: <strong>${correction}</strong>?</span></li>`;
    }
    if (which === "origin") {
      html += `<li data-here="1" aria-selected="false"><span class="s-ico"><svg viewBox="0 0 24 24" width="16" height="16"><circle cx="12" cy="12" r="3" fill="currentColor"/><circle cx="12" cy="12" r="8" fill="none" stroke="currentColor" stroke-width="1.6"/></svg></span><span><span class="s-name">Estou aqui (marcar no mapa)</span><span class="s-cat">Usar minha posição</span></span></li>`;
    }
    if (!items.length && which !== "origin") {
      listEl.innerHTML = normSearch(query)
        ? `<li class="s-empty">Nenhum local encontrado para “${String(query).trim()}”.</li>`
        : `<li class="s-empty">Digite para buscar um local.</li>`;
      listEl.hidden = false;
      return;
    }
    if (!items.length && which === "origin") {
      if (normSearch(query)) {
        html += `<li class="s-empty">Nenhum local encontrado para “${String(query).trim()}”.</li>`;
      }
      listEl.innerHTML = html || `<li class="s-empty">Nenhum local neste filtro.</li>`;
      listEl.hidden = false;
      const hereOnly = listEl.querySelector("li[data-here]");
      if (hereOnly) hereOnly.addEventListener("mousedown", (e) => { e.preventDefault(); startPlacingHere(); });
      return;
    }
    html += items.map((p) => {
      const label = poiSuggestTitle(p);
      const meta = poiSuggestMeta(p);
      return `
      <li data-id="${p.id}" aria-selected="false">
        <span class="s-ico">${iconFor()}</span>
        <span><span class="s-name">${label}</span><span class="s-cat">${meta}</span></span>
      </li>`;
    }).join("");
    listEl.innerHTML = html;
    listEl.hidden = false;

    listEl.querySelectorAll("li[data-id]").forEach((li) => {
      li.addEventListener("mousedown", (e) => {
        e.preventDefault();
        const poi = G.pois.find((p) => p.id === li.dataset.id);
        setField(which, poi);
      });
    });
    const hereLi = listEl.querySelector("li[data-here]");
    if (hereLi) hereLi.addEventListener("mousedown", (e) => { e.preventDefault(); startPlacingHere(); });
  }

  function closeSuggest() { el.originList.hidden = true; el.destList.hidden = true; }

  /* ---- Mobile: painel no topo quando o teclado abre ---- */
  let mobileSearchExitTimer = null;

  function isMobileLayout() {
    return window.innerWidth <= 860;
  }

  function syncVisualViewportVars() {
    const vv = window.visualViewport;
    const top = vv ? vv.offsetTop : 0;
    const height = vv ? vv.height : window.innerHeight;
    document.documentElement.style.setProperty("--vv-top", `${Math.max(0, top)}px`);
    document.documentElement.style.setProperty("--vv-height", `${Math.max(180, height)}px`);
  }

  function enterMobileSearchMode() {
    if (!isMobileLayout() || !el.panel) return;
    clearTimeout(mobileSearchExitTimer);
    const wasSearching = el.panel.classList.contains("is-searching");
    if (!el.panel.classList.contains("open")) setPanelOpen(true);
    el.panel.classList.add("is-searching");
    document.body.classList.add("is-searching-mobile");
    syncVisualViewportVars();
    // scrollIntoView só na 1ª entrada — repetir a cada tecla no mobile resetava o cursor
    if (!wasSearching) {
      requestAnimationFrame(() => {
        const active = document.activeElement;
        if (active && el.panel.contains(active) && typeof active.scrollIntoView === "function") {
          active.scrollIntoView({ block: "nearest", inline: "nearest" });
        }
      });
    }
  }

  function exitMobileSearchMode() {
    if (!el.panel) return;
    clearTimeout(mobileSearchExitTimer);
    el.panel.classList.remove("is-searching");
    document.body.classList.remove("is-searching-mobile");
  }

  function scheduleExitMobileSearchMode() {
    clearTimeout(mobileSearchExitTimer);
    mobileSearchExitTimer = setTimeout(() => {
      const active = document.activeElement;
      if (active === el.originInput || active === el.destInput) return;
      if (active && el.panel?.contains(active) && active.closest?.(".suggest")) return;
      exitMobileSearchMode();
    }, 180);
  }

  function initMobileViewport() {
    syncVisualViewportVars();
    const onVV = () => {
      syncVisualViewportVars();
      if (isMobileLayout() && el.panel?.classList.contains("is-searching")) {
        // se o teclado fechou e nenhum campo tem foco, sai do modo busca
        const active = document.activeElement;
        const focused = active === el.originInput || active === el.destInput;
        if (!focused) exitMobileSearchMode();
      }
      if (document.body.classList.contains("is-navigating") && isMobileLayout()) {
        syncNavLayoutMetrics();
        fitSoon(() => fitRouteInView(state.route, { navMode: true, preferActiveLeg: true, fillWidth: true }));
      }
    };
    if (window.visualViewport) {
      window.visualViewport.addEventListener("resize", onVV);
      window.visualViewport.addEventListener("scroll", onVV);
    }
    window.addEventListener("resize", onVV);
  }


  function refreshOpenSuggest() {
    if (state.activeField === "origin" && el.originList && !el.originList.hidden) {
      withSearchInputCaret(el.originInput, () => renderSuggest("origin", el.originInput.value));
    } else if (state.activeField === "dest" && el.destList && !el.destList.hidden) {
      withSearchInputCaret(el.destInput, () => renderSuggest("dest", el.destInput.value));
    }
  }

  function searchGroupLabel(id) {
    const g = (CONFIG.searchGroups || []).find((x) => x.id === id);
    return g?.label || "Áreas";
  }

  function updateAreaChrome() {
    const active = state.searchGroup || "all";
    const label = searchGroupLabel(active);
    if (el.areaBtn) {
      el.areaBtn.title = active === "all" ? "Filtrar áreas" : `Área: ${label}`;
      el.areaBtn.setAttribute("aria-label", active === "all" ? "Filtrar áreas" : `Filtrar áreas · ${label}`);
    }
    if (el.areaBadge) el.areaBadge.hidden = active === "all";
  }

  function closeAreaMenu() {
    state.areaMenuOpen = false;
    if (el.areaMenu) el.areaMenu.hidden = true;
    if (el.areaBtn) el.areaBtn.setAttribute("aria-expanded", "false");
  }

  function renderAreaMenu() {
    if (!el.areaMenu) return;
    const groups = CONFIG.searchGroups || [];
    el.areaMenu.innerHTML = groups.map((g) => {
      const selected = g.id === state.searchGroup;
      return `<li role="option">
        <button type="button" class="floor-menu__item" data-group="${g.id}"
          aria-selected="${selected ? "true" : "false"}">
          <span>${g.label}</span>
          ${selected ? `<span class="floor-menu__meta">Ativo</span>` : ""}
        </button>
      </li>`;
    }).join("");
    el.areaMenu.querySelectorAll("[data-group]").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.preventDefault();
        setSearchGroup(btn.dataset.group);
        closeAreaMenu();
      });
    });
  }

  function toggleAreaMenu() {
    if (state.floorMenuOpen) closeFloorMenu();
    state.areaMenuOpen = !state.areaMenuOpen;
    if (el.areaMenu) el.areaMenu.hidden = !state.areaMenuOpen;
    if (el.areaBtn) el.areaBtn.setAttribute("aria-expanded", state.areaMenuOpen ? "true" : "false");
    if (state.areaMenuOpen) renderAreaMenu();
  }

  function setSearchGroup(groupId) {
    state.searchGroup = groupId || "all";
    updateAreaChrome();
    refreshOpenSuggest();
  }

  function initBrowseFilters() {
    updateAreaChrome();
    if (el.searchLevelSelect) {
      const floors = visibleFloors().filter((f) => isCampusFloor(f.id));
      state.searchLevel = state.searchLevel || "all";
      el.searchLevelSelect.innerHTML = [
        `<option value="all">Todos os níveis</option>`,
        ...floors.map((f) => `<option value="${f.id}">${f.id} — ${f.title}</option>`),
      ].join("");
      if (!el.searchLevelSelect.querySelector(`option[value="${state.searchLevel}"]`)) {
        state.searchLevel = "all";
      }
      el.searchLevelSelect.value = state.searchLevel || "all";
      el.searchLevelSelect.addEventListener("change", () => {
        state.searchLevel = el.searchLevelSelect.value || "all";
        refreshOpenSuggest();
      });
    }
  }

  /* ============================================================ "ESTOU AQUI" */
  function startPlacingHere() {
    state.placingHere = true;
    closeSuggest();
    el.viewport.style.cursor = "crosshair";
    if (isMobileLayout()) setPanelOpen(false);
    toast("Toque no mapa onde você está.");
  }

  function placeHere(p) {
    const lvl = state.activeLevel || "L00";
    // Clique no mapa de andar usa viewBox com offset (ex.: L01 y≈385+)
    const maxSnap = lvl === "L00" ? 120 : 55;
    let snap = null;

    // 1) Nó amarelo do andar atual (limite curto = preciso)
    if (state.navGraph && globalThis.NearestGraphPoint?.findNearestValidNavNode) {
      const hit = NearestGraphPoint.findNearestValidNavNode(p, state.navGraph, {
        level: lvl,
        maxDistanceSvg: maxSnap,
        metersPerUnit: G.metersPerUnit || CONFIG.metersPerUnit || 0.35,
      });
      if (hit?.id && hit.node) {
        snap = { id: hit.id, x: hit.node.x, y: hit.node.y, d: hit.distanceSvg };
      }
    }

    // 2) Projeção na edge caminhável do andar (corredor entre nós)
    if (!snap && state.navGraph && globalThis.NearestGraphPoint?.findNearestWalkableEdge) {
      const edgeHit = NearestGraphPoint.findNearestWalkableEdge(p, state.navGraph, {
        level: lvl,
        maxDistanceSvg: maxSnap,
        metersPerUnit: G.metersPerUnit || CONFIG.metersPerUnit || 0.35,
      });
      if (edgeHit?.nearestNodeId) {
        const node = state.navGraph.nodesById.get(edgeHit.nearestNodeId);
        if (node) {
          snap = {
            id: edgeHit.nearestNodeId,
            x: node.x,
            y: node.y,
            d: edgeHit.distanceSvg,
          };
        }
      }
    }

    // 3) Fallback NavigationRouter (ainda com limite)
    if (!snap && state.navGraph && globalThis.NavigationRouter) {
      const nid = NavigationRouter.nearestNodeId(p, state.navGraph, { level: lvl });
      const node = nid && state.navGraph.nodesById.get(nid);
      if (node && isFinite(node.x) && isFinite(node.y)) {
        const d = Math.hypot(p.x - node.x, p.y - node.y);
        if (d <= maxSnap * 1.35) snap = { id: nid, x: node.x, y: node.y, d };
      }
    }

    // 4) Malha SVG local (L00)
    if (!snap && lvl === "L00") {
      const routable = nearestRoutableNode(p, true, maxSnap) || nearestRoutableNode(p, false, maxSnap);
      snap = routable
        ? { id: routable.id, x: routable.n.x, y: routable.n.y, d: routable.d }
        : null;
      if (snap?.id) attachNodeToMeshSafe(snap.id, true);
    }

    if (!snap?.id) {
      toast("Toque mais perto de um corredor ou porta deste andar.");
      return;
    }

    // Origem alinhada ao nó (rota precisa); clique só escolhe qual nó
    state.here = {
      id: "__here__",
      name: "Estou aqui",
      x: snap.x,
      y: snap.y,
      iconX: p.x,
      iconY: p.y,
      anchor: snap.id,
      snap: { x: snap.x, y: snap.y },
      cat: "acesso",
      level: lvl,
      navNodeIds: [snap.id],
    };
    state._ignoreNextPoiClick = true;
    setField("origin", state.here);
    // LP: ponto azul “hereMarker” permanece oculto
    if (el.hereMarker) {
      el.hereMarker.hidden = true;
      el.hereMarker.setAttribute("hidden", "");
      el.hereMarker.setAttribute("visibility", "hidden");
      el.hereMarker.style.display = "none";
    }
    state.placingHere = false;
    el.viewport.style.cursor = "";
    toast("Posição marcada neste andar. Agora escolha o destino.");
  }

  /* ============================================================ PAN / ZOOM
     Zoom altera width/height do SVG (vetor nítido), NÃO usa scale() CSS
     — scale() CSS rasteriza e deixa o mapa borrado em zoom. */
  const mapCtrl = globalThis.PIBMapMapController?.create?.({
    state,
    G,
    el,
    refreshRouteMarkerScales,
    mobileMapPadding,
  }) || {};
  const apply = mapCtrl.apply || function () {};
  const clamp = mapCtrl.clamp || function () {};
  const fit = mapCtrl.fit || function () {};
  const fitSoon = mapCtrl.fitSoon || function (fn) { requestAnimationFrame(() => requestAnimationFrame(fn || fit)); };
  const zoomAt = mapCtrl.zoomAt || function () {};
  const viewportPoint = mapCtrl.viewportPoint || function () { return { x: 0, y: 0 }; };

  function fitToPoints(pts, opts = {}) {
    if (!pts?.length) return;
    const r = el.viewport.getBoundingClientRect();
    if (!r.width || !r.height) return;

    const xs = pts.map((p) => p.x).filter(isFinite);
    const ys = pts.map((p) => p.y).filter(isFinite);
    if (!xs.length || !ys.length) return;

    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);
    const minSpan = opts.minSpan ?? 64;
    const w = Math.max(minSpan, maxX - minX);
    const h = Math.max(minSpan, maxY - minY);

    const mobile = innerWidth <= 860;
    let padLeft;
    let padRight;
    let padTop;
    let padBottom;
    if (mobile) {
      const mp = mobileMapPadding(opts);
      padLeft = mp.padLeft;
      padRight = mp.padRight;
      padTop = mp.padTop;
      padBottom = mp.padBottom;
    } else {
      const padX = opts.padX ?? 100;
      padLeft = padRight = padX;
      padTop = opts.padTop ?? 100;
      padBottom = opts.padBottom ?? (opts.navMode ? 200 : 100);
    }

    const availW = Math.max(60, r.width - padLeft - padRight);
    const availH = Math.max(60, r.height - padTop - padBottom);
    const scaleW = availW / w;
    const scaleH = availH / h;
    const widthMargin = opts.widthMargin ?? (opts.fillWidth ? 0.94 : 0.9);
    let nextScale;
    if (opts.fillWidth) {
      // Prioriza preencher a largura útil (como apps de navegação).
      nextScale = scaleW * widthMargin;
      const heightCap = scaleH * 1.06;
      if (nextScale > heightCap && h > w * 1.25) nextScale = heightCap;
    } else {
      nextScale = Math.min(scaleW, scaleH) * widthMargin;
    }
    nextScale = Math.min(
      state.maxScale,
      Math.max(state.minScale * 0.35, nextScale),
    );
    state.scale = nextScale;

    // viewBox dos andares começa em (vbX, vbY) — o pan opera no espaço local do SVG
    const vbX = G.vbX || 0;
    const vbY = G.vbY || 0;
    const midX = (minX + maxX) / 2 - vbX;
    const midY = (minY + maxY) / 2 - vbY;
    const focusCX = padLeft + availW / 2;
    const focusCY = padTop + availH / 2;
    state.panX = focusCX - midX * state.scale;
    state.panY = focusCY - midY * state.scale;
    clamp();
    apply();
  }

  function activeLegPoints(route = state.route) {
    if (!route) return [];
    const { points } = routePointsForLevel(route, state.activeLevel);
    return points.length >= 2 ? points : [];
  }

  /** Enquadra a rota (preferência: trecho do andar ativo). */
  function fitRouteInView(route, opts = {}) {
    const mobile = innerWidth <= 860;
    const fillWidth = opts.fillWidth ?? mobile;
    let pts = ensureActiveFloorRoutePoints().filter((p) => p && isFinite(p.x) && isFinite(p.y));
    if (pts.length < 2 && opts.preferActiveLeg !== false) {
      pts = activeLegPoints(route);
    }
    const oLvl = poiLevel(state.origin);
    const dLvl = poiLevel(state.dest);
    if (pts.length < 2 && oLvl === dLvl && oLvl === state.activeLevel) {
      pts = (route?.points || []).filter((p) => p && isFinite(p.x) && isFinite(p.y));
    }
    if (pts.length >= 1) {
      const extras = [];
      if (state.origin?.snap && (!state.origin.level || poiLevel(state.origin) === state.activeLevel)) {
        extras.push(state.origin.snap);
      } else if (state.origin && isFinite(state.origin.x) && poiLevel(state.origin) === state.activeLevel) {
        extras.push(state.origin);
      }
      if (state.dest?.snap && (!state.dest.level || poiLevel(state.dest) === state.activeLevel)) {
        extras.push(state.dest.snap);
      } else if (state.dest && isFinite(state.dest.x) && poiLevel(state.dest) === state.activeLevel) {
        extras.push(state.dest);
      }
      fitToPoints(pts.concat(extras), { ...opts, fillWidth });
      return;
    }
    const leg = (route?.legs || []).find((l) => l.level === state.activeLevel) || route?.legs?.[0];
    if (leg?.points?.length) fitToPoints(leg.points, { ...opts, fillWidth });
  }

  /** Zoom no trecho atual da navegação (com olhar um pouco à frente). */
  function fitNavSegment() {
    const p = navViewPoints();
    if (!p || p.length < 2) return;
    const total = p.length - 1;
    const i = Math.max(0, Math.min(state.navIdx, total - 1));
    const ahead = Math.min(p.length - 1, i + 3);
    const pts = p.slice(i, ahead + 1);
    if (pts.length < 2 && p[i + 1]) pts.push(p[i + 1]);
    fitToPoints(pts, {
      navMode: true,
      minSpan: innerWidth <= 860 ? 56 : 48,
      fillWidth: innerWidth <= 860,
    });
  }


  /* ============================================================ NAVEGACAO / BUSSOLA */
  function bearingBetween(a, b) {
    // angulo em graus, 0 = para cima (norte do mapa), sentido horario
    return (Math.atan2(b.x - a.x, -(b.y - a.y)) * 180) / Math.PI;
  }

  function navSegments() {
    const p = navViewPoints();
    return Math.max(0, p.length - 1);
  }

  function enterNav() {
    if (!canStartNavigation()) return;
    if (navSegments() < 1) { toast("Rota inválida para navegação."); return; }
    state.navIdx = 0;

    const ensureStartFloor = () => {
      const oLvl = poiLevel(state.origin);
      const dLvl = poiLevel(state.dest);
      return ensureNavGraphForTrip(oLvl, dLvl).then(() => {
        rebuildRouteLegs(state.route);
        const viewLevel = routeInitialViewLevel(state.route, oLvl, dLvl);
        if (state.activeLevel === viewLevel) return;
        return setActiveLevel(viewLevel, { silent: true, keepTrip: true });
      });
    };

    ensureStartFloor().then(() => {
    state.navIdx = 0;
    paintActiveRouteLeg();
    if (isMobileLayout()) {
      el.panel.classList.add("open", "panel--nav-compact");
      el.originInput?.setAttribute("readonly", "readonly");
      el.destInput?.setAttribute("readonly", "readonly");
      if (el.summary) el.summary.hidden = false;
    } else {
      el.panel.classList.remove("open");
    }
    el.navOverlay.hidden = false;
    el.navOverlay.classList.add("is-open");
    el.navOverlay.setAttribute("aria-hidden", "false");
    document.body.classList.add("is-navigating");
    if (el.routePick) el.routePick.hidden = true;
    if (el.routeOptions) {
      el.routeOptions.hidden = true;
    }
    if (el.routePickCount) el.routePickCount.hidden = true;
    state.routePickOpen = false;
    state.userLocation?.setFollowMode?.("off");
    state.userLocation?.hidePuck?.();
    if (state.origin?.id === "__here__") {
      state.userLocation?.setFollowMode?.("follow");
      state.userLocation?.startFollowing?.().catch(() => {
        state.userLocation?.start?.({ silent: true });
      });
    }
    updateNavBtn();
    requestOrientation();
    requestAnimationFrame(() => {
      syncNavLayoutMetrics();
      paintActiveRouteLeg();
      updateNav({ fitCamera: true, fitFullRoute: true });
    });
    });
  }

  function exitNav(msg) {
    state.gpsOrientation?.getTracking()?.stop();
    state.gpsOrientation?.setGpsButtonState?.("IDLE");
    el.navOverlay.hidden = true;
    el.navOverlay.classList.remove("is-open");
    el.navOverlay.setAttribute("aria-hidden", "true");
    document.body.classList.remove("is-navigating");
    el.panel.classList.remove("panel--nav-compact");
    el.originInput?.removeAttribute("readonly");
    el.destInput?.removeAttribute("readonly");
    syncNavLayoutMetrics();
    state.navIdx = 0;
    updateNavBtn();
    if (msg) toast(msg);
  }

  function navPrev() {
    if (!state.route) return;
    state.navIdx = Math.max(0, state.navIdx - 1);
    updateNav({ fitCamera: true });
  }

  function navNext() {
    if (!state.route) return;
    const total = navSegments();
    if (total < 1) {
      if (advanceToNextRouteLeg()) return;
      exitNav("Rota inválida.");
      return;
    }
    if (state.navIdx >= total - 1) {
      if (advanceToNextRouteLeg()) return;
      setRouteVisualCompleted(true);
      paintActiveRouteLeg();
      exitNav("Você chegou ao destino!");
      return;
    }
    state.navIdx += 1;
    syncRouteFloorToNavProgress(state.navIdx);
    updateNav({ fitCamera: true });
  }

  function updateNav(opts = {}) {
    const p = navViewPoints();
    if (!p || p.length < 2) {
      el.navStepText.textContent = "Sem trechos na rota";
      el.navDistText.textContent = "—";
      el.navHint.textContent = "Saia e trace a rota novamente.";
      return;
    }

    const total = p.length - 1;
    const i = Math.max(0, Math.min(state.navIdx, total - 1));
    state.navIdx = i;
    const from = p[i];
    const to = p[i + 1];
    if (!from || !to) return;

    const mapBearing = bearingBetween(from, to);
    const arrowRot = `rotate(${mapBearing - state.heading}deg)`;
    el.compassArrow.style.transform = arrowRot;
    if (el.navDirArrow) el.navDirArrow.style.transform = arrowRot;

    const segLen = dist(from, to);
    const remaining = navRemainingLength(i);
    const isLast = i >= total - 1;
    if (isLast) {
      el.navStepText.textContent = `Chegando: ${state.dest?.name || "destino"}`;
    } else {
      const t = turnLabel(p[i], p[i + 1], p[i + 2] || to);
      el.navStepText.textContent = t.txt;
    }
    el.navDistText.textContent = `${fmtMeters(segLen)} · trecho ${i + 1} de ${total}`;
    if (el.navTimeRemain) el.navTimeRemain.textContent = fmtNavTimeShort(remaining);
    if (el.navDistRemain) el.navDistRemain.textContent = fmtMeters(remaining);
    if (el.navProgressFill) {
      const pct = total > 0 ? Math.round((i / total) * 100) : 0;
      el.navProgressFill.style.width = `${pct}%`;
    }
    el.navHint.textContent = state._hasOrientation
      ? "Aponte o celular à frente: a seta indica a direção."
      : "Bússola indisponível — a seta usa o norte do mapa.";

    el.navPrev.disabled = i <= 0;
    el.navNext.textContent = isLast ? "Chegar" : "Próximo";

    if (opts.fitCamera) {
      fitSoon(() => {
        syncNavLayoutMetrics();
        fitNavSegment();
      });
    } else if (isMobileLayout()) {
      syncNavLayoutMetrics();
    }
  }

  function requestOrientation() {
    if (state._orientBound) return;
    const handler = (ev) => {
      let h = ev.webkitCompassHeading != null
        ? ev.webkitCompassHeading
        : (ev.alpha != null ? 360 - ev.alpha : null);
      if (h != null) {
        state.heading = h;
        state._hasOrientation = true;
        if (el.navOverlay.classList.contains("is-open")) updateNav();
      }
    };
    const bindOrient = () => {
      state._orientBound = true;
      addEventListener("deviceorientationabsolute", handler, true);
      addEventListener("deviceorientation", handler, true);
    };
    if (typeof DeviceOrientationEvent !== "undefined" && typeof DeviceOrientationEvent.requestPermission === "function") {
      DeviceOrientationEvent.requestPermission().then((s) => { if (s === "granted") bindOrient(); }).catch(() => {});
    } else if (typeof DeviceOrientationEvent !== "undefined") {
      bindOrient();
    }
  }

  /* ============================================================ ANDARES (B01–B02, L00–L07) */
  function levelFromId(id) {
    const s = String(id || "");
    const m =
      s.match(/(?:^|_)(B0[12]|L0[0-7])(?=_|$)/i) ||
      s.match(/\b(B0[12]|L0[0-7])\b/i);
    return m ? m[1].toUpperCase() : null;
  }

  function floorById(id) {
    return (CONFIG.floors || []).find((f) => f.id === id) || null;
  }

  /** Andares exibidos ao usuário (oculta L07 etc.). */
  function visibleFloors() {
    return (CONFIG.floors || []).filter((f) => !f.hidden);
  }

  function poisForActiveLevel() {
    return (G.pois || []).filter((p) => (p.level || "L00") === state.activeLevel && isSearchablePoi(p));
  }

  function closeFloorMenu() {
    state.floorMenuOpen = false;
    if (el.floorMenu) el.floorMenu.hidden = true;
    if (el.floorBtn) el.floorBtn.setAttribute("aria-expanded", "false");
  }

  function toggleFloorMenu() {
    if (state.areaMenuOpen) closeAreaMenu();
    state.floorMenuOpen = !state.floorMenuOpen;
    if (el.floorMenu) el.floorMenu.hidden = !state.floorMenuOpen;
    if (el.floorBtn) el.floorBtn.setAttribute("aria-expanded", state.floorMenuOpen ? "true" : "false");
    if (state.floorMenuOpen) renderFloorMenu();
  }

  function renderFloorMenu() {
    if (!el.floorMenu) return;
    const floors = visibleFloors();
    el.floorMenu.innerHTML = floors.map((f) => {
      const selected = f.id === state.activeLevel;
      const available = !!(f.mapUrl || f.ready);
      const meta = floorMenuMeta(f);
      return `<li role="option">
        <button type="button" class="floor-menu__item${available ? "" : " floor-menu__item--soon"}" data-floor="${f.id}"
          aria-selected="${selected ? "true" : "false"}">
          <span class="floor-menu__text">
            <span class="floor-menu__title">${f.id} — ${f.title}</span>
            ${f.subtitle ? `<span class="floor-menu__sub">${f.subtitle}</span>` : ""}
          </span>
          ${meta ? `<span class="floor-menu__meta">${meta}</span>` : ""}
        </button>
      </li>`;
    }).join("");
    el.floorMenu.querySelectorAll("[data-floor]").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.preventDefault();
        setActiveLevel(btn.dataset.floor);
        closeFloorMenu();
      });
    });
  }

  function updateFloorChrome() {
    const floor = floorById(state.activeLevel) || { id: "L00", title: "Térreo", ready: true };
    if (el.floorHint) {
      el.floorHint.textContent = `${floor.id} — ${floor.title}`;
    }
    if (el.floorBtn) {
      el.floorBtn.title = `Escolha o Andar · atual: ${floor.id}`;
      el.floorBtn.setAttribute("aria-label", `Escolha o Andar · atual ${floor.id}`);
    }
    if (el.floorBanner) {
      // Banner só para andares sem SVG; L01 (mapa base) já tem planta
      if (floor.ready || floor.mapUrl) {
        el.floorBanner.hidden = true;
      } else {
        el.floorBanner.hidden = false;
        if (el.floorBannerTitle) el.floorBannerTitle.textContent = `${floor.label} — ${floor.title}`;
        if (el.floorBannerMsg) {
          el.floorBannerMsg.textContent = "Mapa deste andar em preparação. As salas serão habilitadas quando o SVG for publicado.";
        }
      }
    }
  }

  /** Ícones no SVG do campus: usa mapLevel (Espaço Servir B01 continua visível no L00). */
  function applyFloorVisibility() {
    const host = state.floorViews.L00 || el.svgHost?.querySelector("#mapaSVG");
    if (!host) return;
    const active = state.activeLevel || "L00";
    host.querySelectorAll("[data-poi]").forEach((node) => {
      const poi = G.pois.find((p) => p.id === node.getAttribute("data-poi"));
      const mapLvl = poi?.mapLevel || "L00";
      const on = active === "L00" && mapLvl === "L00";
      node.style.display = on ? "" : "none";
      node.style.pointerEvents = on ? "all" : "none";
      if (!on) {
        node.removeAttribute("data-hover");
        node.removeAttribute("data-selected");
      }
    });
    host.style.opacity = "1";
    host.style.filter = "none";
  }

  function setMapViewBox(vbW, vbH, vbX = 0, vbY = 0) {
    G.vbW = vbW;
    G.vbH = vbH;
    G.vbX = vbX;
    G.vbY = vbY;
    el.overlay.setAttribute("viewBox", `${vbX} ${vbY} ${vbW} ${vbH}`);
    el.overlay.removeAttribute("width");
    el.overlay.removeAttribute("height");
    el.overlay.setAttribute("preserveAspectRatio", "xMidYMid meet");
  }

  async function ensureFloorSvg(floor) {
    if (!floor?.mapUrl) return null;
    if (state.floorViews[floor.id]) return state.floorViews[floor.id];
    const res = await fetch(floor.mapUrl, { cache: "no-store" });
    if (!res.ok) throw new Error(`Falha ao carregar ${floor.mapUrl}: HTTP ${res.status}`);
    const text = await res.text();
    const doc = new DOMParser().parseFromString(text, "image/svg+xml");
    if (doc.querySelector("parsererror") || !doc.documentElement.matches("svg")) {
      throw new Error(`SVG inválido: ${floor.mapUrl}`);
    }
    const svg = document.importNode(doc.documentElement, true);
    svg.removeAttribute("width");
    svg.removeAttribute("height");
    svg.setAttribute("preserveAspectRatio", "xMidYMid meet");
    svg.style.display = "block";
    svg.style.shapeRendering = "geometricPrecision";
    svg.setAttribute("id", `mapaSVG_${floor.id}`);
    svg.dataset.level = floor.id;

    const vb = (svg.getAttribute("viewBox") || "0 0 1000 600").split(/[\s,]+/).map(Number);
    const vbX = vb[0] || 0;
    const vbY = vb[1] || 0;
    const vbW = vb[2] || 1000;
    const vbH = vb[3] || 600;
    // Só injeta fundo se o SVG não trouxer um (ex.: L01 já tem #fffef5)
    const hasOwnBg = !!svg.querySelector(
      "[data-floor-bg], #L01_adm_map_background > rect, #L01_adm_map_bacground > rect, #L02_adm_map_background > rect, #L03_adm_map_background > rect, #L04_adm_map_background > rect, #L05_adm_map_background > rect, #L06_adm_map_background > rect, #B01_map_background > rect, #B02_map_background > rect, rect.cls-4, rect.l01-bg, rect.l02-bg, rect.l03-bg, rect.l04-bg, rect.l05-bg, rect.l06-bg, rect.b01-bg, rect.b02-bg",
    );
    if (!hasOwnBg) {
      const bg = document.createElementNS(NS, "rect");
      bg.setAttribute("data-floor-bg", "true");
      bg.setAttribute("x", String(vbX));
      bg.setAttribute("y", String(vbY));
      bg.setAttribute("width", String(vbW));
      bg.setAttribute("height", String(vbH));
      bg.setAttribute("fill", "#0a0a0a");
      const first = svg.firstElementChild;
      if (first && first.tagName.toLowerCase() === "defs" && first.nextSibling) {
        svg.insertBefore(bg, first.nextSibling);
      } else if (first) {
        svg.insertBefore(bg, first);
      } else {
        svg.appendChild(bg);
      }
    }

    state.floorViews[floor.id] = svg;
    state.floorMeta[floor.id] = { vbX, vbY, vbW, vbH };

    // Andares internos: esconder camadas técnicas (poi/node/edge) se existirem
    ["L01_POI", "L01_NODES", "L01_EDGES", "L02_POI", "L02_NODES", "L02_EDGES", "L03_POI", "L03_NODES", "L03_EDGES", "L04_POI", "L04_NODES", "L04_EDGES", "L05_POI", "L05_NODES", "L05_EDGES", "L06_POI", "L06_NODES", "L06_EDGES", "B01_POI", "B01_NODES", "B01_EDGES", "B02_POI", "B02_NODES", "B02_EDGES", "NODES", "EDGES"].forEach((id) => {
      const g = svg.getElementById(id);
      if (!g) return;
      g.style.display = "none";
      g.style.visibility = "hidden";
      g.style.pointerEvents = "none";
      g.setAttribute("aria-hidden", "true");
    });

    bindFloorPois(svg, floor.id);
    applyBasementFloorBackground(svg, floor.id);
    parseFloorWalls(svg, floor.id);

    return svg;
  }

  /** B01/B02: fundo branco opaco (evita transparência sobre o mapa de rua). */
  function applyBasementFloorBackground(svg, floorId) {
    if (floorId !== "B01" && floorId !== "B02") return;
    const fill = "#ffffff";
    svg.querySelectorAll(
      "[data-floor-bg], .b01-bg, .b02-bg, #B01_map_background > rect, #B02_map_background > rect",
    ).forEach((node) => {
      node.setAttribute("fill", fill);
    });
    const styleEl = svg.querySelector("defs style");
    if (styleEl?.textContent) {
      styleEl.textContent = styleEl.textContent
        .replace(/\.b01-bg\s*\{[^}]*\}/g, `.b01-bg { fill: ${fill}; }`)
        .replace(/\.b02-bg\s*\{[^}]*\}/g, `.b02-bg { fill: ${fill}; }`);
    }
  }

  async function showFloorMap(levelId) {
    const floor = floorById(levelId) || floorById("L00");
    const isCampus = !floor.mapUrl || floor.id === "L00";

    if (isCampus) {
      const campus = state.floorViews.L00;
      if (!campus) return;
      if (el.svgHost.firstChild !== campus) {
        el.svgHost.innerHTML = "";
        el.svgHost.appendChild(campus);
      }
      el.svgHost.dataset.level = "L00";
      el.svgHost.classList.remove("svg-host--floor");
      const meta = state.floorMeta.L00 || { vbX: 0, vbY: 0, vbW: G.vbW, vbH: G.vbH };
      setMapViewBox(meta.vbW, meta.vbH, meta.vbX || 0, meta.vbY || 0);
      applyFloorVisibility();
      if (state.route) {
        syncMapViewBeforeRoutePaint();
        rebuildRouteLegs(state.route);
        hydrateRouteLegPoints(state.route, "L00");
        paintActiveRouteLeg();
        fitSoon(() => {
          syncMapViewBeforeRoutePaint();
          paintActiveRouteLeg();
          if (document.body.classList.contains("is-navigating")) fitNavSegment();
          else fitRouteInView(state.route, { navMode: false, preferActiveLeg: true });
        });
      } else {
        fitSoon();
      }
      return;
    }

    try {
      const svg = await ensureFloorSvg(floor);
      if (!svg) return;
      if (el.svgHost.firstChild !== svg) {
        el.svgHost.innerHTML = "";
        el.svgHost.appendChild(svg);
      }
      el.svgHost.dataset.level = floor.id;
      el.svgHost.classList.add("svg-host--floor");
      const meta = state.floorMeta[floor.id];
      setMapViewBox(meta.vbW, meta.vbH, meta.vbX || 0, meta.vbY || 0);
      if (state.route) {
        syncMapViewBeforeRoutePaint();
        rebuildRouteLegs(state.route);
        hydrateRouteLegPoints(state.route, floor.id);
        paintActiveRouteLeg();
        fitSoon(() => {
          syncMapViewBeforeRoutePaint();
          paintActiveRouteLeg();
          fitRouteInView(state.route, {
            navMode: !!document.body.classList.contains("is-navigating"),
            preferActiveLeg: true,
          });
        });
      } else {
        clearRoutePaint();
        fitSoon();
      }
    } catch (err) {
      console.error(err);
      toast(`Não foi possível abrir o mapa ${floor.id}`);
      state.activeLevel = "L00";
      await showFloorMap("L00");
      updateFloorChrome();
    }
  }

  async function setActiveLevel(levelId, opts = {}) {
    const floor = floorById(levelId);
    if (!floor) return;
    if (state.activeLevel === floor.id && !opts.force) {
      updateFloorChrome();
      if (state.route) paintActiveRouteLeg();
      return;
    }
    state.activeLevel = floor.id;
    state.liveNav?.rebuildIndexes?.(floor.id);
    state.liveMapMatchEnhancer = state.liveNav?.createMapMatchEnhancer?.() || state.liveMapMatchEnhancer;

    const multiTrip = !!(state.origin && state.dest && poiLevel(state.origin) !== poiLevel(state.dest));
    const keepTrip = !!opts.keepTrip || multiTrip || !!state.route;

    if (!keepTrip) {
      const badOrigin = state.origin && state.origin.id !== "__here__" && poiLevel(state.origin) !== floor.id;
      const badDest = state.dest && poiLevel(state.dest) !== floor.id;
      if (badOrigin || badDest) {
        state.origin = null;
        state.dest = null;
        if (el.originInput) el.originInput.value = "";
        if (el.destInput) el.destInput.value = "";
        clearRoute(true);
        highlightSelected();
      } else if (floor.mapUrl && !state.route) {
        clearRoutePaint();
      }
    }

    await state.ensureNavGraphFloors?.(floor.id);
    if (state.route && state.origin && state.dest) {
      await ensureNavGraphForTrip(poiLevel(state.origin), poiLevel(state.dest));
      rebuildRouteLegs(state.route);
    }
    await showFloorMap(floor.id);
    if (state.route) paintActiveRouteLeg();
    updateFloorChrome();
    closeSuggest();

    const n = poisForActiveLevel().length;
    if (!opts.silent) {
      if (state.route && multiTrip) {
        toast(`${floor.title}: trecho da rota neste andar`);
      } else if (floor.ready && floor.mapUrl) {
        toast(`${floor.id} — ${floor.title}`);
      } else if (floor.ready) {
        toast(`${floor.title} · ${n} ${n === 1 ? "local" : "locais"}`);
      } else {
        toast(`${floor.label} · em breve (mapa ainda não publicado)`);
      }
    }
    if (el.statusHint) {
      if (state.route && multiTrip) {
        const via = routeViaLabel(state.route, poiLevel(state.origin), poiLevel(state.dest));
        renderFloorLocaisHint(`${floor.title}: trecho da rota · ${via}`);
      } else {
        renderFloorLocaisHint();
      }
    }
  }

  /* ============================================================ MOBILE: TOOLS + DRAWER LATERAL */
  function isMobileLayout() {
    return window.matchMedia && window.matchMedia("(max-width: 860px)").matches;
  }

  function mobilePanelInsetPx() {
    if (!isMobileLayout() || !el.panel?.classList.contains("open")) return 0;
    if (document.body.classList.contains("is-navigating")) return 0;
    const w = el.panel.offsetWidth || Math.min(360, innerWidth * 0.88);
    return w + 16;
  }

  function syncNavLayoutMetrics() {
    const root = document.documentElement;
    if (!isMobileLayout() || !document.body.classList.contains("is-navigating")) {
      root.style.removeProperty("--nav-top-h");
      root.style.removeProperty("--nav-bottom-h");
      return;
    }
    const topH = el.panel?.getBoundingClientRect().height || 210;
    const card = el.navOverlay?.querySelector(".nav-card");
    const bottomH = (card?.getBoundingClientRect().height || 220) + 12;
    root.style.setProperty("--nav-top-h", `${Math.ceil(topH)}px`);
    root.style.setProperty("--nav-bottom-h", `${Math.ceil(bottomH)}px`);
  }

  function mobileMapPadding(opts = {}) {
    if (!isMobileLayout()) {
      const pad = opts.padX ?? 36;
      return {
        padLeft: pad,
        padRight: pad,
        padTop: opts.padTop ?? 36,
        padBottom: opts.padBottom ?? 36,
      };
    }
    if (document.body.classList.contains("is-navigating")) {
      const root = document.documentElement;
      const cs = getComputedStyle(root);
      const top = parseFloat(root.style.getPropertyValue("--nav-top-h"))
        || parseFloat(cs.getPropertyValue("--nav-top-h"))
        || 210;
      const bottom = parseFloat(root.style.getPropertyValue("--nav-bottom-h"))
        || parseFloat(cs.getPropertyValue("--nav-bottom-h"))
        || 230;
      const side = opts.fillWidth ? 14 : 44;
      return {
        padLeft: opts.padLeft ?? side,
        padRight: opts.padRight ?? side,
        padTop: opts.padTop ?? Math.ceil(top + 12),
        padBottom: opts.padBottom ?? Math.ceil(bottom + 12),
      };
    }
    const inset = mobilePanelInsetPx();
    const side = opts.fillWidth ? 14 : 12;
    return {
      padLeft: opts.padLeft ?? (side + inset),
      padRight: opts.padRight ?? side,
      padTop: opts.padTop ?? 12,
      padBottom: opts.padBottom ?? (opts.navMode ? 140 : 24),
    };
  }

  function syncMapToolsPlacement() {
    const extras = el.mapToolsExtras;
    const host = el.panelActionsHost;
    const stage = el.stage;
    if (!extras || !host || !stage) return;
    if (isMobileLayout()) {
      if (extras.parentElement !== stage) stage.appendChild(extras);
    } else {
      document.body.classList.remove("panel-drawer-open");
      if (extras.parentElement !== host) host.appendChild(extras);
    }
  }

  function setPanelOpen(open) {
    if (!el.panel) return;
    if (!open) exitMobileSearchMode();
    el.panel.classList.toggle("open", !!open);
    el.panel.style.transform = "";
    el.panel.classList.remove("is-dragging");
    document.body.classList.toggle("panel-drawer-open", isMobileLayout() && !!open);
    if (el.panelToggle) {
      el.panelToggle.setAttribute("aria-expanded", open ? "true" : "false");
    }
    if (isMobileLayout()) fitSoon();
  }

  function togglePanelSheet() {
    if (!el.panel) return;
    setPanelOpen(!el.panel.classList.contains("open"));
  }

  function panelClosedOffset() {
    const w = el.panel?.offsetWidth || 0;
    return Math.max(0, w);
  }

  function initPanelSheetGesture() {
    const panel = el.panel;
    const grab = el.panelGrab;
    if (!panel || !grab) return;

    let active = false;
    let startX = 0;
    let startOffset = 0;
    let lastX = 0;
    let lastT = 0;
    let velocity = 0;
    let moved = false;
    let pointerId = null;

    function canGesture() {
      return isMobileLayout()
        && !panel.classList.contains("is-searching")
        && !document.body.classList.contains("is-navigating");
    }

    function currentOffset() {
      if (panel.classList.contains("open") && !panel.classList.contains("is-dragging")) return 0;
      const t = panel.style.transform;
      const m = /translateX\(([-\d.]+)px\)/.exec(t || "");
      if (m) return +m[1];
      return panel.classList.contains("open") ? 0 : -panelClosedOffset();
    }

    function setOffset(x) {
      const min = -panelClosedOffset();
      const clamped = Math.min(0, Math.max(min, x));
      panel.style.transform = `translateX(${clamped}px)`;
      return clamped;
    }

    function isGrabTarget(target) {
      if (!target || !panel.contains(target)) return false;
      if (target.closest("input, textarea, select, button, a, .suggest, .floor-menu, .trip__actions, .summary, .browse")) {
        return false;
      }
      if (grab.contains(target) || target === grab) return true;
      if (target.closest(".panel__head, .brand")) return true;
      return false;
    }

    function onDown(e) {
      if (!canGesture()) return;
      if (e.pointerType === "mouse" && e.button !== 0) return;
      if (!isGrabTarget(e.target)) return;
      active = true;
      moved = false;
      pointerId = e.pointerId;
      startX = e.clientX;
      lastX = e.clientX;
      lastT = performance.now();
      velocity = 0;
      startOffset = currentOffset();
      panel.classList.add("is-dragging");
      try { panel.setPointerCapture?.(e.pointerId); } catch {}
    }

    function onMove(e) {
      if (!active || (pointerId != null && e.pointerId !== pointerId)) return;
      const x = e.clientX;
      const now = performance.now();
      const dx = x - startX;
      if (Math.abs(dx) > 4) moved = true;
      const dt = Math.max(1, now - lastT);
      velocity = (x - lastX) / dt;
      lastX = x;
      lastT = now;
      setOffset(startOffset + dx);
      if (moved) e.preventDefault();
    }

    function onUp(e) {
      if (!active || (pointerId != null && e.pointerId !== pointerId)) return;
      active = false;
      const wasMoved = moved;
      pointerId = null;
      panel.classList.remove("is-dragging");
      const offset = currentOffset();
      const max = panelClosedOffset() || 1;
      const flickOpen = velocity > 0.45;
      const flickClose = velocity < -0.45;
      let open;
      if (flickOpen) open = true;
      else if (flickClose) open = false;
      else if (!wasMoved) open = !panel.classList.contains("open");
      else open = offset > -max * 0.45;
      panel.style.transform = "";
      setPanelOpen(open);
    }

    panel.addEventListener("pointerdown", onDown);
    window.addEventListener("pointermove", onMove, { passive: false });
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
  }

  /* ============================================================ TEMA (dark/light) */
  function applyTheme(theme) {
    const t = theme === "light" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", t);
    try { localStorage.setItem("mapa-theme", t); } catch {}
    if (el.themeBtn) {
      el.themeBtn.setAttribute("aria-pressed", t === "light");
      el.themeBtn.dataset.theme = t;
      el.themeBtn.title = t === "light" ? "Tema claro (clique p/ escuro)" : "Tema escuro (clique p/ claro)";
    }
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", t === "light" ? "#e8eef8" : "#0a1220");
  }
  function initTheme() {
    let saved = null;
    try { saved = localStorage.getItem("mapa-theme"); } catch {}
    applyTheme(saved || "dark");
  }
  function toggleTheme() {
    const cur = document.documentElement.getAttribute("data-theme");
    applyTheme(cur === "light" ? "dark" : "light");
  }

  /* ============================================================ EVENTOS */
  function bind() {
    initRouteAnimationLayers();
    syncMapToolsPlacement();
    if (el.themeBtn) el.themeBtn.addEventListener("click", (e) => { e.preventDefault(); toggleTheme(); });
    if (el.areaBtn) {
      el.areaBtn.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        toggleAreaMenu();
      });
    }
    if (el.floorBtn) {
      el.floorBtn.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        toggleFloorMenu();
      });
    }
    document.addEventListener("pointerdown", (e) => {
      if (state.areaMenuOpen && el.areaPicker && !e.target.closest("#areaPicker")) closeAreaMenu();
      if (state.floorMenuOpen && el.floorPicker && !e.target.closest("#floorPicker")) closeFloorMenu();
    });
    // inputs autocomplete
    function initSearchField(input) {
      if (!input) return;
      input.setAttribute("dir", "ltr");
      input.setAttribute("autocorrect", "off");
      input.setAttribute("autocapitalize", "off");
      input.setAttribute("spellcheck", "false");
      input.addEventListener("focus", () => {
        enterMobileSearchMode();
        withSearchInputCaret(input, () => {
          renderSuggest(input.id === "originInput" ? "origin" : "dest", input.value);
        });
      });
      input.addEventListener("input", () => {
        const which = input.id === "originInput" ? "origin" : "dest";
        state[which] = null;
        if (state.route) clearRoute(true);
        else updateNavBtn();
        withSearchInputCaret(input, () => renderSuggest(which, input.value));
      });
      input.addEventListener("blur", () => scheduleExitMobileSearchMode());
    }
    initSearchField(el.originInput);
    initSearchField(el.destInput);
    document.addEventListener("pointerdown", (e) => {
      if (!e.target.closest(".field") && !e.target.closest(".suggest") && !e.target.closest("#browseBar")) {
        closeSuggest();
        exitMobileSearchMode();
      }
    });

    initMobileViewport();

    el.swapBtn.addEventListener("click", (e) => {
      e.preventDefault();
      const o = state.origin, d = state.dest;
      state.origin = d; state.dest = o;
      el.originInput.value = d ? d.name : "";
      el.destInput.value = o ? o.name : "";
      if (state.origin && state.dest) drawRoute();
    });
    el.hereBtn.addEventListener("click", (e) => { e.preventDefault(); startPlacingHere(); });
    el.routeBtn.addEventListener("click", (e) => { e.preventDefault(); drawRoute(); });
    el.clearBtn.addEventListener("click", (e) => { e.preventDefault(); clearRoute(); });
    el.navBtn.addEventListener("click", (e) => {
      e.preventDefault();
      if (el.navBtn.disabled) return;
      if (isNavigating()) exitNav();
      else enterNav();
    });

    // Delegação no overlay — garante clique mesmo com SVG/filho no caminho
    el.navOverlay.addEventListener("click", (e) => {
      const btn = e.target.closest("button");
      if (!btn || !el.navOverlay.contains(btn)) return;
      e.preventDefault();
      e.stopPropagation();
      if (btn.id === "navExit") exitNav();
      else if (btn.id === "navPrev") navPrev();
      else if (btn.id === "navNext") navNext();
    });

    // controles
    el.zoomIn.addEventListener("click", (e) => { e.preventDefault(); zoomAt(1.25); });
    el.zoomOut.addEventListener("click", (e) => { e.preventDefault(); zoomAt(0.8); });
    el.fitBtn.addEventListener("click", (e) => { e.preventDefault(); fit(); });
    el.panelToggle.addEventListener("click", (e) => {
      e.preventDefault();
      togglePanelSheet();
    });
    syncMapToolsPlacement();
    initPanelSheetGesture();
    if (el.stage) {
      el.stage.addEventListener("click", (e) => {
        if (!isMobileLayout() || !el.panel?.classList.contains("open")) return;
        if (el.panel.contains(e.target)) return;
        if (e.target.closest(".map-tools, .map-controls, .nav-overlay, .floor-menu, .area-menu")) return;
        if (el.panel.classList.contains("is-searching")) {
          exitMobileSearchMode();
          el.originInput?.blur();
          el.destInput?.blur();
        }
        setPanelOpen(false);
      });
    }
    updateSummaryChrome();
    window.addEventListener("resize", () => syncMapToolsPlacement());
    if (window.matchMedia) {
      window.matchMedia("(max-width: 860px)").addEventListener("change", () => syncMapToolsPlacement());
    }

    if (el.calibBtn) {
      el.calibBtn.addEventListener("click", (e) => {
        e.preventDefault();
        if (!CONFIG.isDev) return;
        if (state.calibMode) exitCalibMode();
        else enterCalibMode();
      });
    }
    if (el.calibCancel) {
      el.calibCancel.addEventListener("click", (e) => {
        e.preventDefault();
        exitCalibMode();
        if (CONFIG.isDev && state.calibration) {
          drawCalibrationMarks(state.calibration.startPoint, state.calibration.endPoint);
        } else clearCalibrationMarks();
      });
    }
    if (el.calibSave) {
      el.calibSave.addEventListener("click", (e) => {
        e.preventDefault();
        if (!state._calibDraft) return;
        applyCalibration(state._calibDraft, { persist: true });
        exitCalibMode();
        if (CONFIG.isDev) {
          drawCalibrationMarks(state.calibration.startPoint, state.calibration.endPoint);
        }
        toast("Escala do Batistério aplicada (6,80 m).");
      });
    }
    if (el.calibRealInput) {
      el.calibRealInput.addEventListener("change", () => {
        if (state.calibPoints.length >= 2) finishCalibPreview();
      });
    }

    // pan / zoom — ignora cliques em controles do mapa
    el.viewport.addEventListener("wheel", (e) => {
      e.preventDefault();
      const r = el.viewport.getBoundingClientRect();
      zoomAt(e.deltaY < 0 ? 1.12 : 0.9, e.clientX - r.left, e.clientY - r.top);
    }, { passive: false });

    el.viewport.addEventListener("pointerdown", (e) => {
      if (e.target.closest("button, a, input, .map-marker")) return;
      if (state.calibMode) {
        e.preventDefault();
        const p = viewportPoint(e);
        if (state.calibStep === 0) {
          state.calibPoints = [p];
          state.calibStep = 1;
          drawCalibrationMarks(p, null);
          if (el.calibHelp) {
            el.calibHelp.innerHTML = "Agora clique no extremo <strong>direito</strong> da largura do Batistério.";
          }
          toast("Ponto esquerdo marcado. Clique no extremo direito.");
        } else if (state.calibStep === 1) {
          state.calibPoints[1] = p;
          state.calibStep = 2;
          finishCalibPreview();
          toast("Pontos definidos. Revise e salve a escala.");
        }
        return;
      }
      if (state.placingHere) {
        e.preventDefault();
        state._ignoreNextPoiClick = true;
        placeHere(viewportPoint(e));
        return;
      }
      state.drag = true; state.moved = false;
      state.sx = e.clientX; state.sy = e.clientY;
      state.px = state.panX; state.py = state.panY;
      el.viewport.classList.add("dragging");
      el.viewport.setPointerCapture(e.pointerId);
    });
    el.viewport.addEventListener("pointermove", (e) => {
      if (!state.drag) return;
      const dx = e.clientX - state.sx, dy = e.clientY - state.sy;
      if (Math.abs(dx) + Math.abs(dy) > 3) {
        state.moved = true;
        if (state.userLocation) state.userLocation.onMapDragged();
      }
      state.panX = state.px + dx; state.panY = state.py + dy; clamp(); apply();
    });
    const endDrag = (e) => {
      state.drag = false;
      el.viewport.classList.remove("dragging");
      try { el.viewport.releasePointerCapture(e.pointerId); } catch {}
    };
    el.viewport.addEventListener("pointerup", endDrag);
    el.viewport.addEventListener("pointercancel", endDrag);

    // pinch (touch)
    let pinch = null;
    el.viewport.addEventListener("touchmove", (e) => {
      if (e.touches.length === 2) {
        e.preventDefault();
        const [a, b] = e.touches;
        const d = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
        const mid = { x: (a.clientX + b.clientX) / 2, y: (a.clientY + b.clientY) / 2 };
        const r = el.viewport.getBoundingClientRect();
        if (pinch) zoomAt(d / pinch, mid.x - r.left, mid.y - r.top);
        pinch = d;
      }
    }, { passive: false });
    el.viewport.addEventListener("touchend", () => { pinch = null; });

    addEventListener("keydown", (e) => {
      if (e.key === "Escape" && el.navOverlay.classList.contains("is-open")) exitNav();
    });
    addEventListener("resize", () => setTimeout(() => {
      if (document.body.classList.contains("is-navigating") && isMobileLayout()) {
        syncNavLayoutMetrics();
        fitRouteInView(state.route, { navMode: true, preferActiveLeg: true, fillWidth: true });
      } else {
        fit();
      }
    }, 120));
  }

  /* ============================================================ INIT */
  setupDevUi();
  initTheme();
  initBrowseFilters();
  bind();
  loadSVG();
})();
