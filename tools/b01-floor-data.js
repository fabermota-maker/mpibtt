/**
 * Gera nós / edges / POIs do B01 a partir dos SVGs oficiais.
 * Coordenadas locais do viewBox (577.67 × 271.82) — sem transform campus.
 */
const fs = require("fs");
const path = require("path");

const SRC_DIR = path.resolve(
  __dirname,
  "..",
  "..",
  "Map location PIBCuritiba",
  "SVG map pib B01 vetor -app",
);

const METERS_PER_UNIT = 0.35;
const SNAP_MAX = 10;

const POI_META = {
  B01_poi_0001: {
    name: "Banheiro feminino",
    group: "banheiros",
    cat: "geral",
    node: "B01_node_0001_banheiro_femin_b01",
  },
  "B01_poi_0001-2": { skip: true },
  B01_poi_0002: {
    name: "Pastoreo",
    group: "salas",
    cat: "geral",
    node: "B01_node_0002_pastoreo_b01",
  },
  B01_poi_0006: {
    name: "Banheiro masculino",
    group: "banheiros",
    cat: "geral",
    node: "B01_node_0005_banheiro_masc_b01",
  },
  B01_poi_0007: {
    name: "Escada — templo / batistério",
    group: "elevadores",
    cat: "acesso",
    node: "B01_node_0006_conexao_templo_batisterio",
  },
  B01_poi_0009: {
    name: "Batistério",
    group: "salas",
    cat: "geral",
    node: "B01_node_0006_conexao_templo_batisterio",
  },
  B01_poi_0012: {
    name: "Estúdio ensaio",
    group: "salas",
    cat: "geral",
    node: "B01_node_0011",
  },
};

