/**
 * The supplier's minimum margin of a «% Margen Garantizado», as fractions: above -100 % and below
 * the guaranteed margin; 0 and negatives are fine. Null when it is right or not typed. The API
 * checks the same and answers 422 on `supplier_min_margin_pct`.
 */
export function guaranteedMinError(min: unknown, guaranteed: unknown): string | null {
  if (typeof min !== "number") return null;
  if (min <= -1) return "Debe ser mayor que -100 %.";
  if (typeof guaranteed === "number" && min >= guaranteed) return "Debe ser menor que el margen garantizado.";
  return null;
}
