"use client";

import { useState } from "react";
import { Popover } from "@base-ui/react/popover";
import { DayPicker, type DateRange } from "@daypicker/react";
import { es } from "@daypicker/react/locale";
import { CalendarDays, ChevronLeft, ChevronRight, X } from "lucide-react";

import { formatIso, toDate, toIso } from "@/shared/lib/iso-date";
import { cn } from "@/shared/lib/utils";

import { Button } from "./button";

/** Calendar dates travel as "YYYY-MM-DD", the way the API and the URL carry them. */
export interface IsoDateRange {
  from?: string;
  to?: string;
}

/** "01/09/2026 – 29/09/2026", or the open side said in words. */
export function formatIsoRange({ from, to }: IsoDateRange): string {
  if (from && to) return from === to ? formatIso(from) : `${formatIso(from)} – ${formatIso(to)}`;
  if (from) return `Desde ${formatIso(from)}`;
  if (to) return `Hasta ${formatIso(to)}`;
  return "";
}

function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function presets(today: Date): { label: string; range: DateRange }[] {
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
  return [
    { label: "Hoy", range: { from: today, to: today } },
    { label: "Últimos 7 días", range: { from: addDays(today, -6), to: today } },
    { label: "Últimos 30 días", range: { from: addDays(today, -29), to: today } },
    { label: "Este mes", range: { from: monthStart, to: today } },
    {
      label: "Mes anterior",
      range: {
        from: new Date(today.getFullYear(), today.getMonth() - 1, 1),
        to: addDays(monthStart, -1),
      },
    },
  ];
}

const dayButton =
  "flex size-9 items-center justify-center rounded-md text-sm tabular-nums outline-none " +
  "hover:bg-canvas-subtle focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ring";

/**
 * One control for a from–to filter: a trigger that reads like the dropdowns
 * next to it, and a one-month calendar with the usual shortcuts. The range is
 * applied with «Aplicar», so a half-picked range never fires a search.
 */
