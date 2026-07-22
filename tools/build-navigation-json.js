/**
 * Gera data/navigation.json a partir dos SVGs oficiais.
 * Runtime NÃO cria conexões — só este build mapeia edges SVG → from/to de nodes.
 */
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const ASSETS = path.join(ROOT, "assets");
const OUT = path.join(ROOT, "data", "navigation.json");

const SNAP_TOL = 24; // folga Illustrator entre ponta de edge e node (ex.: CF ↔ malha principal)
const METERS_PER_UNIT = 0.35; // fallback até calibração confirmada
const LEVEL = "L00";

const PARKING_ZONES = [
  { x0: 480, y0: 545, x1: 990, y1: 870 },
  { x0: 340, y0: 270, x1: 450, y1: 350 },
];

const POI_ANCHORS = {
  P000_templo: [
    "L00_N0084",
    "L00_N0068",
    "L00_N0016_entrada_lateral_templo_02",
    "L00_N0029",
    "L00_N0013_entrada_lateral_templo_01",
  ],
  P001_entrada_principal_toldo: ["L00_N0023_intersection_entrada_toldo"],
  P002_capela: ["L00_N0064"],
  P003_estacionamento_01: ["L00_N0017_estacionamento"],
  P004_sala_de_oracao_RGO: ["L00_N0038"],
  P005_centro_de_formacao: ["L00_N0034"],
  P006_estacionamento_02: ["L00_N0031"],
  P007_area_kids: ["L00_N0051"],
  P008_refeitorio_externo: ["L00_N0025"],
  P009_livraria_evangelica: ["L00_N0076"],
  P010_espaco_conexao: ["L00_N0078"],
  P011_bercario: ["L00_N0071"],
  P012_sala_de_oracao_cleusa: ["L00_N0059"],
  P013_recepcao: ["L00_N0061"],
  P014_seven_pass: ["L00_N0047"],
  P015_bazar_abasc: ["L00_N0046"],
  P016_jardim: ["L00_N0030"],
  P017_espaco_acolher_ceara: ["L00_N0072"],
  P018_abasc: ["L00_N0057"],
  P019_banheiro_familia: ["L00_N0070"],
  P020_espaco_servir: ["L00_N0028"],
  P021_banheiro_feminino_ginasio: ["L00_N0050_banheiro_feminino_ginasio"],
  P022_banheiro_masculino_ginasio: ["L00_N0045_banheiro_masculino_ginasio"],
  P023_banheiro_feminino: ["L00_N0066"],
  P024_banheiro_masculino: ["L00_N0065"],
  P025_banheiro_masculino_feminino: ["L00_N0054"],
  P026_elevador_ginasio: ["L00_N0019_intersection_entrada_seven_pass_elevador"],
  P027_elevador_templo: ["L00_N0077"],
  P028_estacionamento_moto: ["L00_N0007_estacionamento_motos"],
  B02_entrada_narnia: ["L00_N0014_entrada_narnia_B02"],
  P029_entrada_pedestre_02_batel: ["L00_N0082"],
  P030_entrada_estacionamento_av_batel: ["L00_N0093_entrada_estacionamento_av_batel"],
  P031_entrada_estacionamento_bento_viana: ["L00_N0002_entrada_estacionamento_principal_bento"],
};

/** Nível lógico / mapa / acesso (ex.: Espaço Servir = B01, ícone no L00). */
const POI_LEVEL_META = {
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
};

/** Nós/edges/POIs extras (preservados no rebuild). */
const { buildL01FloorLinks } = require("./l01-floor-data");
const { buildL02FloorLinks } = require("./l02-floor-data");
const { buildL03FloorLinks } = require("./l03-floor-data");
const { buildL04FloorLinks } = require("./l04-floor-data");
const { buildL05FloorLinks } = require("./l05-floor-data");
const { buildL06FloorLinks } = require("./l06-floor-data");
const { buildB01FloorLinks } = require("./b01-floor-data");
const { buildB02FloorLinks } = require("./b02-floor-data");
const { buildAdmStairLinks } = require("./adm-stair-links");
const L01_LINKS = buildL01FloorLinks();
const L02_LINKS = buildL02FloorLinks();
const L03_LINKS = buildL03FloorLinks();
const L04_LINKS = buildL04FloorLinks();
const L05_LINKS = buildL05FloorLinks();
const L06_LINKS = buildL06FloorLinks();
const B01_LINKS = buildB01FloorLinks();
const B02_LINKS = buildB02FloorLinks();
const STAIR_LINKS = buildAdmStairLinks();

