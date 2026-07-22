/**
 * Wrapper fino sobre GeoTransform — sem calibração inventada.
 */
(function (global) {
  "use strict";

  function createCoordinateTransform(geoReferenceData) {
    const gt = global.GeoTransform?.createFromGeoReference?.(geoReferenceData);
    if (!gt?.latLngToSvg) {
      return {
        ready: false,
        latLngToMap: () => null,
        warning: "Calibração geográfica insuficiente. Use marcação manual.",
      };
    }

    const points = geoReferenceData?.controlPoints || geoReferenceData?.geoReferencePoints || [];
    if (points.length < 2) {
      return {
        ready: false,
        latLngToMap: () => null,
        warning: "São necessários ao menos 2 pontos de referência.",
      };
    }

    return {
      ready: true,
      latLngToMap(latitude, longitude, level = "L00") {
        const pt = gt.latLngToSvg(latitude, longitude);
        if (!pt) return null;
        return { x: pt.x, y: pt.y, level };
      },
      mapToLatLng: gt.svgToLatLng ? (x, y) => gt.svgToLatLng(x, y) : null,
      geoReferencePoints: points,
    };
  }

  global.LiveCoordinateTransform = {
    createCoordinateTransform,
  };
})(typeof window !== "undefined" ? window : globalThis);
