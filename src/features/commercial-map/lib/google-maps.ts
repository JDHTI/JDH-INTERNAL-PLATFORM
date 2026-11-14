import type { Coordinates } from "./coordinates";

/**
 * A Google Maps directions link takes an origin, a destination and at most
 * nine points between them, so a longer route is split into legs that start
 * where the previous one ended.
 */
const POINTS_PER_LINK = 11;

export interface DirectionsLeg {
  href: string;
  /** Index, in the list given, of the first and last point of the leg. */
  from: number;
  to: number;
}

const pair = ({ latitude, longitude }: Coordinates) => `${latitude},${longitude}`;

export function directionsLegs(points: Coordinates[]): DirectionsLeg[] {
  const legs: DirectionsLeg[] = [];
  for (let start = 0; start < points.length - 1; start += POINTS_PER_LINK - 1) {
    const end = Math.min(start + POINTS_PER_LINK - 1, points.length - 1);
    const params = new URLSearchParams({
      api: "1",
      travelmode: "driving",
      origin: pair(points[start]),
      destination: pair(points[end]),
    });
    const between = points.slice(start + 1, end).map(pair);
    if (between.length > 0) params.set("waypoints", between.join("|"));
    legs.push({ href: `https://www.google.com/maps/dir/?${params.toString()}`, from: start, to: end });
  }
  return legs;
}

export function pointLink(point: Coordinates): string {
  return `https://www.google.com/maps/search/?api=1&query=${pair(point)}`;
}
