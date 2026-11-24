import { LINE_REGIONALS, NATIONAL, REGIONALS, REST, type LineRegional } from "../types/increase-requests.types";

const LABELS: Record<string, string> = {
  NACIONAL: "Nacional",
  ANTIOQUIA: "Antioquia",
  BOGOTA: "Bogotá",
  PEREIRA: "Pereira",
  BUCARAMANGA: "Bucaramanga",
  CARTAGENA: "Cartagena",
  BARRANQUILLA: "Barranquilla",
  "RESTO DE REGIONALES": "Resto de regionales",
};

/** «Bogotá» for BOGOTA; anything unknown as the API sent it. */
export const regionalLabel = (regional: string) => LABELS[regional] ?? regional;

export const REGIONAL_OPTIONS = LINE_REGIONALS.map((value) => ({ value, label: regionalLabel(value) }));

/** «Bogotá, Pereira y Barranquilla». */
export function regionalList(regionals: string[]): string {
  const names = regionals.map(regionalLabel);
  return names.length <= 1 ? (names[0] ?? "") : `${names.slice(0, -1).join(", ")} y ${names.at(-1)}`;
}

/** The help the form shows, the same rules the API checks. */
export const REGIONAL_HELP =
  "Nacional: el mismo costo en todo el país, y va sola en su referencia. Si solo cambian algunas regionales, una línea por cada una. " +
  "Si una regional tiene un costo y las demás otro, esa regional más «Resto de regionales»: por ejemplo, Antioquia sube a 23.000 y las otras cinco a 22.000, dos líneas: Antioquia y Resto de regionales.";

/**
 * What is wrong with the regionals of one reference's lines, as the API says
 * it: NACIONAL goes alone, a regional is not repeated, and RESTO needs another
 * regional line and must leave some regional to cover. Null when they are fine.
 */
export function regionalProblem(regionals: LineRegional[]): string | null {
  if (regionals.includes(NATIONAL) && regionals.length > 1) {
    return "Nacional va sola en su referencia. Para una regional distinta, usa esa regional más «Resto de regionales».";
  }
  const seen = new Set<string>();
  for (const regional of regionals) {
    if (seen.has(regional)) return `${regionalLabel(regional)} está dos veces en la misma referencia.`;
    seen.add(regional);
  }
  if (regionals.includes(REST)) {
    const named = regionals.filter((regional) => regional !== REST);
    if (named.length === 0) return "«Resto de regionales» necesita al menos otra línea con una regional.";
    if (REGIONALS.every((regional) => named.includes(regional))) {
      return "«Resto de regionales» no cubre ninguna: las seis regionales ya tienen su línea.";
    }
  }
  return null;
}

/** The regionals RESTO would cover next to the named ones, for the form's hint. */
export function restCoverage(regionals: LineRegional[]): string[] {
  return REGIONALS.filter((regional) => !regionals.includes(regional));
}