const FLOOR_LINKS = {
  nodes: [
    { id: "escada_mesanino_01", level: "L00", x: 236.5, y: 485, active: true, hidden: true },
    { id: "escada_mesanino_02", level: "L00", x: 465.5, y: 485, active: true, hidden: true },
    ...L01_LINKS.nodes,
    ...L02_LINKS.nodes,
    ...L03_LINKS.nodes,
    ...L04_LINKS.nodes,
    ...L05_LINKS.nodes,
    ...L06_LINKS.nodes,
    ...B01_LINKS.nodes,
    ...B02_LINKS.nodes,
    ...STAIR_LINKS.nodes,
  ],
  edges: [
    {
      id: "L00_E_escada_mesanino_01",
      from: "L00_N0085",
      to: "escada_mesanino_01",
      path: [
        { x: 237.3, y: 476.98 },
        { x: 236.5, y: 485 },
      ],
      distanceMeters: 2.82,
      bidirectional: true,
      accessible: false,
      active: true,
      level: "L00",
      zone: "indoor",
      type: "stairs",
      parkingLot: false,
    },
    {
      id: "L00_E_escada_mesanino_02",
      from: "L00_N0062",
      to: "escada_mesanino_02",
      path: [
        { x: 466.06, y: 475.41 },
        { x: 465.5, y: 485 },
      ],
      distanceMeters: 3.36,
      bidirectional: true,
      accessible: false,
      active: true,
      level: "L00",
      zone: "indoor",
      type: "stairs",
      parkingLot: false,
    },
    // Calçadão lateral oeste — Av. Batel (CF/RGO → sul, sem dar volta ao estacionamento)
    {
      id: "L00_E_lateral_batel_norte",
      from: "L00_N0032",
      to: "L00_N0093_entrada_estacionamento_av_batel",
      path: [
        { x: 10.69, y: 269.38 },
        { x: 21.39, y: 269.38 },
        { x: 21.5, y: 347 },
      ],
      distanceMeters: 32.2,
      bidirectional: true,
      accessible: true,
      active: true,
      level: "L00",
      zone: "outdoor",
      type: "outdoor_path",
      parkingLot: false,
    },
    {
      id: "L00_E_lateral_batel_sul",
      from: "L00_N0083",
      to: "L00_N0082",
      path: [
        { x: 21.86, y: 429.51 },
        { x: 20.51, y: 457.4 },
      ],
      distanceMeters: 9.8,
      bidirectional: true,
      accessible: true,
      active: true,
      level: "L00",
      zone: "outdoor",
      type: "outdoor_path",
      parkingLot: false,
    },
    ...L01_LINKS.edges,
    ...L02_LINKS.edges,
    ...L03_LINKS.edges,
    ...L04_LINKS.edges,
    ...L05_LINKS.edges,
    ...L06_LINKS.edges,
    ...B01_LINKS.edges,
    ...B02_LINKS.edges,
    ...STAIR_LINKS.edges,
  ],
  pois: [
    {
      id: "L00_P_escada_mesanino_01",
      rawId: "escada_mesanino_01",
      name: "Escadas mezanino templo 01",
      nodeIds: ["escada_mesanino_01"],
      active: true,
      cat: "acesso",
      level: "L00",
      building: "Templo",
      group: "salas",
      inject: true,
    },
    {
      id: "L00_P_escada_mesanino_02",
      rawId: "escada_mesanino_02",
      name: "Escadas mezanino templo 02",
      nodeIds: ["escada_mesanino_02"],
      active: true,
      cat: "acesso",
      level: "L00",
      building: "Templo",
      group: "salas",
      inject: true,
    },
    {
      id: "L00_P_entrada_ginasio",
      rawId: "entrada_ginasio",
      name: "Ginásio",
      nodeIds: ["L00_N0020_intersection_sevenpass_estaionamento"],
      active: true,
      cat: "acesso",
      level: "L00",
      mapLevel: "L00",
      building: "Ginásio",
      group: "salas",
      inject: true,
    },
    {
      id: "L00_P_min_esportes",
      rawId: "min_esportes",
      name: "Min. Esportes",
      nodeIds: ["L00_N0019_intersection_entrada_seven_pass_elevador"],
      active: true,
      cat: "acesso",
      level: "L00",
      mapLevel: "L00",
      building: "Ginásio",
      group: "salas",
      accessNote: "Entrada pelo elevador lateral",
      inject: true,
    },
    ...L01_LINKS.pois,
    ...L02_LINKS.pois,
    ...L03_LINKS.pois,
    ...L04_LINKS.pois,
    ...L05_LINKS.pois,
    ...L06_LINKS.pois,
    ...B01_LINKS.pois,
    ...B02_LINKS.pois,
    ...STAIR_LINKS.pois,
  ],
};

