import { toIso } from "@/shared/lib/iso-date";

/**
 * A start of validity before today. SIESA does not load past dates, so the API moves it: to the
 * validation day when validating, and to the download day in the files of one still to load
 * (API #101, decided 2026-11-20). The browser's date only decides whether to say so.
 */
export function activationPassed(activation: string | null | undefined): boolean {
  return Boolean(activation && activation < toIso(new Date()));
}

export const ACTIVATION_PASSED_TEXT =
  "La vigencia pedida ya pasó: el Excel y el plano salen con la fecha de hoy, porque SIESA no acepta fechas vencidas.";
