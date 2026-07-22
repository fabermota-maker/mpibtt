/**
 * Detecção de saída da rota — exige confirmações consecutivas.
 */
(function (global) {
  "use strict";

  const CFG = () => global.LiveNavigationConfig?.LIVE_NAVIGATION_CONFIG || {};

  function createOffRouteDetector(required) {
    const need = required ?? CFG().offRouteConfirmationsRequired ?? 3;
    let count = 0;

    return {
      reset() {
        count = 0;
      },
      /** @returns {{ offRoute:boolean, confirmed:boolean, count:number }} */
      detect(matchedPosition, currentRoute, floorId, navGraph, metersPerUnit) {
        const threshold = CFG().offRouteThresholdMeters ?? 10;
        const maxAcc = CFG().maximumAcceptedAccuracyMeters ?? 35;

        if (!matchedPosition?.isReliable) {
          return { offRoute: false, confirmed: false, count, lowAccuracy: true };
        }

        const progress = global.LiveRouteProgress?.updateRouteProgress?.(
          matchedPosition.snappedPosition,
          currentRoute,
          floorId,
          navGraph,
          metersPerUnit,
        );

        let dist =
          progress?.distanceFromRouteMeters ??
          matchedPosition.distanceToEdgeMeters ??
          0;

        if (
          !progress?.distanceFromRouteMeters &&
          currentRoute?.points?.length >= 2 &&
          global.LivePolylineGeometry
        ) {
          const pr = global.LivePolylineGeometry.projectPointOnPolyline(
            matchedPosition.snappedPosition,
            currentRoute.points,
            metersPerUnit,
          );
          dist = pr?.distanceMeters ?? dist;
        }
        if (dist <= threshold) {
          count = 0;
          return { offRoute: false, confirmed: false, count, ...progress };
        }

        if ((matchedPosition.accuracyMeters ?? 0) > maxAcc) {
          return { offRoute: false, confirmed: false, count, lowAccuracy: true };
        }

        count += 1;
        const confirmed = count >= need;
        if (confirmed) count = 0;
        return {
          offRoute: true,
          confirmed,
          count,
          distanceFromRouteMeters: dist,
          ...progress,
        };
      },
    };
  }

  global.LiveOffRouteDetection = {
    createOffRouteDetector,
  };
})(typeof window !== "undefined" ? window : globalThis);
