/**
 * Gera nós / edges / POIs do L04 a partir dos SVGs oficiais (nomenclatura + geometria).
 * Usado por build-navigation-json.js (FLOOR_LINKS).
 * Edges resolvidas por proximidade geométrica dos extremos.
 */
const fs = require("fs");
const path = require("path");

const SRC_DIR = path.resolve(
  __dirname,
  "..",
  "..",
  "Map location PIBCuritiba",
  "SVG map pib L04 vetor -app",
);

const TX = 37.53;
const TY = 401.3;
const SCALE = 1.57;
const METERS_PER_UNIT = 0.35;
const SNAP_MAX = 8;

const POI_META = {
  L04_poi_0001: { name: "Sala 01", group: "salas", cat: "geral", node: "L04_node_0003" },
  L04_poi_0002: { name: "Sala calma", group: "salas", cat: "geral", node: "L04_node_0003" },
  L04_poi_0003: {
    name: "Elevador (4º andar)",
    group: "elevadores",
    cat: "acesso",
    node: "L04_node_0001_elevador",
  },
  L04_poi_0004: { name: "Hall", group: "salas", cat: "geral", node: "L04_node_0002_hall_principal" },
  L04_poi_0005: {
    name: "Escadas de emergência",
    group: "elevadores",
    cat: "acesso",
    node: "L04_node_0004_escada_emergen",
  },
  L04_poi_0006: { name: "Sala 06", group: "salas", cat: "geral", node: "L04_node_0006_entrada_corredor_d" },
  L04_poi_0007: { name: "Sala 07", group: "salas", cat: "geral", node: "L04_node_0008_entrada_corredor_d" },
  L04_poi_0008: { name: "Sala 08", group: "salas", cat: "geral", node: "L04_node_0009_entrada_corredor_d" },
  L04_poi_0009: { name: "Sala 09", group: "salas", cat: "geral", node: "L04_node_0010_entrada_corredor_d" },
  L04_poi_0010: { name: "Banheiro", group: "banheiros", cat: "geral", node: "L04_node_0005" },
  L04_poi_0011: { name: "Sala 11", group: "salas", cat: "geral", node: "L04_node_0011" },
  L04_poi_0012: { name: "Sala 12", group: "salas", cat: "geral", node: "L04_node_0011" },
  L04_poi_0013: { name: "Sala 13", group: "salas", cat: "geral", node: "L04_node_0021" },
  // Área Kids só no L01 — não expor neste andar
  L04_poi_0014: { skip: true },
  L04_poi_0015: { name: "Sala 15", group: "salas", cat: "geral", node: "L04_node_0022_entrada_corredor_d" },
  L04_poi_0016: {
    name: "Auditório L04",
    group: "auditorios",
    cat: "geral",
    node: "L04_node_0023_auditorio_l01",
    icon: { x: 82, y: 118 },
  },
  L04_poi_0017: {
    name: "Espaço brincar",
    group: "salas",
    cat: "geral",
    node: "L04_node_0020_entrada_espaco_brincar",
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
    if (!id || !/^L04_node_/i.test(id) || !isFinite(cx) || !isFinite(cy)) continue;
    const p = toCampus(cx, cy);
    nodes.push({
      id,
      level: "L04",
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

    const pathPts = localPts.map((p) => toCampus(p.x, p.y));
    pathPts[0] = { x: from.x, y: from.y };
    pathPts[pathPts.length - 1] = { x: to.x, y: to.y };

    const units = pathLength(pathPts);
    if (units < 0.05) return;

    const type = /elevador/i.test(from.id + to.id)
      ? "elevator"
      : /escada/i.test(from.id + to.id)
        ? "stairs"
        : "corridor";

    edges.push({
      id: `L04_E${String(seq++).padStart(4, "0")}`,
      from: from.id,
      to: to.id,
      path: pathPts,
      distanceMeters: +(units * METERS_PER_UNIT).toFixed(3),
      bidirectional: true,
      accessible: type !== "stairs",
      active: true,
      level: "L04",
      zone: "indoor",
      type,
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
  const re = /<(?:rect|polygon)\b([^>]*)\/?>/gi;
  let m;
  while ((m = re.exec(svg))) {
    const attrs = m[1];
    const id = (/id=["']([^"']+)/.exec(attrs) || [])[1];
    if (!id || !/^L04_poi_/i.test(id)) continue;

    let centerLocal;
    if (/points=/i.test(attrs)) {
      const pts = parsePointsAttr((/points=["']([^"']+)/.exec(attrs) || [])[1]);
      if (pts.length < 3) continue;
      const sx = pts.reduce((s, p) => s + p.x, 0) / pts.length;
      const sy = pts.reduce((s, p) => s + p.y, 0) / pts.length;
      centerLocal = { x: sx, y: sy };
    } else {
      const x = +(/x=["']([^"']+)/.exec(attrs) || [])[1];
      const y = +(/y=["']([^"']+)/.exec(attrs) || [])[1];
      const w = +(/width=["']([^"']+)/.exec(attrs) || [])[1];
      const h = +(/height=["']([^"']+)/.exec(attrs) || [])[1];
      if (![x, y, w, h].every(isFinite)) continue;
      centerLocal = { x: x + w / 2, y: y + h / 2 };
    }

    const center = toCampus(centerLocal.x, centerLocal.y);
    const meta = POI_META[id] || {
      name: id.replace(/^L04_poi_0*/i, "Sala "),
      group: "salas",
      cat: "geral",
    };
    if (meta.skip || /area_kids/i.test(id)) continue;
    const node = (meta.node && byId[meta.node]) || nearestNode(center, nodes);
    if (!node) continue;
    pois.push({
      id: `L04_P_${id}`,
      rawId: id,
      name: meta.name,
      nodeIds: [node.id],
      active: true,
      cat: meta.cat,
      level: "L04",
      mapLevel: "L04",
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

function buildL04FloorLinks() {
  const nodesSvg = readSvg("2026_mapa_L04_node.svg");
  const edgeSvg = readSvg("2026_mapa_L04_edge.svg");
  const poiSvg = readSvg("2026_mapa_L04_poi.svg");

  const nodesRaw = parseNodes(nodesSvg);
  const { edges, skipped } = parseEdgeShapes(edgeSvg, nodesRaw);
  const pois = parsePois(poiSvg, nodesRaw);
  const nodes = stripLocal(nodesRaw);

  // elevador L03 ↔ L04 (mesmo poço)
  const elevL04 = nodes.find((n) => /node_0001_elevador/i.test(n.id));
  if (elevL04) {
    let elevL03 = null;
    try {
      const { buildL03FloorLinks } = require("./l03-floor-data");
      elevL03 = buildL03FloorLinks().nodes.find((n) => n.id === "L03_node_0001");
    } catch (_) {}
    const fromPt = elevL03
      ? { x: elevL03.x, y: elevL03.y }
      : { x: elevL04.x, y: elevL04.y };
    edges.push({
      id: "L03_L04_E_elevador_adm",
      from: "L03_node_0001",
      to: elevL04.id,
      path: [fromPt, { x: elevL04.x, y: elevL04.y }],
      distanceMeters: 4.2,
      bidirectional: true,
      accessible: true,
      active: true,
      level: "L03-L04",
      zone: "vertical",
      type: "elevator",
      parkingLot: false,
    });
  }

  const stair = nodes.find((n) => /node_0024_escada_lateral/i.test(n.id));
  if (stair && !pois.some((p) => p.nodeIds?.[0] === stair.id)) {
    pois.push({
      id: "L04_P_escada_lateral",
      rawId: stair.id,
      name: "Escada lateral",
      nodeIds: [stair.id],
      active: true,
      cat: "acesso",
      level: "L04",
      mapLevel: "L04",
      building: "Administrativo",
      group: "elevadores",
      inject: true,
    });
  }

  return { nodes, edges, pois, skipped, elevL04 };
}

module.exports = { buildL04FloorLinks, POI_META, toCampus };

if (require.main === module) {
  const data = buildL04FloorLinks();
  console.log(`L04 nodes=${data.nodes.length} edges=${data.edges.length} pois=${data.pois.length}`);
  if (data.skipped.length) console.log("skipped:", data.skipped.join(", "));
  console.log(data.pois.map((p) => `${p.name} → ${p.nodeIds[0]}`).join("\n"));
  if (data.elevL04) console.log("elevador:", data.elevL04.id, data.elevL04.x, data.elevL04.y);
}
