"use client";

import { useState } from "react";
import { Popover } from "@base-ui/react/popover";
import { DayPicker } from "@daypicker/react";
import { es } from "@daypicker/react/locale";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";

import { formatIso, toDate, toIso } from "@/shared/lib/iso-date";
import { cn } from "@/shared/lib/utils";

import { Button } from "./button";

const dayButton =
  "flex size-10 items-center justify-center rounded-md text-sm tabular-nums outline-none md:size-9 " +
  "hover:bg-canvas-subtle focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ring";

/**
 * One calendar date as a field. It replaces `<input type="date">`, whose
 * picker differs per browser and cannot follow the app's theme. Dates travel
 * as "YYYY-MM-DD"; an empty string is "no date". A pick applies right away:
 * there is no half-typed date to publish, which is why the fields that save on
 * their own can commit on change.
 */
export function DatePicker({
  id,
  value,
  onChange,
  min,
  max,
  placeholder = "Sin fecha",
  clearable = false,
  disabled,
  className,
  "aria-invalid": invalid,
  "aria-describedby": describedBy,
}: {
  id?: string;
  /** Extra classes for the trigger, e.g. a taller touch target on a public form. */
  className?: string;
  value: string;
  onChange: (next: string) => void;
  /** First selectable day, "YYYY-MM-DD". */
  min?: string;
  /** Last selectable day, "YYYY-MM-DD". */
  max?: string;
  placeholder?: string;
  /** Shows «Quitar fecha»; leave it off for a field that needs a value. */
  clearable?: boolean;
  disabled?: boolean;
  "aria-invalid"?: boolean;
  "aria-describedby"?: string;
}) {
  const [open, setOpen] = useState(false);
  const [month, setMonth] = useState<Date>(new Date());
  const selected = toDate(value || undefined);
  const minDate = toDate(min);
  const maxDate = toDate(max);
  const today = toDate(toIso(new Date()))!;
  const todayOutOfRange = (minDate && today < minDate) || (maxDate && today > maxDate);

  const openChange = (next: boolean) => {
    if (next) {
      const anchor = selected ?? minDate ?? today;
      setMonth(new Date(anchor.getFullYear(), anchor.getMonth(), 1));
    }
    setOpen(next);
  };

  const apply = (next: string) => {
    onChange(next);
    setOpen(false);
  };

  return (
    <Popover.Root open={open} onOpenChange={openChange}>
      <Popover.Trigger
        id={id}
        disabled={disabled}
        aria-invalid={invalid}
        aria-describedby={describedBy}
        className={cn(
          "flex h-9 w-full items-center gap-2 rounded-md border border-border-control bg-transparent px-2.5 text-left text-sm text-text-primary",
          "transition-colors duration-150 outline-none hover:bg-canvas-subtle data-[popup-open]:bg-canvas-subtle",
          "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
          "disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
          "aria-invalid:border-danger",
          className
        )}
      >
        <CalendarDays className="size-4 shrink-0 text-text-secondary" aria-hidden="true" />
        <span className={cn("tabular-nums min-w-0 truncate", !value && "text-text-secondary")}>
          {value ? formatIso(value) : placeholder}
        </span>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Positioner side="bottom" align="start" sideOffset={4} className="z-50">
          <Popover.Popup className="max-w-[calc(100vw-2rem)] rounded-lg border border-border bg-surface-raised p-3 text-text-primary shadow-modal outline-none">
            <Popover.Title className="sr-only">Elegir fecha</Popover.Title>
            <DayPicker
              mode="single"
              locale={es}
              numberOfMonths={1}
              month={month}
              onMonthChange={setMonth}
              selected={selected}
              onSelect={(date) => date && apply(toIso(date))}
              disabled={[
                ...(minDate ? [{ before: minDate }] : []),
                ...(maxDate ? [{ after: maxDate }] : []),
              ]}
              startMonth={minDate}
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
                weekday: "size-10 text-[11px] font-semibold text-text-secondary uppercase md:size-9",
                day: "size-10 p-0 text-center md:size-9",
                day_button: dayButton,
                today: "font-semibold [&>button]:underline [&>button]:underline-offset-4",
                disabled: "text-text-disabled [&>button]:pointer-events-none",
                hidden: "invisible",
                selected:
                  "[&>button]:bg-primary [&>button]:text-text-on-primary [&>button]:hover:bg-primary-hover",
              }}
            />
            <div className="mt-3 flex items-center gap-2 border-t border-border pt-3">
              {clearable && value && (
                <Button variant="ghost" size="sm" className="max-md:h-11" onClick={() => apply("")}>
                  Quitar fecha
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                className="ml-auto max-md:h-11"
                disabled={Boolean(todayOutOfRange)}
                onClick={() => apply(toIso(today))}
              >
                Hoy
              </Button>
            </div>
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  );
}
