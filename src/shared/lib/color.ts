export interface Rgb {
  r: number;
  g: number;
  b: number;
}

/**
 * "#1D4ED8", "1d4ed8", "#14d" → "#1d4ed8". Anything else → null. The API
 * only stores six-digit lowercase hex, so this is the one shape that leaves
 * the browser.
 */
export function normalizeHex(input: string): string | null {
  const raw = input.trim().replace(/^#/, "").toLowerCase();
  if (/^[0-9a-f]{3}$/.test(raw)) {
    return `#${[...raw].map((digit) => digit + digit).join("")}`;
  }
  return /^[0-9a-f]{6}$/.test(raw) ? `#${raw}` : null;
}

export function hexToRgb(hex: string): Rgb {
  const value = Number.parseInt(hex.slice(1), 16);
  return { r: (value >> 16) & 255, g: (value >> 8) & 255, b: value & 255 };
}

export function rgbToHex({ r, g, b }: Rgb): string {
  return `#${[r, g, b].map((channel) => channel.toString(16).padStart(2, "0")).join("")}`;
}

/** Channel text → 0..255, or null while the field is empty or not a number. */
export function parseChannel(text: string): number | null {
  if (!/^\d{1,3}$/.test(text.trim())) return null;
  return Math.min(255, Number(text));
}
