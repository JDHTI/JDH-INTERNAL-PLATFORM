import { layers, type Flavor } from "@protomaps/basemaps";
import type { LayerSpecification, StyleSpecification } from "maplibre-gl";

import type { MapPalette } from "./map-tokens";

/** The font stacks scripts/mapas/build_glyphs.py writes. */
export const MAP_FONT = {
  regular: "Centrale Sans Regular",
  italic: "Centrale Sans Italic",
  medium: "Centrale Sans Medium",
  bold: "Centrale Sans Bold",
} as const;

export const BASEMAP_SOURCE = "protomaps";

/** Colombia with its islands and a margin, so the camera cannot leave the file. */
export const COLOMBIA_BOUNDS: [[number, number], [number, number]] = [
  [-84.5, -6],
  [-64.5, 15],
];

/** Where the map opens before there is data to frame: the Aburrá valley. */
export const DEFAULT_CENTER: [number, number] = [-75.575, 6.235];
export const DEFAULT_ZOOM = 11;

function assetsUrl(): string {
  const base = (process.env.NEXT_PUBLIC_MAP_ASSETS_URL ?? "/mapas").replace(/\/+$/, "");
  // MapLibre fetches glyphs from a worker, where a path has no origin to lean on.
  return base.startsWith("/") ? `${window.location.origin}${base}` : base;
}

/**
 * A Protomaps flavor with nothing but the palette: land, water, three road
 * weights and labels. Casings take the land color, so roads separate from each
 * other without adding a tone.
 */
function flavor(palette: MapPalette): Flavor {
  const { land, water, green, building, roadMinor, roadMajor, roadHighway, boundary, label, labelStrong, halo } =
    palette;
  return {
    background: land,
    earth: land,
    park_a: green,
    park_b: green,
    hospital: land,
    industrial: land,
    school: land,
    wood_a: green,
    wood_b: green,
    pedestrian: land,
    scrub_a: green,
    scrub_b: green,
    glacier: land,
    sand: land,
    beach: land,
    aerodrome: green,
    runway: roadMajor,
    water,
    zoo: green,
    military: land,

    tunnel_other_casing: land,
    tunnel_minor_casing: land,
    tunnel_link_casing: land,
    tunnel_major_casing: land,
    tunnel_highway_casing: land,
    tunnel_other: roadMinor,
    tunnel_minor: roadMinor,
    tunnel_link: roadMinor,
    tunnel_major: roadMajor,
    tunnel_highway: roadHighway,

    pier: land,
    buildings: building,

    minor_service_casing: land,
    minor_casing: land,
    link_casing: land,
    major_casing_late: land,
    highway_casing_late: land,
    other: roadMinor,
    minor_service: roadMinor,
    minor_a: roadMinor,
    minor_b: roadMinor,
    link: roadMinor,
    major_casing_early: land,
    major: roadMajor,
    highway_casing_early: land,
    highway: roadHighway,
    railway: roadMajor,
    boundaries: boundary,

    bridges_other_casing: land,
    bridges_minor_casing: land,
    bridges_link_casing: land,
    bridges_major_casing: land,
    bridges_highway_casing: land,
    bridges_other: roadMinor,
    bridges_minor: roadMinor,
    bridges_link: roadMinor,
    bridges_major: roadMajor,
    bridges_highway: roadHighway,

    roads_label_minor: label,
    roads_label_minor_halo: halo,
    roads_label_major: label,
    roads_label_major_halo: halo,
    // The only label that sits on water, where the secondary tone falls short of AA.
    ocean_label: labelStrong,
    subplace_label: label,
    subplace_label_halo: halo,
    city_label: label,
    city_label_halo: halo,
    state_label: label,
    state_label_halo: halo,
    country_label: label,
    address_label: label,
    address_label_halo: halo,

    regular: MAP_FONT.regular,
    bold: MAP_FONT.medium,
    italic: MAP_FONT.italic,
    // No `pois` and no `landcover`: the points on this map are the prospects.
  };
}

const LABEL_HALO = 1.5;

/** One-way arrows and road shields draw from a sprite this map does not ship. */
const SPRITE_LAYERS = new Set(["roads_oneway", "roads_shields"]);

export function basemapLayers(palette: MapPalette): LayerSpecification[] {
  return layers(BASEMAP_SOURCE, flavor(palette), { lang: "es" })
    .filter((layer) => !SPRITE_LAYERS.has(layer.id))
    .map((layer) => {
      if (layer.type !== "symbol" || !layer.layout) return layer;
      // Town dots come from the same sprite; the name alone places the town.
      const layout = { ...layer.layout };
      delete layout["icon-image"];
      delete layout["icon-size"];
      delete layout["icon-padding"];
      // Parks and buildings are a shade off the land, where the label tone
      // drops under AA. A halo this wide keeps every glyph on the land color.
      const paint = layer.paint?.["text-halo-color"] ? { ...layer.paint, "text-halo-width": LABEL_HALO } : layer.paint;
      return { ...layer, layout, paint };
    });
}

export function basemapStyle(palette: MapPalette): StyleSpecification {
  const assets = assetsUrl();
  return {
    version: 8,
    glyphs: `${assets}/fonts/{fontstack}/{range}.pbf`,
    sources: {
      [BASEMAP_SOURCE]: {
        type: "vector",
        url: `pmtiles://${assets}/colombia.pmtiles`,
        attribution:
          '<a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">© OpenStreetMap</a>',
      },
    },
    layers: basemapLayers(palette),
  };
}
