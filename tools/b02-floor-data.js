/**
 * Gera nós / edges / POIs do B02 (Nárnia) a partir dos SVGs oficiais.
 * Coordenadas locais do viewBox (519.83 × 190.11).
 */
const fs = require("fs");
const path = require("path");

const SRC_DIR = path.resolve(
  __dirname,
  "..",
  "..",
  "Map location PIBCuritiba",
  "SVG map pib B02 vetor -app",
);

const METERS_PER_UNIT = 0.35;
const SNAP_MAX = 10;
const LEVEL = "B02";
const BUILDING = "Subsolo 02 · Nárnia";

const POI_META = {
  B02_poi_0003: { name: "Rádio", group: "salas", cat: "geral", node: "B02_node_0003_radio" },
  "B02_poi_0003-2": { skip: true },
  B02_poi_0004: { name: "Sala Albert", rawId: "sala_albert", group: "salas", cat: "geral", node: "B02_node_0004_albert" },
  B02_poi_0006: {
    name: "Acesso ao Espaço Servir",
    group: "elevadores",
    cat: "acesso",
    node: "B02_node_0005_conexao_servir",
  },
  B02_poi_0007: { name: "Cozinha Nárnia", group: "salas", cat: "geral", node: "B02_node_0007_cozinha_narnia" },
  B02_poi_0010: { name: "Som / Tec.", group: "salas", cat: "geral", node: "B02_node_0010_som_tec_b01" },
  B02_poi_0011: { name: "Transmissão ao vivo", group: "salas", cat: "geral", node: "B02_node_0011_aovivo" },
  B02_poi_0013: { name: "Sala de vidro", group: "salas", cat: "geral", node: "B02_node_0013_sala_de_vidro" },
  B01_poi_0006: {
    name: "Encomun",
    rawId: "encomun",
    group: "salas",
    cat: "geral",
    node: "B02_node_0012_comunicacao_encomun",
  },
  "B01_poi_0006-2": { name: "Estúdio de vídeo", group: "salas", cat: "geral", node: "B02_node_0018_estudio_video" },
  "B01_poi_0006-3": { skip: true },
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
    if (!id || !/^B02_node_/i.test(id) || !isFinite(cx) || !isFinite(cy)) continue;
    const p = toLocal(cx, cy);
    nodes.push({
      id,
      level: LEVEL,
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

    const type = /escada|stairs|narnia|servir|conexao/i.test(from.id + to.id + id)
      ? "stairs"
      : "corridor";

    edges.push({
      id: `B02_E${String(seq++).padStart(4, "0")}`,
      from: from.id,
      to: to.id,
      path: pathPts,
      distanceMeters: +(units * METERS_PER_UNIT).toFixed(3),
      bidirectional: true,
      accessible: type !== "stairs",
      active: true,
      level: LEVEL,
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
  const seenNode = new Set();
  const re = /<(?:rect|polygon|path)\b([^>]*)\/?>/gi;
  let m;
  while ((m = re.exec(svg))) {
    const full = m[0];
    const tag = /^<(\w+)/.exec(full)?.[1]?.toLowerCase() || "rect";
    const attrs = m[1];
    const id = (/id=["']([^"']+)/.exec(attrs) || [])[1];
    if (!id || !/^(B02_poi_|B01_poi_)/i.test(id)) continue;

    const centerLocal = shapeCenter(attrs, tag);
    if (!centerLocal) continue;

    const meta = POI_META[id] || {
      name: id.replace(/^B0[12]_poi_0*/i, "Sala "),
      group: "salas",
      cat: "geral",
    };
    if (meta.skip) continue;

    const node = (meta.node && byId[meta.node]) || nearestNodeLocal(centerLocal, nodes, SNAP_MAX * 2);
    if (!node || seenNode.has(node.id)) continue;
    seenNode.add(node.id);

    pois.push({
      id: `B02_P_${(meta.rawId || id).replace(/[^a-zA-Z0-9_]/g, "_")}`,
      rawId: meta.rawId || id,
      name: meta.name,
      nodeIds: [node.id],
      active: true,
      cat: meta.cat || "geral",
      level: LEVEL,
      mapLevel: LEVEL,
      building: BUILDING,
      group: meta.group || "salas",
      inject: true,
    });
  }
  return pois;
}

function stripLocal(nodes) {
  return nodes.map(({ localX, localY, ...rest }) => rest);
}

function pushPoi(pois, poi) {
  if (pois.some((p) => p.nodeIds?.[0] === poi.nodeIds[0])) return;
  pois.push(poi);
}

function buildB02FloorLinks() {
  const nodesSvg = readSvg("2026_mapa_B02_node.svg");
  const edgeSvg = readSvg("2026_mapa_B02_edge.svg");
  const poiSvg = readSvg("2026_mapa_B02_poi.svg");

  const nodesRaw = parseNodes(nodesSvg);
  const { edges, skipped } = parseEdgeShapes(edgeSvg, nodesRaw);
  const pois = parsePois(poiSvg, nodesRaw);
  const nodes = stripLocal(nodesRaw);

  const narnia = nodes.find((n) => n.id === "B02_node_0014_entrada_narnia");
  const servir = nodes.find((n) => n.id === "B02_node_0005_conexao_servir");
  const bat = nodes.find((n) => n.id === "B02_node_0008_conexao_templo_batisterio");
  const almox = nodes.find((n) => n.id === "B02_node_0009_almox");
  const engVivo = nodes.find((n) => n.id === "B02_node_0017_eng_vivo");

  if (narnia) {
    edges.push({
      id: "B01_B02_E_escada_narnia",
      from: "B01_node_0013_entrada_narnia",
      to: narnia.id,
      path: [
        { x: 456.19, y: 174.68 },
        { x: narnia.x, y: narnia.y },
      ],
      distanceMeters: 8,
      bidirectional: true,
      accessible: false,
      active: true,
      level: "B01-B02",
      zone: "vertical",
      type: "stairs",
      parkingLot: false,
    });
  }

  if (servir) {
    edges.push({
      id: "B01_B02_E_acesso_servir",
      from: "B01_node_0003",
      to: servir.id,
      path: [
        { x: 218.32, y: 198 },
        { x: servir.x, y: servir.y },
      ],
      distanceMeters: 10,
      bidirectional: true,
      accessible: false,
      active: true,
      level: "B01-B02",
      zone: "vertical",
      type: "stairs",
      parkingLot: false,
    });
  }

  if (bat) {
    edges.push({
      id: "B01_B02_E_batisterio",
      from: "B01_node_0006_conexao_templo_batisterio",
      to: bat.id,
      path: [
        { x: 303.05, y: 219.32 },
        { x: bat.x, y: bat.y },
      ],
      distanceMeters: 9,
      bidirectional: true,
      accessible: false,
      active: true,
      level: "B01-B02",
      zone: "vertical",
      type: "stairs",
      parkingLot: false,
    });
  }

  if (almox) {
    pushPoi(pois, {
      id: "B02_P_almoxarifado",
      rawId: "B02_poi_almox",
      name: "Almoxarifado",
      nodeIds: [almox.id],
      active: true,
      cat: "geral",
      level: LEVEL,
      mapLevel: LEVEL,
      building: BUILDING,
      group: "salas",
      inject: true,
    });
  }

  if (engVivo) {
    pushPoi(pois, {
      id: "B02_P_engenharia_ao_vivo",
      rawId: "B02_poi_eng_vivo",
      name: "Engenharia ao vivo",
      nodeIds: [engVivo.id],
      active: true,
      cat: "geral",
      level: LEVEL,
      mapLevel: LEVEL,
      building: BUILDING,
      group: "salas",
      inject: true,
    });
  }

  if (narnia) {
    pushPoi(pois, {
      id: "B02_P_entrada_narnia_map",
      rawId: "B02_entrada_narnia_map",
      name: "Entrada Nárnia",
      nodeIds: [narnia.id],
      active: true,
      cat: "acesso",
      level: LEVEL,
      mapLevel: LEVEL,
      building: BUILDING,
      group: "elevadores",
      inject: true,
    });
  }

  if (bat) {
    pushPoi(pois, {
      id: "B02_P_escada_batisterio",
      rawId: "B02_escada_batisterio",
      name: "Escada — templo / batistério",
      nodeIds: [bat.id],
      active: true,
      cat: "acesso",
      level: LEVEL,
      mapLevel: LEVEL,
      building: BUILDING,
      group: "elevadores",
      inject: true,
    });
  }

  return { nodes, edges, pois, skipped, narnia, servir, bat };
}

module.exports = { buildB02FloorLinks, POI_META };

if (require.main === module) {
  const data = buildB02FloorLinks();
  console.log(`B02 nodes=${data.nodes.length} edges=${data.edges.length} pois=${data.pois.length}`);
  if (data.skipped.length) console.log("skipped:", data.skipped.join(", "));
  console.log(data.pois.map((p) => `${p.name} → ${p.nodeIds[0]}`).join("\n"));
}