export function DateRangePicker({
  id,
  value,
  onChange,
  max,
  placeholder = "Cualquier fecha",
  label,
}: {
  id?: string;
  value: IsoDateRange;
  onChange: (next: IsoDateRange) => void;
  /** Last selectable day, "YYYY-MM-DD". */
  max?: string;
  placeholder?: string;
  /** Accessible name of the trigger, when the visible label is elsewhere. */
  label?: string;
}) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<DateRange | undefined>();
  const [month, setMonth] = useState<Date>(new Date());
  const maxDate = toDate(max);
  const today = maxDate ?? toDate(toIso(new Date()))!;
  const hasValue = Boolean(value.from || value.to);
  const summary = formatIsoRange(value);

  const openChange = (next: boolean) => {
    if (next) {
      const from = toDate(value.from);
      setDraft(hasValue ? { from, to: toDate(value.to) } : undefined);
      // Open on the month where the chosen range ends.
      const anchor = toDate(value.to) ?? from ?? today;
      setMonth(new Date(anchor.getFullYear(), anchor.getMonth(), 1));
    }
    setOpen(next);
  };

  const apply = (range: DateRange | undefined) => {
    onChange({
      from: range?.from ? toIso(range.from) : undefined,
      // One day picked means that day alone.
      to: range?.to ? toIso(range.to) : range?.from ? toIso(range.from) : undefined,
    });
    setOpen(false);
  };

  return (
    <Popover.Root open={open} onOpenChange={openChange}>
      <div className="relative w-full">
        <Popover.Trigger
          id={id}
          aria-label={label ? `${label}: ${summary || placeholder}` : undefined}
          className={cn(
            "flex h-9 w-full items-center gap-2 rounded-md border border-border-control bg-transparent px-2.5 text-left text-sm text-text-primary",
            "transition-colors duration-150 outline-none hover:bg-canvas-subtle data-[popup-open]:bg-canvas-subtle",
            "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring-control",
            "max-md:h-11",
            hasValue && "pr-9"
          )}
        >
          <CalendarDays className="size-4 shrink-0 text-text-secondary" aria-hidden="true" />
          <span className={cn("tabular min-w-0 truncate", !hasValue && "text-text-secondary")}>
            {summary || placeholder}
          </span>
        </Popover.Trigger>
        {hasValue && (
          <button
            type="button"
            aria-label="Quitar rango de fechas"
            onClick={() => onChange({})}
            className="absolute top-1/2 right-1.5 flex size-6 -translate-y-1/2 items-center justify-center rounded-sm text-text-secondary hover:bg-canvas-subtle hover:text-text-primary focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ring-control"
          >
            <X className="size-4" aria-hidden="true" />
          </button>
        )}
      </div>
      <Popover.Portal>
        <Popover.Positioner side="bottom" align="start" sideOffset={4} className="z-50">
          <Popover.Popup className="max-w-[calc(100vw-2rem)] rounded-lg border border-border bg-surface-raised text-text-primary shadow-modal outline-none">
            <Popover.Title className="sr-only">Elegir rango de fechas</Popover.Title>
            <div className="flex flex-col sm:flex-row">
              <ul
                aria-label="Rangos rápidos"
                className="flex gap-1 overflow-x-auto border-b border-border p-2 sm:w-40 sm:flex-col sm:border-r sm:border-b-0"
              >
                {presets(today).map((preset) => (
                  <li key={preset.label}>
                    <button
                      type="button"
                      onClick={() => apply(preset.range)}
                      className="h-8 w-full rounded-sm px-2 text-left text-sm whitespace-nowrap hover:bg-canvas-subtle focus-visible:outline-2 focus-visible:outline-ring max-md:h-11"
                    >
                      {preset.label}
                    </button>
                  </li>
                ))}
              </ul>
              <div className="p-3">
                <DayPicker
                  mode="range"
                  locale={es}
                  numberOfMonths={1}
                  month={month}
                  onMonthChange={setMonth}
                  selected={draft}
                  onSelect={setDraft}
                  disabled={maxDate ? { after: maxDate } : undefined}
                  endMonth={maxDate}
                  showOutsideDays={false}
                  components={{
                    Chevron: ({ orientation }) =>
                      orientation === "left" ? (
                        <ChevronLeft className="size-4" aria-hidden="true" />
                      ) : (
                        <ChevronRight className="size-4" aria-hidden="true" />
                      ),
                  }}
                  classNames={{
                    root: "relative",
                    months: "flex",
                    month: "space-y-2",
                    month_caption: "flex h-8 items-center justify-center",
                    caption_label: "text-sm font-semibold capitalize",
                    nav: "absolute inset-x-0 top-0 z-10 flex h-8 items-center justify-between",
                    button_previous:
                      "flex size-8 items-center justify-center rounded-md text-text-secondary hover:bg-canvas-subtle hover:text-text-primary disabled:opacity-40",
                    button_next:
                      "flex size-8 items-center justify-center rounded-md text-text-secondary hover:bg-canvas-subtle hover:text-text-primary disabled:opacity-40",
                    month_grid: "border-collapse",
                    weekday: "size-9 text-[11px] font-semibold text-text-secondary uppercase",
                    day: "size-9 p-0 text-center",
                    day_button: dayButton,
                    today: "font-semibold [&>button]:underline [&>button]:underline-offset-4",
                    disabled: "text-text-disabled [&>button]:pointer-events-none",
                    hidden: "invisible",
                    selected:
                      "[&>button]:bg-primary [&>button]:text-text-on-primary [&>button]:hover:bg-primary-hover",
                    range_start: "rounded-l-md bg-primary-subtle",
                    range_end: "rounded-r-md bg-primary-subtle",
                    range_middle:
                      "bg-primary-subtle [&>button]:bg-transparent! [&>button]:text-text-primary! [&>button]:rounded-none",
                  }}
                />
                <div className="mt-3 flex items-center gap-2 border-t border-border pt-3">
                  {/* Only the next step; the chosen range already shows in the
                      field and in the filter chip. */}
                  <span className="mr-auto text-[13px] text-text-secondary" aria-live="polite">
                    {!draft?.from ? "Elige el primer día" : !draft.to ? "Elige el último día" : ""}
                  </span>
                  <Popover.Close
                    render={<Button variant="outline" size="sm" className="max-md:h-11" />}
                  >
                    Cancelar
                  </Popover.Close>
                  <Button
                    size="sm"
                    className="max-md:h-11"
                    disabled={!draft?.from}
                    onClick={() => apply(draft)}
                  >
                    Aplicar
                  </Button>
                </div>
              </div>
            </div>
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  );
}
