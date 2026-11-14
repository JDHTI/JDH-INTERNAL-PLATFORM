import type { Feature, FeatureCollection, LineString, Point } from "geojson";
import type { Map as MapLibreMap } from "maplibre-gl";

import { PALETTE_KEYS } from "./map-tokens";
import type { PaletteKey, ProspectCollection, ProspectMapProperties } from "../types/commercial-map.types";

export interface PreparedProspect extends ProspectMapProperties {
  /** Palette key of the category. */
  color: PaletteKey;
  /** Shared by every prospect the file put on the same point. */
  stack_key: string;
  stack_size: number;
  /** One per stack: the feature that carries the stack's chip. */
  stack_lead: boolean;
}

export type PreparedFeature = Feature<Point, PreparedProspect>;
export type PreparedCollection = FeatureCollection<Point, PreparedProspect>;

const NO_CATEGORY: PaletteKey = "gray";

/**
 * A color per category, in alphabetical order so it does not move between
 * loads. Past nine categories the palette repeats: the name, not the color,
 * identifies one (DESIGN.md §15).
 */
export function categoryColors(categories: string[]): Map<string, PaletteKey> {
  const sorted = [...new Set(categories)].sort((a, b) => a.localeCompare(b, "es"));
  return new Map(sorted.map((category, index) => [category, PALETTE_KEYS[index % PALETTE_KEYS.length]]));
}

export function categoryColor(colors: Map<string, PaletteKey>, category: string | null): PaletteKey {
  return (category && colors.get(category)) || NO_CATEGORY;
}

const stackKey = ([lng, lat]: number[]) => `${lng.toFixed(6)},${lat.toFixed(6)}`;

/**
 * Adds what the layers paint from: the category's color and the stack each
 * point belongs to. The monthly file geocodes some addresses to one centroid,
 * so several prospects land on the exact same point.
 */
export function prepareProspects(
  collection: ProspectCollection,
  colors: Map<string, PaletteKey>
): PreparedCollection {
  const sizes = new Map<string, number>();
  for (const feature of collection.features) {
    const key = stackKey(feature.geometry.coordinates);
    sizes.set(key, (sizes.get(key) ?? 0) + 1);
  }
  const led = new Set<string>();
  return {
    type: "FeatureCollection",
    features: collection.features.map((feature) => {
      const key = stackKey(feature.geometry.coordinates);
      const lead = !led.has(key);
      led.add(key);
      return {
        ...feature,
        properties: {
          ...feature.properties,
          color: categoryColor(colors, feature.properties.category),
          stack_key: key,
          stack_size: sizes.get(key) ?? 1,
          stack_lead: lead,
        },
      };
    }),
  };
}

export interface Fan {
  center: [number, number];
  leaves: PreparedFeature[];
  /** Where each leaf is drawn, by prospect id. */
  positions: Map<string, [number, number]>;
}

/** Past this many, a ring gets too wide and the leaves go on a spiral. */
const RING_LIMIT = 10;

function offsets(count: number): Array<[number, number]> {
  if (count <= RING_LIMIT) {
    const radius = Math.min(96, Math.max(46, (count * 34) / (2 * Math.PI)));
    return Array.from({ length: count }, (_, index) => {
      const angle = -Math.PI / 2 + (index * 2 * Math.PI) / count;
      return [radius * Math.cos(angle), radius * Math.sin(angle)];
    });
  }
  const points: Array<[number, number]> = [];
  let leg = 30;
  let angle = 0;
  for (let index = 0; index < count; index += 1) {
    angle += 32 / leg + index * 0.0005;
    points.push([leg * Math.cos(angle), leg * Math.sin(angle)]);
    leg += (2 * Math.PI * 6) / angle;
  }
  return points;
}

/** Spreads the prospects of one point around it, in screen pixels at the current zoom. */
export function openFan(map: MapLibreMap, leaves: PreparedFeature[]): Fan {
  const center = leaves[0].geometry.coordinates as [number, number];
  const origin = map.project(center);
  const positions = new Map<string, [number, number]>();
  offsets(leaves.length).forEach(([dx, dy], index) => {
    const spot = map.unproject([origin.x + dx, origin.y + dy]);
    positions.set(leaves[index].properties.id, [spot.lng, spot.lat]);
  });
  return { center, leaves, positions };
}

export function fanPoints(fan: Fan): PreparedCollection {
  return {
    type: "FeatureCollection",
    features: fan.leaves.map((leaf) => ({
      ...leaf,
      geometry: { type: "Point", coordinates: fan.positions.get(leaf.properties.id) ?? fan.center },
    })),
  };
}

export function fanLines(fan: Fan): FeatureCollection<LineString> {
  return {
    type: "FeatureCollection",
    features: [...fan.positions.values()].map((position) => ({
      type: "Feature",
      properties: {},
      geometry: { type: "LineString", coordinates: [fan.center, position] },
    })),
  };
}

/** The box around a set of points, or null when there are none. */
export function boundsOf(coordinates: number[][]): [[number, number], [number, number]] | null {
  if (coordinates.length === 0) return null;
  let west = Infinity;
  let south = Infinity;
  let east = -Infinity;
  let north = -Infinity;
  for (const [lng, lat] of coordinates) {
    west = Math.min(west, lng);
    east = Math.max(east, lng);
    south = Math.min(south, lat);
    north = Math.max(north, lat);
  }
  return [
    [west, south],
    [east, north],
  ];
}
