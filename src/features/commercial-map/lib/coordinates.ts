export interface Coordinates {
  latitude: number;
  longitude: number;
}

/** Mainland Colombia and its islands, with a margin; the API checks the real outline. */
const LIMITS = { south: -4.5, north: 13.6, west: -82, east: -66.5 };

export function inColombia({ latitude, longitude }: Coordinates): boolean {
  return (
    latitude >= LIMITS.south && latitude <= LIMITS.north && longitude >= LIMITS.west && longitude <= LIMITS.east
  );
}

/**
 * Reads «6.2518, -75.5636», the way Google Maps copies a point, or a Google
 * Maps link that carries one (`?q=lat,lon` or `@lat,lon`). Latitude first.
 */
export function parseCoordinates(text: string): Coordinates | null {
  const match =
    /[?&]q=(-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?)/.exec(text) ??
    /@(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/.exec(text) ??
    /^\s*(-?\d+(?:\.\d+)?)\s*[,;\s]\s*(-?\d+(?:\.\d+)?)\s*$/.exec(text);
  if (!match) return null;
  const point = { latitude: Number(match[1]), longitude: Number(match[2]) };
  return inColombia(point) ? point : null;
}

export function formatCoordinates({ latitude, longitude }: Coordinates): string {
  return `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
}
