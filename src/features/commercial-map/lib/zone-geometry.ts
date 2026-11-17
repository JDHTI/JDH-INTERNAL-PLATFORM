import type { Position } from "geojson";

import type { PaletteKey, ZoneFeature, ZoneGeometry } from "../types/commercial-map.types";
import { PALETTE_KEYS } from "./map-tokens";

/** Area-weighted centre of a ring: where a zone's name goes. */
export function ringCentre(ring: Position[]): Position {
  let area = 0;
  let x = 0;
  let y = 0;
  for (let index = 0; index < ring.length - 1; index += 1) {
    const [x0, y0] = ring[index];
    const [x1, y1] = ring[index + 1];
    const cross = x0 * y1 - x1 * y0;
    area += cross;
    x += (x0 + x1) * cross;
    y += (y0 + y1) * cross;
  }
  if (area === 0) return ring[0];
  return [x / (3 * area), y / (3 * area)];
}

function ringArea(ring: Position[]): number {
  let area = 0;
  for (let index = 0; index < ring.length - 1; index += 1) {
    area += ring[index][0] * ring[index + 1][1] - ring[index + 1][0] * ring[index][1];
  }
  return Math.abs(area);
}

function outerRings(geometry: ZoneGeometry): Position[][] {
  return geometry.type === "Polygon" ? [geometry.coordinates[0]] : geometry.coordinates.map((part) => part[0]);
}

/** The outer ring of the largest part: a zone made of several pieces is named once. */
export function mainRing(geometry: ZoneGeometry): Position[] {
  const rings = outerRings(geometry);
  return rings.reduce((largest, ring) => (ringArea(ring) > ringArea(largest) ? ring : largest), rings[0]);
}

function ringContains(ring: Position[], [x, y]: Position): boolean {
  let inside = false;
  for (let index = 0, previous = ring.length - 1; index < ring.length; previous = index, index += 1) {
    const [x0, y0] = ring[index];
    const [x1, y1] = ring[previous];
    if (y0 > y !== y1 > y && x < ((x1 - x0) * (y - y0)) / (y1 - y0) + x0) inside = !inside;
  }
  return inside;
}

/** Whether the centre of `inner` falls inside `outer`: a commune inside its municipality. */
export function holds(outer: ZoneFeature, inner: ZoneFeature): boolean {
  const centre = ringCentre(mainRing(inner.geometry));
  return outerRings(outer.geometry).some((ring) => ringContains(ring, centre));
}

/** Gray stays out: it is the tone of a municipality that is not split into communes. */
const HUES = PALETTE_KEYS.filter((key) => key !== "gray");

/** Hues that read as one at the opacity of a tint, so two neighbours avoid them too. */
const ALIKE: [PaletteKey, PaletteKey][] = [
  ["orange", "yellow"],
  ["orange", "brown"],
  ["yellow", "brown"],
  ["pink", "red"],
  ["blue", "purple"],
];

/** About 110 m: two zones with a boundary point in the same cell are neighbours. */
const CELL = 0.001;
const cellOf = (x: number, y: number) => `${Math.round(x / CELL)},${Math.round(y / CELL)}`;

/** The cells a ring passes through, walking each side in steps shorter than a cell. */
function ringCells(ring: Position[], into: Set<string>): void {
  for (let index = 0; index < ring.length - 1; index += 1) {
    const [x0, y0] = ring[index];
    const [x1, y1] = ring[index + 1];
    const steps = Math.max(1, Math.ceil(Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0)) / (CELL / 2)));
    for (let step = 0; step <= steps; step += 1) {
      into.add(cellOf(x0 + ((x1 - x0) * step) / steps, y0 + ((y1 - y0) * step) / steps));
    }
  }
}

/**
 * A hue for each zone so that two that touch never share it, as on a political
 * map: the color only tells one part from the next and means nothing else.
 * The same zones always get the same hues.
 */
export function segmentColors(zones: ZoneFeature[]): Map<string, PaletteKey> {
  const owners = new Map<string, Set<number>>();
  zones.forEach((zone, index) => {
    const cells = new Set<string>();
    for (const ring of outerRings(zone.geometry)) ringCells(ring, cells);
    for (const cell of cells) {
      const set = owners.get(cell);
      if (set) set.add(index);
      else owners.set(cell, new Set([index]));
    }
  });

  const neighbours = zones.map(() => new Set<number>());
  for (const set of owners.values()) {
    if (set.size < 2) continue;
    for (const a of set) for (const b of set) if (a !== b) neighbours[a].add(b);
  }

  // The zones with most neighbours choose first, while there is still choice.
  const order = zones.map((_, index) => index).sort((a, b) => neighbours[b].size - neighbours[a].size || a - b);
  const assigned: PaletteKey[] = [];
  const uses = new Map<PaletteKey, number>(HUES.map((hue) => [hue, 0]));
  for (const index of order) {
    const taken = new Set([...neighbours[index]].map((neighbour) => assigned[neighbour]));
    const free = HUES.filter((hue) => !taken.has(hue));
    // Among the hues no neighbour has: first one that no neighbour resembles, then the least used.
    const cost = (hue: PaletteKey) =>
      (uses.get(hue) ?? 0) + (ALIKE.some(([a, b]) => (a === hue && taken.has(b)) || (b === hue && taken.has(a))) ? 100 : 0);
    const hue = (free.length > 0 ? free : HUES).reduce((best, candidate) => (cost(candidate) < cost(best) ? candidate : best));
    assigned[index] = hue;
    uses.set(hue, (uses.get(hue) ?? 0) + 1);
  }
  return new Map(zones.map((zone, index) => [zone.properties.id, assigned[index]]));
}
