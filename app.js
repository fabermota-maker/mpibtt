(() => {
  "use strict";

  /* ============================================================
     CONFIG — SVG único do Illustrator com todas as camadas.
     Cada camada é um grupo <g> com o id exportado pelo AI.
     ============================================================ */
  const CONFIG = {
    // UI técnica (calibração / camadas SVG) só com ?calib=1 ou ?dev=1
    isDev: /(?:\?|&)(?:calib|dev)=1(?:&|$)/.test(location.search),
    svgFiles: {
      background: "assets/mapa-background.svg",
      wall: "assets/mapa-wall.svg",
      edgeIndoor: "assets/mapa-edge-indoor.svg",
      edgeOutdoor: "assets/mapa-edge-outdoor.svg",
      nodes: "assets/mapa-nodes.svg",
      pois: "assets/mapa-pois.svg",
      infoTextos: "assets/mapa-info-textos.svg",
    },
    layers: {
      // IDs no SVG composto (nodes/pois atualizados 2026)
      // edges 2026 limpos: _05_edge_indoor_tech / _06_edge_outdoor-tech
      nodes: ["_09_nodes_L00"],
      edges: ["_05_edge_indoor_tech", "_06_edge_outdoor-tech"],
      edgeZones: ["indoor", "outdoor"],
      pois: ["_08_pois"],
      visible: [
        "_x30_2_x5F_background_x5F_estacionamento_x5F_BG",
        "_x30_3_x5F_background_x5F_estacionamento_x5F_Map",
        "_02_background_estacionamento_BG",
        "_03_background_estacionamento_Map",
        "_x30_4_x5F__x5F_background_x5F_wall_x5F_paredes_x5F_tech",
        "_x30_7_x5F_txt_x5F_info",
        "_07_txt_info",
        "_08_pois",
        "_x30_8_x5F_pois",
      ],
      technical: [
        "_05_edge_indoor_tech",
        "_06_edge_outdoor-tech",
        "_x30_5_x5F_edge_x5F_indoor_x5F_tech",
        "_x30_6_x5F_edge_x5F_outdoor-tech",
        "_09_nodes_L00",
        "_x30_9_x5F_nodes_x5F_L00",
      ],
    },
    // no background antigo, as camadas ainda têm estes IDs (antes da substituição)
    replaceTargets: {
      nodes: "_x30_9_x5F_nodes_x5F_L00",
      pois: "_x30_8_x5F_pois",
      wall: "_x30_4_x5F__x5F_background_x5F_wall_x5F_paredes_x5F_tech",
      infoTextos: "_x30_7_x5F_txt_x5F_info",
      edgeIndoor: "_x30_5_x5F_edge_x5F_indoor_x5F_tech",
      edgeOutdoor: "_x30_6_x5F_edge_x5F_outdoor-tech",
    },
    metersPerUnit: 0.35, // fallback até calibração do Batistério (6,80 m)
    walkingSpeedMps: 1.2,
    calibrationUrl: "data/map-calibration.json",
    navigationUrl: "data/navigation.json",
    snapTol: 8,        // encaixe genérico entre nós
    edgeEndpointTol: 24, // ponta de edge ↔ node oficial (folgas do Illustrator)
    spurTol: 80,       // ícone POI ↔ entrada da malha (curto; sem atravessar parede)
    edgeSnapTol: 180,  // distância máx. POI → edge de entrada
    entranceTol: 160,  // busca de node oficial de porta
    bridgeTol: 6,      // só micro-folgas da malha oficial (não inventa atalho)
    componentBridgeTol: 28, // une componentes separados por folga de exportação
    // zonas de estacionamento (bbox em unidades SVG) — evita atravessar o pátio
    parkingZones: [
      // pátio principal (vagas ao sul do toldo / templo)
      { x0: 480, y0: 545, x1: 990, y1: 870 },
      // estacionamento 02 (pátio ao lado do CF — não inclui o corredor oeste y≈252)
      { x0: 340, y0: 270, x1: 450, y1: 350 },
    ],
    snapLateral: 0.45,
    // âncora oficial (entrada) por POI — evita misturar locais vizinhos
    poiAnchors: {
      P000_templo: "L00_N0013_entrada_lateral_templo_01",
      P001_entrada_principal_toldo: "L00_N0023_intersection_entrada_toldo",
      P002_capela: "L00_N0064",
      P003_estacionamento_01: "L00_N0017_estacionamento",
      P004_sala_de_oracao_RGO: "L00_N0038",
      P005_centro_de_formacao: "L00_N0034",
      P006_estacionamento_02: "L00_N0031",
      P007_area_kids: "L00_N0051",
      P008_refeitorio_externo: "L00_N0025",
      P009_livraria_evangelica: "L00_N0076",
      P010_espaco_conexao: "L00_N0078",
      P011_bercario: "L00_N0071",
      P012_sala_de_oracao_cleusa: "L00_N0059",
      P013_recepcao: "L00_N0061",
      P014_seven_pass: "L00_N0047",
      P015_bazar_abasc: "L00_N0046",
      P016_jardim: "L00_N0030",
      P017_espaco_acolher_ceara: "L00_N0072",
      P018_abasc: "L00_N0057",
      P019_banheiro_familia: "L00_N0070",
      P020_espaco_servir: "L00_N0028",
      P021_banheiro_feminino_ginasio: "L00_N0050_banheiro_feminino_ginasio",
      P022_banheiro_masculino_ginasio: "L00_N0045_banheiro_masculino_ginasio",
      P023_banheiro_feminino: "L00_N0066",
      P024_banheiro_masculino: "L00_N0065",
      P025_banheiro_masculino_feminino: "L00_N0054",
      P026_elevador_ginasio: "L00_N0019_intersection_entrada_seven_pass_elevador",
      P027_elevador_templo: "L00_N0077",
      P028_estacionamento_moto: "L00_N0007_estacionamento_motos",
      B02_entrada_narnia: "L00_N0014_entrada_narnia_B02",
      P028_B02_entrada_narnia: "L00_N0014_entrada_narnia_B02",
      P029_entrada_pedestre_02_batel: "L00_N0082",
      P030_entrada_estacionamento_av_batel: "L00_N0093_entrada_estacionamento_av_batel",
      P031_entrada_estacionamento_bento_viana: "L00_N0002_entrada_estacionamento_principal_bento",
    },
    // entradas do templo — opções de rota “por dentro” do estabelecimento
    templeEntrances: [
      { id: "L00_N0084", label: "Entrada 01 principal templo" },
      { id: "L00_N0068", label: "Entrada 02 principal templo" },
      { id: "L00_N0016_entrada_lateral_templo_02", label: "Entrada lateral 02 templo" },
      { id: "L00_N0029", label: "Entrada lateral 03 templo" },
      { id: "L00_N0013_entrada_lateral_templo_01", label: "Entrada lateral 01 templo" },
    ],
    // rotas opcionais nomeadas (par de POIs → via nó(s) externo(s))
    namedExternalRoutes: [
      {
        a: ["P007_area_kids", "P008_refeitorio_externo"],
        b: ["P016_jardim", "P020_espaco_servir"],
        via: "L00_N0027", // sul do templo / Batistério
        label: "Por fora (externa)",
        avoidParking: false,
      },
      // Lado leste / ginásio / hall → Elevador / Templo / mezanino: estacionamento → sul → jardim
      {
        a: [
          "P014_seven_pass",
          "P026_elevador_ginasio",
          "P021_banheiro_feminino_ginasio",
          "P022_banheiro_masculino_ginasio",
          "P007_area_kids",
          "P008_refeitorio_externo",
          "P025_banheiro_masculino_feminino",
          "P009_livraria_evangelica",
          "P010_espaco_conexao",
          "P011_bercario",
          "P012_sala_de_oracao_cleusa",
          "P013_recepcao",
          "P017_espaco_acolher_ceara",
          "P019_banheiro_familia",
          "P002_capela",
          "P005_centro_de_formacao",
          "P001_entrada_principal_toldo",
          "P015_bazar_abasc",
          "P018_abasc",
        ],
        b: [
          "P027_elevador_templo",
          "P000_templo",
          "escada_mesanino_01",
          "escada_mesanino_02",
          "L01_elevador",
        ],
        via: ["L00_N0004", "L00_N0027"],
        label: "Por fora do templo",
        avoidParking: false,
      },
    ],
    // Andares disponíveis no seletor (L00 = campus atual; L01–L07 = prédios internos)
    floors: [
      { id: "L00", label: "L00", title: "Térreo · Campus", ready: true },
      { id: "L01", label: "L01", title: "1º andar", ready: true, mapUrl: "assets/mapa-L01.svg" },
      { id: "L02", label: "L02", title: "2º andar", ready: false },
      { id: "L03", label: "L03", title: "3º andar", ready: false },
      { id: "L04", label: "L04", title: "4º andar", ready: false },
      { id: "L05", label: "L05", title: "5º andar", ready: false },
      { id: "L06", label: "L06", title: "6º andar", ready: false },
      { id: "L07", label: "L07", title: "7º andar", ready: false },
    ],
    // hubs de elevador por andar (conexão vertical)
    elevatorHubs: {
      L00: { nodeId: "L00_N0077", label: "Elevador Templo" },
      L01: { nodeId: "L01_elevador", label: "Elevador (1º andar)" },
    },
    // filtros da lista de destinos
    searchGroups: [
      { id: "all", label: "Todos" },
      { id: "floor", label: "Neste andar" },
      { id: "salas", label: "Salas" },
      { id: "auditorios", label: "Auditórios" },
      { id: "banheiros", label: "Banheiros" },
      { id: "elevadores", label: "Elevadores" },
    ],
  };

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
    searchLevelSelect: $("searchLevelSelect"),
    browseBar: $("browseBar"),
    steps: $("steps"), clearBtn: $("clearBtn"), navBtn: $("navBtn"),
    statusHint: $("statusHint"), scaleHint: $("scaleHint"), svgName: $("svgName"),
    calibBtn: $("calibBtn"), calibPanel: $("calibPanel"), calibHelp: $("calibHelp"),
    calibRealInput: $("calibRealInput"), calibResult: $("calibResult"),
    calibCancel: $("calibCancel"), calibSave: $("calibSave"),
    stage: $("stage"), viewport: $("viewport"), canvas: $("canvas"),
    svgHost: $("svgHost"), overlay: $("overlay"),
    routeGlow: $("routeGlow"), routeCasing: $("routeCasing"),
    routeLine: $("routeLine"), routeFlow: $("routeFlow"),
    routeStart: $("routeStart"), routeEnd: $("routeEnd"), hereMarker: $("hereMarker"),
    zoomIn: $("zoomIn"), zoomOut: $("zoomOut"), fitBtn: $("fitBtn"), locBtn: $("locBtn"),
    gpsOrientBtn: $("gpsOrientBtn"), gpsOrientCancel: $("gpsOrientCancel"),
    gpsAccuracyHint: $("gpsAccuracyHint"),
    gpsConfirmModal: $("gpsConfirmModal"), gpsConfirmTitle: $("gpsConfirmTitle"),
    gpsConfirmActions: $("gpsConfirmActions"), gpsConfirmDismiss: $("gpsConfirmDismiss"),
    gpsCompass: $("gpsCompass"), gpsCompassArrow: $("gpsCompassArrow"),
    navOverlay: $("navOverlay"), compassArrow: $("compassArrow"),
    navStepText: $("navStepText"), navDistText: $("navDistText"),
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
    calibMode: false, calibStep: 0, calibPoints: [],
    walkingSpeedMps: CONFIG.walkingSpeedMps || 1.2,
    activeLevel: "L00",
    floorMenuOpen: false,
    areaMenuOpen: false,
    searchGroup: "all",
    searchLevel: "all", // padrão: todos os níveis
    floorViews: {}, // { L00: SVGElement, L01: SVGElement, ... }
    floorMeta: {},  // { L00: { vbW, vbH }, ... }
    userNav: null,
    userLocation: null,
    gpsOrientation: null,
  };

  const CAT_LABEL = {
    acesso: "Entrada/Acesso", apoio: "Apoio", servico: "Serviço",
    ambiente: "Ambiente", alimentacao: "Alimentação", estacionamento: "Estacionamento",
  };

  /* ============================================================ UTIL */
  const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
  const norm = (s = "") => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  const Cal = () => (typeof MapCalibration !== "undefined" ? MapCalibration : null);

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
    try {
      const res = await fetch(CONFIG.navigationUrl, { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      state.navGraph = NavigationRouter.createNavigationGraph(data);
      if (data.metersPerUnit > 0 && !state.calibration) {
        CONFIG.metersPerUnit = data.metersPerUnit;
      }
      if (data.walkingSpeedMetersPerSecond) {
        state.walkingSpeedMps = data.walkingSpeedMetersPerSecond;
      }
      // sincroniza POIs da UI com nodeIds do JSON
      for (const poi of G.pois) {
        const match = (data.pois || []).find((p) =>
          p.rawId === poi.rawId
          || p.id === poi.rawId
          || (p.id && poi.rawId && p.id.endsWith(poi.rawId))
        );
        if (!match?.nodeIds?.length) continue;
        poi.navNodeIds = match.nodeIds.slice();
        poi.navId = match.id;
        const nid = match.nodeIds[0];
        if (nid && G.nodes[nid]) {
          poi.anchor = nid;
          poi.snap = { x: G.nodes[nid].x, y: G.nodes[nid].y };
        }
        enrichPoiMeta(poi);
      }
      // POIs só no JSON (outros andares ou nós ocultos com inject:true)
      for (const jp of data.pois || []) {
        const already = G.pois.some((p) =>
          p.navId === jp.id || p.rawId === jp.rawId || p.id === jp.rawId
        );
        if (already || !jp.nodeIds?.length) continue;
        const nid = jp.nodeIds[0];
        const node = state.navGraph.nodesById.get(nid);
        if (!node) continue;
        const isOtherFloor = (node.level || "L00") !== "L00";
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
          level: node.level || "L00",
          building: jp.building,
          group: jp.group,
          cat: jp.cat || "acesso",
          navNodeIds: jp.nodeIds.slice(),
          navId: jp.id,
          anchor: nid,
          snap: { x: node.x, y: node.y },
          iconHidden: true,
        });
        G.pois.push(poi);
      }
      G.pois.sort((a, b) => (a.searchLabel || a.name).localeCompare(b.searchLabel || b.name, "pt-BR"));
      return true;
    } catch (err) {
      state.navGraphError = err;
      console.error("Falha ao carregar navigation.json:", err);
      return false;
    }
  }

  function poiLevel(poi) {
    if (!poi) return "L00";
    if (poi.level) return poi.level;
    if (poi.anchor && state.navGraph?.nodesById.has(poi.anchor)) {
      return state.navGraph.nodesById.get(poi.anchor).level || "L00";
    }
    return levelFromId(poi.rawId || poi.id) || "L00";
  }

  function floorTitle(levelId) {
    return floorById(levelId)?.title || levelId || "andar";
  }

  function elevatorHub(levelId) {
    return (CONFIG.elevatorHubs || {})[levelId] || null;
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
    // nós já canônicos (não stripar L01_elevador → "elevador")
    if (/^(escada_mesanino_|L0[0-7]_elevador)/i.test(s)) return s;
    // L00_P_P027_… / L00_P027_… → P027_…
    s = s.replace(/^L0[0-7]_P_/i, "").replace(/^L0[0-7]_/i, "");
    return s;
  }

  function isTempleHubPoi(poi) {
    if (!poi) return false;
    const k = poiRawKey(poi);
    return /P027_elevador_templo|P000_templo|escada_mesanino|L01_elevador/i.test(k);
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
    // Se envolve elevador/templo/mezanino e ainda não há "por fora do templo", força a opção
    if ((isTempleHubPoi(origin) || isTempleHubPoi(dest))
      && !matched.some((r) => /fora do templo/i.test(r.label || ""))) {
      matched.push({
        via: ["L00_N0004", "L00_N0027"],
        label: "Por fora do templo",
        avoidParking: false,
      });
    }
    return matched;
  }

  function namedExternalForPair(origin, dest) {
    return namedExternalSpecsForPair(origin, dest)[0] || null;
  }

  /** Garante a rota nomeada (mesmo mais longa) entre as opções exibidas. */
  function finalizePackedRoutes(packed, NR) {
    const list = (packed || []).filter((r) => r && r.points && r.points.length >= 2);
    list.sort((a, b) => a.length - b.length);
    const named = list.filter((r) => r.namedExternal);
    const rest = list.filter((r) => !r.namedExternal);
    const out = rest.slice(0, Math.max(1, 3 - Math.min(1, named.length)));
    for (const n of named) {
      if (out.length >= 4) break;
      if (!out.some((r) => (r.edgeIds || []).join(">") === (n.edgeIds || []).join(">"))) {
        out.push(n);
      }
    }
    // se a nomeada ficou de fora por empate de assinatura, ainda assim inclui
    if (named[0] && !out.some((r) => r.namedExternal) && out.length < 4) {
      out.push(named[0]);
    }
    out.sort((a, b) => {
      // nomeadas por fora ficam depois da mais curta, mas sempre presentes
      if (a.namedExternal !== b.namedExternal) return a.namedExternal ? 1 : -1;
      return a.length - b.length;
    });
    out.forEach((r, i) => {
      r.rank = i + 1;
      if (r.namedExternal) {
        r.kind = "fora";
        r.label = r.label || "Por fora do templo";
      } else if (!r.entranceId) {
        r.label = (NR && NR.rankLabel) ? NR.rankLabel(i + 1, out.length) : `Rota ${i + 1}`;
        r.kind = i === 0 ? "best" : "alt";
      }
    });
    return out.slice(0, 4);
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
    const vias = (Array.isArray(spec.via) ? spec.via : [spec.via])
      .filter((id) => state.navGraph.nodesById.has(id));
    if (!vias.length) return null;
    const opts = {
      preference: "shortest",
      avoidParking: spec.avoidParking === true,
      walkingSpeedMps: state.walkingSpeedMps || 1.2,
    };
    let best = null;
    for (const s of startIds) {
      if (!s || !state.navGraph.nodesById.has(s)) continue;
      for (const e of endIds) {
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
        if (!merged || merged.points.length < 2) continue;
        if (!best || merged.distanceMeters < best.distanceMeters) best = merged;
      }
    }
    if (!best) return null;
    const points = appendPoiEndpoints(best.points, origin, dest);
    if (points.length < 2) return null;
    let length = 0;
    for (let i = 1; i < points.length; i++) length += dist(points[i - 1], points[i]);
    const mpu = getMetersPerUnit();
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
    };
  }

  function appendNamedExternalOptions(NR, startIds, endIds, origin, dest, packed) {
    const specs = namedExternalSpecsForPair(origin, dest);
    if (!specs.length) return packed;
    const list = packed ? packed.slice() : [];
    for (const spec of specs) {
      const external = buildNamedExternalRoute(NR, startIds, endIds, origin, dest, spec);
      if (!external) continue;
      const sig = (external.edgeIds || []).join(">");
      const dup = list.some((r) => (r.edgeIds || []).join(">") === sig);
      if (!dup) list.push(external);
    }
    return list;
  }

  /** Extende até o ícone só se o trecho for curto e NÃO atravessar parede. */
  function appendPoiEndpoints(points, origin, dest) {
    const pts = (points || []).map((p) => ({ x: p.x, y: p.y }));
    if (!pts.length) return pts;
    const maxSpur = CONFIG.spurTol || 80;
    const o = poiIcon(origin);
    const d = poiIcon(dest);
    const oLvl = poiLevel(origin);
    const dLvl = poiLevel(dest);
    // não mistura coordenadas de andares diferentes
    if (o && oLvl === dLvl && dist(o, pts[0]) > 0.8 && dist(o, pts[0]) <= maxSpur) {
      if (!crossesWall(o, pts[0])) pts.unshift({ x: o.x, y: o.y });
    }
    if (d && oLvl === dLvl && dist(pts[pts.length - 1], d) > 0.8) {
      if (isTemplePoi(dest)) return pts;
      const tip = pts[pts.length - 1];
      if (dist(tip, d) <= maxSpur && !crossesWall(tip, d)) {
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
      if (leg.edgeIds.length >= 1 && leg.nodeIds.length >= 2) {
        try {
          leg.points = NR.buildRoutePoints(leg.edgeIds, leg.nodeIds, state.navGraph.edgesById);
        } catch {
          leg.points = leg.nodeIds.map((id) => {
            const n = state.navGraph.nodesById.get(id);
            return n ? { x: n.x, y: n.y } : null;
          }).filter(Boolean);
        }
      } else {
        const n = state.navGraph.nodesById.get(leg.nodeIds[0]);
        leg.points = n ? [{ x: n.x, y: n.y }] : [];
      }
    }
    return legs;
  }

  function paintActiveRouteLeg() {
    if (!state.route) {
      clearRoutePaint();
      return;
    }
    const legs = state.route.legs || routeLegsFromGraph(state.route);
    state.route.legs = legs;
    const leg = legs.find((l) => l.level === state.activeLevel) || null;
    if (!leg?.points?.length) {
      clearRoutePaint();
      return;
    }
    let pts = leg.points.map((p) => ({ x: p.x, y: p.y }));
    if (pts.length === 1) {
      pts = [pts[0], { x: pts[0].x + 0.5, y: pts[0].y }];
    }
    // spurs só no andar do POI correspondente
    if (poiLevel(state.origin) === state.activeLevel) {
      pts = appendPoiEndpoints(pts, state.origin, {
        ...state.dest,
        level: state.activeLevel,
        iconX: undefined,
        iconY: undefined,
        x: pts[pts.length - 1].x,
        y: pts[pts.length - 1].y,
      });
    } else if (poiLevel(state.dest) === state.activeLevel) {
      pts = appendPoiEndpoints(pts, {
        ...state.origin,
        level: state.activeLevel,
        iconX: undefined,
        iconY: undefined,
        x: pts[0].x,
        y: pts[0].y,
      }, state.dest);
    }
    const a = pts[0];
    const b = pts[pts.length - 1];
    paintRouteOnMap(pts.map((p) => `${p.x},${p.y}`).join(" "), a, b, pts);
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
      const id = NR.nearestNodeId(poiIcon(origin) || origin, state.navGraph, {});
      if (id) startIds = [id];
    }
    if (!endIds.length) {
      const id = NR.nearestNodeId(poiIcon(dest) || dest, state.navGraph, {});
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

    // destino = Templo → opções por cada entrada + rota por fora (se houver)
    if (isTemplePoi(dest)) {
      let viaDoors = routesViaTempleEntrances(NR, startIds, origin, dest, allowParking);
      viaDoors = appendNamedExternalOptions(NR, startIds, endIds, origin, dest, viaDoors);
      if (viaDoors.length) return finalizePackedRoutes(viaDoors, NR);
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
      if (flipped.length) return finalizePackedRoutes(flipped, NR);
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
    return finalizePackedRoutes(packed, NR);
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
      el.statusHint.textContent = `Mapa pronto: ${G.pois.length} locais`;
      await loadCalibration();
      await loadNavigation();
      autoCalibrateFromSvg(svg);
      if (CONFIG.isDev && state.calibration) {
        drawCalibrationMarks(state.calibration.startPoint, state.calibration.endPoint);
      }
      fit();
      initUserLocation();
    } catch (err) {
      el.statusHint.textContent = `Não foi possível montar o mapa: ${err.message}`;
      console.error(err);
    }
  }

  function initUserLocation() {
    if (state.userLocation) return;
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
    state.userLocation = UserLocationSystem.create({
      overlay: el.overlay,
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
      toast,
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
        if (state.userLocation.startFollowing) {
          return !!(await state.userLocation.startFollowing());
        }
        return !!(await state.userLocation.start?.({ silent: true }));
      },
      onTrackingSnap: (valid) => {
        // LP: não desenha o ponto azul “hereMarker”; só atualiza o hint
        if (el.hereMarker) {
          el.hereMarker.hidden = true;
          el.hereMarker.setAttribute("hidden", "");
          el.hereMarker.setAttribute("visibility", "hidden");
          el.hereMarker.style.display = "none";
        }
        if (el.navHint && isFinite(valid?.routeProgress)) {
          const pct = Math.round(valid.routeProgress * 100);
          el.navHint.textContent = `Progresso na rota: ~${pct}% · precisão ±${Math.round(valid.accuracy || 0)} m`;
        }
      },
      onNeedManualEntrance: () => {
        toast(
          "Localização aproximada encontrada.\nSelecione a entrada mais próxima para continuar.",
        );
        startPlacingHere();
      },
      onAmbiguousEntrances: askAmbiguousEntrances,
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

  function crossesWall(a, b) {
    if (!a || !b || !G.walls.length) return false;
    // amostras ao longo do segmento (pega atravessamento de paredes finas)
    const samples = 9;
    for (let s = 1; s < samples; s++) {
      const t = s / samples;
      const pt = { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
      for (const poly of G.walls) {
        if (poly.length >= 3 && pointInPoly(pt, poly)) return true;
      }
    }
    for (const poly of G.walls) {
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
  function findNearestEdgeHit(p, maxDist, requireClear) {
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
          const score = pr.d + lat * Math.abs(pr.x - p.x) + lat * 0.25 * Math.abs(pr.y - p.y);
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
    const maxD = CONFIG.entranceTol || 160;

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
        if (d > maxD * 1.5) continue;
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
    const hit = findNearestEdgeHit(p, CONFIG.edgeSnapTol, true);
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

  // decodifica id: P002_capela / P002_x5F_capela -> "Capela"
  function decodePoiName(rawId, dataName) {
    if (dataName && dataName.trim() && !/^P\d+/i.test(dataName) && !/^B\d+/i.test(dataName)) {
      return dataName.trim();
    }
    let s = dataName || rawId || "";
    s = s.replace(/_x5F_/g, "_").replace(/_x([0-9a-fA-F]{2})_/g, (_, h) => String.fromCharCode(parseInt(h, 16)));
    s = s.replace(/^P\d+[_-]?/i, "").replace(/^B\d+[_-]?/i, "");
    s = s.replace(/[_-]+/g, " ").trim();
    if (!s) return rawId;
    return s.replace(/\S+/g, (w) => (w.length <= 2 ? w.toUpperCase() : w[0].toUpperCase() + w.slice(1)));
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
    if (/ginasio|seven_pass|^p014_|^p021_|^p022_|^p026_|elevador_ginasio/.test(id)
      || /ginasio|seven pass|restaurante seven/.test(n)) {
      return "Ginásio";
    }
    if (/abasc|bazar|^p015_|^p018_/.test(id) || /abasc|bazar transforma/.test(n)) {
      return "ABASC";
    }
    if (/area_kids|refeitorio_externo|^p007_|^p008_/.test(id) || /area kids|refeitorio externo/.test(n)) {
      return "Área Kids";
    }
    if (/espaco_servir|jardim|^p016_|^p020_/.test(id) || /espaco servir|jardim/.test(n)) {
      return "Área Sul";
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
    const level = poi.level || levelFromId(poi.rawId) || "L00";
    const building = poi.building || buildingFromPoi(poi.rawId, poi.name);
    const group = poi.group || searchGroupFromPoi(poi.rawId, poi.name, poi.cat);
    const code = poi.code || `${level}_${poi.rawId || poi.id}`;
    const searchLabel = poi.searchLabel || `${poi.name} — ${level} — ${building}`;
    poi.level = level;
    poi.building = building;
    poi.group = group;
    poi.code = code;
    poi.searchLabel = searchLabel;
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
        const epTol = CONFIG.edgeEndpointTol || CONFIG.snapTol * 3;
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
    connectComponentsToMain(CONFIG.componentBridgeTol || 120);
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
        const level = levelFromId(rawId) || levelFromId(c.id) || "L00";
        const poiId = `${level}_${rawId}`;
        c.setAttribute("data-poi", poiId);
        c.style.cursor = "pointer";
        // área de clique maior (ícones minúsculos como Jardim)
        ensurePoiHitArea(c, p);
        const poi = enrichPoiMeta({
          id: poiId, name, cat, x: p.x, y: p.y,
          iconX: p.x, iconY: p.y,
          rawId, anchor: null, snap: null,
          level,
        });
        G.pois.push(poi);
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
    for (const id of pool) {
      if (!(G.adj[id] || []).some((e) => e.official)) continue;
      const n = G.nodes[id];
      if (!n) continue;
      const d = dist(poi, n);
      if (d > (CONFIG.entranceTol || 160) * 2) continue;
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
    let layer = svg.getElementById("routeLayer");
    if (layer) {
      svg.appendChild(layer); // sempre no topo
      return layer;
    }
    layer = document.createElementNS(NS, "g");
    layer.setAttribute("id", "routeLayer");
    layer.setAttribute("pointer-events", "none");
    const mkPath = (id, attrs) => {
      const p = document.createElementNS(NS, "path");
      p.setAttribute("id", id);
      p.setAttribute("fill", "none");
      p.setAttribute("d", "");
      p.setAttribute("vector-effect", "non-scaling-stroke");
      Object.entries(attrs).forEach(([k, v]) => p.setAttribute(k, v));
      layer.appendChild(p);
      return p;
    };
    mkPath("mapRouteGlow", { stroke: "#60a5fa", "stroke-opacity": "0.4", "stroke-width": "14", "stroke-linecap": "round", "stroke-linejoin": "round" });
    mkPath("mapRouteCasing", { stroke: "#ffffff", "stroke-width": "9", "stroke-linecap": "round", "stroke-linejoin": "round" });
    mkPath("mapRouteLine", { stroke: "#2563eb", "stroke-width": "5", "stroke-linecap": "round", "stroke-linejoin": "round" });
    mkPath("mapRouteFlow", { stroke: "#ffffff", "stroke-opacity": "0.95", "stroke-width": "2.2", "stroke-linecap": "round", "stroke-linejoin": "round", "stroke-dasharray": "2 16", class: "route-flow" });
    const pin = (id, kind) => {
      const g = document.createElementNS(NS, "g");
      g.setAttribute("id", id);
      g.setAttribute("class", `route-pin route-pin--${kind}`);
      g.setAttribute("visibility", "hidden");
      if (kind === "start") {
        const halo = document.createElementNS(NS, "circle");
        halo.setAttribute("class", "pin-halo");
        halo.setAttribute("r", "12");
        halo.setAttribute("fill", "rgba(15, 118, 110, 0.32)");
        g.appendChild(halo);
      } else {
        const ring = document.createElementNS(NS, "circle");
        ring.setAttribute("class", "pin-ring");
        ring.setAttribute("r", "7.5");
        ring.setAttribute("fill", "none");
        ring.setAttribute("stroke", "#2563eb");
        ring.setAttribute("stroke-width", "2.8");
        ring.setAttribute("vector-effect", "non-scaling-stroke");
        g.appendChild(ring);
      }
      const dot = document.createElementNS(NS, "circle");
      dot.setAttribute("class", "pin-dot");
      dot.setAttribute("r", "4");
      dot.setAttribute("fill", "#ffffff");
      g.appendChild(dot);
      layer.appendChild(g);
      return g;
    };
    pin("mapRouteStart", "start");
    pin("mapRouteEnd", "end");
    svg.appendChild(layer);
    return layer;
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
      "entrada sevenpass", "entrada seven pass",
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
        if (hits.length === 1 && ["jardim", "templo", "capela", "abasc", "kids", "narnia", "toldo", "bercario", "recepcao", "ginasio", "formacao", "sevenpass", "seven", "bazar", "cf"].includes(hits[0])) {
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
        const poi = G.pois.find((p) => p.id === poiId);
        if (!poi) return;
        const lvl = poi.level || "L00";
        if (lvl !== state.activeLevel) setActiveLevel(lvl, { silent: true });
        if (!state.origin) setField("origin", poi);
        else setField("dest", poi);
        toast(`${poi.name} selecionado.`);
      });
    });
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
      if (canSpurTo(origin, n)) pts.unshift({ x: origin.x, y: origin.y });
      if (canSpurTo(dest, n)) pts.push({ x: dest.x, y: dest.y });
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
  function canSpurTo(from, to) {
    const max = CONFIG.spurTol || 80;
    return from && to && from.x != null && to.x != null
      && dist(from, to) > 0.8
      && dist(from, to) <= max
      && !crossesWall(from, to);
  }

  function resolvePoi(which) {
    if (state[which]) return state[which];
    const raw = ((which === "origin" ? el.originInput : el.destInput).value || "").trim();
    if (!raw) return null;
    const q = norm(raw);
    const exact = G.pois.find((p) => norm(p.name) === q);
    if (exact) return exact;
    const hits = G.pois.filter((p) => norm(p.name).includes(q) || q.includes(norm(p.name)));
    return hits.length === 1 ? hits[0] : null;
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

    // 4b) rotas externas nomeadas (ex.: por fora do templo via estacionamento/sul)
    for (const extSpec of namedExternalSpecsForPair(origin, dest)) {
      if (out.length >= 4) break;
      const vias = (Array.isArray(extSpec.via) ? extSpec.via : [extSpec.via])
        .filter((id) => G.nodes[id]);
      if (!vias.length) continue;
      const extOpts = {
        avoidParking: extSpec.avoidParking === true,
        officialOnly: true,
      };
      const chain = [startNode, ...vias, endNode];
      let ids = [chain[0]];
      let ok = true;
      for (let i = 0; i < chain.length - 1; i++) {
        const leg = shortest(chain[i], chain[i + 1], null, null, extOpts);
        if (!leg || leg.length < 2) { ok = false; break; }
        ids = ids.concat(leg.slice(1));
      }
      if (!ok) continue;
      const sig = ids.join(">");
      if (seen.has(sig)) continue;
      const r = assembleRoute(ids, origin, dest);
      if (r && r.points.length >= 2) {
        r.sig = sig;
        r.kind = "fora";
        r.label = extSpec.label || "Por fora (externa)";
        r.namedExternal = true;
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
        if (!r.entranceId || !r.label) continue;
        if (seenDoor.has(r.entranceId)) continue;
        seenDoor.add(r.entranceId);
        doors.push(r);
        if (doors.length >= 4) break;
      }
      if (doors.length) return doors;
    }

    // garante no máximo uma de cada perfil + a melhor sempre em 1º
    const picked = [];
    const usedKinds = new Set();
    for (const r of out) {
      if (picked.length >= 3) break;
      if (r.namedExternal) {
        r.kind = "fora";
        r.label = r.label || "Por fora (externa)";
        picked.push(r);
        usedKinds.add("fora");
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
        if (picked.length >= 3) break;
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

    // garante a externa nomeada entre as opções
    const namedExt = out.find((r) => r.namedExternal);
    if (namedExt && !picked.includes(namedExt)) {
      if (picked.length < 3) picked.push(namedExt);
      else picked[picked.length - 1] = namedExt;
    }

    return picked.slice(0, 3);
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
    const maxSpur = CONFIG.spurTol || 80;
    if (oIcon && dist(oIcon, startSnap) > 0.8 && dist(oIcon, startSnap) <= maxSpur && !crossesWall(oIcon, startSnap)) {
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
      if (dist(tip, dIcon) > 0.8 && dist(tip, dIcon) <= maxSpur && !crossesWall(tip, dIcon)) {
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
    const steps = [];
    const oLvl = poiLevel(state.origin);
    const dLvl = poiLevel(state.dest);
    const legs = route.legs || routeLegsFromGraph(route);
    steps.push({ ico: "S", txt: `Início: ${state.origin.name}`, dist: "" });

    if (oLvl !== dLvl && legs.length >= 2) {
      const exitHub = elevatorHub(oLvl);
      const arriveHub = elevatorHub(dLvl);
      const firstLeg = legs[0];
      if (firstLeg?.edgeIds?.length) {
        steps.push({
          ico: "U",
          txt: `Siga até o elevador${exitHub ? ` (${exitHub.label})` : ""}`,
          dist: "",
        });
      } else {
        steps.push({
          ico: "U",
          txt: `Vá ao elevador${exitHub ? ` — ${exitHub.label}` : ""}`,
          dist: "",
        });
      }
      steps.push({
        ico: "U",
        txt: `Pegue o elevador até ${floorTitle(dLvl)}${arriveHub ? ` — ${arriveHub.label}` : ""}`,
        dist: "",
      });
      steps.push({
        ico: "U",
        txt: `Do elevador, siga até ${state.dest.name}`,
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

  function paintRouteOnMap(ptsStr, a, b, points) {
    const pts = (points || ptsStr.split(/\s+/).map((s) => {
      const [x, y] = s.split(",").map(Number);
      return { x, y };
    })).filter((p) => isFinite(p.x) && isFinite(p.y));
    if (pts.length < 2) return;
    const d = pointsToPathD(pts);
    const safePtsStr = pts.map((p) => `${p.x},${p.y}`).join(" ");

    // overlay HTML (polyline) — fallback visual acima do mapa
    el.routeGlow.setAttribute("points", safePtsStr);
    el.routeCasing.setAttribute("points", safePtsStr);
    el.routeLine.setAttribute("points", safePtsStr);
    el.routeFlow.setAttribute("points", safePtsStr);
    ["routeGlow", "routeCasing", "routeLine", "routeFlow"].forEach((key) => {
      const node = el[key];
      if (!node) return;
      node.setAttribute("vector-effect", "non-scaling-stroke");
      node.style.display = "block";
      node.removeAttribute("hidden");
    });
    el.routeStart.removeAttribute("hidden");
    el.routeStart.setAttribute("visibility", "visible");
    el.routeStart.style.display = "";
    el.routeStart.setAttribute("transform", `translate(${a.x} ${a.y})`);
    el.routeEnd.removeAttribute("hidden");
    el.routeEnd.setAttribute("visibility", "visible");
    el.routeEnd.style.display = "";
    el.routeEnd.setAttribute("transform", `translate(${b.x} ${b.y})`);

    // camada vetorial DENTRO do mapa (sempre no topo + path)
    const svg = el.svgHost.querySelector("#mapaSVG") || el.svgHost.querySelector("svg");
    if (!svg) return;
    const layer = ensureRouteLayer(svg);
    layer.style.display = "";
    layer.setAttribute("visibility", "visible");
    layer.removeAttribute("hidden");
    const setD = (id) => {
      const n = svg.getElementById(id);
      if (n) {
        n.setAttribute("d", d);
        n.style.display = "";
        n.setAttribute("visibility", "visible");
      }
    };
    setD("mapRouteGlow");
    setD("mapRouteCasing");
    setD("mapRouteLine");
    setD("mapRouteFlow");
    const pin = (id, pt) => {
      const n = svg.getElementById(id);
      if (!n) return;
      n.setAttribute("visibility", "visible");
      n.removeAttribute("hidden");
      n.setAttribute("transform", `translate(${pt.x} ${pt.y})`);
    };
    pin("mapRouteStart", a);
    pin("mapRouteEnd", b);
  }

  function clearRoutePaint() {
    el.routeGlow.setAttribute("points", "");
    el.routeCasing.setAttribute("points", "");
    el.routeLine.setAttribute("points", "");
    el.routeFlow.setAttribute("points", "");
    el.routeStart.setAttribute("hidden", "");
    el.routeStart.setAttribute("visibility", "hidden");
    el.routeStart.style.display = "none";
    el.routeEnd.setAttribute("hidden", "");
    el.routeEnd.setAttribute("visibility", "hidden");
    el.routeEnd.style.display = "none";
    const svg = el.svgHost.querySelector("#mapaSVG") || el.svgHost.querySelector("svg");
    if (!svg) return;
    ["mapRouteGlow", "mapRouteCasing", "mapRouteLine", "mapRouteFlow"].forEach((id) => {
      const n = svg.getElementById(id);
      if (n) n.setAttribute("d", "");
    });
    ["mapRouteStart", "mapRouteEnd"].forEach((id) => {
      const n = svg.getElementById(id);
      if (n) n.setAttribute("visibility", "hidden");
    });
  }

  function drawRoute() {
    const origin = resolvePoi("origin");
    const dest = resolvePoi("dest");
    if (origin) { state.origin = origin; el.originInput.value = origin.searchLabel || origin.name; }
    if (dest) { state.dest = dest; el.destInput.value = dest.searchLabel || dest.name; }

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
    if (!options.length) return;

    state.routeOptions = options;
    state.routePickOpen = true;
    selectRoute(0, true);
    el.summary.hidden = false;
    // No celular: fecha o painel para a rota ficar visível e centralizada no mapa
    if (innerWidth <= 860) el.panel.classList.remove("open");
    const n = state.routeOptions.length;
    toast(n > 1
      ? `${n} rotas — Rota 1 (mais curta) selecionada.`
      : "Rota traçada até o destino.");
  }

  function selectRoute(idx, doFit) {
    const options = state.routeOptions || [];
    if (!options.length) return;
    idx = Math.max(0, Math.min(idx, options.length - 1));
    state.routeIdx = idx;
    const route = options[idx];
    state.route = route;
    route.legs = routeLegsFromGraph(route);

    const oLvl = poiLevel(state.origin);
    const dLvl = poiLevel(state.dest);
    const multi = oLvl !== dLvl;
    // se no andar de origem só há o elevador (sem corredor), mostra o trecho do destino
    const originWalk = (route.legs?.[0]?.edgeIds?.length || 0) > 0;
    const viewLevel = multi && !originWalk ? dLvl : oLvl;

    const finish = () => {
      paintActiveRouteLeg();
      el.summaryDist.textContent = fmtMeters(route.length);
      if (el.summaryTime) el.summaryTime.textContent = fmtRouteTime(route.length);
      el.summaryMeta.textContent = multi
        ? `${state.origin.name} → ${state.dest.name} · via elevador (${oLvl}→${dLvl})`
        : `${state.origin.name} → ${state.dest.name}`;
      const steps = buildSteps(route);
      el.steps.innerHTML = steps.map((s) => `
      <li><span class="step-ico"><svg viewBox="0 0 24 24" width="16" height="16">${STEP_ICO[s.ico]}</svg></span>
      <span class="step-txt">${s.txt}${s.dist ? `<span class="step-dist"> · ${s.dist}</span>` : ""}</span></li>`).join("");

      renderRouteOptions();
      state.navIdx = 0;
      if (doFit) {
        // sempre enquadra a rota inteira no campo de visão
        requestAnimationFrame(() => fitRouteInView(route, { navMode: false }));
      }
      if (multi) {
        const arrive = elevatorHub(dLvl);
        toast(`Via elevador: desça em ${arrive?.label || floorTitle(dLvl)} e siga até ${state.dest.name}. Troque o andar para ver cada trecho.`);
      }
    };

    if (state.activeLevel !== viewLevel) {
      setActiveLevel(viewLevel, { silent: true, keepTrip: true }).then(finish);
    } else {
      finish();
    }
  }

  function renderRouteOptions() {
    const options = state.routeOptions || [];
    if (!el.routePick) return;

    if (!options.length) {
      el.routePick.hidden = true;
      el.routeOptions.innerHTML = "";
      return;
    }

    el.routePick.hidden = false;
    if (el.routePickLabel) {
      const cur = options[state.routeIdx];
      el.routePickLabel.textContent = cur?.label || "Rota 1 — Mais curta";
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
          : "Rota 3 — Alternativa mais longa");
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
    state.route = null;
    state.routeOptions = [];
    state.routeIdx = 0;
    state.routePickOpen = false;
    clearRoutePaint();
    el.summary.hidden = true;
    if (el.routePick) el.routePick.hidden = true;
    if (el.routeOptions) { el.routeOptions.hidden = true; el.routeOptions.innerHTML = ""; }
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
    highlightSelected();

    if (state.origin && state.dest) {
      drawRoute();
      return;
    }
    // só troca o mapa ao escolher origem do mesmo fluxo (sem apagar a viagem)
    if (which === "origin" && poi && poiLevel(poi) !== state.activeLevel) {
      setActiveLevel(poiLevel(poi), { silent: true, keepTrip: true });
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
    const q = norm(query);
    return (G.pois || []).filter((p) => {
      enrichPoiMeta(p);
      // filtro de nível (padrão: todos)
      if (state.searchLevel && state.searchLevel !== "all" && (p.level || "L00") !== state.searchLevel) {
        return false;
      }
      // filtro de grupo
      const g = state.searchGroup || "all";
      if (g === "floor") {
        if ((p.level || "L00") !== state.activeLevel) return false;
      } else if (g !== "all") {
        if ((p.group || searchGroupFromPoi(p.rawId, p.name, p.cat)) !== g) return false;
      }
      if (!q) return true;
      const hay = norm([
        p.searchLabel, p.name, p.building, p.level, p.code, p.rawId, CAT_LABEL[p.cat] || "",
      ].filter(Boolean).join(" "));
      return hay.includes(q);
    });
  }

  function renderSuggest(which, query) {
    state.activeField = which;
    const listEl = which === "origin" ? el.originList : el.destList;
    const items = filterPoisForSearch(query);

    let html = "";
    if (which === "origin") {
      html += `<li data-here="1" aria-selected="false"><span class="s-ico"><svg viewBox="0 0 24 24" width="16" height="16"><circle cx="12" cy="12" r="3" fill="currentColor"/><circle cx="12" cy="12" r="8" fill="none" stroke="currentColor" stroke-width="1.6"/></svg></span><span><span class="s-name">Estou aqui (marcar no mapa)</span><span class="s-cat">Usar minha posição</span></span></li>`;
    }
    if (!items.length && which !== "origin") {
      listEl.innerHTML = `<li class="s-empty">Nenhum local neste filtro.</li>`;
      listEl.hidden = false;
      return;
    }
    if (!items.length && which === "origin") {
      listEl.innerHTML = html || `<li class="s-empty">Nenhum local neste filtro.</li>`;
      listEl.hidden = false;
      const hereOnly = listEl.querySelector("li[data-here]");
      if (hereOnly) hereOnly.addEventListener("mousedown", (e) => { e.preventDefault(); startPlacingHere(); });
      return;
    }
    html += items.map((p) => {
      const label = p.searchLabel || `${p.name} — ${p.level || "L00"} — ${p.building || "Campus"}`;
      const meta = `${p.level || "L00"} · ${p.building || "Campus"}`;
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

  function refreshOpenSuggest() {
    if (state.activeField === "origin" && el.originList && !el.originList.hidden) {
      renderSuggest("origin", el.originInput.value);
    } else if (state.activeField === "dest" && el.destList && !el.destList.hidden) {
      renderSuggest("dest", el.destInput.value);
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
      const floors = CONFIG.floors || [];
      el.searchLevelSelect.innerHTML = [
        `<option value="all">Todos os níveis</option>`,
        ...floors.map((f) => {
          const title = f.id === "L00" ? "L00 — Térreo" : f.label;
          return `<option value="${f.id}">${title}</option>`;
        }),
      ].join("");
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
    if (innerWidth <= 860) el.panel.classList.remove("open");
    toast("Toque no mapa onde você está.");
  }

  function placeHere(p) {
    const lvl = state.activeLevel || "L00";
    let snap = null;
    // andares internos: ancora no grafo JSON do mesmo nível (ex.: L01_elevador)
    if (lvl !== "L00" && state.navGraph && globalThis.NavigationRouter) {
      const nid = NavigationRouter.nearestNodeId(p, state.navGraph, { level: lvl });
      const node = nid && state.navGraph.nodesById.get(nid);
      if (node) snap = { id: nid, x: node.x, y: node.y };
      if (!snap) {
        const hub = elevatorHub(lvl);
        const hn = hub && state.navGraph.nodesById.get(hub.nodeId);
        if (hn) snap = { id: hub.nodeId, x: hn.x, y: hn.y };
      }
    } else {
      const routable = nearestRoutableNode(p, true) || nearestRoutableNode(p, false);
      snap = routable
        ? { id: routable.id, x: routable.n.x, y: routable.n.y }
        : snapToNetwork(p);
      if (snap?.id) attachNodeToMeshSafe(snap.id, true);
    }
    if (!snap?.id) { toast("Aproxime-se de um caminho do mapa."); return; }
    state.here = {
      id: "__here__", name: "Estou aqui", x: p.x, y: p.y,
      anchor: snap.id, snap: { x: snap.x, y: snap.y }, cat: "acesso",
      level: lvl, navNodeIds: [snap.id],
    };
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
    toast("Posição definida. Agora escolha o destino.");
  }

  /* ============================================================ PAN / ZOOM
     Zoom altera width/height do SVG (vetor nítido), NÃO usa scale() CSS
     — scale() CSS rasteriza e deixa o mapa borrado em zoom. */
  function apply() {
    const w = G.vbW * state.scale;
    const h = G.vbH * state.scale;
    const svg = el.svgHost.querySelector("svg");
    if (svg) {
      svg.setAttribute("width", w);
      svg.setAttribute("height", h);
    }
    el.overlay.setAttribute("width", w);
    el.overlay.setAttribute("height", h);
    el.canvas.style.width = `${w}px`;
    el.canvas.style.height = `${h}px`;
    const followHeading = state.userNav?.isFollowingHeading && isFinite(state.userNav.cameraBearing);
    if (followHeading) {
      const ox = w / 2;
      const oy = h / 2;
      el.canvas.style.transformOrigin = `${ox}px ${oy}px`;
      el.canvas.style.transform =
        `translate(${state.panX}px, ${state.panY}px) rotate(${state.userNav.cameraBearing}deg)`;
    } else {
      el.canvas.style.transformOrigin = "";
      el.canvas.style.transform = `translate(${state.panX}px, ${state.panY}px)`;
    }
  }
  function clamp() {
    const r = el.viewport.getBoundingClientRect();
    const w = G.vbW * state.scale, h = G.vbH * state.scale, m = 120;
    state.panX = w <= r.width ? (r.width - w) / 2 : Math.min(m, Math.max(r.width - w - m, state.panX));
    state.panY = h <= r.height ? (r.height - h) / 2 : Math.min(m, Math.max(r.height - h - m, state.panY));
  }
  function fit() {
    const r = el.viewport.getBoundingClientRect();
    if (!r.width) return;
    const pad = innerWidth <= 860 ? 24 : 48;
    const sc = Math.min((r.width - pad * 2) / G.vbW, (r.height - pad * 2) / G.vbH);
    state.minScale = Math.max(0.1, sc * 0.7);
    state.scale = sc;
    state.panX = (r.width - G.vbW * sc) / 2;
    state.panY = (r.height - G.vbH * sc) / 2;
    apply();
  }
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
    const w = Math.max(80, maxX - minX);
    const h = Math.max(80, maxY - minY);

    const mobile = innerWidth <= 860;
    const padX = opts.padX ?? (mobile ? 36 : 110);
    const padTop = opts.padTop ?? (mobile ? 64 : 110);
    // reserva espaço inferior (painel / card de navegação) para a rota ficar no campo de visão
    const padBottom = opts.padBottom ?? (mobile
      ? (opts.navMode ? 300 : 170)
      : (opts.navMode ? 220 : 110));

    const availW = Math.max(60, r.width - padX * 2);
    const availH = Math.max(60, r.height - padTop - padBottom);
    const nextScale = Math.min(
      state.maxScale,
      Math.max(state.minScale * 0.5, Math.min(availW / w, availH / h) * 0.92),
    );
    state.scale = nextScale;

    const midX = (minX + maxX) / 2;
    const midY = (minY + maxY) / 2;
    const focusCX = r.width / 2;
    const focusCY = padTop + availH / 2;
    state.panX = focusCX - midX * state.scale;
    state.panY = focusCY - midY * state.scale;
    clamp();
    apply();
  }

  /** Enquadra a rota completa no viewport (origem → destino). */
  function fitRouteInView(route, opts = {}) {
    const pts = route?.points?.filter((p) => p && isFinite(p.x) && isFinite(p.y));
    if (pts?.length >= 1) {
      // inclui pins de origem/destino se existirem
      const extras = [];
      if (state.origin?.snap) extras.push(state.origin.snap);
      else if (state.origin && isFinite(state.origin.x)) extras.push(state.origin);
      if (state.dest?.snap) extras.push(state.dest.snap);
      else if (state.dest && isFinite(state.dest.x)) extras.push(state.dest);
      fitToPoints(pts.concat(extras), opts);
      return;
    }
    const leg = (route?.legs || []).find((l) => l.level === state.activeLevel) || route?.legs?.[0];
    if (leg?.points?.length) fitToPoints(leg.points, opts);
  }
  function zoomAt(factor, cx, cy) {
    const r = el.viewport.getBoundingClientRect();
    cx = cx ?? r.width / 2; cy = cy ?? r.height / 2;
    const mx = (cx - state.panX) / state.scale, my = (cy - state.panY) / state.scale;
    state.scale = Math.min(state.maxScale, Math.max(state.minScale, state.scale * factor));
    state.panX = cx - mx * state.scale; state.panY = cy - my * state.scale;
    clamp(); apply();
  }
  function viewportPoint(e) {
    const r = el.viewport.getBoundingClientRect();
    return { x: (e.clientX - r.left - state.panX) / state.scale, y: (e.clientY - r.top - state.panY) / state.scale };
  }

  /* ============================================================ NAVEGACAO / BUSSOLA */
  function bearingBetween(a, b) {
    // angulo em graus, 0 = para cima (norte do mapa), sentido horario
    return (Math.atan2(b.x - a.x, -(b.y - a.y)) * 180) / Math.PI;
  }

  function navSegments() {
    const p = state.route?.points || [];
    return Math.max(0, p.length - 1);
  }

  function enterNav() {
    if (!state.route?.points?.length) { toast("Trace uma rota primeiro."); return; }
    if (navSegments() < 1) { toast("Rota inválida para navegação."); return; }
    state.navIdx = 0;
    if (innerWidth <= 860) el.panel.classList.remove("open");
    el.navOverlay.hidden = false;
    el.navOverlay.classList.add("is-open");
    el.navOverlay.setAttribute("aria-hidden", "false");
    document.body.classList.add("is-navigating");
    // recentraliza a rota deixando espaço para o card inferior no celular
    requestAnimationFrame(() => fitRouteInView(state.route, { navMode: true }));
    requestOrientation();
    updateNav();

    state.userLocation?.startFollowing?.().catch(() => {
      state.userLocation?.start?.({ silent: true });
    });
  }

  function exitNav(msg) {
    state.gpsOrientation?.getTracking()?.stop();
    state.gpsOrientation?.setGpsButtonState?.("IDLE");
    el.navOverlay.hidden = true;
    el.navOverlay.classList.remove("is-open");
    el.navOverlay.setAttribute("aria-hidden", "true");
    document.body.classList.remove("is-navigating");
    state.navIdx = 0;
    if (msg) toast(msg);
  }

  function navPrev() {
    if (!state.route) return;
    state.navIdx = Math.max(0, state.navIdx - 1);
    updateNav();
  }

  function navNext() {
    if (!state.route) return;
    const total = navSegments();
    if (total < 1) { exitNav("Rota inválida."); return; }
    if (state.navIdx >= total - 1) {
      exitNav("Você chegou ao destino!");
      return;
    }
    state.navIdx += 1;
    updateNav();
  }

  function updateNav() {
    const p = state.route?.points;
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
    el.compassArrow.style.transform = `rotate(${mapBearing - state.heading}deg)`;

    const segLen = dist(from, to);
    const isLast = i >= total - 1;
    if (isLast) {
      el.navStepText.textContent = `Chegando: ${state.dest?.name || "destino"}`;
    } else {
      const t = turnLabel(p[i], p[i + 1], p[i + 2] || to);
      el.navStepText.textContent = t.txt;
    }
    el.navDistText.textContent = `${fmtMeters(segLen)} · trecho ${i + 1} de ${total}`;
    el.navHint.textContent = state._hasOrientation
      ? "Aponte o celular à frente: a seta indica a direção."
      : "Bússola indisponível — a seta usa o norte do mapa.";

    el.navPrev.disabled = i <= 0;
    el.navNext.textContent = isLast ? "Chegar" : "Próximo";
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

  /* ============================================================ ANDARES (L00–L07) */
  function levelFromId(id) {
    const m = String(id || "").match(/(?:^|_)(L0[0-7])(?=_|$)/i) || String(id || "").match(/\b(L0[0-7])\b/i);
    return m ? m[1].toUpperCase() : null;
  }

  function floorById(id) {
    return (CONFIG.floors || []).find((f) => f.id === id) || null;
  }

  function poisForActiveLevel() {
    return (G.pois || []).filter((p) => (p.level || "L00") === state.activeLevel);
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
    const floors = CONFIG.floors || [];
    el.floorMenu.innerHTML = floors.map((f) => {
      const selected = f.id === state.activeLevel;
      const meta = f.mapUrl ? `${f.title} · base` : (f.ready ? f.title : "Em breve");
      return `<li role="option">
        <button type="button" class="floor-menu__item" data-floor="${f.id}"
          aria-selected="${selected ? "true" : "false"}">
          <span>${f.label}</span>
          <span class="floor-menu__meta">${meta}</span>
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
    const floor = floorById(state.activeLevel) || { id: "L00", title: "Térreo · Campus", ready: true };
    if (el.floorHint) {
      if (floor.mapUrl) {
        el.floorHint.textContent = `${floor.title} · mapa base (${floor.id})`;
      } else if (floor.ready) {
        el.floorHint.textContent = `${floor.title} (${floor.id})`;
      } else {
        el.floorHint.textContent = `${floor.label} · mapa em preparação`;
      }
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

  /** Mostra só POIs L00 no campus; andares com SVG próprio usam showFloorMap. */
  function applyFloorVisibility() {
    const host = state.floorViews.L00 || el.svgHost?.querySelector("#mapaSVG");
    if (!host) return;
    const active = state.activeLevel || "L00";
    host.querySelectorAll("[data-poi]").forEach((node) => {
      const poi = G.pois.find((p) => p.id === node.getAttribute("data-poi"));
      const lvl = poi?.level || "L00";
      const on = active === "L00" && lvl === "L00";
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
    const hasOwnBg = !!svg.querySelector("[data-floor-bg], #L01_adm_map_bacground > rect, rect.cls-4");
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
    return svg;
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
      if (state.route) paintActiveRouteLeg();
      fit();
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
      if (state.route) paintActiveRouteLeg();
      else clearRoutePaint();
      fit();
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

    await showFloorMap(floor.id);
    if (state.route) paintActiveRouteLeg();
    updateFloorChrome();
    closeSuggest();

    const n = poisForActiveLevel().length;
    if (!opts.silent) {
      if (state.route && multiTrip) {
        toast(`${floor.title}: trecho da rota neste andar`);
      } else if (floor.ready && floor.mapUrl) {
        toast(`${floor.title} · mapa base carregado`);
      } else if (floor.ready) {
        toast(`${floor.title} · ${n} local${n === 1 ? "" : "is"}`);
      } else {
        toast(`${floor.label} selecionado — mapa em preparação`);
      }
    }
    if (el.statusHint) {
      if (state.route && multiTrip) {
        el.statusHint.textContent = `${floor.title}: trecho da rota · via elevador`;
      } else if (floor.mapUrl) {
        el.statusHint.textContent = `${floor.title}: mapa base (salas em breve)`;
      } else if (floor.ready) {
        el.statusHint.textContent = `${floor.title}: ${n} locais`;
      } else {
        el.statusHint.textContent = `${floor.label}: aguardando mapa e salas`;
      }
    }
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
    el.originInput.addEventListener("focus", () => renderSuggest("origin", el.originInput.value));
    el.originInput.addEventListener("input", () => { state.origin = null; renderSuggest("origin", el.originInput.value); });
    el.destInput.addEventListener("focus", () => renderSuggest("dest", el.destInput.value));
    el.destInput.addEventListener("input", () => { state.dest = null; renderSuggest("dest", el.destInput.value); });
    document.addEventListener("pointerdown", (e) => {
      if (!e.target.closest(".field") && !e.target.closest(".suggest") && !e.target.closest("#browseBar")) {
        closeSuggest();
      }
    });

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
    el.navBtn.addEventListener("click", (e) => { e.preventDefault(); enterNav(); });

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
    el.panelToggle.addEventListener("click", (e) => { e.preventDefault(); el.panel.classList.toggle("open"); });

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
      if (state.placingHere) { placeHere(viewportPoint(e)); return; }
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
    addEventListener("resize", () => setTimeout(fit, 120));
  }

  /* ============================================================ INIT */
  setupDevUi();
  initTheme();
  initBrowseFilters();
  bind();
  loadSVG();
})();
