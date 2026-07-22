/**
 * Gera nós / edges / POIs do L03 a partir dos SVGs oficiais.
 * Usado por build-navigation-json.js (FLOOR_LINKS).
 *
 * Nota: o SVG de nodes tem IDs duplicados (ex. L03_node_0007 e L03_node_0007-2).
 * Edges são resolvidas por proximidade geométrica dos extremos, não pelo número no id.
 */
const fs = require("fs");
const path = require("path");

const SRC_DIR = path.resolve(
  __dirname,
  "..",
  "..",
  "Map location PIBCuritiba",
  "SVG map pib L03 vetor -app",
);

const TX = 37.53;
const TY = 401.3;
const SCALE = 1.57;
const METERS_PER_UNIT = 0.35;
const SNAP_MAX = 8; // unidades locais

const POI_META = {
  L03_POI0025_elevador_emerg: {
    name: "Elevador de emergência",
    group: "elevadores",
    cat: "acesso",
    node: "L03_node_0004",
  },
  // Área Kids só no L01 — não expor neste andar
  L03_POI0002_area_kids: { skip: true },
  L03_POI0002_elevador: {
    name: "Elevador (3º andar)",
    group: "elevadores",
    cat: "acesso",
    node: "L03_node_0001",
  },
  L03_POI0001_hall: {
    name: "Hall",
    group: "salas",
    cat: "geral",
    node: "L03_node_0002",
  },
  L03_POI0009_banheiro_masculino: {
    name: "Banheiro masculino",
    group: "banheiros",
    cat: "geral",
    node: "L03_node_0034",
  },
  L03_POI0028_banheiro_feminino: {
    name: "Banheiro feminino",
    group: "banheiros",
    cat: "geral",
    node: "L03_node_0035",
  },
  L03_POI0026_escadal_ateral: {
    name: "Escada lateral",
    group: "elevadores",
    cat: "acesso",
    node: "L03_node_0003",
  },
  L03_POI0002_banheiro: {
    name: "Banheiro",
    group: "banheiros",
    cat: "geral",
    node: "L03_node_0036",
  },
  L03_POI0027_copa: {
    name: "Copa",
    group: "salas",
    cat: "geral",
    node: "L03_node_0008",
  },
  L03_POI0011_sala_02: {
    name: "Sala 02",
    group: "salas",
    cat: "geral",
    node: "L03_node_0003-2",
  },
  L03_POI0010_sala_01: {
    name: "Sala 01",
    group: "salas",
    cat: "geral",
    node: "L03_node_0005-2",
  },
  L03_POI0003_auditorio: {
    name: "Auditório",
    group: "auditorios",
    cat: "geral",
    node: "L03_node_0001-2",
  },
  L03_POI0005_sala_05: {
    name: "Sala 05",
    group: "salas",
    cat: "geral",
    node: "L03_node_0029",
  },
  L03_POI0006_sala_06: {
    name: "Sala 06",
    group: "salas",
    cat: "geral",
    node: "L03_node_0028",
  },
  L03_POI0007_sala_07: {
    name: "Sala 07",
    group: "salas",
    cat: "geral",
    node: "L03_node_0027",
  },
  L03_POI0008_sala_08: {
    name: "Sala 08",
    group: "salas",
    cat: "geral",
    node: "L03_node_0022",
  },
  L03_POI0004_sala_04: {
    name: "Sala 04",
    group: "salas",
    cat: "geral",
    node: "L03_node_0006-2",
  },
  L03_POI0001_sala_03: {
    name: "Sala 03",
    group: "salas",
    cat: "geral",
    node: "L03_node_0002-2",
  },
  L03_POI0009_sala_09: {
    name: "Sala 09",
    group: "salas",
    cat: "geral",
    node: "L03_node_0020",
  },
  L03_POI0010_sala_10: {
    name: "Sala 10",
    group: "salas",
    cat: "geral",
    node: "L03_node_0018",
  },
  L03_POI0011_sala_11: {
    name: "Sala 11",
    group: "salas",
    cat: "geral",
    node: "L03_node_0016",
  },
  L03_POI0012_sala_12: {
    name: "Sala 12",
    group: "salas",
    cat: "geral",
    node: "L03_node_0014",
  },
  L03_POI0013_sala_13: {
    name: "Sala 13",
    group: "salas",
    cat: "geral",
    node: "L03_node_0013",
  },
  L03_POI0014_sala_14: {
    name: "Sala 14",
    group: "salas",
    cat: "geral",
    node: "L03_node_0012",
  },
  L03_POI0015_sala_15: {
    name: "Sala 15",
    group: "salas",
    cat: "geral",
    node: "L03_node_0026",
  },
  L03_POI0016_sala_16: {
    name: "Sala 16",
    group: "salas",
    cat: "geral",
    node: "L03_node_0010",
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
    if (!id || !/^L03_node_/i.test(id) || !isFinite(cx) || !isFinite(cy)) continue;
    const p = toCampus(cx, cy);
    nodes.push({
      id,
      level: "L03",
      x: p.x,
      y: p.y,
      localX: cx,
      localY: cy,
      active: true,
      hidden: true,
    });
  }
  return nodes;
}

