import type { FeatureCollection, GeoJSON } from "geojson";
import type {
  ExpressionSpecification,
  GeoJSONSource,
  LayerSpecification,
  Map as MapLibreMap,
} from "maplibre-gl";

import { basemapLayers, MAP_FONT } from "./map-style";
import { PALETTE_KEYS, type MapPalette } from "./map-tokens";

export const SOURCE = {
  reference: "reference-zones",
  referenceLabels: "reference-labels",
  zones: "zones",
  zoneLabels: "zone-labels",
  routeLine: "route-line",
  routeStops: "route-stops",
  prospects: "prospects",
  fanLines: "fan-lines",
  fanPoints: "fan-points",
  selection: "selection",
} as const;

export const LAYER = {
  referenceSelected: "reference-selected",
  referenceLabels: "reference-labels",
  zonesFill: "zones-fill",
  zonesLine: "zones-line",
  zonesSelected: "zones-selected",
  zoneLabels: "zone-labels",
  routeRoad: "route-road",
  routeStraight: "route-straight",
  clusters: "prospect-clusters",
  clusterCount: "prospect-cluster-count",
  former: "prospect-former",
  points: "prospect-points",
  approximate: "prospect-approximate",
  chips: "prospect-chips",
  routeStops: "route-stops",
  routeStopNumbers: "route-stop-numbers",
  routeOrigin: "route-origin",
  fanLines: "fan-lines",
  fanFormer: "fan-former",
  fanPoints: "fan-points",
  fanApproximate: "fan-approximate",
  fanLabels: "fan-labels",
  selection: "selection-ring",
} as const;

/** Layers a click on a prospect can land on, topmost first. */
export const PROSPECT_HIT_LAYERS = [LAYER.fanPoints, LAYER.chips, LAYER.points, LAYER.clusters];

/** Past this zoom every prospect is its own mark, and streets are wide enough for names. */
export const CHIP_ZOOM = 15;

const CHIP_IMAGE = "prospect-chip";

export const EMPTY: FeatureCollection = { type: "FeatureCollection", features: [] };

const NOT_CLUSTER: ExpressionSpecification = ["!", ["has", "point_count"]];

function byColor(palette: MapPalette): ExpressionSpecification {
  const pairs = PALETTE_KEYS.flatMap((key) => [key, palette.project[key]]);
  return ["match", ["get", "color"], ...pairs, palette.project.gray] as unknown as ExpressionSpecification;
}

/**
 * Everything the module draws over the basemap, bottom to top: zones, the
 * route, prospects, the fan of a shared point and the selection. Marks are
 * told apart by shape before color: a second ring is a former customer, a
 * hollow centre an approximate location, and every mark carries a 3:1 outline.
 */
