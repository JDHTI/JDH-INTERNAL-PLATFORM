const sizeFormatter = new Intl.NumberFormat("es-CO", {
  maximumFractionDigits: 1,
});

/** The API serializes Decimal as a string or a number depending on the field. */
export type Decimal = number | string;

/** null for an empty or non-numeric value, so a formatter prints a dash. */
export function toNumber(value: Decimal | null | undefined): number | null {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${sizeFormatter.format(bytes / 1024)} KB`;
  return `${sizeFormatter.format(bytes / (1024 * 1024))} MB`;
}