function nearestNodeLocal(pt, nodes, maxDist) {
  let best = null;
  let bestD = Infinity;
  for (const n of nodes) {
    const d = dist(pt, { x: n.localX, y: n.localY });
    if (d < bestD) {
      bestD = d;
      best = n;
    }
  }
  if (!best || bestD > maxDist) return null;
  return best;
}

function parsePointsAttr(raw) {
  const nums = (raw || "").trim().split(/[\s,]+/).map(Number).filter((n) => isFinite(n));
  const pts = [];
  for (let i = 0; i + 1 < nums.length; i += 2) pts.push({ x: nums[i], y: nums[i + 1] });
  return pts;
}

function samplePathD(d) {
  // Resolve M/L/H/V/C/S (abs/rel) para obter extremos reais do path.
  const tokens = [];
  const re = /([MmLlHhVvCcSs])|([-+]?(?:\d+\.?\d*|\.\d+)(?:[eE][-+]?\d+)?)/g;
  let m;
  while ((m = re.exec(d))) {
    if (m[1]) tokens.push(m[1]);
    else tokens.push(+m[2]);
  }
  const pts = [];
  let i = 0;
  let cx = 0;
  let cy = 0;
  let cmd = "M";
  while (i < tokens.length) {
    const t = tokens[i];
    if (typeof t === "string") {
      cmd = t;
      i++;
      continue;
    }
    const abs = cmd === cmd.toUpperCase();
    const c = cmd.toUpperCase();
    if (c === "M" || c === "L") {
      const x = abs ? t : cx + t;
      const y = abs ? tokens[i + 1] : cy + tokens[i + 1];
      cx = x;
      cy = y;
      pts.push({ x, y });
      i += 2;
      if (c === "M") cmd = abs ? "L" : "l";
    } else if (c === "H") {
      cx = abs ? t : cx + t;
      pts.push({ x: cx, y: cy });
      i += 1;
    } else if (c === "V") {
      cy = abs ? t : cy + t;
      pts.push({ x: cx, y: cy });
      i += 1;
    } else if (c === "C") {
      const x = abs ? tokens[i + 4] : cx + tokens[i + 4];
      const y = abs ? tokens[i + 5] : cy + tokens[i + 5];
      cx = x;
      cy = y;
      pts.push({ x, y });
      i += 6;
    } else if (c === "S") {
      const x = abs ? tokens[i + 2] : cx + tokens[i + 2];
      const y = abs ? tokens[i + 3] : cy + tokens[i + 3];
      cx = x;
      cy = y;
      pts.push({ x, y });
      i += 4;
    } else {
      i += 1;
    }
  }
  return pts;
}

