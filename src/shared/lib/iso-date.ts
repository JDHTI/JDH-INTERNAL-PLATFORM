/*
 * Calendar dates travel as "YYYY-MM-DD", the way the API and the URL carry
 * them. These helpers build local-time Dates from that string, never through
 * `new Date("YYYY-MM-DD")`, which parses as UTC and lands a day early here.
 */

export function toDate(iso: string | undefined): Date | undefined {
  if (!iso) return undefined;
  const [year, month, day] = iso.split("-").map(Number);
  return new Date(year, month - 1, day);
}

export function toIso(date: Date): string {
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** "29/09/2026" */
export function formatIso(iso: string): string {
  const [year, month, day] = iso.split("-");
  return `${day}/${month}/${year}`;
}
