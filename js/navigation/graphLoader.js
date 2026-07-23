/**
 * Carregamento lazy do grafo de navegação por andar.
 * Inicial: meta.json + L00. Demais andares: data/navigation/floors/{level}.json
 */
(function (global) {
  "use strict";

  function connectorLevelsFor(meta, levelId) {
    if (!meta?.floors?.length || !levelId) return [];
    return meta.floors.filter((f) => f.includes("-") && f.split("-").includes(levelId));
  }

  function createGraphLoader(opts = {}) {
    const baseUrl = opts.baseUrl || "data/navigation/";
    const floorCache = new Map();
    let meta = null;
    let graph = null;
    const loaded = new Set();

    async function fetchJson(url) {
      const res = await fetch(url, { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status} — ${url}`);
      return res.json();
    }

    async function loadMeta() {
      if (meta) return meta;
      meta = await fetchJson(`${baseUrl}meta.json`);
      return meta;
    }

    async function loadFloorFile(levelId) {
      if (floorCache.has(levelId)) return floorCache.get(levelId);
      const data = await fetchJson(`${baseUrl}floors/${levelId}.json`);
      floorCache.set(levelId, data);
      return data;
    }

    function mergeFloor(levelId, floorData) {
      if (!global.NavigationRouter?.mergeNavigationLevel) {
        throw new Error("NavigationRouter.mergeNavigationLevel não carregado");
      }
      graph = global.NavigationRouter.mergeNavigationLevel(graph, floorData);
      loaded.add(levelId);
      return graph;
    }

    async function loadInitialLevel() {
      await loadMeta();
      const l00 = await loadFloorFile("L00");
      const seed = {
        version: meta.version,
        mapId: meta.mapId,
        metersPerUnit: meta.metersPerUnit,
        walkingSpeedMetersPerSecond: meta.walkingSpeedMetersPerSecond,
        config: meta.config,
        nodes: [...(l00.nodes || [])],
        edges: [...(l00.edges || [])],
        pois: [...(l00.pois || [])],
      };
      graph = global.NavigationRouter.createNavigationGraph(seed);
      loaded.add("L00");
      return { meta, graph, poiCatalog: meta.poiCatalog || [] };
    }

    /** @deprecated fallback — navigation.json monolítico */
    async function loadMonolith(url) {
      const data = await fetchJson(url || "data/navigation.json");
      meta = {
        version: data.version,
        mapId: data.mapId,
        metersPerUnit: data.metersPerUnit,
        walkingSpeedMetersPerSecond: data.walkingSpeedMetersPerSecond,
        config: data.config,
        floors: [...new Set((data.nodes || []).map((n) => n.level || "L00"))],
        poiCatalog: (data.pois || []).map((p) => ({
          id: p.id,
          rawId: p.rawId,
          name: p.name,
          level: p.level,
          mapLevel: p.mapLevel,
          nodeIds: p.nodeIds,
          building: p.building,
          group: p.group,
          cat: p.cat,
          inject: p.inject,
          accessNote: p.accessNote,
        })),
        generatedAt: data.generatedAt,
      };
      graph = global.NavigationRouter.createNavigationGraph(data);
      for (const f of meta.floors) loaded.add(f);
      return { meta, graph, poiCatalog: meta.poiCatalog, monolith: true };
    }

    async function loadFloorData(levelId, { withConnectors = true } = {}) {
      if (!levelId) return graph;
      await loadMeta();

      if (!graph) await loadInitialLevel();

      if (!loaded.has(levelId)) {
        const floor = await loadFloorFile(levelId);
        mergeFloor(levelId, floor);
      }

      if (withConnectors) {
        for (const conn of connectorLevelsFor(meta, levelId)) {
          if (loaded.has(conn)) continue;
          const floor = await loadFloorFile(conn);
          mergeFloor(conn, floor);
        }
      }

      return graph;
    }

    async function ensureFloors(levelIds) {
      const ids = [...new Set((levelIds || []).filter(Boolean))];
      if (!ids.length) return graph;
      if (!graph) await loadInitialLevel();
      for (const id of ids) {
        await loadFloorData(id, { withConnectors: true });
      }
      return graph;
    }

    return {
      loadMeta,
      loadInitialLevel,
      loadMonolith,
      loadFloorData,
      ensureFloors,
      getGraph: () => graph,
      getMeta: () => meta,
      isLoaded: (levelId) => loaded.has(levelId),
      loadedLevels: () => [...loaded],
    };
  }

  global.NavigationGraphLoader = { create: createGraphLoader, connectorLevelsFor };
})(typeof window !== "undefined" ? window : globalThis);
