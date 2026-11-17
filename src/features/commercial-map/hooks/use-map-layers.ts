"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { FeatureCollection, Point } from "geojson";
import type { GeoJSONSource, Map as MapLibreMap, MapMouseEvent } from "maplibre-gl";

import { EMPTY, LAYER, PROSPECT_HIT_LAYERS, setSourceData, SOURCE } from "../lib/map-layers";
import { moveDuration } from "../lib/motion";
import {
  categoryColors,
  prepareProspects,
  type PreparedCollection,
  type PreparedFeature,
} from "../lib/prospect-features";
import { mainRing, ringCentre } from "../lib/zone-geometry";
import type { PaletteKey, ProspectCollection, ZoneCollection } from "../types/commercial-map.types";
import { useProspectFacets } from "./use-commercial-map";

/** A map this wide has room for the card docked at its left and the point beside it. */
const DOCK_WIDTH = 640;

/**
 * Whether the card docks over the map or goes in the panel. It depends on the
 * map's own width and not on the screen's: the sidebar and the panel take
 * theirs first, so a wide screen can still leave a narrow map.
 */
export function useCanDock(element: HTMLElement | null): boolean {
  const [wide, setWide] = useState(false);
  useEffect(() => {
    if (!element) return;
    const observer = new ResizeObserver(([entry]) => setWide(entry.contentRect.width >= DOCK_WIDTH));
    observer.observe(element);
    return () => observer.disconnect();
  }, [element]);
  return wide;
}

/** The color of each category, from the full list of categories and not from what a filter leaves. */
export function useCategoryColors(): Map<string, PaletteKey> {
  const facets = useProspectFacets();
  return useMemo(
    () => categoryColors((facets.data?.categories ?? []).map((category) => category.value)),
    [facets.data]
  );
}

/** Puts the prospects on the map and returns them as the layers see them. */
export function useProspectLayer(
  map: MapLibreMap | null,
  collection: ProspectCollection | undefined,
  colors: Map<string, PaletteKey>
): PreparedCollection | null {
  const prepared = useMemo(
    () => (collection ? prepareProspects(collection, colors) : null),
    [collection, colors]
  );
  useEffect(() => {
    if (!map) return;
    setSourceData(map, SOURCE.prospects, prepared ?? EMPTY);
  }, [map, prepared]);
  return prepared;
}

/** Paints the commercial zones, each with its name, and outlines the selected one. */
export function useZoneLayer(
  map: MapLibreMap | null,
  zones: ZoneCollection | undefined,
  selectedId: string | null = null,
  hiddenId: string | null = null
): void {
  useEffect(() => {
    if (!map) return;
    const features = (zones?.features ?? [])
      .filter((zone) => zone.properties.id !== hiddenId)
      .map((zone) => ({ ...zone, properties: { ...zone.properties, color: zone.properties.color ?? "gray" } }));
    setSourceData(map, SOURCE.zones, { type: "FeatureCollection", features });
    const labels: FeatureCollection<Point> = {
      type: "FeatureCollection",
      features: features.map((zone) => ({
        type: "Feature",
        properties: { name: zone.properties.name },
        geometry: { type: "Point", coordinates: ringCentre(mainRing(zone.geometry)) },
      })),
    };
    setSourceData(map, SOURCE.zoneLabels, labels);
  }, [map, zones, hiddenId]);

  useEffect(() => {
    if (!map || !map.getLayer(LAYER.zonesSelected)) return;
    map.setFilter(LAYER.zonesSelected, ["==", ["get", "id"], selectedId ?? ""]);
  }, [map, selectedId]);
}

/** «Comuna 14 - El Poblado» reads as «El Poblado» on the map; the full name stays in the panel. */
export function shortZoneName(name: string): string {
  const cut = name.indexOf(" - ");
  return cut === -1 ? name : name.slice(cut + 3);
}

/** How the official zones look beyond their perimeter. */
export interface ReferenceLook {
  /** The fill of each zone, by id. A zone left out has none. */
  tints: Map<string, PaletteKey> | null;
  /** Whether each level shows its names. The zone that filters always shows its own. */
  communeNames: boolean;
  municipalityNames: boolean;
}

/**
 * Draws the official zones (communes, municipalities) over the map: the one
 * that is filtering, or all of them as the segmentation of the territory, each
 * with its name and how many prospects fall inside. They are a reference: they
 * assign nothing.
 */
