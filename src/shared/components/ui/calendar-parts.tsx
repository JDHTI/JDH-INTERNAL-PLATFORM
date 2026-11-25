"use client";

import type { ChevronProps, DayPickerProps } from "@daypicker/react";
import { ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";

import { toIso } from "@/shared/lib/iso-date";
import { cn } from "@/shared/lib/utils";

/** Years the month and year dropdowns offer around today, when the field sets no min or max. */
export const YEARS_BACK = 10;
export const YEARS_AHEAD = 5;

/** The arrows and the dropdowns' caret, from the app's icon set. */
export function CalendarChevron({ orientation }: ChevronProps) {
  if (orientation === "left") return <ChevronLeft className="size-4" aria-hidden="true" />;
  if (orientation === "down") return <ChevronDown className="size-3.5 text-text-secondary" aria-hidden="true" />;
  return <ChevronRight className="size-4" aria-hidden="true" />;
}

/** Spanish names for the dropdowns: a screen reader says what each one picks. */
export const CALENDAR_LABELS: DayPickerProps["labels"] = {
  labelMonthDropdown: () => "Mes",
  labelYearDropdown: () => "Año",
  labelPrevious: () => "Mes anterior",
  labelNext: () => "Mes siguiente",
};

const navButton =
  "pointer-events-auto flex size-8 items-center justify-center rounded-md text-text-secondary hover:bg-canvas-subtle hover:text-text-primary " +
  "focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ring disabled:opacity-40 max-md:size-11";

/**
 * The calendar's look, shared by the single and the range picker. The month and year are native
 * selects laid over their label (DayPicker's dropdown caption), so the keyboard and the phone's
 * own picker work as anywhere else; the arrows stay on both sides.
 */
export function calendarClassNames(dayClass: string, extra: Partial<NonNullable<DayPickerProps["classNames"]>> = {}) {
  return {
    root: "relative",
    months: "flex",
    month: "space-y-2",
    month_caption: "flex h-8 items-center justify-center max-md:h-11",
    caption_label: "pointer-events-none flex items-center gap-0.5 text-sm font-semibold capitalize",
    dropdowns: "flex items-center gap-1",
    dropdown_root: cn(
      "relative inline-flex h-8 items-center rounded-md px-2 hover:bg-canvas-subtle max-md:h-11",
      "has-[select:focus-visible]:outline-2 has-[select:focus-visible]:outline-offset-1 has-[select:focus-visible]:outline-ring"
    ),
    // Invisible over its label, but it is the real control: click, keyboard and screen reader.
    dropdown: "absolute inset-0 w-full cursor-pointer appearance-none opacity-0",
    // The arrows sit over the caption's row; only the buttons take clicks, so the dropdowns between them work.
    nav: "pointer-events-none absolute inset-x-0 top-0 z-10 flex h-8 items-center justify-between max-md:h-11",
    button_previous: navButton,
    button_next: navButton,
    month_grid: "border-collapse",
    weekday: cn(dayClass, "text-[11px] font-semibold text-text-secondary uppercase"),
    day: cn(dayClass, "p-0 text-center"),
    day_button: cn(
      dayClass,
      "flex items-center justify-center rounded-md text-sm tabular-nums outline-none",
      "hover:bg-canvas-subtle focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ring"
    ),
    today: "font-semibold [&>button]:underline [&>button]:underline-offset-4",
    disabled: "text-text-disabled [&>button]:pointer-events-none",
    hidden: "invisible",
    selected: "[&>button]:bg-primary [&>button]:text-text-on-primary [&>button]:hover:bg-primary-hover",
    ...extra,
  };
}

/**
 * The first and last month the dropdowns offer: the field's min and max when it has them, else
 * ten years back and five ahead, always widened to reach the dates already chosen.
 */
export function calendarBounds(
  { min, max, include = [] }: { min?: Date; max?: Date; include?: (Date | undefined)[] },
  { back = YEARS_BACK, ahead = YEARS_AHEAD }: { back?: number; ahead?: number } = {}
): { startMonth: Date; endMonth: Date } {
  const year = new Date().getFullYear();
  const chosen = include.filter((date): date is Date => date !== undefined);
  const first = min ?? new Date(Math.min(year - back, ...chosen.map((date) => date.getFullYear())), 0, 1);
  const last = max ?? new Date(Math.max(year + ahead, ...chosen.map((date) => date.getFullYear())), 11, 31);
  return { startMonth: first, endMonth: last };
}

/**
 * A typed date, as the app writes it (29/09/2026, also 29-9-2026 or 29.09.2026) or pasted from
 * elsewhere as 2026-09-29. Returns "YYYY-MM-DD", or null when it is not a real day.
 */
export function parseDateText(text: string): string | null {
  const trimmed = text.trim();
  const iso = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(trimmed);
  const local = /^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/.exec(trimmed);
  const parts = iso ? [iso[1], iso[2], iso[3]] : local ? [local[3], local[2], local[1]] : null;
  if (!parts) return null;
  const [year, month, day] = parts.map(Number);
  const date = new Date(year, month - 1, day);
  // 31/02 rolls over to March: only a date that comes back as typed is real.
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) return null;
  return toIso(date);
}

/** Why a typed date is refused, or null when it is valid and in range. */
export function dateTextError(text: string, min?: string, max?: string): { iso: string | null; error: string | null } {
  const iso = parseDateText(text);
  if (!iso) {
    // Right shape but no such day (31/02): say that, not the format again.
    const shaped = /^(\d{4}-\d{1,2}-\d{1,2}|\d{1,2}[/.-]\d{1,2}[/.-]\d{4})$/.test(text.trim());
    return { iso: null, error: shaped ? "Esa fecha no existe." : "Escribe la fecha como dd/mm/aaaa." };
  }
  if (min && iso < min) return { iso: null, error: `No puede ser antes del ${formatShort(min)}.` };
  if (max && iso > max) return { iso: null, error: `No puede ser después del ${formatShort(max)}.` };
  return { iso, error: null };
}

const formatShort = (iso: string) => iso.split("-").reverse().join("/");