function parseEdgeShapes(svg, nodes) {
  const edges = [];
  const seen = new Set();
  let seq = 1;
  const skipped = [];

  function pushEdge(id, localPts) {
    if (!localPts || localPts.length < 2) {
      skipped.push(id);
      return;
    }
    const from = nearestNodeLocal(localPts[0], nodes, SNAP_MAX);
    const to = nearestNodeLocal(localPts[localPts.length - 1], nodes, SNAP_MAX);
    if (!from || !to || from.id === to.id) {
      skipped.push(id);
      return;
    }
    const key = from.id < to.id ? `${from.id}|${to.id}` : `${to.id}|${from.id}`;
    if (seen.has(key)) return;
    seen.add(key);

    const path = localPts.map((p) => toCampus(p.x, p.y));
    path[0] = { x: from.x, y: from.y };
    path[path.length - 1] = { x: to.x, y: to.y };

    const units = pathLength(path);
    if (units < 0.05) return;

    edges.push({
      id: `L03_E${String(seq++).padStart(4, "0")}`,
      from: from.id,
      to: to.id,
      path,
      distanceMeters: +(units * METERS_PER_UNIT).toFixed(3),
      bidirectional: true,
      accessible: true,
      active: true,
      level: "L03",
      zone: "indoor",
      type: "corridor",
      parkingLot: false,
      sourceId: id,
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
    pushEdge(id, [
      { x: x1, y: y1 },
      { x: x2, y: y2 },
    ]);
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

  return { edges, skipped };
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
    if (!id || !/^L03_POI/i.test(id)) continue;
    const x = +(/x=["']([^"']+)/.exec(attrs) || [])[1];
    const y = +(/y=["']([^"']+)/.exec(attrs) || [])[1];
    const w = +(/width=["']([^"']+)/.exec(attrs) || [])[1];
    const h = +(/height=["']([^"']+)/.exec(attrs) || [])[1];
    if (![x, y, w, h].every(isFinite)) continue;
    const centerLocal = { x: x + w / 2, y: y + h / 2 };
    const center = toCampus(centerLocal.x, centerLocal.y);
    const meta = POI_META[id] || {
      name: id.replace(/^L03_POI\d+_?/i, "").replace(/_/g, " ") || id,
      group: "salas",
      cat: "geral",
    };
    if (meta.skip || /area_kids/i.test(id)) continue;
    const node = (meta.node && byId[meta.node]) || nearestNode(center, nodes);
    if (!node) continue;
    pois.push({
      id: `L03_P_${id}`,
      rawId: id,
      name: meta.name,
      nodeIds: [node.id],
      active: true,
      cat: meta.cat,
      level: "L03",
      mapLevel: "L03",
      building: "Administrativo",
      group: meta.group,
      inject: true,
    });
  }
  return pois;
}

function stripLocal(nodes) {
  return nodes.map(({ localX, localY, ...rest }) => rest);
}

function buildL03FloorLinks() {
  const nodesSvg = readSvg("2026_mapa_L03_node.svg");
  const edgeSvg = readSvg("2026_mapa_L03_edge.svg");
  const poiSvg = readSvg("2026_mapa_L03_poi.svg");

  const nodesRaw = parseNodes(nodesSvg);
  const { edges, skipped } = parseEdgeShapes(edgeSvg, nodesRaw);
  const pois = parsePois(poiSvg, nodesRaw);
  const nodes = stripLocal(nodesRaw);

  // elevador L02 ↔ L03 (mesmo poço)
  const elevL03 = nodes.find((n) => n.id === "L03_node_0001");
  if (elevL03) {
    let elevL02 = null;
    try {
      const { buildL02FloorLinks } = require("./l02-floor-data");
      elevL02 = buildL02FloorLinks().nodes.find((n) => /node_0001_elevador/i.test(n.id));
    } catch (_) {
      /* L02 opcional em teste isolado */
    }
    const fromPt = elevL02
      ? { x: elevL02.x, y: elevL02.y }
      : { x: elevL03.x, y: elevL03.y };
    edges.push({
      id: "L02_L03_E_elevador_adm",
      from: "L02_node_0001_elevador",
      to: elevL03.id,
      path: [fromPt, { x: elevL03.x, y: elevL03.y }],
      distanceMeters: 4.2,
      bidirectional: true,
      accessible: true,
      active: true,
      level: "L02-L03",
      zone: "vertical",
      type: "elevator",
      parkingLot: false,
    });
  }

  return { nodes, edges, pois, skipped };
}

module.exports = { buildL03FloorLinks, POI_META, toCampus };

if (require.main === module) {
  const data = buildL03FloorLinks();
  console.log(`L03 nodes=${data.nodes.length} edges=${data.edges.length} pois=${data.pois.length}`);
  if (data.skipped.length) console.log("skipped edges:", data.skipped.join(", "));
  console.log(data.pois.map((p) => `${p.name} → ${p.nodeIds[0]}`).join("\n"));
}
