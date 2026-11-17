import type { PaletteKey } from "../types/commercial-map.types";

export const PALETTE_KEYS: PaletteKey[] = [
  "blue",
  "orange",
  "green",
  "purple",
  "yellow",
  "pink",
  "brown",
  "red",
  "gray",
];

/**
 * Every color the map draws with, resolved from the tokens of globals.css for
 * the theme on screen. MapLibre paints on a canvas and cannot read `var()` or
 * `color-mix()`, so the browser resolves them and the map gets plain `rgb()`.
 */
export interface MapPalette {
  land: string;
  water: string;
  green: string;
  building: string;
  roadMinor: string;
  roadMajor: string;
  roadHighway: string;
  boundary: string;
  label: string;
  labelStrong: string;
  halo: string;
  chip: string;
  /** Opacity of a zone's fill over the land. */
  zoneTint: number;
  /** Opacity of the fill of a commune or a municipality in the segmentation. */
  segmentTint: number;
  project: Record<PaletteKey, string>;
}

const TOKENS = {
  land: "--map-land",
  water: "--map-water",
  green: "--map-green",
  building: "--map-building",
  roadMinor: "--map-road-minor",
  roadMajor: "--map-road-major",
  roadHighway: "--map-road-highway",
  boundary: "--map-boundary",
  label: "--map-label",
  labelStrong: "--map-label-strong",
  halo: "--map-halo",
  chip: "--map-chip",
} as const;

/**
 * `rgb(r, g, b)`, or `color(srgb r g b)` for the result of a `color-mix()`:
 * the two ways a browser serialises an opaque computed color.
 */
function toRgb(computed: string): string {
  const numbers = computed.match(/-?\d*\.?\d+(?:e-?\d+)?/g)?.map(Number) ?? [];
  if (numbers.length < 3) return "rgb(0, 0, 0)";
  const scale = computed.startsWith("color(") ? 255 : 1;
  const [r, g, b] = numbers.slice(0, 3).map((value) => Math.round(Math.min(255, Math.max(0, value * scale))));
  return `rgb(${r}, ${g}, ${b})`;
}

/** `rgb(r, g, b)` as `#rrggbb`, the only form Terra Draw's styles take. */
export function toHex(rgb: string): `#${string}` {
  const channels = rgb.match(/\d+/g)?.slice(0, 3).map(Number) ?? [0, 0, 0];
  return `#${channels.map((channel) => channel.toString(16).padStart(2, "0")).join("")}`;
}

export function readMapPalette(): MapPalette {
  const probe = document.createElement("span");
  probe.style.display = "none";
  document.body.appendChild(probe);
  const resolve = (token: string) => {
    probe.style.color = `var(${token})`;
    return toRgb(getComputedStyle(probe).color);
  };

  const base = Object.fromEntries(
    Object.entries(TOKENS).map(([name, token]) => [name, resolve(token)])
  ) as Record<keyof typeof TOKENS, string>;
  const project = Object.fromEntries(
    PALETTE_KEYS.map((key) => [key, resolve(`--project-${key}`)])
  ) as Record<PaletteKey, string>;
  const root = getComputedStyle(document.documentElement);
  const opacity = (token: string) => {
    const value = Number(root.getPropertyValue(token));
    return Number.isFinite(value) && value > 0 ? value : 0.14;
  };
  probe.remove();

  return { ...base, project, zoneTint: opacity("--map-zone-tint"), segmentTint: opacity("--map-segment-tint") };
}
