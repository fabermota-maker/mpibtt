/**
 * Marca rótulos tipográficos (path) que devem permanecer visíveis.
 */
const fs = require("fs");
const path = require("path");

const file = path.resolve(__dirname, "../assets/mapa-info-textos.svg");
let svg = fs.readFileSync(file, "utf8");

const marks = [
  {
    start: "M99.3,108.13",
    id: "label_centro_formacao_cf",
    label: "Centro de Formacao | CF",
  },
  {
    start: "M742.18,456.86",
    id: "label_seven_pass",
    label: "SEVEN PASS",
  },
  {
    start: "M807.93,456.78",
    id: "label_bazar_abasc",
    label: "Bazar abasc",
  },
];

for (const m of marks) {
  const needle = `<g>\n    <path class="cls-9" d="${m.start}`;
  const alt = `<g>\r\n    <path class="cls-9" d="${m.start}`;
  const replacement = `<g id="${m.id}" data-keep-label="true" data-label="${m.label}">\n    <path class="cls-9" d="${m.start}`;
  if (svg.includes(needle)) {
    svg = svg.replace(needle, replacement);
    console.log("OK", m.id);
  } else if (svg.includes(alt)) {
    svg = svg.replace(alt, replacement);
    console.log("OK (crlf)", m.id);
  } else if (svg.includes(`id="${m.id}"`)) {
    console.log("already", m.id);
  } else {
    // fallback: find path start anywhere after <g>
    const re = new RegExp(
      `<g>\\s*<path class="cls-9" d="${m.start.replace(".", "\\.")}`,
    );
    if (re.test(svg)) {
      svg = svg.replace(
        re,
        `<g id="${m.id}" data-keep-label="true" data-label="${m.label}"><path class="cls-9" d="${m.start}`,
      );
      console.log("OK (re)", m.id);
    } else {
      console.log("MISS", m.id, m.start);
    }
  }
}

fs.writeFileSync(file, svg, "utf8");
console.log("saved", file);
