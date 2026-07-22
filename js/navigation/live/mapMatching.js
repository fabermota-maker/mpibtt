/**
 * Map matching — escolha de edge com pontuação, histerese e índice espacial.
 */
(function (global) {
  "use strict";

  const CFG = () => global.LiveNavigationConfig?.LIVE_NAVIGATION_CONFIG || {};
  const AVAIL = () => global.LiveNavigationConfig?.MAP_MATCHING_AVAILABILITY || {};
  const PG = () => global.LivePolylineGeometry;
  const SI = () => global.LiveSpatialIndex;

  function isEdgeAllowed(edge, opts = {}) {
    if (!edge || edge.active === false) return false;
    if (opts.level && (edge.level || "L00") !== opts.level) return false;
    if (opts.accessibleOnly && edge.accessible === false) return false;
    if (opts.outdoorOnly && edge.zone === "indoor" && !global.LiveEdgeCache?.isOutdoorEdge(edge)) {
      return false;
    }
    if (edge.type === "elevator" || edge.type === "level_transition") return false;
    return true;
  }

  function headingScore(userHeading, segAngle) {
    if (userHeading == null || !isFinite(userHeading)) return 0.5;
    let diff = Math.abs(userHeading - segAngle);
    if (diff > 180) diff = 360 - diff;
    return Math.max(0, 1 - diff / 90);
  }

  function segmentAngle(a, b) {
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    let deg = (Math.atan2(dy, dx) * 180) / Math.PI;
    if (deg < 0) deg += 360;
    return deg;
  }

  function scoreCandidate(entry, projection, opts) {
    const cfg = CFG();
    const maxSnap =
      opts.outdoorOnly || entry.outdoor
        ? cfg.maximumSnapDistanceOutdoorMeters ?? 30
        : cfg.maximumSnapDistanceIndoorMeters ?? 12;
    const mpu = opts.metersPerUnit || 0.35;
    const distM = projection.distanceMeters;

    if (distM > maxSnap) return null;

    const distScore = Math.max(0, 1 - distM / maxSnap);

    let continuityScore = 0;
    if (opts.previousEdgeId && entry.edgeId === opts.previousEdgeId) {
      continuityScore = 1;
    } else if (opts.routeEdgeIds?.has(entry.edgeId)) {
      continuityScore = 0.85;
    } else if (opts.previousEdgeId) {
      continuityScore = 0.1;
    } else {
      continuityScore = 0.4;
    }

    let hScore = 0.5;
    if (opts.heading != null && entry.path?.length >= 2) {
      const si = projection.segmentIndex ?? 0;
      const a = entry.path[si];
      const b = entry.path[Math.min(si + 1, entry.path.length - 1)];
      hScore = headingScore(opts.heading, segmentAngle(a, b));
    }

    const score =
      distScore * (cfg.distanceWeight ?? 0.5) +
      continuityScore * (cfg.routeContinuityWeight ?? 0.35) +
      hScore * (cfg.headingWeight ?? 0.15);

    return { score, distM, distScore, continuityScore, headingScore: hScore };
  }

  function findNearestNavigableEdge(position, context) {
    const {
      edgeCache,
      spatialIndex,
      level = "L00",
      heading = null,
      previousEdgeId = null,
      routeEdgeIds = null,
      accessibleOnly = false,
      outdoorOnly = AVAIL().outdoor && !AVAIL().indoor,
      metersPerUnit = 0.35,
    } = context || {};

    if (!edgeCache?.byId || !position) return null;

    const cfg = CFG();
    const radiusSvg = (cfg.spatialSearchRadiusMeters ?? 35) / metersPerUnit;

    let candidateIds;
    if (spatialIndex && global.LiveNavigationConfig?.PERFORMANCE_CONFIG?.spatialGridEnabled !== false) {
      candidateIds = SI().queryNearbyEdges(spatialIndex, position, radiusSvg);
    } else {
      candidateIds = [...edgeCache.byId.keys()];
    }

    const routeSet = routeEdgeIds instanceof Set ? routeEdgeIds : new Set(routeEdgeIds || []);
    let best = null;
    const debugCandidates = [];

    for (const edgeId of candidateIds) {
      const entry = edgeCache.byId.get(edgeId);
      if (!entry) continue;
      if ((entry.level || "L00") !== level) continue;
      if (outdoorOnly && !entry.outdoor) continue;
      if (!isEdgeAllowed(entry.edge, { level, accessibleOnly, outdoorOnly })) continue;

      const projection = PG()?.projectPointOnPolyline(position, entry.path, metersPerUnit);
      if (!projection) continue;

      const scored = scoreCandidate(entry, projection, {
        heading,
        previousEdgeId,
        routeEdgeIds: routeSet,
        outdoorOnly,
        metersPerUnit,
      });
      if (!scored) continue;

      const item = {
        edgeId,
        entry,
        projection,
        ...scored,
        snappedPosition: projection.point,
        level: entry.level,
      };
      debugCandidates.push(item);
      if (!best || item.score > best.score) best = item;
    }

    if (!best) return null;

    const maxAcc = cfg.maximumAcceptedAccuracyMeters ?? 35;
    const acc = context?.accuracyMeters ?? maxAcc;
    const confidence = Math.max(0, Math.min(1, best.score * (acc <= maxAcc ? 1 : 0.5)));

    return {
      rawMapPosition: { x: position.x, y: position.y, level },
      snappedPosition: { x: best.snappedPosition.x, y: best.snappedPosition.y, level },
      matchedEdgeId: best.edgeId,
      segmentIndex: best.projection.segmentIndex,
      segmentRatio: best.projection.segmentRatio,
      distanceToEdgeMeters: best.distM,
      confidence,
      accuracyMeters: acc,
      isReliable: acc <= maxAcc && best.distM <= (best.entry.outdoor ? cfg.maximumSnapDistanceOutdoorMeters : cfg.maximumSnapDistanceIndoorMeters),
      _debugCandidates: debugCandidates,
    };
  }

  /** Histerese — evita saltos entre edges paralelos. */
  function createEdgeHysteresis(required = 2) {
    let pendingId = null;
    let pendingCount = 0;
    let currentId = null;

    return {
      resolve(candidateEdgeId, stillValidOnCurrent) {
        if (stillValidOnCurrent && currentId) {
          pendingId = null;
          pendingCount = 0;
          return currentId;
        }
        if (!candidateEdgeId) return currentId;

        if (candidateEdgeId === currentId) {
          pendingId = null;
          pendingCount = 0;
          return currentId;
        }

        if (candidateEdgeId === pendingId) {
          pendingCount += 1;
          if (pendingCount >= required) {
            currentId = candidateEdgeId;
            pendingId = null;
            pendingCount = 0;
          }
          return currentId;
        }

        pendingId = candidateEdgeId;
        pendingCount = 1;
        return currentId;
      },
      getCurrent: () => currentId,
      reset: (id) => {
        currentId = id || null;
        pendingId = null;
        pendingCount = 0;
      },
    };
  }

  global.LiveMapMatching = {
    findNearestNavigableEdge,
    createEdgeHysteresis,
    isEdgeAllowed,
  };
})(typeof window !== "undefined" ? window : globalThis);
