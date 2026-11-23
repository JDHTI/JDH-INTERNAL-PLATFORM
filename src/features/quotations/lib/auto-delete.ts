import { toIso } from "@/shared/lib/iso-date";

import { formatDay } from "./format";

/** From this many days left, the notice turns amber. */
export const DELETE_SOON_DAYS = 7;

/** Whole days from today (the browser's day) to `deletedOn`, "YYYY-MM-DD"; 0 on the day itself. */
export function daysUntil(deletedOn: string): number {
  const [y1, m1, d1] = toIso(new Date()).split("-").map(Number);
  const [y2, m2, d2] = deletedOn.slice(0, 10).split("-").map(Number);
  return Math.round((Date.UTC(y2, m2 - 1, d2) - Date.UTC(y1, m1 - 1, d1)) / 86_400_000);
}

/**
 * A customer quotation in draft that was never sent to validation is deleted 30 days after it was
 * created (the API's daily job, 00:15); `deleted_on` says when. Sending it to validation saves it.
 */
export function deletionText(deletedOn: string): string {
  return (
    `Esta cotización se elimina el ${formatDay(deletedOn)} si no se envía a validación. ` +
    "Las cotizaciones en borrador que nunca se envían se eliminan a los 30 días de creadas."
  );
}
