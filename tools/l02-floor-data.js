/**
 * Gera nós / edges / POIs do L02 a partir dos SVGs oficiais.
 * Usado por build-navigation-json.js (FLOOR_LINKS).
 */
const fs = require("fs");
const path = require("path");

const SRC_DIR = path.resolve(
  __dirname,
  "..",
  "..",
  "Map location PIBCuritiba",
  "SVG map pib L02 vetor -app",
);

// Mesmo enquadramento do mapa L01/L02 na LP
const TX = 37.53;
const TY = 401.3;
const SCALE = 1.57;
const METERS_PER_UNIT = 0.35;

const POI_META = {
  L02_POI0025_elevador_emerg: {
    name: "Elevador de emergência",
    group: "elevadores",
    cat: "acesso",
    node: "L02_node_0004_escada_emerg",
  },
  // Área Kids só no L01 — não expor neste andar
  L02_POI0002_area_kids: { skip: true },
  L02_POI0002_elevador: {
    name: "Elevador (2º andar)",
    group: "elevadores",
    cat: "acesso",
    node: "L02_node_0001_elevador",
  },
  L02_POI0001_hall: {
    name: "Hall",
    group: "salas",
    cat: "geral",
    node: "L02_node_0002_hall",
  },
  L02_POI0011_sala_02: {
    name: "Sala 02",
    group: "salas",
    cat: "geral",
    node: "L02_node_0023",
  },
  L02_POI0010_sala_01: {
    name: "Sala 01",
    group: "salas",
    cat: "geral",
    node: "L02_node_0024",
  },
  L02_POI0009_banheiro_masculino: {
    name: "Banheiro masculino",
    group: "banheiros",
    cat: "geral",
    node: "L02_node_0018",
  },
  L02_POI0008_banheiro_feminino: {
    name: "Banheiro feminino",
    group: "banheiros",
    cat: "geral",
    node: "L02_node_0014",
  },
  L02_POI0007_copa: {
    name: "Copa",
    group: "salas",
    cat: "geral",
    node: "L02_node_0007",
  },
  L02_POI0006: {
    name: "Depósito",
    group: "salas",
    cat: "geral",
    node: "L02_node_0006",
  },
  L02_POI0005_sala_05: {
    name: "Sala 05",
    group: "salas",
    cat: "geral",
    node: "L02_node_0011",
  },
  L02_POI0004_sala_04: {
    name: "Sala 04",
    group: "salas",
    cat: "geral",
    node: "L02_node_0019",
  },
  L02_POI0003_auditorio: {
    name: "Auditório",
    group: "auditorios",
    cat: "geral",
    node: "L02_node_0005",
  },
  L02_POI0002_banheiro: {
    name: "Banheiro",
    group: "banheiros",
    cat: "geral",
    node: "L02_node_0013",
  },
  L02_POI0001_sala_03: {
    name: "Sala 03",
    group: "salas",
    cat: "geral",
    node: "L02_node_0020",
  },
};

function toCampus(x, y) {
  return {
    x: +(TX + x * SCALE).toFixed(3),
    y: +(TY + y * SCALE).toFixed(3),
  };
}

function dist(a, b) {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
}

function pathLength(pts) {
  let t = 0;
  for (let i = 1; i < pts.length; i++) t += dist(pts[i - 1], pts[i]);
  return t;
}

function readSvg(name) {
  return fs.readFileSync(path.join(SRC_DIR, name), "utf8");
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
    if (!id || !/^L02_node_/i.test(id) || !isFinite(cx) || !isFinite(cy)) continue;
    const p = toCampus(cx, cy);
    nodes.push({
      id,
      level: "L02",
      x: p.x,
      y: p.y,
      active: true,
      hidden: true,
    });
  }
  return nodes;
}

function findNodeByNum(nodes, num) {
  const pad = String(num).padStart(4, "0");
  const re = new RegExp(`_node_${pad}(?:_|$)`, "i");
  return nodes.find((n) => re.test(n.id)) || null;
}

