/**
 * Testes unitários — geometria, map matching, virtual node, off-route.
 * Executar: node tools/test-live-navigation.js
 */
"use strict";

const path = require("path");
const vm = require("vm");

function loadScript(file, sandbox) {
  const code = require("fs").readFileSync(file, "utf8");
  vm.runInNewContext(code, sandbox, { filename: file });
}

function createSandbox() {
  const g = {
    console,
    Math,
    Date,
    Set,
    Map,
    Infinity,
    isFinite,
    navigator: undefined,
    location: { search: "" },
  };
  const dir = path.join(__dirname, "..", "js", "navigation", "live");
  loadScript(path.join(dir, "liveNavigationConfig.js"), g);
  loadScript(path.join(dir, "polylineGeometry.js"), g);
  loadScript(path.join(dir, "spatialIndex.js"), g);
  loadScript(path.join(dir, "edgeCache.js"), g);
  loadScript(path.join(dir, "mapMatching.js"), g);
  loadScript(path.join(dir, "virtualNode.js"), g);
  loadScript(path.join(dir, "positionSmoothing.js"), g);
  loadScript(path.join(dir, "routeProgress.js"), g);
  loadScript(path.join(dir, "offRouteDetection.js"), g);
  loadScript(path.join(dir, "rerouting.js"), g);

  g.NavigationRouter = {
    astar(start, goals, graph) {
      if (start === "virtual_node_user" && graph.nodesById.has("goal")) {
        return {
          nodeIds: [start, "goal"],
          edgeIds: ["__temp__e1__b"],
          points: [{ x: 5, y: 0 }, { x: 10, y: 0 }],
          distanceMeters: 5,
        };
      }
      return null;
    },
  };
  return g;
}

let passed = 0;
let failed = 0;

function assert(cond, msg) {
  if (cond) {
    passed += 1;
    console.log("  OK:", msg);
  } else {
    failed += 1;
    console.error("  FAIL:", msg);
  }
}

function approx(a, b, eps = 0.01) {
  return Math.abs(a - b) <= eps;
}

