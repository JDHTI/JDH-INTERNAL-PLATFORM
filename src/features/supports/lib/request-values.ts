/** UI percentages use points; the API stores fractions with at most six decimals. */
export function requestValue(input: string, netCost: boolean): number | null {
  const text = input.trim().replace(",", ".");
  if (!/^-?\d+(?:\.\d+)?$/.test(text)) return null;
  const decimals = text.split(".")[1]?.length ?? 0;
  if (decimals > (netCost ? 6 : 4)) return null;
  const number = Number(text);
  if (!Number.isFinite(number)) return null;
  if (netCost) return number >= 0 && number < 1e12 ? number : null;
  return number >= -100 && number <= 100 ? Number((number / 100).toFixed(6)) : null;
}

/** Keep the full contract precision when a reviewer confirms a proposal. */
export function formatRequestValue(value: string | number | null | undefined, netCost: boolean): string {
  if (value === null || value === undefined || value === "") return "—";
  const number = Number(value);
  if (!Number.isFinite(number)) return "—";
  return new Intl.NumberFormat("es-CO", netCost
    ? { style: "currency", currency: "COP", maximumFractionDigits: 6 }
    : { style: "percent", maximumFractionDigits: 4 }).format(number);
}
