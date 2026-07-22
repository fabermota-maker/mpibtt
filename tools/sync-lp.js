/**
 * Espelha mapa-interativo → Map location PIBCuritiba/.../map PIB Model V1
 * Uso: node tools/sync-lp.js
 * Watch: node tools/sync-lp.js --watch
 */
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const DEST = path.resolve(
  ROOT,
  "..",
  "Map location PIBCuritiba",
  "SVG map pib V1",
  "map PIB Model V1"
);

const FILES = [
  "app.js",
  "index.html",
  "styles.css",
  "server.js",
  "js/calibration.js",
  "js/navigation-router.js",
  "js/geo-transform.js",
  "js/pib-curitiba-location-config.js",
  "js/geofence-service.js",
  "js/gps-reading-collector.js",
  "js/nearest-graph-point.js",
  "js/route-snap-service.js",
  "js/route-tracking-service.js",
  "js/route-animation-config.js",
  "js/gps-orientation.js",
  "js/navigation/live/liveNavigationConfig.js",
  "js/navigation/live/polylineGeometry.js",
  "js/navigation/live/spatialIndex.js",
  "js/navigation/live/edgeCache.js",
  "js/navigation/live/mapMatching.js",
  "js/navigation/live/virtualNode.js",
  "js/navigation/live/positionSmoothing.js",
  "js/navigation/live/routeProgress.js",
  "js/navigation/live/offRouteDetection.js",
  "js/navigation/live/rerouting.js",
  "js/navigation/live/coordinateTransform.js",
  "js/navigation/live/geolocationService.js",
  "js/navigation/live/liveNavigationController.js",
  "js/permission-service.js",
  "js/location-service.js",
  "js/heading-service.js",
  "js/gps-compass.js",
  "js/map-nav-icons.js",
  "js/user-location-puck.js",
  "js/map-camera-controller.js",
  "js/user-location.js",
  "data/navigation.json",
  "data/map-calibration.json",
  "data/geo-reference.json",
  "data/pib-geofence.json",
];

function ensureDir(p) {
  fs.mkdirSync(p, { recursive: true });
}

function syncOnce() {
  if (!fs.existsSync(DEST)) {
    console.error("Destino não encontrado:", DEST);
    process.exit(1);
  }
  let n = 0;
  for (const rel of FILES) {
    const src = path.join(ROOT, rel);
    if (!fs.existsSync(src)) continue;
    const dst = path.join(DEST, rel);
    ensureDir(path.dirname(dst));
    fs.copyFileSync(src, dst);
    n++;
  }
  // assets essenciais
  const assetsSrc = path.join(ROOT, "assets");
  const assetsDst = path.join(DEST, "assets");
  if (fs.existsSync(assetsSrc)) {
    ensureDir(assetsDst);
    for (const f of fs.readdirSync(assetsSrc)) {
      const s = path.join(assetsSrc, f);
      if (!fs.statSync(s).isFile()) continue;
      fs.copyFileSync(s, path.join(assetsDst, f));
      n++;
    }
  }
  console.log(`[sync-lp] ${n} arquivos → Model V1 (${new Date().toLocaleTimeString("pt-BR")})`);
}

function watch() {
  syncOnce();
  console.log("[sync-lp] observando alterações em mapa-interativo…");
  let t = null;
  const kick = () => {
    clearTimeout(t);
    t = setTimeout(syncOnce, 400);
  };
  for (const dir of [ROOT, path.join(ROOT, "js"), path.join(ROOT, "data"), path.join(ROOT, "assets")]) {
    if (!fs.existsSync(dir)) continue;
    fs.watch(dir, { recursive: false }, kick);
  }
}

if (process.argv.includes("--watch")) watch();
else syncOnce();