function run() {
  const g = createSandbox();
  const PG = g.LivePolylineGeometry;
  const MM = g.LiveMapMatching;
  const EC = g.LiveEdgeCache;
  const SI = g.LiveSpatialIndex;
  const VN = g.LiveVirtualNode;
  const PS = g.LivePositionSmoothing;
  const ORD = g.LiveOffRouteDetection;

  console.log("\n=== Projeção segmento horizontal ===");
  {
    const r = PG.projectPointOnSegment({ x: 5, y: 2 }, { x: 0, y: 0 }, { x: 10, y: 0 });
    assert(approx(r.point.x, 5) && approx(r.point.y, 0), "horizontal");
  }

  console.log("\n=== Projeção segmento vertical ===");
  {
    const r = PG.projectPointOnSegment({ x: 2, y: 5 }, { x: 0, y: 0 }, { x: 0, y: 10 });
    assert(approx(r.point.x, 0) && approx(r.point.y, 5), "vertical");
  }

  console.log("\n=== Projeção diagonal ===");
  {
    const r = PG.projectPointOnSegment({ x: 3, y: 3 }, { x: 0, y: 0 }, { x: 10, y: 10 });
    assert(approx(r.point.x, 3) && approx(r.point.y, 3), "diagonal");
  }

  console.log("\n=== Polilinha curva ===");
  {
    const path = [
      { x: 0, y: 0 },
      { x: 5, y: 5 },
      { x: 10, y: 0 },
    ];
    const r = PG.projectPointOnPolyline({ x: 5, y: 4 }, path, 1);
    assert(r.segmentIndex === 0 || r.segmentIndex === 1, "polyline segment");
    assert(r.distanceMapUnits < 2, "near polyline");
  }

  console.log("\n=== Antes/início e depois/fim ===");
  {
    const r1 = PG.projectPointOnSegment({ x: -5, y: 0 }, { x: 0, y: 0 }, { x: 10, y: 0 });
    const r2 = PG.projectPointOnSegment({ x: 15, y: 0 }, { x: 0, y: 0 }, { x: 10, y: 0 });
    assert(approx(r1.point.x, 0) && approx(r2.point.x, 10), "clamp endpoints");
  }

  console.log("\n=== Edges paralelos — histerese ===");
  {
    const h = MM.createEdgeHysteresis(2);
    assert(h.resolve("e1", false) === null, "first pending");
    assert(h.resolve("e1", false) === "e1", "confirmed e1");
    assert(h.resolve("e2", false) === "e1", "still e1");
    assert(h.resolve("e2", false) === "e2", "switch to e2");
  }

  console.log("\n=== Map matching nível / outdoor ===");
  {
    const navGraph = {
      metersPerUnit: 1,
      nodesById: new Map([
        ["a", { id: "a", x: 0, y: 0, active: true, level: "L00" }],
        ["b", { id: "b", x: 10, y: 0, active: true, level: "L00" }],
        ["c", { id: "c", x: 0, y: 0, active: true, level: "L01" }],
        ["d", { id: "d", x: 10, y: 0, active: true, level: "L01" }],
      ]),
      edgesById: new Map([
        [
          "out",
          {
            id: "out",
            from: "a",
            to: "b",
            active: true,
            level: "L00",
            zone: "outdoor",
            type: "outdoor_path",
            path: [{ x: 0, y: 0 }, { x: 10, y: 0 }],
          },
        ],
        [
          "in",
          {
            id: "in",
            from: "c",
            to: "d",
            active: true,
            level: "L01",
            zone: "indoor",
            path: [{ x: 0, y: 0 }, { x: 10, y: 0 }],
          },
        ],
      ]),
      adjacency: new Map(),
    };
    const cache = EC.buildEdgeCache(navGraph, { level: "L00", metersPerUnit: 1 });
    const idx = SI.buildSpatialIndex(cache.list, 5);
    const hit = MM.findNearestNavigableEdge(
      { x: 5, y: 0.5 },
      { edgeCache: cache, spatialIndex: idx, level: "L00", metersPerUnit: 1, outdoorOnly: true },
    );
    assert(hit?.matchedEdgeId === "out", "outdoor L00 edge");
    const miss = MM.findNearestNavigableEdge(
      { x: 5, y: 0.5 },
      { edgeCache: cache, spatialIndex: idx, level: "L01", metersPerUnit: 1, outdoorOnly: true },
    );
    assert(!miss || miss.matchedEdgeId !== "out", "wrong level excluded");
  }

  console.log("\n=== Virtual node + rota ===");
  {
    const navGraph = {
      metersPerUnit: 1,
      nodesById: new Map([
        ["n1", { id: "n1", x: 0, y: 0, active: true }],
        ["n2", { id: "n2", x: 10, y: 0, active: true }],
        ["goal", { id: "goal", x: 20, y: 0, active: true }],
      ]),
      edgesById: new Map([
        [
          "e1",
          {
            id: "e1",
            from: "n1",
            to: "n2",
            active: true,
            level: "L00",
            zone: "outdoor",
            bidirectional: true,
            path: [{ x: 0, y: 0 }, { x: 10, y: 0 }],
          },
        ],
      ]),
      adjacency: new Map([
        ["n1", [{ id: "e1", from: "n1", to: "n2" }]],
      ]),
    };
    const cache = EC.buildEdgeCache(navGraph, { level: "L00", metersPerUnit: 1 });
    const match = {
      matchedEdgeId: "e1",
      snappedPosition: { x: 5, y: 0 },
      rawMapPosition: { x: 5, y: 0.2 },
    };
    const session = VN.createEphemeralGraphWithVirtualNode(navGraph, match, { edgeCache: cache });
    assert(session?.virtualNode?.id === "virtual_node_user", "virtual node id");
    assert(session.graph.nodesById.has("virtual_node_user"), "in memory only");
    const route = VN.calculateRouteFromVirtualNode({
      baseGraph: navGraph,
      matchResult: match,
      destinationNodeIds: ["goal"],
      edgeCache: cache,
    });
    assert(!!route, "route from virtual node");
  }

  console.log("\n=== Off-route confirmações ===");
  {
    const det = ORD.createOffRouteDetector(3);
    const route = { edgeIds: ["e1"], points: [{ x: 0, y: 0 }, { x: 10, y: 0 }], distanceMeters: 10 };
    const match = {
      isReliable: true,
      matchedEdgeId: "e1",
      snappedPosition: { x: 5, y: 12 },
      accuracyMeters: 10,
    };
    let r1 = det.detect(match, route, "L00", null, 1);
    let r2 = det.detect(match, route, "L00", null, 1);
    let r3 = det.detect(match, route, "L00", null, 1);
    assert(r1.offRoute && !r1.confirmed, "1st off");
    assert(r2.offRoute && !r2.confirmed, "2nd off");
    assert(r3.offRoute && r3.confirmed, "3rd confirmed");
  }

  console.log("\n=== Suavização / salto impossível ===");
  {
    const hist = [
      { point: { x: 0, y: 0 }, accuracy: 10, timestamp: 1000 },
      { point: { x: 100, y: 0 }, accuracy: 10, timestamp: 1100 },
    ];
    const s = PS.smoothPosition(hist, 1);
    assert(s.suspicious === true, "reject jump");
  }

  console.log(`\n=== Resultado: ${passed} ok, ${failed} fail ===\n`);
  process.exit(failed > 0 ? 1 : 0);
}

run();
