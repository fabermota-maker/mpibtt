/**
 * Configuração central — navegação ao vivo / map matching.
 * Não espalhar números mágicos fora deste arquivo.
 */
(function (global) {
  "use strict";

  const GRAPH_SAFETY = {
    ALLOW_FREE_GPS_CONNECTION: false,
    ALLOW_STRAIGHT_LINE_TO_ROUTE: false,
    ALLOW_ROUTE_OUTSIDE_GRAPH: false,
    ALLOW_AUTOMATIC_LEVEL_CHANGE: false,
    ALLOW_PERMANENT_VIRTUAL_NODE: false,
    ALLOW_CROSS_LEVEL_EDGE_MATCHING: false,
  };

  const LIVE_NAVIGATION_CONFIG = {
    enabled: true,

    maximumAcceptedAccuracyMeters: 35,
    preferredAccuracyMeters: 15,

    maximumSnapDistanceOutdoorMeters: 30,
    maximumSnapDistanceIndoorMeters: 12,

    offRouteThresholdMeters: 10,
    offRouteConfirmationsRequired: 3,

    edgeChangeConfirmationsRequired: 2,

    minimumRerouteIntervalMs: 5000,
    minimumRouteCalculationIntervalMs: 3000,
    minimumMarkerUpdateIntervalMs: 500,

    minimumMovementMeters: 1.5,
    arrivalThresholdMeters: 5,

    headingWeight: 0.15,
    routeContinuityWeight: 0.35,
    distanceWeight: 0.5,

    smoothingWindowSize: 4,
    maximumPositionHistory: 10,

    spatialSearchRadiusMeters: 35,
    spatialGridCellSize: 50,

    showAccuracyCircle: true,
    showRawGpsPositionInDebug: false,
    enableDebugLogs: false,
  };

  const MAP_MATCHING_AVAILABILITY = {
    outdoor: true,
    indoor: false,
    manualIndoorPosition: true,
    qrCodeIndoorPosition: false,
  };

  const PERFORMANCE_CONFIG = {
    markerUpdateIntervalMs: 500,
    routeProgressIntervalMs: 1000,
    minimumRerouteIntervalMs: 5000,
    offRouteConfirmationsRequired: 3,
    edgeChangeConfirmationsRequired: 2,
    spatialGridEnabled: true,
    rebuildSpatialIndexOnEveryUpdate: false,
    recalculateRouteOnEveryPosition: false,
  };

  const VIRTUAL_NODE_ID = "virtual_node_user";

  function isDebugNavigation() {
    if (typeof location === "undefined") return false;
    return /(?:\?|&)debugNavigation=true/i.test(location.search || "");
  }

  global.LiveNavigationConfig = {
    GRAPH_SAFETY,
    LIVE_NAVIGATION_CONFIG,
    MAP_MATCHING_AVAILABILITY,
    PERFORMANCE_CONFIG,
    VIRTUAL_NODE_ID,
    isDebugNavigation,
  };
})(typeof window !== "undefined" ? window : globalThis);
