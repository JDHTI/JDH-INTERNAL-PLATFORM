import type { Feature, FeatureCollection, LineString, Point } from "geojson";

import type { RouteGeometryStatus, RouteOrigin } from "../types/commercial-map.types";

/** A route admits this many stops: the free routing plan takes 50 points with the origin. */
export const MAX_STOPS = 48;

export interface RoutePoint {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  /** Visited, with whatever result. */
  done: boolean;
}

const position = (point: { latitude: number; longitude: number }): [number, number] => [
  point.longitude,
  point.latitude,
];

/**
 * A route as the map layers draw it: the line and the numbered stops. Without
 * a stored geometry (a draft, or a route waiting to be computed) the line
 * joins the stops in order, and the layer draws it dashed.
 */
export function routeMapData(
  stops: RoutePoint[],
  origin: RouteOrigin | null,
  geometry: LineString | null,
  status: RouteGeometryStatus
): { line: FeatureCollection<LineString>; points: FeatureCollection<Point>; coordinates: number[][] } {
  const path = [...(origin ? [position(origin)] : []), ...stops.map(position)];
  const lines: Feature<LineString>[] = geometry
    ? [{ type: "Feature", properties: { status }, geometry }]
    : path.length >= 2
      ? [{ type: "Feature", properties: { status: "pending" }, geometry: { type: "LineString", coordinates: path } }]
      : [];

  const points: Feature<Point>[] = stops.map((stop, index) => ({
    type: "Feature",
    properties: { kind: "stop", position: index + 1, name: stop.name, done: stop.done },
    geometry: { type: "Point", coordinates: position(stop) },
  }));
  if (origin) {
    points.push({
      type: "Feature",
      properties: { kind: "origin", name: origin.label?.trim() || "Partida" },
      geometry: { type: "Point", coordinates: position(origin) },
    });
  }

  return {
    line: { type: "FeatureCollection", features: lines },
    points: { type: "FeatureCollection", features: points },
    coordinates: geometry ? [...geometry.coordinates, ...path] : path,
  };
}
