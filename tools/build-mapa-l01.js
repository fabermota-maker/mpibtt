/**
 * Compõe assets/mapa-L01.svg a partir das camadas oficiais L01.
 * Uso: node tools/build-mapa-l01.js
 *
 * Visível: wall, icon_info
 * Oculto: poi, node, edge (grafo técnico)
 */
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const SRC_DIR = path.resolve(ROOT, "..", "Map location PIBCuritiba", "SVG map pib L01 vetor -app");
const OUT = path.join(ROOT, "assets", "mapa-L01.svg");

const FRAME = {
  viewBox: "15 385 1145 360",
  bgW: 1175.11,
  bgH: 1120,
  transform: "translate(37.53 401.3) scale(1.57)",
};

const LAYERS = [
  { file: "2026_mapa_L01_wall_parede.svg", prefix: "l01w", id: "L01_WALL", hidden: false },
  { file: "2026_mapa_L01_icon_info.svg", prefix: "l01c", id: "L01_ICONS", hidden: false },
  { file: "2026_mapa_L01_poi.svg", prefix: "l01p", id: "L01_POI", hidden: true },
  { file: "2026_mapa_L01_node.svg", prefix: "l01n", id: "L01_NODES", hidden: true },
  { file: "2026_mapa_L01_edge.svg", prefix: "l01e", id: "L01_EDGES", hidden: true },
];

function readSrc(name) {
  const p = path.join(SRC_DIR, name);
  if (!fs.existsSync(p)) throw new Error(`Arquivo não encontrado: ${p}`);
  return fs.readFileSync(p, "utf8");
}

function extractDefsStyle(svg) {
  const m = svg.match(/<defs>[\s\S]*?<\/defs>/i);
  if (!m) return { style: "", otherDefs: "" };
  const defs = m[0];
  const styleM = defs.match(/<style[^>]*>[\s\S]*?<\/style>/i);
  const style = styleM ? styleM[0] : "";
  const otherDefs = defs
    .replace(/<defs>/i, "")
    .replace(/<\/defs>/i, "")
    .replace(/<style[^>]*>[\s\S]*?<\/style>/i, "")
    .trim();
  return { style, otherDefs };
}

function extractInner(svg) {
  return svg
    .replace(/^[\s\S]*?<svg[^>]*>/i, "")
    .replace(/<\/svg>\s*$/i, "")
    .replace(/<defs>[\s\S]*?<\/defs>/i, "")
    .trim();
}

function prefixClasses(css, prefix) {
  return css.replace(/\.cls-(\d+)/g, `.${prefix}-cls-$1`);
}

function prefixClassAttrs(html, prefix) {
  return html
    .replace(/\bclass="([^"]+)"/g, (_, classes) => {
      const next = classes
        .split(/\s+/)
        .filter(Boolean)
        .map((c) => (c.startsWith("cls-") ? `${prefix}-${c}` : c))
        .join(" ");
      return `class="${next}"`;
    })
    .replace(/\bclass='([^']+)'/g, (_, classes) => {
      const next = classes
        .split(/\s+/)
        .filter(Boolean)
        .map((c) => (c.startsWith("cls-") ? `${prefix}-${c}` : c))
        .join(" ");
      return `class='${next}'`;
    });
}

function stripStyleTag(styleBlock) {
  return styleBlock
    .replace(/^<style[^>]*>/i, "")
    .replace(/<\/style>$/i, "")
    .trim();
}

function main() {
  const styleChunks = [];
  const defChunks = [];
  const bodyChunks = [];

  for (const layer of LAYERS) {
    const raw = readSrc(layer.file);
    const { style, otherDefs } = extractDefsStyle(raw);
    let inner = extractInner(raw);

    if (style) {
      styleChunks.push(prefixClasses(stripStyleTag(style), layer.prefix));
    }
    if (otherDefs) {
      defChunks.push(prefixClassAttrs(otherDefs, layer.prefix));
    }
    inner = prefixClassAttrs(inner, layer.prefix);

    const hideAttrs = layer.hidden
      ? ' style="display:none" visibility="hidden" aria-hidden="true" pointer-events="none"'
      : "";
    bodyChunks.push(
      `    <g id="${layer.id}" data-layer="${layer.file}"${hideAttrs}>\n${inner
        .split("\n")
        .map((l) => (l ? `      ${l}` : ""))
        .join("\n")}\n    </g>`,
    );
  }

  const out = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="${FRAME.viewBox}" version="1.1">
  <defs>
    <style>
      .l01-bg { fill: #fffef5; }
${styleChunks.map((c) => c.split("\n").map((l) => `      ${l}`).join("\n")).join("\n\n")}
    </style>
${defChunks.map((c) => c.split("\n").map((l) => `    ${l}`).join("\n")).join("\n")}
  </defs>
  <g id="L01_adm_map_background">
    <rect class="l01-bg" data-floor-bg="true" width="${FRAME.bgW}" height="${FRAME.bgH}"/>
    <g id="L01_adm_map_content" transform="${FRAME.transform}">
${bodyChunks.join("\n")}
    </g>
  </g>
</svg>
`;

  fs.writeFileSync(OUT, out, "utf8");
  console.log("[build-mapa-l01] escrito:", OUT);
  console.log("[build-mapa-l01] camadas ocultas: L01_POI, L01_NODES, L01_EDGES");
}

main();
