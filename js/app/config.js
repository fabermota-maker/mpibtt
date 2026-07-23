/** Configuração principal — mapa PIB Curitiba */
(function (global) {
  "use strict";
  global.PIBMapConfig = {
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
    snapTol: 8,        // encaixe genérico entre nós (~2,8 m com escala 0,35)
    // Fallback global; preferir toleranceByZone (indoor/outdoor/parking)
    edgeEndpointTol: 20, // ponta de edge ↔ node oficial
    spurTol: 55,       // ícone POI ↔ malha (só visualização da rota)
    edgeSnapTol: 100,  // POI → edge de entrada (fallback)
    entranceTol: 100,  // node oficial de porta ↔ POI (fallback)
    bridgeTol: 6,      // micro-folgas da malha oficial
    componentBridgeTol: 22, // une componentes por folga de exportação (efetivo ≤ bridgeTol×3)
    // Por zona — validar em paredes finas, salas vizinhas, corredores paralelos, estacionamento e templo
    toleranceByZone: {
      indoor: {
        edgeEndpointTol: 18,
        entranceTol: 95,
        edgeSnapTol: 85,
        spurTol: 48,
      },
      outdoor: {
        edgeEndpointTol: 24,
        entranceTol: 130,
        edgeSnapTol: 140,
        spurTol: 72,
      },
      parking: {
        edgeEndpointTol: 22,
        entranceTol: 105,
        edgeSnapTol: 110,
        spurTol: 62,
      },
    },
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
      entrada_ginasio: "L00_N0020_intersection_sevenpass_estaionamento",
      min_esportes: "L00_N0019_intersection_entrada_seven_pass_elevador",
      encomun: "B02_node_0012_comunicacao_encomun",
      sala_albert: "B02_node_0004_albert",
      L04_poi_0016: "L04_node_0023_auditorio_l01",
    },
    // rótulos oficiais na busca (podem diferir do ícone no mapa)
    poiDisplayNames: {
      P005_centro_de_formacao: "Centro de Formação CF",
      min_esportes: "Min. esportes",
      encomun: "Encomun",
    },
    // atalhos de busca → rawId do POI
    poiSearchAliases: {
      P005_centro_de_formacao: ["cf", "centro de formacao cf", "centro formacao cf", "formacao cf"],
      P004_sala_de_oracao_RGO: ["rgo", "sala rgo", "sala de oracao rgo", "oracao", "oração"],
      min_esportes: ["min esportes", "ministerio esportes", "ministerio de esportes", "esportes"],
      encomun: ["encomun", "comunicacao", "comunicação", "rede super", "sala 08", "sala 08 b02"],
      sala_albert: ["sala albert", "albert", "sala abert", "sala 06", "sala 06 b02"],
      P000_templo: ["templo", "igreja"],
      P016_jardim: ["jardim"],
      entrada_ginasio: ["ginasio", "ginásio", "seven pass", "sevenpass"],
      B02_entrada_narnia: ["entrada de narnia", "entrada narnia", "porta de narnia", "narnia"],
      B01_entrada_narnia: ["entrada de narnia b01", "entrada narnia b01", "porta de narnia b01"],
      B02_entrada_narnia_map: ["entrada narnia b02", "porta de narnia b02"],
    },
    // limita opções de rota em pares específicos (evita desvios absurdos no grafo)
    routeOptionCaps: [
      {
        a: ["P005_centro_de_formacao", "P004_sala_de_oracao_RGO"],
        b: ["min_esportes"],
        max: 3,
      },
    ],
    // centro visual (planta local ADM) → pin de origem/destino nos andares internos
    poiIconLocal: {
      L04_poi_0016: { x: 82, y: 118 },
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
      // Jardim / Espaço Servir ↔ Entrada do toldo (e kids/refeitório): por fora, sul do templo
      {
        a: ["P016_jardim", "P020_espaco_servir"],
        b: [
          "P001_entrada_principal_toldo",
          "P007_area_kids",
          "P008_refeitorio_externo",
        ],
        via: [
          "L00_N0027",
          "L00_N0008_templo_estacionamento",
          "L00_N0009_templo_entrada_principal_toldo_narnia",
        ],
        label: "Por fora da igreja",
        // trecho leste do templo toca a zona de estacionamento no grafo
        avoidParking: false,
        allowParking: true,
      },
      // Nárnia / lado leste → Templo: sul do templo → Jardim → entrada lateral oeste
      {
        a: [
          "B02_entrada_narnia",
          "P028_B02_entrada_narnia",
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
          "L01_node_0001_elevador",
          "L02_node_0001_elevador",
        ],
        via: ["L00_N0027", "L00_N0030"],
        endNodes: ["L00_N0029"],
        label: "Pelo jardim",
        avoidParking: false,
      },
      // CF / Sala de Oração RGO → Templo: sai pela lateral Av. Batel e reentra na entrada principal
      {
        a: [
          "P005_centro_de_formacao",
          "P004_sala_de_oracao_RGO",
        ],
        b: [
          "P000_templo",
          "P027_elevador_templo",
          "escada_mesanino_01",
          "escada_mesanino_02",
          "L01_node_0001_elevador",
          "L02_node_0001_elevador",
          "L03_node_0001",
          "L04_node_0001_elevador",
          "L05_node_0001_elevador",
          "L06_node_0033_elevador",
        ],
        via: [
          "L00_N0032",
          "L00_N0093_entrada_estacionamento_av_batel",
          "L00_N0083",
          "L00_N0082",
          "L00_N0081",
        ],
        endNodes: ["L00_N0084", "L00_N0068"],
        label: "Entrada/saída · Av. Batel",
        avoidParking: false,
        allowParking: true,
        slot: 4,
      },
      // CF / RGO → Jardim / Espaço Servir: lateral Av. Batel (sem dar volta ao templo)
      {
        a: [
          "P005_centro_de_formacao",
          "P004_sala_de_oracao_RGO",
        ],
        b: [
          "P016_jardim",
          "P020_espaco_servir",
        ],
        via: [
          "L00_N0032",
          "L00_N0093_entrada_estacionamento_av_batel",
          "L00_N0083",
          "L00_N0082",
          "L00_N0081",
        ],
        endNodes: ["L00_N0030", "L00_N0028"],
        label: "Entrada/saída · Av. Batel",
        avoidParking: false,
        allowParking: true,
      },
      // Estacionamento conveniado → Templo: lateral Av. Batel (sem desvio pelo CF)
      {
        a: ["P003_estacionamento_01"],
        b: [
          "P000_templo",
          "P027_elevador_templo",
          "escada_mesanino_01",
          "escada_mesanino_02",
          "L01_node_0001_elevador",
          "L02_node_0001_elevador",
          "L03_node_0001",
          "L04_node_0001_elevador",
          "L05_node_0001_elevador",
          "L06_node_0033_elevador",
        ],
        via: [
          "L00_N0093_entrada_estacionamento_av_batel",
          "L00_N0083",
          "L00_N0082",
          "L00_N0081",
        ],
        endNodes: ["L00_N0084", "L00_N0068"],
        label: "Entrada/saída · Av. Batel",
        avoidParking: false,
        allowParking: true,
        slot: 4,
      },
      // Estacionamento 02 → Templo: lateral Av. Batel
      {
        a: ["P006_estacionamento_02"],
        b: [
          "P000_templo",
          "P027_elevador_templo",
          "escada_mesanino_01",
          "escada_mesanino_02",
          "L01_node_0001_elevador",
          "L02_node_0001_elevador",
          "L03_node_0001",
          "L04_node_0001_elevador",
          "L05_node_0001_elevador",
          "L06_node_0033_elevador",
        ],
        via: [
          "L00_N0032",
          "L00_N0093_entrada_estacionamento_av_batel",
          "L00_N0083",
          "L00_N0082",
          "L00_N0081",
        ],
        endNodes: ["L00_N0084", "L00_N0068"],
        label: "Entrada/saída · Av. Batel",
        avoidParking: false,
        allowParking: true,
        slot: 4,
      },
      // Estacionamento 02 → Jardim / Espaço Servir: lateral Av. Batel
      {
        a: ["P006_estacionamento_02"],
        b: [
          "P016_jardim",
          "P020_espaco_servir",
        ],
        via: [
          "L00_N0032",
          "L00_N0093_entrada_estacionamento_av_batel",
          "L00_N0083",
          "L00_N0082",
          "L00_N0081",
        ],
        endNodes: ["L00_N0030", "L00_N0028"],
        label: "Entrada/saída · Av. Batel",
        avoidParking: false,
        allowParking: true,
      },
    ],
    // Nível lógico (exibição/filtro) × mapa de rota (ícone/grafo)
    // Espaço Servir fica no B01, mas o acesso caminhável está no L00 (Jardim / lateral templo).
    poiLevels: {
      P016_jardim: {
        level: "L00",
        mapLevel: "L00",
        building: "Jardim",
      },
      P020_espaco_servir: {
        level: "B01",
        mapLevel: "L00",
        building: "Subsolo 01",
        accessNote:
          "Acesso descendo pelo Jardim (L00) ou pela lateral do templo, próximo à entrada de pedestres da Av. Bento Viana",
      },
    },
    // Andares: L00 = térreo/campus; L01–L07 = andares; B01/B02 = subsolos
    floors: [
      { id: "L00", label: "L00", title: "Térreo", subtitle: "Ação Social, Aconselhamento, Plantão Pastoral", ready: true },
      { id: "L01", label: "L01", title: "1º andar", subtitle: "Min. Infantil · TDP (2 a 5 anos)", ready: true, mapUrl: "assets/mapa-L01.svg" },
      { id: "L02", label: "L02", title: "2º andar", subtitle: "Mulheres e Idosos · TDP (6 e 7 anos)", ready: true, mapUrl: "assets/mapa-L02.svg" },
      { id: "L03", label: "L03", title: "3º andar", subtitle: "Juventude e Educação Cristã", ready: true, mapUrl: "assets/mapa-L03.svg" },
      { id: "L04", label: "L04", title: "4º andar", subtitle: "Min. Infantil · Espaço START (8 e 9 anos)", ready: true, mapUrl: "assets/mapa-L04.svg" },
      { id: "L05", label: "L05", title: "5º andar", subtitle: "Ministérios: Administração, RH, TI, Missões e Eficiente", ready: true, mapUrl: "assets/mapa-L05.svg" },
      { id: "L06", label: "L06", title: "6º andar", subtitle: "Ministérios: Pastoral, Adoração, Integração, Células, Movimento Discipular, Família", ready: true, mapUrl: "assets/mapa-L06.svg" },
      { id: "L07", label: "L07", title: "7º andar", subtitle: "Espaço ao Ar Livre", ready: false, hidden: true },
      { id: "B01", label: "B01", title: "Subsolo 01", subtitle: "Pastoreo, Espaço Servir, Estúdio ensaio", ready: true, mapUrl: "assets/mapa-B01.svg" },
      { id: "B02", label: "B02", title: "Subsolo 02 · Nárnia", subtitle: "Comunicação, Rádio, Estúdios e Transmissão", ready: true, mapUrl: "assets/mapa-B02.svg" },
    ],
    // hubs de elevador por andar (conexão vertical)
    narniaHub: {
      L00: "L00_N0014_entrada_narnia_B02",
      B01: "B01_node_0013_entrada_narnia",
      B02: "B02_node_0014_entrada_narnia",
    },
    narniaGateLabels: {
      L00: "Porta de Nárnia (Térreo)",
      B01: "Porta de Nárnia (Subsolo 01)",
      B02: "Porta de Nárnia (Subsolo 02 · Nárnia)",
    },
    /** Ícone exato do lampião / poste — origem e fim de rota na Entrada de Nárnia. */
    narniaGateIcons: {
      L00: { x: 434.5, y: 738.2, nodeId: "L00_N0014_entrada_narnia_B02" },
      B01: { x: 456.19, y: 174.68, nodeId: "B01_node_0013_entrada_narnia" },
      B02: { x: 303.82, y: 102.53, nodeId: "B02_node_0014_entrada_narnia" },
    },
    narniaPoiRawIds: [
      "B02_entrada_narnia",
      "B01_entrada_narnia",
      "B02_entrada_narnia_map",
      "P028_B02_entrada_narnia",
    ],
    /** Atalhos B01↔B02 / B01↔L00 que não passam pela entrada de Nárnia no T. */
    narniaForbiddenEdges: [
      "B01_B02_E_acesso_servir",
      "B01_B02_E_batisterio",
      "L00_B01_E_escada_batisterio",
    ],
    elevatorHubs: {
      L00: { nodeId: "L00_N0077", label: "Elevador Templo" },
      L01: { nodeId: "L01_node_0001_elevador", label: "Elevador (1º andar)" },
      L02: { nodeId: "L02_node_0001_elevador", label: "Elevador (2º andar)" },
      L03: { nodeId: "L03_node_0001", label: "Elevador (3º andar)" },
      L04: { nodeId: "L04_node_0001_elevador", label: "Elevador (4º andar)" },
      L05: { nodeId: "L05_node_0001_elevador", label: "Elevador (5º andar)" },
      L06: { nodeId: "L06_node_0033_elevador", label: "Elevador (6º andar)" },
    },
    // hubs da escada lateral — L00 = ícone Escadas ao lado do Berçário START
    stairHubs: {
      L00: { nodeId: "L00_N0075", label: "Escadas (Berçário START)" },
      L01: { nodeId: "L01_node_0040_escada_lateral", label: "Escada lateral (1º andar)" },
      L02: { nodeId: "L02_node_0003_escada_laral", label: "Escada lateral (2º andar)" },
      L03: { nodeId: "L03_node_0003", label: "Escada lateral (3º andar)" },
      L04: { nodeId: "L04_node_0024_escada_lateral", label: "Escada lateral (4º andar)" },
      L05: { nodeId: "L05_node_0039_escada_lateral", label: "Escada lateral (5º andar)" },
      L06: { nodeId: "L06_node_0035_escada_lateral", label: "Escada lateral (6º andar)" },
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
})(typeof window !== "undefined" ? window : globalThis);
