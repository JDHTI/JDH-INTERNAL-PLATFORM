/** Mirrors the API's limits so the obvious mistakes are caught before upload. */
export const MAX_UPLOAD_BYTES = 25 * 1024 * 1024;

export const ALLOWED_EXTENSIONS = [
  "pdf",
  "doc",
  "docx",
  "xls",
  "xlsx",
  "xlsm",
  "csv",
  "ppt",
  "pptx",
  "txt",
  "png",
  "jpg",
  "jpeg",
  "zip",
] as const;

export const ACCEPT_ATTRIBUTE = ALLOWED_EXTENSIONS.map((ext) => `.${ext}`).join(",");

export function fileExtension(filename: string): string {
  const dot = filename.lastIndexOf(".");
  return dot === -1 ? "" : filename.slice(dot + 1).toLowerCase();
}

const sizeFormatter = new Intl.NumberFormat("es-CO", {
  maximumFractionDigits: 1,
});

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${sizeFormatter.format(bytes / 1024)} KB`;
  return `${sizeFormatter.format(bytes / (1024 * 1024))} MB`;
}

// Numeric (24/09/2026): fixed width, so dates line up down the column.
const dateFormatter = new Intl.DateTimeFormat("es-CO", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

export function formatDate(iso: string): string {
  return dateFormatter.format(new Date(iso));
}

/**
 * The API's form of a tag: lowercase, whitespace collapsed. Colors are keyed
 * by it, so "Contratos " typed in the upload form finds the color that
 * "contratos" already has.
 */
export function normalizeTag(tag: string): string {
  return tag.split(/\s+/).filter(Boolean).join(" ").toLowerCase();
}

/** "Contratos, 2026 ,contratos" → ["Contratos", "2026"]. */
export function parseTags(text: string): string[] {
  const seen = new Set<string>();
  const tags: string[] = [];
  for (const raw of text.split(",")) {
    const tag = raw.trim();
    const key = tag.toLowerCase();
    if (tag && !seen.has(key)) {
      seen.add(key);
      tags.push(tag);
    }
  }
  return tags;
}
