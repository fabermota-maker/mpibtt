/**
 * Atualiza assets a partir dos SVG 2026 na pasta SVG map pib V1.
 * Uso: node tools/update-map-assets.js
 */
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const SRC_DIR = path.resolve(ROOT, "..", "Map location PIBCuritiba", "SVG map pib V1");
const ASSETS = path.join(ROOT, "assets");

const SRC = {
  background: "2026 mapa pib Background 01.svg",
  info: "2026 mapa pib_txt_info_tech.svg",
};

const PLACEHOLDERS = [
  ["_x30_4_x5F__x5F_background_x5F_wall_x5F_paredes_x5F_tech", "04_background_wall_paredes_tech"],
  ["_x30_5_x5F_edge_x5F_indoor_x5F_tech", "05_edge_indoor_tech"],
  ["_x30_6_x5F_edge_x5F_outdoor-tech", "06_edge_outdoor-tech"],
  ["_x30_7_x5F_txt_x5F_info", "07_txt_info"],
  ["_x30_8_x5F_pois", "08_pois"],
  ["_x30_9_x5F_nodes_x5F_L00", "09_nodes_L00"],
];

function readSrc(name) {
  const p = path.join(SRC_DIR, name);
  if (!fs.existsSync(p)) throw new Error(`Arquivo não encontrado: ${p}`);
  return fs.readFileSync(p, "utf8");
}

function extractDefs(svg) {
  const m = svg.match(/<defs>[\s\S]*?<\/defs>/i);
  return m ? m[0] : "<defs></defs>";
}

function extractInner(svg) {
  return svg
    .replace(/^[\s\S]*?<svg[^>]*>/i, "")
    .replace(/<\/svg>\s*$/i, "")
    .replace(/<defs>[\s\S]*?<\/defs>/i, "")
    .trim();
}

function buildBackgroundHost(bgSvg) {
  const defs = extractDefs(bgSvg);
  const inner = extractInner(bgSvg);
  const placeholders = PLACEHOLDERS.map(
    ([id, dataName]) => `  <g id="${id}" data-name="${dataName}"></g>`,
  ).join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 1011.56 862.63" version="1.1">
${defs}
  <g id="_x30_2_x5F_background_x5F_estacionamento_x5F_BG" data-name="02_background_estacionamento_BG">
${inner.split("\n").map((l) => (l ? `    ${l}` : "")).join("\n")}
  </g>
  <g id="_x30_3_x5F_background_x5F_estacionamento_x5F_Map" data-name="03_background_estacionamento_Map"></g>
${placeholders}
</svg>
`;
}

function main() {
  const bgSrc = readSrc(SRC.background);
  const infoSrc = readSrc(SRC.info);

  const hostBg = buildBackgroundHost(bgSrc);
  fs.writeFileSync(path.join(ASSETS, "mapa-background.svg"), hostBg, "utf8");
  fs.writeFileSync(path.join(ASSETS, "background.svg"), hostBg, "utf8");
  fs.writeFileSync(path.join(ASSETS, "mapa-info-textos.svg"), infoSrc, "utf8");

  // reaplicar marcação de rótulos tipográficos (path) que devem ficar visíveis
  try {
    require("./keep-info-labels.js");
  } catch (err) {
    console.warn("[update-map-assets] keep-info-labels:", err.message);
  }

  console.log("[update-map-assets] atualizados:");
  console.log("  - assets/mapa-background.svg");
  console.log("  - assets/background.svg");
  console.log("  - assets/mapa-info-textos.svg");
  console.log(`  fontes: ${SRC.background} · ${SRC.info}`);
}

main();
