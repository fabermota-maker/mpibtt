/**
 * Compõe assets/mapa-B02.svg a partir das camadas oficiais B02.
 * Uso: node tools/build-mapa-b02.js
 *
 * Visível: wall, info
 * Oculto: poi, node, edge (grafo técnico)
 */
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const SRC_DIR = path.resolve(ROOT, "..", "Map location PIBCuritiba", "SVG map pib B02 vetor -app");
const OUT = path.join(ROOT, "assets", "mapa-B02.svg");

const FRAME = {
  viewBox: "0 0 519.83 190.11",
  bgW: 519.83,
  bgH: 190.11,
};

const LAYERS = [
  { file: "2026_mapa_B02_wall_parede.svg", prefix: "b02w", id: "B02_WALL", hidden: false },
  { file: "2026_mapa_B02_info.svg", prefix: "b02i", id: "B02_ICONS", hidden: false },
  { file: "2026_mapa_B02_poi.svg", prefix: "b02p", id: "B02_POI", hidden: true },
  { file: "2026_mapa_B02_node.svg", prefix: "b02n", id: "B02_NODES", hidden: true },
  { file: "2026_mapa_B02_edge.svg", prefix: "b02e", id: "B02_EDGES", hidden: true },
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
      .b02-bg { fill: #ffffff; }
${styleChunks.map((c) => c.split("\n").map((l) => `      ${l}`).join("\n")).join("\n\n")}
    </style>
${defChunks.map((c) => c.split("\n").map((l) => `    ${l}`).join("\n")).join("\n")}
  </defs>
  <g id="B02_map_background">
    <rect class="b02-bg" data-floor-bg="true" width="${FRAME.bgW}" height="${FRAME.bgH}"/>
    <g id="B02_map_content">
${bodyChunks.join("\n")}
    </g>
  </g>
</svg>
`;

  fs.writeFileSync(OUT, out, "utf8");
  console.log("[build-mapa-b02] escrito:", OUT);
  console.log("[build-mapa-b02] camadas ocultas: B02_POI, B02_NODES, B02_EDGES");
}

main();