export function dataLayers(palette: MapPalette): LayerSpecification[] {
  const color = byColor(palette);
  const { label, labelStrong, halo, chip } = palette;

  const point = (id: string, source: string, filter?: ExpressionSpecification): LayerSpecification => ({
    id,
    type: "circle",
    source,
    ...(filter ? { filter } : {}),
    paint: {
      "circle-radius": ["interpolate", ["linear"], ["zoom"], 9, 4, 14, 6],
      "circle-color": color,
      "circle-stroke-color": label,
      "circle-stroke-width": 1.25,
    },
  });
  const formerRing = (id: string, source: string, filter: ExpressionSpecification): LayerSpecification => ({
    id,
    type: "circle",
    source,
    filter,
    paint: {
      "circle-radius": ["interpolate", ["linear"], ["zoom"], 9, 7, 14, 10],
      "circle-opacity": 0,
      "circle-stroke-color": labelStrong,
      "circle-stroke-width": 1.5,
    },
  });
  const hollow = (id: string, source: string, filter: ExpressionSpecification): LayerSpecification => ({
    id,
    type: "circle",
    source,
    filter,
    paint: {
      "circle-radius": ["interpolate", ["linear"], ["zoom"], 9, 1.5, 14, 2.5],
      "circle-color": chip,
    },
  });
  const isFormer: ExpressionSpecification = ["==", ["get", "is_former_customer"], true];
  const isApproximate: ExpressionSpecification = ["==", ["get", "location_quality"], "approximate"];

  return [
    {
      // The perimeter of the commune or municipality that is filtering the map.
      id: LAYER.referenceSelected,
      type: "line",
      source: SOURCE.reference,
      filter: ["==", ["get", "id"], ""],
      layout: { "line-join": "round" },
      paint: { "line-color": labelStrong, "line-width": 3 },
    },
    {
      id: LAYER.referenceLabels,
      type: "symbol",
      source: SOURCE.referenceLabels,
      layout: {
        "text-field": ["format", ["get", "name"], {}, "\n", {}, ["get", "count"], { "font-scale": 0.9 }],
        "text-font": [MAP_FONT.medium],
        "text-size": 12,
        "text-max-width": 9,
      },
      paint: { "text-color": labelStrong, "text-halo-color": halo, "text-halo-width": 1.5 },
    },
    {
      id: LAYER.zonesFill,
      type: "fill",
      source: SOURCE.zones,
      paint: { "fill-color": color, "fill-opacity": palette.zoneTint },
    },
    {
      id: LAYER.zonesLine,
      type: "line",
      source: SOURCE.zones,
      paint: { "line-color": color, "line-width": 1.5 },
    },
    {
      id: LAYER.zonesSelected,
      type: "line",
      source: SOURCE.zones,
      filter: ["==", ["get", "id"], ""],
      paint: { "line-color": labelStrong, "line-width": 2.5 },
    },
    {
      id: LAYER.routeRoad,
      type: "line",
      source: SOURCE.routeLine,
      filter: ["==", ["get", "status"], "road"],
      layout: { "line-cap": "round", "line-join": "round" },
      paint: { "line-color": labelStrong, "line-width": 3.5 },
    },
    {
      // Dashed: a straight line between stops is not a way to drive there.
      id: LAYER.routeStraight,
      type: "line",
      source: SOURCE.routeLine,
      filter: ["!=", ["get", "status"], "road"],
      paint: { "line-color": labelStrong, "line-width": 2, "line-dasharray": [2, 2] },
    },
    {
      id: LAYER.zoneLabels,
      type: "symbol",
      source: SOURCE.zoneLabels,
      layout: {
        "text-field": ["get", "name"],
        "text-font": [MAP_FONT.bold],
        "text-size": 13,
        "text-max-width": 8,
      },
      paint: { "text-color": labelStrong, "text-halo-color": halo, "text-halo-width": 1.5 },
    },
    {
      id: LAYER.clusters,
      type: "circle",
      source: SOURCE.prospects,
      filter: ["has", "point_count"],
      paint: {
        "circle-radius": ["step", ["get", "point_count"], 14, 25, 17, 100, 21, 500, 26],
        "circle-color": chip,
        "circle-stroke-color": label,
        "circle-stroke-width": 1.5,
      },
    },
    {
      id: LAYER.clusterCount,
      type: "symbol",
      source: SOURCE.prospects,
      filter: ["has", "point_count"],
      layout: {
        "text-field": ["get", "point_count_abbreviated"],
        "text-font": [MAP_FONT.bold],
        "text-size": 12,
        "text-allow-overlap": true,
        // A count sits inside its own circle; it must not push a zone's name off the map.
        "text-ignore-placement": true,
      },
      paint: { "text-color": labelStrong },
    },
    formerRing(LAYER.former, SOURCE.prospects, ["all", NOT_CLUSTER, isFormer]),
    point(LAYER.points, SOURCE.prospects, NOT_CLUSTER),
    hollow(LAYER.approximate, SOURCE.prospects, ["all", NOT_CLUSTER, isApproximate]),
    {
      // The name beside its dot, on the label recipe of DESIGN.md §7.7. A stack
      // shows one chip with how many it holds instead of names piled on a point.
      id: LAYER.chips,
      type: "symbol",
      source: SOURCE.prospects,
      minzoom: CHIP_ZOOM,
      filter: ["all", NOT_CLUSTER, ["any", ["==", ["get", "stack_size"], 1], ["==", ["get", "stack_lead"], true]]],
      layout: {
        "text-field": [
          "case",
          [">", ["get", "stack_size"], 1],
          ["concat", ["to-string", ["get", "stack_size"]], " en este punto"],
          ["get", "name"],
        ],
        "text-font": [MAP_FONT.medium],
        "text-size": 12,
        "text-max-width": 11,
        "text-anchor": "left",
        "text-justify": "left",
        "text-offset": [1.5, 0],
        "icon-image": CHIP_IMAGE,
        "icon-text-fit": "both",
        "icon-text-fit-padding": [3, 7, 3, 7],
        // Former customers keep their chip when two collide.
        "symbol-sort-key": ["case", isFormer, 0, 1],
      },
      paint: { "text-color": labelStrong },
    },
    {
      id: LAYER.routeStops,
      type: "circle",
      source: SOURCE.routeStops,
      filter: ["==", ["get", "kind"], "stop"],
      paint: {
        "circle-radius": 11,
        // Filled once visited: read by weight, and the list says the result in words.
        "circle-color": ["case", ["==", ["get", "done"], true], labelStrong, chip],
        "circle-stroke-color": labelStrong,
        "circle-stroke-width": 1.5,
      },
    },
    {
      id: LAYER.routeStopNumbers,
      type: "symbol",
      source: SOURCE.routeStops,
      filter: ["==", ["get", "kind"], "stop"],
      layout: {
        "text-field": ["to-string", ["get", "position"]],
        "text-font": [MAP_FONT.bold],
        "text-size": 11,
        "text-allow-overlap": true,
      },
      paint: { "text-color": ["case", ["==", ["get", "done"], true], chip, labelStrong] },
    },
    {
      id: LAYER.routeOrigin,
      type: "symbol",
      source: SOURCE.routeStops,
      filter: ["==", ["get", "kind"], "origin"],
      layout: {
        "text-field": ["get", "name"],
        "text-font": [MAP_FONT.bold],
        "text-size": 12,
        "icon-image": CHIP_IMAGE,
        "icon-text-fit": "both",
        "icon-text-fit-padding": [3, 7, 3, 7],
        "text-allow-overlap": true,
        "icon-allow-overlap": true,
      },
      paint: { "text-color": labelStrong },
    },
    {
      id: LAYER.fanLines,
      type: "line",
      source: SOURCE.fanLines,
      paint: { "line-color": label, "line-width": 1 },
    },
    formerRing(LAYER.fanFormer, SOURCE.fanPoints, isFormer),
    point(LAYER.fanPoints, SOURCE.fanPoints),
    hollow(LAYER.fanApproximate, SOURCE.fanPoints, isApproximate),
    {
      id: LAYER.fanLabels,
      type: "symbol",
      source: SOURCE.fanPoints,
      layout: {
        "text-field": ["get", "name"],
        "text-font": [MAP_FONT.medium],
        "text-size": 11,
        "text-max-width": 9,
        "text-variable-anchor": ["left", "right", "top", "bottom"],
        "text-radial-offset": 1,
        "text-optional": true,
      },
      paint: { "text-color": labelStrong, "text-halo-color": halo, "text-halo-width": 1.5 },
    },
    {
      id: LAYER.selection,
      type: "circle",
      source: SOURCE.selection,
      paint: {
        "circle-radius": 14,
        "circle-opacity": 0,
        "circle-stroke-color": labelStrong,
        "circle-stroke-width": 2.5,
      },
    },
  ];
}