function dist(a, b) {
  const dx = a.x - b.x, dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
}

function pathLength(pts) {
  let t = 0;
  for (let i = 1; i < pts.length; i++) t += dist(pts[i - 1], pts[i]);
  return t;
}

function inParkingZone(p) {
  return PARKING_ZONES.some((z) => p.x >= z.x0 && p.x <= z.x1 && p.y >= z.y0 && p.y <= z.y1);
}

function extractLayer(svg, layerId) {
  const esc = layerId.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const reG = new RegExp(`<g[^>]*\\bid=["']${esc}["'][^>]*>([\\s\\S]*?)<\\/g>`, "i");
  const mG = svg.match(reG);
  if (mG) return mG[1];
  // arquivo 2026 limpo: conteúdo no próprio <svg id="...">
  const reSvg = new RegExp(`<svg[^>]*\\bid=["']${esc}["'][^>]*>([\\s\\S]*?)<\\/svg>`, "i");
  const mSvg = svg.match(reSvg);
  if (mSvg) return mSvg[1].replace(/<defs[\s\S]*?<\/defs>/i, "");
  return "";
}

function extractEdgeContent(svgText, layerIds) {
  for (const id of layerIds) {
    const html = extractLayer(svgText, id);
    if (html && /<(line|polyline)\b/i.test(html)) return html;
  }
  return svgText;
}

function parsePointsAttr(raw) {
  const nums = (raw || "").trim().split(/[\s,]+/).map(Number).filter((n) => isFinite(n));
  const pts = [];
  for (let i = 0; i + 1 < nums.length; i += 2) pts.push({ x: nums[i], y: nums[i + 1] });
  return pts;
}