export function useReferenceLayer(
  map: MapLibreMap | null,
  zones: ZoneCollection | undefined,
  selectedId: string | null,
  { tints, communeNames, municipalityNames }: ReferenceLook
): void {
  useEffect(() => {
    if (!map) return;
    const features = (zones?.features ?? []).map((zone) => ({
      ...zone,
      properties: { ...zone.properties, tint: tints?.get(zone.properties.id) ?? "" },
    }));
    setSourceData(map, SOURCE.reference, { type: "FeatureCollection", features });
  }, [map, zones, tints]);

  useEffect(() => {
    if (!map) return;
    const named = (zones?.features ?? []).filter(
      (zone) =>
        zone.properties.id === selectedId ||
        (zone.properties.level === "municipality" ? municipalityNames : communeNames)
    );
    const labels: FeatureCollection<Point> = {
      type: "FeatureCollection",
      features: named.map((zone) => ({
        type: "Feature",
        properties: {
          name: shortZoneName(zone.properties.name),
          count: zone.properties.prospect_count === 1 ? "1 prospecto" : `${zone.properties.prospect_count} prospectos`,
          level: zone.properties.level,
        },
        geometry: { type: "Point", coordinates: ringCentre(mainRing(zone.geometry)) },
      })),
    };
    setSourceData(map, SOURCE.referenceLabels, labels);
  }, [map, zones, selectedId, communeNames, municipalityNames]);

  useEffect(() => {
    if (!map || !map.getLayer(LAYER.referenceSelected)) return;
    map.setFilter(LAYER.referenceSelected, ["==", ["get", "id"], selectedId ?? ""]);
  }, [map, selectedId]);

  useEffect(() => {
    if (!map) return;
    return () => {
      setSourceData(map, SOURCE.reference, EMPTY);
      setSourceData(map, SOURCE.referenceLabels, EMPTY);
    };
  }, [map]);
}

interface ProspectClickHandlers {
  /** One prospect, on the map or on a leaf of the fan. */
  onPick: (feature: PreparedFeature) => void;
  /** Several prospects on the same point. */
  onStack: (leaves: PreparedFeature[]) => void;
  /** A click on the map and not on a prospect. */
  onMiss?: (event: MapMouseEvent) => void;
}

/** A cluster holding this many or fewer is checked for being one shared point. */
const STACK_LIMIT = 60;

/**
 * What a click on the prospects means: a cluster opens, a lone point is
 * picked, and a point shared by several prospects fans out.
 */
export function useProspectClicks(
  map: MapLibreMap | null,
  prepared: PreparedCollection | null,
  handlers: ProspectClickHandlers,
  enabled = true
): void {
  const latest = useRef({ prepared, handlers });
  useEffect(() => {
    latest.current = { prepared, handlers };
  });

  useEffect(() => {
    if (!map || !enabled) return;

    const stackOf = (key: string) =>
      (latest.current.prepared?.features ?? []).filter((feature) => feature.properties.stack_key === key);

    const onClick = async (event: MapMouseEvent) => {
      const layers = PROSPECT_HIT_LAYERS.filter((id) => map.getLayer(id));
      const hit = map.queryRenderedFeatures(event.point, { layers })[0];
      if (!hit) {
        latest.current.handlers.onMiss?.(event);
        return;
      }
      const properties = hit.properties ?? {};
      if (properties.cluster) {
        const source = map.getSource(SOURCE.prospects) as GeoJSONSource;
        if (properties.point_count <= STACK_LIMIT) {
          const leaves = (await source.getClusterLeaves(properties.cluster_id, STACK_LIMIT, 0)) as PreparedFeature[];
          if (new Set(leaves.map((leaf) => leaf.properties.stack_key)).size === 1) {
            latest.current.handlers.onStack(leaves);
            return;
          }
        }
        const zoom = await source.getClusterExpansionZoom(properties.cluster_id);
        map.easeTo({ center: (hit.geometry as Point).coordinates as [number, number], zoom, duration: moveDuration() });
        return;
      }
      const stack = stackOf(properties.stack_key);
      const feature = stack.find((candidate) => candidate.properties.id === properties.id);
      if (!feature) return;
      if (hit.layer.id !== LAYER.fanPoints && stack.length > 1) latest.current.handlers.onStack(stack);
      else latest.current.handlers.onPick(feature);
    };

    const canvas = map.getCanvas();
    const enter = () => {
      canvas.style.cursor = "pointer";
    };
    const leave = () => {
      canvas.style.cursor = "";
    };
    map.on("click", onClick);
    for (const layer of PROSPECT_HIT_LAYERS) {
      map.on("mouseenter", layer, enter);
      map.on("mouseleave", layer, leave);
    }
    return () => {
      map.off("click", onClick);
      for (const layer of PROSPECT_HIT_LAYERS) {
        map.off("mouseenter", layer, enter);
        map.off("mouseleave", layer, leave);
      }
      canvas.style.cursor = "";
    };
  }, [map, enabled]);
}

/** Width the docked card takes at the left of the map, with its margin. */
const CARD_SPAN = 360;

/**
 * Moves the map just enough for a point to be clear of the card docked at its
 * left edge. A point already in the open part of the map does not move it.
 */
export function revealBesideCard(map: MapLibreMap, position: [number, number]): void {
  const { x } = map.project(position);
  const clear = CARD_SPAN + 32;
  if (x >= clear) return;
  map.panBy([x - clear, 0], { duration: moveDuration() });
}

/** Camera offset that centres a point in the part of the map the card leaves open. */
export const BESIDE_CARD_OFFSET: [number, number] = [CARD_SPAN / 2, 0];
