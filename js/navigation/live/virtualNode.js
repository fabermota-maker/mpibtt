/**
 * Virtual Node temporário — só em memória, nunca persiste no navigation.json.
 */
(function (global) {
  "use strict";

  const CFG = () => global.LiveNavigationConfig || {};
  const PG = () => global.LivePolylineGeometry;
  const VIRTUAL_NODE_ID = () => CFG().VIRTUAL_NODE_ID || "virtual_node_user";

  function tempEdgeId(baseId, suffix) {
    return `__temp__${baseId}__${suffix}`;
  }

  /**
   * Insere virtual node no grafo em memória (cópia superficial).
   * @returns {{ graph, virtualNode, cleanup: Function }}
   */
  function createEphemeralGraphWithVirtualNode(baseGraph, matchResult, opts = {}) {
    const safety = CFG().GRAPH_SAFETY || {};
    if (safety.ALLOW_PERMANENT_VIRTUAL_NODE) {
      throw new Error("Virtual node permanente não permitido");
    }

    const edgeId = matchResult.matchedEdgeId;
    const edgeEntry = opts.edgeCache?.byId?.get(edgeId);
    const edge = edgeEntry?.edge || baseGraph.edgesById.get(edgeId);
    if (!edge || !edgeEntry?.path) return null;

    const proj = PG()?.projectPointOnPolyline(
      matchResult.snappedPosition || matchResult.rawMapPosition,
      edgeEntry.path,
      opts.metersPerUnit || baseGraph.metersPerUnit || 0.35,
    );
    if (!proj || !isFinite(proj.distanceMapUnits)) return null;

    const { partA, partB } = PG()?.splitPolylineAt(
      edgeEntry.path,
      proj.segmentIndex,
      proj.point,
    ) || { partA: [], partB: [] };

    const mpu = opts.metersPerUnit || baseGraph.metersPerUnit || 0.35;
    const lenA = PG()?.polylineLength(partA, mpu) ?? 0;
    const lenB = PG()?.polylineLength(partB, mpu) ?? 0;

    const virtualNode = {
      id: VIRTUAL_NODE_ID(),
      type: "temporary",
      level: edge.level || "L00",
      x: proj.point.x,
      y: proj.point.y,
      edgeId,
      segmentIndex: proj.segmentIndex,
      segmentRatio: proj.segmentRatio,
      active: true,
    };

    const nodesById = new Map(baseGraph.nodesById);
    nodesById.set(virtualNode.id, virtualNode);

    const edgesById = new Map(baseGraph.edgesById);
    const adjacency = new Map();
    for (const [nid, list] of baseGraph.adjacency) {
      adjacency.set(nid, [...list]);
    }

    const eA = tempEdgeId(edgeId, "a");
    const eB = tempEdgeId(edgeId, "b");

    const baseProps = {
      active: true,
      level: edge.level || "L00",
      type: edge.type,
      zone: edge.zone,
      accessible: edge.accessible !== false,
      bidirectional: edge.bidirectional !== false,
      parkingLot: edge.parkingLot,
      temporary: true,
      sourceEdgeId: edgeId,
    };

    const edgeToFrom = {
      id: eA,
      from: edge.from,
      to: virtualNode.id,
      ...baseProps,
      path: partA,
      distanceMeters: lenA,
    };
    const edgeToTo = {
      id: eB,
      from: virtualNode.id,
      to: edge.to,
      ...baseProps,
      path: partB,
      distanceMeters: lenB,
    };

    edgesById.set(eA, edgeToFrom);
    edgesById.set(eB, edgeToTo);

    function link(from, toEdge) {
      if (!adjacency.has(from)) adjacency.set(from, []);
      adjacency.get(from).push({
        id: toEdge.id,
        from,
        to: toEdge.to,
        ...toEdge,
      });
    }

    link(edge.from, edgeToFrom);
    link(virtualNode.id, edgeToTo);
    if (edge.bidirectional !== false) {
      const revA = {
        ...edgeToFrom,
        id: tempEdgeId(edgeId, "a_rev"),
        from: virtualNode.id,
        to: edge.from,
        path: PG()?.reversePath(partA),
        distanceMeters: lenA,
      };
      const revB = {
        ...edgeToTo,
        id: tempEdgeId(edgeId, "b_rev"),
        from: edge.to,
        to: virtualNode.id,
        path: PG()?.reversePath(partB),
        distanceMeters: lenB,
      };
      edgesById.set(revA.id, revA);
      edgesById.set(revB.id, revB);
      link(virtualNode.id, revA);
      link(edge.to, revB);
    }

    const graph = {
      ...baseGraph,
      nodesById,
      edgesById,
      adjacency,
      _ephemeral: true,
      _virtualNodeId: virtualNode.id,
    };

    return {
      graph,
      virtualNode,
      projected: proj,
      tempEdgeIds: [eA, eB],
      cleanup: () => {},
    };
  }

  /**
   * Calcula rota a partir do virtual node usando A* existente.
   */
  function calculateRouteFromVirtualNode({
    baseGraph,
    matchResult,
    destinationNodeIds,
    routePreferences,
    edgeCache,
  }) {
    const session = createEphemeralGraphWithVirtualNode(baseGraph, matchResult, {
      edgeCache,
      metersPerUnit: baseGraph.metersPerUnit,
    });
    if (!session) return null;

    const NR = global.NavigationRouter;
    if (!NR?.astar) return null;

    const goals = Array.isArray(destinationNodeIds)
      ? destinationNodeIds
      : [destinationNodeIds];

    const route = NR.astar(session.virtualNode.id, goals, session.graph, routePreferences || {});
    return route;
  }

  global.LiveVirtualNode = {
    VIRTUAL_NODE_ID,
    createEphemeralGraphWithVirtualNode,
    calculateRouteFromVirtualNode,
    tempEdgeId,
  };
})(typeof window !== "undefined" ? window : globalThis);