function extractShapes(layerHtml) {
  const shapes = [];
  const lineRe = /<line\b([^>]*)\/?>/gi;
  let m;
  while ((m = lineRe.exec(layerHtml))) {
    const attrs = m[1];
    const x1 = +(/x1=["']([^"']+)/.exec(attrs) || [])[1];
    const y1 = +(/y1=["']([^"']+)/.exec(attrs) || [])[1];
    const x2 = +(/x2=["']([^"']+)/.exec(attrs) || [])[1];
    const y2 = +(/y2=["']([^"']+)/.exec(attrs) || [])[1];
    if ([x1, y1, x2, y2].every(isFinite)) {
      shapes.push([{ x: x1, y: y1 }, { x: x2, y: y2 }]);
    }
  }
  const polyRe = /<polyline\b([^>]*)\/?>/gi;
  while ((m = polyRe.exec(layerHtml))) {
    const ptsAttr = (/points=["']([^"']+)/.exec(m[1]) || [])[1];
    const pts = parsePointsAttr(ptsAttr);
    if (pts.length >= 2) shapes.push(pts);
  }
  return shapes;
}

function parseNodes(svg) {
  const nodes = [];
  const re = /<circle\b([^>]*)\/?>/gi;
  let m;
  while ((m = re.exec(svg))) {
    const attrs = m[1];
    const id = (/id=["']([^"']+)/.exec(attrs) || [])[1];
    const cx = +(/cx=["']([^"']+)/.exec(attrs) || [])[1];
    const cy = +(/cy=["']([^"']+)/.exec(attrs) || [])[1];
    if (!id || !/^L00_N/i.test(id) || !isFinite(cx) || !isFinite(cy)) continue;
    nodes.push({ id, level: LEVEL, x: cx, y: cy, active: true });
  }
  return nodes;
}

const PT_LOWER_WORDS = new Set([
  "de", "da", "do", "das", "dos", "e", "em", "na", "no", "nas", "nos",
  "a", "o", "as", "os", "por", "com", "sem",
]);

function titleCasePoiWords(text) {
  const words = String(text || "").trim().split(/\s+/).filter(Boolean);
  return words.map((word, i) => {
    if (/^[A-Z0-9]{2,}$/.test(word)) return word;
    const lower = word.toLowerCase();
    if (i > 0 && PT_LOWER_WORDS.has(lower)) return lower;
    if (word.length <= 2 && /^[a-zA-Z]+$/.test(word)) return word.toUpperCase();
    return lower.charAt(0).toUpperCase() + lower.slice(1);
  }).join(" ");
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

function decodePoiName(rawId, dataName) {
  if (dataName && dataName.trim() && !/^P\d+/i.test(dataName) && !/^B\d+/i.test(dataName)) {
    return applySlugAcronyms(titleCasePoiWords(dataName.trim()), rawId);
  }
  let s = dataName || rawId || "";
  s = s.replace(/_x5F_/g, "_");
  s = s.replace(/^P\d+[_-]?/i, "").replace(/^B\d+[_-]?/i, "");
  s = s.replace(/[_-]+/g, " ").trim();
  if (!s) return rawId;
  return applySlugAcronyms(titleCasePoiWords(s), rawId);
}

function parsePois(svg, nodeIds) {
  const nodeSet = new Set(nodeIds);
  const pois = [];
  const seen = new Set();
  const re = /<(?:g|path)\b([^>]*\bid=["'](?:P\d+|B\d+_)[^"']*["'][^>]*)>/gi;
  let m;
  while ((m = re.exec(svg))) {
    const attrs = m[1];
    const id = (/id=["']([^"']+)/.exec(attrs) || [])[1];
    if (!id || seen.has(id)) continue;
    if (!/^(P\d+|B\d+_)/i.test(id)) continue;
    seen.add(id);
    const dataName = (/data-name=["']([^"']+)/.exec(attrs) || [])[1];
    const name = decodePoiName(id, dataName);
    let anchors = POI_ANCHORS[id] || [];
    anchors = anchors.filter((n) => nodeSet.has(n));
    if (!anchors.length) {
      // fallback: node cujo slug bate parcialmente
      const slug = id.replace(/^(P|B)\d+_?/i, "").toLowerCase();
      const hit = [...nodeSet].find((n) => n.toLowerCase().includes(slug.slice(0, 8)));
      if (hit) anchors = [hit];
    }
    if (!anchors.length) continue;
    const meta = POI_LEVEL_META[id] || {};
    const level = meta.level || "L00";
    pois.push({
      id: id.startsWith("L00_P") || id.startsWith("B0")
        ? id
        : `${level}_P_${id}`,
      rawId: id,
      name: id === "P020_espaco_servir" ? "Espaço Servir" : name,
      level,
      mapLevel: meta.mapLevel || level,
      building: meta.building,
      accessNote: meta.accessNote,
      nodeIds: anchors,
      active: true,
      cat: /estacionamento/i.test(id + name) ? "estacionamento" : "geral",
    });
  }
  return pois;
}

function nearestNodeId(p, nodes, tol) {
  let best = null, bestD = Infinity;
  for (const n of nodes) {
    const d = dist(p, n);
    if (d < bestD) { bestD = d; best = n.id; }
  }
  return bestD <= tol ? best : null;
}

function edgeKey(a, b) {
  return a < b ? `${a}|${b}` : `${b}|${a}`;
}

function buildEdges(shapes, zone, nodes) {
  const edges = [];
  const seen = new Set();
  let seq = 1;

  for (const pts of shapes) {
    if (pts.length < 2) continue;
    const from = nearestNodeId(pts[0], nodes, SNAP_TOL);
    const to = nearestNodeId(pts[pts.length - 1], nodes, SNAP_TOL);
    if (!from || !to || from === to) continue;

    const key = edgeKey(from, to);
    const units = pathLength(pts);
    if (units < 0.05) continue;

    // se já existe aresta mais curta, mantém a menor
    if (seen.has(key)) {
      const existing = edges.find((e) => edgeKey(e.from, e.to) === key);
      if (existing && units < existing._units) {
        existing.path = pts.map((p) => ({ x: +p.x.toFixed(3), y: +p.y.toFixed(3) }));
        existing.distanceMeters = +(units * METERS_PER_UNIT).toFixed(3);
        existing._units = units;
      }
      continue;
    }
    seen.add(key);

    const mid = pts[Math.floor(pts.length / 2)];
    // só o meio do trecho — pontas perto do pátio não marcam o corredor inteiro
    const parking = inParkingZone(mid);
    const type = /elevador/i.test(from + to) ? "elevator"
      : /escada|stair/i.test(from + to) ? "stairs"
      : /rampa|ramp/i.test(from + to) ? "ramp"
      : zone === "outdoor" ? "outdoor_path" : "corridor";

    const id = `L00_E${String(seq++).padStart(4, "0")}`;
    edges.push({
      id,
      from,
      to,
      path: pts.map((p) => ({ x: +p.x.toFixed(3), y: +p.y.toFixed(3) })),
      distanceMeters: +(units * METERS_PER_UNIT).toFixed(3),
      bidirectional: true,
      accessible: type !== "stairs",
      active: true,
      level: LEVEL,
      zone,
      type,
      parkingLot: !!parking,
      _units: units,
    });
  }

  for (const e of edges) delete e._units;
  return edges;
}

function main() {
  const nodesSvg = fs.readFileSync(path.join(ASSETS, "mapa-nodes.svg"), "utf8");
  const indoorSvg = fs.readFileSync(path.join(ASSETS, "mapa-edge-indoor.svg"), "utf8");
  const outdoorSvg = fs.readFileSync(path.join(ASSETS, "mapa-edge-outdoor.svg"), "utf8");
  const poisSvg = fs.readFileSync(path.join(ASSETS, "mapa-pois.svg"), "utf8");

  const nodes = parseNodes(nodesSvg);
  const indoorLayer = extractEdgeContent(indoorSvg, [
    "_05_edge_indoor_tech",
    "_x30_5_x5F_edge_x5F_indoor_x5F_tech",
  ]);
  const outdoorLayer = extractEdgeContent(outdoorSvg, [
    "_06_edge_outdoor-tech",
    "_x30_6_x5F_edge_x5F_outdoor-tech",
  ]);
  const indoorShapes = extractShapes(indoorLayer);
  const outdoorShapes = extractShapes(outdoorLayer);

  const indoorEdges = buildEdges(indoorShapes, "indoor", nodes);
  let outdoorEdges = buildEdges(outdoorShapes, "outdoor", nodes);

  // evita duplicar mesma conexão indoor+outdoor — prioriza indoor
  const indoorKeys = new Set(indoorEdges.map((e) => edgeKey(e.from, e.to)));
  outdoorEdges = outdoorEdges.filter((e) => !indoorKeys.has(edgeKey(e.from, e.to)));

  // renumerar IDs únicos
  const edges = [...indoorEdges, ...outdoorEdges].map((e, i) => ({
    ...e,
    id: `L00_E${String(i + 1).padStart(4, "0")}`,
  }));

  const pois = parsePois(poisSvg, nodes.map((n) => n.id));

  // anexar nós/edges/POIs de outros andares (elevadores etc.)
  for (const n of FLOOR_LINKS.nodes) {
    if (!nodes.some((x) => x.id === n.id)) nodes.push({ ...n });
  }
  for (const e of FLOOR_LINKS.edges) {
    if (!edges.some((x) => x.id === e.id)) edges.push({ ...e });
  }
  for (const p of FLOOR_LINKS.pois) {
    const pLevel = p.level || p.mapLevel || LEVEL;
    if (
      !pois.some(
        (x) =>
          x.id === p.id ||
          (x.rawId === p.rawId && (x.level || x.mapLevel || LEVEL) === pLevel),
      )
    ) {
      pois.push({ ...p });
    }
  }

  // Corredor pedestre sul/leste do templo → toldo: não tratar como pátio de vagas
  const PEDESTRIAN_TEMPLO_TOLDO = /0008_templo_estacionamento|0009_templo_entrada_principal_toldo|0010_intersection_estacionamento_entrada|0015_intersection|0023_intersection_entrada_toldo|0027\b/;
  for (const e of edges) {
    if (e.parkingLot && e.zone === "outdoor" && PEDESTRIAN_TEMPLO_TOLDO.test(e.from + e.to)) {
      e.parkingLot = false;
    }
  }

  const payload = {
    version: "1.0.0",
    mapId: "pib-curitiba",
    level: LEVEL,
    metersPerUnit: METERS_PER_UNIT,
    walkingSpeedMetersPerSecond: 1.2,
    config: {
      ALLOW_AUTOMATIC_NODE_CONNECTIONS: false,
      ALLOW_STRAIGHT_LINE_FALLBACK: false,
      ALLOW_ROUTE_OUTSIDE_GRAPH: false,
      MAX_ROUTE_ALTERNATIVES: 4,
      MAX_ROUTE_SIMILARITY: 0.85,
    },
    nodes,
    edges,
    pois,
    generatedAt: new Date().toISOString(),
    source: {
      nodes: "assets/mapa-nodes.svg",
      edgesIndoor: "assets/mapa-edge-indoor.svg",
      edgesOutdoor: "assets/mapa-edge-outdoor.svg",
      pois: "assets/mapa-pois.svg",
    },
  };

  fs.writeFileSync(OUT, JSON.stringify(payload, null, 2), "utf8");
  console.log(`Wrote ${OUT}`);
  console.log(`nodes=${nodes.length} edges=${edges.length} (indoor=${indoorEdges.length} outdoor=${outdoorEdges.length}) pois=${pois.length} floorLinks=${FLOOR_LINKS.nodes.length}`);
}

main();
