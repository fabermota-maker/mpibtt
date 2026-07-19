/**
 * Configuração geográfica — PIB Curitiba
 *
 * Sistema: WGS84
 *
 * Google Maps:
 * { lat: latitude, lng: longitude }
 *
 * GeoJSON:
 * [longitude, latitude]
 *
 * IMPORTANTE:
 * - Os pontos A–O formam exclusivamente a geofence.
 * - Os pontos P–Z são referências internas.
 * - Não adicione os pontos internos ao polígono externo.
 *
 * Carregamento no app: script clássico (IIFE) — constantes em globalThis.
 * Em ambiente ESM/Node, os mesmos símbolos ficam em module.exports.
 */
(function (global, factory) {
  "use strict";
  const api = factory();
  if (typeof module === "object" && module.exports) {
    module.exports = api;
  }
  Object.keys(api).forEach((key) => {
    global[key] = api[key];
  });
  global.PibCuritibaLocationConfig = api.default;
})(typeof window !== "undefined" ? window : globalThis, function factory() {
  "use strict";

  const PIB_CURITIBA_MAP_CENTER = {
    lat: -25.442099,
    lng: -49.284715,
  };

  /**
   * Limite externo da propriedade.
   *
   * Ordem obrigatória:
   * A → B → C → D → E → F → H → I → J → K → L → M → N → O → A
   */
  const PIB_CURITIBA_GEOFENCE = [
    {
      id: "A",
      name: "Esquina Av. Batel com Bento Viana — posto",
      lat: -25.441694444444444,
      lng: -49.28552777777778,
      type: "BOUNDARY",
    },
    {
      id: "B",
      name: "Ponto Jardim CF",
      lat: -25.441607,
      lng: -49.285305,
      type: "BOUNDARY",
    },
    {
      id: "C",
      name: "Entrada Av. Batel — posto",
      lat: -25.441555555555556,
      lng: -49.28491666666667,
      type: "BOUNDARY",
    },
    {
      id: "D",
      name: "Esquina da entrada do CF",
      lat: -25.44125,
      lng: -49.28422222222222,
      type: "BOUNDARY",
    },
    {
      id: "E",
      name: "Lateral do fundo do CF",
      lat: -25.441662,
      lng: -49.284074,
      type: "BOUNDARY",
    },
    {
      id: "F",
      name: "Lateral do fundo direito do estacionamento",
      lat: -25.442087,
      lng: -49.283864,
      type: "BOUNDARY",
    },
    {
      id: "H",
      name: "Lateral direita do estacionamento",
      lat: -25.442193,
      lng: -49.2842,
      type: "BOUNDARY",
    },
    {
      id: "I",
      name: "Lateral da entrada do estacionamento da Capela",
      lat: -25.44225,
      lng: -49.284425,
      type: "BOUNDARY",
    },
    {
      id: "J",
      name: "Fundo do Seven Pass",
      lat: -25.442488,
      lng: -49.284353,
      type: "BOUNDARY",
    },
    {
      id: "K",
      name: "Fundo do Espaço Kids",
      lat: -25.442753,
      lng: -49.284258,
      type: "BOUNDARY",
    },
    {
      id: "L",
      name: "Lateral direita do estacionamento — Av. Visconde",
      lat: -25.442903,
      lng: -49.284619,
      type: "BOUNDARY",
    },
    {
      id: "M",
      name: "Esquina Av. Visconde com Bento Viana",
      lat: -25.443038,
      lng: -49.284959,
      type: "BOUNDARY",
    },
    {
      id: "N",
      name: "Entrada do estacionamento — Av. Bento Viana",
      lat: -25.442469,
      lng: -49.285246,
      type: "BOUNDARY",
    },
    {
      id: "O",
      name: "Lateral do Jardim — Av. Bento Viana",
      lat: -25.442106,
      lng: -49.285379,
      type: "BOUNDARY",
    },
  ];

  /**
   * Pontos internos e âncoras para sincronização GPS.
   * Não alteram o perímetro da propriedade.
   */
  const PIB_CURITIBA_GPS_REFERENCE_POINTS = [
    {
      id: "P",
      name: "Templo",
      lat: -25.442015178704704,
      lng: -49.2850301361921,
      type: "GPS_REFERENCE",
      category: "DESTINATION",
      floorId: "L00",
      navNodeId: null,
      useForGpsSync: true,
    },
    {
      id: "Q",
      name: "Restaurante Seven Pass",
      lat: -25.4422494295931,
      lng: -49.28465388554982,
      type: "GPS_REFERENCE",
      category: "DESTINATION",
      floorId: "L00",
      navNodeId: null,
      useForGpsSync: true,
    },
    {
      id: "R",
      name: "Hall e corredor",
      lat: -25.441972222222223,
      lng: -49.28477777777778,
      type: "GPS_REFERENCE",
      category: "CORRIDOR",
      floorId: "L00",
      navNodeId: null,
      useForGpsSync: true,
    },
    {
      id: "S",
      name: "Elevadores PIB",
      lat: -25.4417545347635,
      lng: -49.28475094211227,
      type: "GPS_REFERENCE",
      category: "VERTICAL_CONNECTOR",
      floorId: "L00",
      navNodeId: null,
      useForGpsSync: true,
    },
    {
      id: "T",
      name: "Entrada do estacionamento — Av. Batel",
      lat: -25.44146003495228,
      lng: -49.28456409015768,
      type: "GPS_REFERENCE",
      category: "ENTRANCE",
      floorId: "L00",
      navNodeId: "L00_N0093_entrada_estacionamento_av_batel",
      useForGpsSync: true,
    },
    {
      id: "U",
      name: "Centro de Formação — CF",
      lat: -25.441547,
      lng: -49.284281,
      type: "GPS_REFERENCE",
      category: "DESTINATION",
      floorId: "L00",
      navNodeId: null,
      useForGpsSync: true,
    },
    {
      id: "V",
      name: "Ginásio",
      lat: -25.442534631956967,
      lng: -49.28449962532391,
      type: "GPS_REFERENCE",
      category: "DESTINATION",
      floorId: "L00",
      navNodeId: null,
      useForGpsSync: true,
    },
    {
      id: "X",
      name: "Espaço Kids e espaço externo",
      lat: -25.442752229860456,
      lng: -49.284506245323534,
      type: "GPS_REFERENCE",
      category: "DESTINATION",
      floorId: "L00",
      navNodeId: null,
      useForGpsSync: true,
    },
    {
      id: "Y",
      name: "Jardim",
      lat: -25.441696,
      lng: -49.285189,
      type: "GPS_REFERENCE",
      category: "DESTINATION",
      floorId: "L00",
      navNodeId: null,
      useForGpsSync: true,
    },
    {
      id: "Z",
      name: "Espaço Servir",
      lat: -25.441822,
      lng: -49.285336,
      type: "GPS_REFERENCE",
      category: "DESTINATION",
      floorId: "B01",
      navNodeId: null,
      useForGpsSync: true,
    },
    {
      id: "ENTRADA_BENTO_VIANA_1200",
      name: "Entrada do estacionamento — Bento Viana 1200",
      lat: -25.442461,
      lng: -49.285231,
      type: "GPS_REFERENCE",
      category: "ENTRANCE",
      floorId: "L00",
      navNodeId: "L00_N0003_entrada_estacionamento_principal_bento",
      useForGpsSync: true,
    },
  ];

  const PIB_CURITIBA_LOCATION_RULES = {
    coordinateSystem: "WGS84",
    requireInsideGeofence: true,
    maximumAcceptedAccuracyMeters: 30,
    outsideReadingsRequired: 3,
    keepLastValidPosition: true,
    useGpsReferencePoints: true,
    maximumGpsReferenceDistanceMeters: 25,
    snapToNearestNavEdge: true,
    maximumNavEdgeSnapDistanceMeters: 10,
    requireFloorConfirmation: true,
    allowFreeMovementOverSvg: false,
  };

  const PIB_CURITIBA_LOCATION_CONFIG = {
    id: "PIB_CURITIBA",
    name: "Primeira Igreja Batista de Curitiba",
    mapCenter: PIB_CURITIBA_MAP_CENTER,
    geofence: PIB_CURITIBA_GEOFENCE,
    gpsReferencePoints: PIB_CURITIBA_GPS_REFERENCE_POINTS,
    rules: PIB_CURITIBA_LOCATION_RULES,
  };

  function getGoogleMapsGeofencePath() {
    return PIB_CURITIBA_GEOFENCE.map((point) => ({
      lat: point.lat,
      lng: point.lng,
    }));
  }

  function getGeoJsonGeofenceRing() {
    const coordinates = PIB_CURITIBA_GEOFENCE.map((point) => [
      point.lng,
      point.lat,
    ]);
    const firstCoordinate = coordinates[0];
    return [...coordinates, [...firstCoordinate]];
  }

  function getGpsReferencePointById(pointId) {
    return (
      PIB_CURITIBA_GPS_REFERENCE_POINTS.find((point) => point.id === pointId) ??
      null
    );
  }

  function getGpsEntrancePoints() {
    return PIB_CURITIBA_GPS_REFERENCE_POINTS.filter(
      (point) => point.category === "ENTRANCE",
    );
  }

  function validatePibCoordinates() {
    const allPoints = [
      ...PIB_CURITIBA_GEOFENCE,
      ...PIB_CURITIBA_GPS_REFERENCE_POINTS,
    ];
    const errors = [];

    for (const point of allPoints) {
      const validLatitude =
        typeof point.lat === "number" &&
        Number.isFinite(point.lat) &&
        point.lat >= -90 &&
        point.lat <= 90;

      const validLongitude =
        typeof point.lng === "number" &&
        Number.isFinite(point.lng) &&
        point.lng >= -180 &&
        point.lng <= 180;

      if (!validLatitude || !validLongitude) {
        errors.push({
          id: point.id,
          name: point.name,
          lat: point.lat,
          lng: point.lng,
        });
      }
    }

    return {
      valid: errors.length === 0,
      totalPoints: allPoints.length,
      boundaryPoints: PIB_CURITIBA_GEOFENCE.length,
      referencePoints: PIB_CURITIBA_GPS_REFERENCE_POINTS.length,
      errors,
    };
  }

  return {
    PIB_CURITIBA_MAP_CENTER,
    PIB_CURITIBA_GEOFENCE,
    PIB_CURITIBA_GPS_REFERENCE_POINTS,
    PIB_CURITIBA_LOCATION_RULES,
    PIB_CURITIBA_LOCATION_CONFIG,
    getGoogleMapsGeofencePath,
    getGeoJsonGeofenceRing,
    getGpsReferencePointById,
    getGpsEntrancePoints,
    validatePibCoordinates,
    default: PIB_CURITIBA_LOCATION_CONFIG,
  };
});