function parseEdgeEndpoints(id, nodes) {
  const m = String(id).match(/node_(\d+).*?node_(\d+)/i);
  if (!m) return null;
  const a = findNodeByNum(nodes, m[1]);
  const b = findNodeByNum(nodes, m[2]);
  if (!a || !b || a.id === b.id) return null;
  return [a, b];
}

function parsePointsAttr(raw) {
  const nums = (raw || "").trim().split(/[\s,]+/).map(Number).filter((n) => isFinite(n));
  const pts = [];
  for (let i = 0; i + 1 < nums.length; i += 2) pts.push({ x: nums[i], y: nums[i + 1] });
  return pts;
}

function samplePathD(d) {
  // amostragem simples de comandos M/L/C (pontas + controles)
  const nums = [];
  const re = /[-+]?(?:\d+\.?\d*|\.\d+)(?:[eE][-+]?\d+)?/g;
  let m;
  while ((m = re.exec(d))) nums.push(+m[0]);
  const pts = [];
  for (let i = 0; i + 1 < nums.length; i += 2) {
    pts.push({ x: nums[i], y: nums[i + 1] });
  }
  return pts;
}

function parseEdgeShapes(svg, nodes) {
  const edges = [];
  const seen = new Set();
  let seq = 1;

  function pushEdge(id, localPts) {
    const ends = parseEdgeEndpoints(id, nodes);
    if (!ends) return;
    const [from, to] = ends;
    const key = from.id < to.id ? `${from.id}|${to.id}` : `${to.id}|${from.id}`;
    if (seen.has(key)) return;
    seen.add(key);

    let path;
    if (localPts && localPts.length >= 2) {
      path = localPts.map((p) => toCampus(p.x, p.y));
      // garante extremos nos nós
      path[0] = { x: from.x, y: from.y };
      path[path.length - 1] = { x: to.x, y: to.y };
    } else {
      path = [
        { x: from.x, y: from.y },
        { x: to.x, y: to.y },
      ];
    }
    const units = pathLength(path);
    if (units < 0.05) return;
    const type = /elevador/i.test(from.id + to.id)
      ? "elevator"
      : /escada/i.test(from.id + to.id)
        ? "stairs"
        : "corridor";
    edges.push({
      id: `L02_E${String(seq++).padStart(4, "0")}`,
      from: from.id,
      to: to.id,
      path,
      distanceMeters: +(units * METERS_PER_UNIT).toFixed(3),
      bidirectional: true,
      accessible: type !== "stairs",
      active: true,
      level: "L02",
      zone: "indoor",
      type,
      parkingLot: false,
    });
  }

  const lineRe = /<line\b([^>]*)\/?>/gi;
  let m;
  while ((m = lineRe.exec(svg))) {
    const attrs = m[1];
    const id = (/id=["']([^"']+)/.exec(attrs) || [])[1];
    const x1 = +(/x1=["']([^"']+)/.exec(attrs) || [])[1];
    const y1 = +(/y1=["']([^"']+)/.exec(attrs) || [])[1];
    const x2 = +(/x2=["']([^"']+)/.exec(attrs) || [])[1];
    const y2 = +(/y2=["']([^"']+)/.exec(attrs) || [])[1];
    if (!id || ![x1, y1, x2, y2].every(isFinite)) continue;
    pushEdge(id, [{ x: x1, y: y1 }, { x: x2, y: y2 }]);
  }

  const polyRe = /<polyline\b([^>]*)\/?>/gi;
  while ((m = polyRe.exec(svg))) {
    const attrs = m[1];
    const id = (/id=["']([^"']+)/.exec(attrs) || [])[1];
    const pts = parsePointsAttr((/points=["']([^"']+)/.exec(attrs) || [])[1]);
    if (!id || pts.length < 2) continue;
    pushEdge(id, pts);
  }

  const pathRe = /<path\b([^>]*)\/?>/gi;
  while ((m = pathRe.exec(svg))) {
    const attrs = m[1];
    const id = (/id=["']([^"']+)/.exec(attrs) || [])[1];
    const d = (/\bd=["']([^"']+)/.exec(attrs) || [])[1];
    if (!id) continue;
    const pts = d ? samplePathD(d) : null;
    pushEdge(id, pts && pts.length >= 2 ? pts : null);
  }

  return edges;
}

function nearestNode(p, nodes) {
  let best = null;
  let bestD = Infinity;
  for (const n of nodes) {
    const d = dist(p, n);
    if (d < bestD) {
      bestD = d;
      best = n;
    }
  }
  return best;
}

function parsePois(svg, nodes) {
  const byId = Object.fromEntries(nodes.map((n) => [n.id, n]));
  const pois = [];
  const re = /<rect\b([^>]*)\/?>/gi;
  let m;
  while ((m = re.exec(svg))) {
    const attrs = m[1];
    const id = (/id=["']([^"']+)/.exec(attrs) || [])[1];
    if (!id || !/^L02_POI/i.test(id)) continue;
    const x = +(/x=["']([^"']+)/.exec(attrs) || [])[1];
    const y = +(/y=["']([^"']+)/.exec(attrs) || [])[1];
    const w = +(/width=["']([^"']+)/.exec(attrs) || [])[1];
    const h = +(/height=["']([^"']+)/.exec(attrs) || [])[1];
    if (![x, y, w, h].every(isFinite)) continue;
    const centerLocal = { x: x + w / 2, y: y + h / 2 };
    const center = toCampus(centerLocal.x, centerLocal.y);
    const meta = POI_META[id] || {
      name: id.replace(/^L02_POI\d+_?/i, "").replace(/_/g, " ") || id,
      group: "salas",
      cat: "geral",
    };
    if (meta.skip || /area_kids/i.test(id)) continue;
    const node = (meta.node && byId[meta.node]) || nearestNode(center, nodes);
    if (!node) continue;
    pois.push({
      id: `L02_P_${id}`,
      rawId: id,
      name: meta.name,
      nodeIds: [node.id],
      active: true,
      cat: meta.cat,
      level: "L02",
      mapLevel: "L02",
      building: "Administrativo",
      group: meta.group,
      inject: true,
    });
  }
  return pois;
}

function buildL02FloorLinks() {
  const nodesSvg = readSvg("2026_mapa_L02_node.svg");
  const edgeSvg = readSvg("2026_mapa_L02_edge.svg");
  const poiSvg = readSvg("2026_mapa_L02_poi.svg");

  const nodes = parseNodes(nodesSvg);
  const edges = parseEdgeShapes(edgeSvg, nodes);
  const pois = parsePois(poiSvg, nodes);

  // elevador L01 ↔ L02 (mesmo poço; coords L01 ≈ toCampus(292.49, 51.01))
  const elevL02 = nodes.find((n) => /node_0001_elevador/i.test(n.id));
  if (elevL02) {
    const elevL01 = { x: 496.739, y: 481.386 };
    edges.push({
      id: "L01_L02_E_elevador_adm",
      from: "L01_node_0001_elevador",
      to: elevL02.id,
      path: [
        { x: elevL01.x, y: elevL01.y },
        { x: elevL02.x, y: elevL02.y },
      ],
      distanceMeters: 4.2,
      bidirectional: true,
      accessible: true,
      active: true,
      level: "L01-L02",
      zone: "vertical",
      type: "elevator",
      parkingLot: false,
    });
  }

  return { nodes, edges, pois };
}

module.exports = { buildL02FloorLinks, POI_META, toCampus };

if (require.main === module) {
  const data = buildL02FloorLinks();
  console.log(`L02 nodes=${data.nodes.length} edges=${data.edges.length} pois=${data.pois.length}`);
  console.log(data.pois.map((p) => `${p.name} → ${p.nodeIds[0]}`).join("\n"));
}