function toLocal(x, y) {
  return { x: +x.toFixed(3), y: +y.toFixed(3) };
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
    if (!id || !/^B01_node_/i.test(id) || !isFinite(cx) || !isFinite(cy)) continue;
    const p = toLocal(cx, cy);
    nodes.push({
      id,
      level: "B01",
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

    const pathPts = localPts.map((p) => toLocal(p.x, p.y));
    pathPts[0] = { x: from.x, y: from.y };
    pathPts[pathPts.length - 1] = { x: to.x, y: to.y };

    const units = pathLength(pathPts);
    if (units < 0.05) return;

    const type = /escada|stairs/i.test(from.id + to.id + id)
      ? "stairs"
      : /elevador|elevator/i.test(from.id + to.id + id)
        ? "elevator"
        : "corridor";

    edges.push({
      id: `B01_E${String(seq++).padStart(4, "0")}`,
      from: from.id,
      to: to.id,
      path: pathPts,
      distanceMeters: +(units * METERS_PER_UNIT).toFixed(3),
      bidirectional: true,
      accessible: type !== "stairs",
      active: true,
      level: "B01",
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

function shapeCenter(attrs, tag) {
  if (/points=/i.test(attrs)) {
    const pts = parsePointsAttr((/points=["']([^"']+)/.exec(attrs) || [])[1]);
    if (pts.length < 3) return null;
    return {
      x: pts.reduce((s, p) => s + p.x, 0) / pts.length,
      y: pts.reduce((s, p) => s + p.y, 0) / pts.length,
    };
  }
  if (tag === "path" && /\bd=["']/.test(attrs)) {
    const d = (/\bd=["']([^"']+)/.exec(attrs) || [])[1];
    const pts = samplePathD(d);
    if (!pts.length) return null;
    return {
      x: pts.reduce((s, p) => s + p.x, 0) / pts.length,
      y: pts.reduce((s, p) => s + p.y, 0) / pts.length,
    };
  }
  const x = +(/x=["']([^"']+)/.exec(attrs) || [])[1];
  const y = +(/y=["']([^"']+)/.exec(attrs) || [])[1];
  const w = +(/width=["']([^"']+)/.exec(attrs) || [])[1];
  const h = +(/height=["']([^"']+)/.exec(attrs) || [])[1];
  if (![x, y, w, h].every(isFinite)) return null;
  return { x: x + w / 2, y: y + h / 2 };
}

function parsePois(svg, nodes) {
  const byId = Object.fromEntries(nodes.map((n) => [n.id, n]));
  const pois = [];
  const re = /<(?:rect|polygon|path)\b([^>]*)\/?>/gi;
  let m;
  while ((m = re.exec(svg))) {
    const full = m[0];
    const tag = /^<(\w+)/.exec(full)?.[1]?.toLowerCase() || "rect";
    const attrs = m[1];
    const id = (/id=["']([^"']+)/.exec(attrs) || [])[1];
    if (!id || !/^B01_poi_/i.test(id)) continue;

    const centerLocal = shapeCenter(attrs, tag);
    if (!centerLocal) continue;

    const meta = POI_META[id] || {
      name: id.replace(/^B01_poi_0*/i, "Sala "),
      group: "salas",
      cat: "geral",
    };
    if (meta.skip) continue;

    const node = (meta.node && byId[meta.node]) || nearestNodeLocal(centerLocal, nodes, SNAP_MAX * 2);
    if (!node) continue;

    pois.push({
      id: `B01_P_${id}`,
      rawId: id,
      name: meta.name,
      nodeIds: [node.id],
      active: true,
      cat: meta.cat,
      level: "B01",
      mapLevel: "B01",
      building: "Subsolo 01",
      group: meta.group,
      inject: true,
    });
  }
  return pois;
}

function stripLocal(nodes) {
  return nodes.map(({ localX, localY, ...rest }) => rest);
}

function buildB01FloorLinks() {
  const nodesSvg = readSvg("2026_mapa_B01_node.svg");
  const edgeSvg = readSvg("2026_mapa_B01_edge.svg");
  const poiSvg = readSvg("2026_mapa_B01_poi.svg");

  const nodesRaw = parseNodes(nodesSvg);
  const { edges, skipped } = parseEdgeShapes(edgeSvg, nodesRaw);
  const pois = parsePois(poiSvg, nodesRaw);
  const nodes = stripLocal(nodesRaw);

  const stairBat = nodes.find((n) => n.id === "B01_node_0006_conexao_templo_batisterio");
  const stairNarnia = nodes.find((n) => n.id === "B01_node_0013_entrada_narnia");
  const somNode = nodes.find((n) => n.id === "B01_node_0010_som_tec_b01");

  if (stairBat) {
    edges.push({
      id: "L00_B01_E_escada_batisterio",
      from: "B01_node_0006_conexao_templo_batisterio",
      to: "L00_N0028",
      path: [
        { x: stairBat.x, y: stairBat.y },
        { x: 206.68, y: 689.63 },
      ],
      distanceMeters: 16,
      bidirectional: true,
      accessible: false,
      active: true,
      level: "L00-B01",
      zone: "vertical",
      type: "stairs",
      parkingLot: false,
    });
  }

  if (stairNarnia) {
    edges.push({
      id: "B01_L00_E_escada_narnia",
      from: "B01_node_0013_entrada_narnia",
      to: "L00_N0014_entrada_narnia_B02",
      path: [
        { x: stairNarnia.x, y: stairNarnia.y },
        { x: 237.3, y: 476.98 },
      ],
      distanceMeters: 14,
      bidirectional: true,
      accessible: false,
      active: true,
      level: "B01-L00",
      zone: "vertical",
      type: "stairs",
      parkingLot: false,
    });
  }

  if (somNode && !pois.some((p) => p.nodeIds?.[0] === somNode.id)) {
    pois.push({
      id: "B01_P_som_tec",
      rawId: "B01_som_tec",
      name: "Som / Tec.",
      nodeIds: [somNode.id],
      active: true,
      cat: "geral",
      level: "B01",
      mapLevel: "B01",
      building: "Subsolo 01",
      group: "salas",
      inject: true,
    });
  }

  const corridor = nodes.find((n) => n.id === "B01_node_0003");
  if (corridor) {
    pois.push({
      id: "B01_P_P020_espaco_servir",
      rawId: "B01_poi_espaco_servir",
      name: "Espaço Servir",
      nodeIds: [corridor.id],
      active: true,
      cat: "geral",
      level: "B01",
      mapLevel: "B01",
      building: "Subsolo 01",
      group: "salas",
      inject: true,
      accessNote:
        "Acesso descendo pelo Jardim (L00) ou pela lateral do templo, próximo à entrada de pedestres da Av. Bento Viana",
    });
  }

  if (stairBat && !pois.some((p) => p.nodeIds?.[0] === stairBat.id && /escada/i.test(p.name))) {
    pois.push({
      id: "B01_P_escada_batisterio",
      rawId: stairBat.id,
      name: "Escada — templo / batistério",
      nodeIds: [stairBat.id],
      active: true,
      cat: "acesso",
      level: "B01",
      mapLevel: "B01",
      building: "Subsolo 01",
      group: "elevadores",
      inject: true,
    });
  }

  if (stairNarnia && !pois.some((p) => p.nodeIds?.[0] === stairNarnia.id)) {
    pois.push({
      id: "B01_P_entrada_narnia",
      rawId: "B01_entrada_narnia",
      name: "Entrada Nárnia (B02)",
      nodeIds: [stairNarnia.id],
      active: true,
      cat: "acesso",
      level: "B01",
      mapLevel: "B01",
      building: "Subsolo 01",
      group: "elevadores",
      inject: true,
    });
  }

  return { nodes, edges, pois, skipped, stairBat, stairNarnia };
}

module.exports = { buildB01FloorLinks, POI_META };

if (require.main === module) {
  const data = buildB01FloorLinks();
  console.log(`B01 nodes=${data.nodes.length} edges=${data.edges.length} pois=${data.pois.length}`);
  if (data.skipped.length) console.log("skipped:", data.skipped.join(", "));
  console.log(data.pois.map((p) => `${p.name} → ${p.nodeIds[0]}`).join("\n"));
}
