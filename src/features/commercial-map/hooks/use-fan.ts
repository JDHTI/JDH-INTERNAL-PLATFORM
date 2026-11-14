"use client";

import { useCallback, useEffect, useState } from "react";
import type { Map as MapLibreMap } from "maplibre-gl";

import { EMPTY, setSourceData, SOURCE } from "../lib/map-layers";
import { fanLines, fanPoints, openFan, type Fan, type PreparedFeature } from "../lib/prospect-features";

/**
 * The fan of a shared point: the prospects the file put on one spot, spread
 * around it so each can be picked. It closes on zoom, because it is laid out
 * in pixels and at another zoom it would be a different shape.
 */
export function useFan(map: MapLibreMap | null) {
  const [fan, setFan] = useState<Fan | null>(null);

  useEffect(() => {
    if (!map) return;
    setSourceData(map, SOURCE.fanPoints, fan ? fanPoints(fan) : EMPTY);
    setSourceData(map, SOURCE.fanLines, fan ? fanLines(fan) : EMPTY);
    if (!fan) return;
    const close = () => setFan(null);
    map.on("zoomstart", close);
    return () => {
      map.off("zoomstart", close);
    };
  }, [map, fan]);

  useEffect(() => {
    if (!map) return;
    return () => {
      setSourceData(map, SOURCE.fanPoints, EMPTY);
      setSourceData(map, SOURCE.fanLines, EMPTY);
    };
  }, [map]);

  const open = useCallback(
    (leaves: PreparedFeature[]) => {
      if (map && leaves.length > 0) setFan(openFan(map, leaves));
    },
    [map]
  );
  const close = useCallback(() => setFan(null), []);

  return { fan, open, close };
}
