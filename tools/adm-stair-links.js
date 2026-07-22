/**
 * Cadeia vertical da escada lateral do prédio ADM (L00–L06).
 * L00: sempre pelo ícone “Escadas” ao lado do Berçário START (L00_N0075).
 */
function buildAdmStairLinks() {
  // Ícone Escadas · Berçário START (mapa campus)
  const L00_STAIR = {
    level: "L00",
    id: "L00_N0075",
    x: 352.39,
    y: 412.07,
    inject: false,
  };

  const hubs = [
    L00_STAIR,
    { level: "L01", id: "L01_node_0040_escada_lateral", x: 654.273, y: 621.116, inject: false },
    { level: "L02", id: "L02_node_0003_escada_laral", x: 660.49, y: 622.513, inject: false },
    { level: "L03", id: "L03_node_0003", x: 660.49, y: 622.513, inject: false },
    { level: "L04", id: "L04_node_0024_escada_lateral", x: 654.163, y: 621.131, inject: false },
    { level: "L05", id: "L05_node_0039_escada_lateral", x: 654.163, y: 621.163, inject: false },
    { level: "L06", id: "L06_node_0035_escada_lateral", x: 654.433, y: 616.688, inject: false },
  ];

  const nodes = hubs
    .filter((h) => h.inject)
    .map((h) => ({
      id: h.id,
      level: h.level,
      x: h.x,
      y: h.y,
      active: true,
      hidden: true,
    }));

  const edges = [];
  for (let i = 0; i < hubs.length - 1; i++) {
    const a = hubs[i];
    const b = hubs[i + 1];
    edges.push({
      id: `${a.level}_${b.level}_E_escada_lateral`,
      from: a.id,
      to: b.id,
      path: [
        { x: a.x, y: a.y },
        { x: b.x, y: b.y },
      ],
      // L00→L01: sobe a partir do Berçário; demais andares no poço do ADM
      distanceMeters: a.level === "L00" ? 12 : 14,
      bidirectional: true,
      accessible: false,
      active: true,
      level: `${a.level}-${b.level}`,
      zone: "vertical",
      type: "stairs",
      parkingLot: false,
    });
  }

  const pois = hubs
    .filter((h) => h.inject)
    .map((h) => ({
      id: `${h.level}_P_escada_lateral`,
      rawId: h.id,
      name: `Escada lateral (${h.level})`,
      nodeIds: [h.id],
      active: true,
      cat: "acesso",
      level: h.level,
      mapLevel: h.level,
      building: "Administrativo",
      group: "elevadores",
      inject: true,
    }));

  return { nodes, edges, pois, hubs };
}

module.exports = { buildAdmStairLinks };