/**
 * The chip behind a name: a rounded box that stretches to its text, drawn
 * here because the map ships no sprite. Twice the size, for sharp edges.
 */
function chipImage(palette: MapPalette) {
  const size = 48;
  const radius = 8;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext("2d");
  if (!context) return null;
  context.beginPath();
  context.roundRect(1, 1, size - 2, size - 2, radius);
  context.fillStyle = palette.chip;
  context.fill();
  context.lineWidth = 2;
  context.strokeStyle = palette.label;
  context.stroke();
  return context.getImageData(0, 0, size, size);
}

const CHIP_METADATA = {
  pixelRatio: 2,
  stretchX: [[12, 36]] as [number, number][],
  stretchY: [[12, 36]] as [number, number][],
  content: [8, 8, 40, 40] as [number, number, number, number],
};

/** Adds the module's sources and layers once, empty: each view fills its own. */
export function installDataLayers(map: MapLibreMap, palette: MapPalette): void {
  const image = chipImage(palette);
  if (image && !map.hasImage(CHIP_IMAGE)) map.addImage(CHIP_IMAGE, image, CHIP_METADATA);

  for (const id of Object.values(SOURCE)) {
    if (map.getSource(id)) continue;
    map.addSource(
      id,
      id === SOURCE.prospects
        ? { type: "geojson", data: EMPTY, cluster: true, clusterRadius: 46, clusterMaxZoom: CHIP_ZOOM - 1 }
        : { type: "geojson", data: EMPTY }
    );
  }
  for (const layer of dataLayers(palette)) {
    if (!map.getLayer(layer.id)) map.addLayer(layer);
  }
}

/**
 * Repaints the map for the other theme. Colors are set layer by layer instead
 * of swapping the style, which would drop the data the views have loaded.
 */
export function applyPalette(map: MapLibreMap, palette: MapPalette): void {
  for (const layer of [...basemapLayers(palette), ...dataLayers(palette)]) {
    if (!map.getLayer(layer.id) || !("paint" in layer) || !layer.paint) continue;
    for (const [property, value] of Object.entries(layer.paint)) {
      map.setPaintProperty(layer.id, property as Parameters<MapLibreMap["setPaintProperty"]>[1], value);
    }
  }
  const image = chipImage(palette);
  if (image && map.hasImage(CHIP_IMAGE)) map.updateImage(CHIP_IMAGE, image);
}

export function setSourceData(map: MapLibreMap, source: string, data: GeoJSON): void {
  const target = map.getSource(source) as GeoJSONSource | undefined;
  void target?.setData(data);
}

export function setLayersVisible(map: MapLibreMap, layers: string[], visible: boolean): void {
  for (const id of layers) {
    if (map.getLayer(id)) map.setLayoutProperty(id, "visibility", visible ? "visible" : "none");
  }
}

export const PROSPECT_LAYERS = [
  LAYER.clusters,
  LAYER.clusterCount,
  LAYER.former,
  LAYER.points,
  LAYER.approximate,
  LAYER.chips,
];
