"use client";

import { useId, useRef, useState } from "react";
import { Popover } from "@base-ui/react/popover";
import { DayPicker } from "@daypicker/react";
import { es } from "@daypicker/react/locale";
import { CalendarDays } from "lucide-react";

import { formatIso, toDate, toIso } from "@/shared/lib/iso-date";
import { cn } from "@/shared/lib/utils";

import { Button } from "./button";
import { CALENDAR_LABELS, CalendarChevron, calendarBounds, calendarClassNames, dateTextError } from "./calendar-parts";

/** What the empty field shows while it is being typed in. */
const FORMAT_HINT = "dd/mm/aaaa";

/**
 * One calendar date as a field. It replaces `<input type="date">`, whose
 * picker differs per browser and cannot follow the app's theme. Dates travel
 * as "YYYY-MM-DD"; an empty string is "no date".
 *
 * The date can be typed (dd/mm/aaaa, or a pasted aaaa-mm-dd) and is checked
 * when the field is left or on Enter: a date that is not real or falls outside
 * min and max is marked with a short message and does not change the value.
 * The calendar opens from the icon, with the month and the year as dropdowns
 * besides the arrows. A pick applies right away, which is why the fields that
 * save on their own can commit on change.
 */
export function DatePicker({
  id,
  value,
  onChange,
  min,
  max,
  placeholder = FORMAT_HINT,
  clearable = false,
  disabled,
  className,
  yearsBack,
  yearsAhead,
  "aria-label": ariaLabel,
  "aria-invalid": invalid,
  "aria-describedby": describedBy,
}: {
  id?: string;
  /** Extra classes for the field, e.g. a taller touch target on a public form. */
  className?: string;
  value: string;
  onChange: (next: string) => void;
  /** First selectable day, "YYYY-MM-DD". */
  min?: string;
  /** Last selectable day, "YYYY-MM-DD". */
  max?: string;
  /** What the empty field says, e.g. «Indefinido»; while typing it shows dd/mm/aaaa. */
  placeholder?: string;
  /** Shows «Quitar fecha» and lets the typed text be erased; leave it off for a field that needs a value. */
  clearable?: boolean;
  disabled?: boolean;
  /** Years the year dropdown reaches without a min or max (10 back and 5 ahead by default). */
  yearsBack?: number;
  yearsAhead?: number;
  "aria-label"?: string;
  "aria-invalid"?: boolean;
  "aria-describedby"?: string;
}) {
  const errorId = useId();
  const fieldRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [month, setMonth] = useState<Date>(new Date());
  // What is being typed; null shows the value as it is.
  const [draft, setDraft] = useState<string | null>(null);
  const [focused, setFocused] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const selected = toDate(value || undefined);
  const minDate = toDate(min);
  const maxDate = toDate(max);
  const today = toDate(toIso(new Date()))!;
  const todayOutOfRange = (minDate && today < minDate) || (maxDate && today > maxDate);
  const bounds = calendarBounds({ min: minDate, max: maxDate, include: [selected] }, { back: yearsBack, ahead: yearsAhead });
  const text = draft ?? (value ? formatIso(value) : "");

  const openChange = (next: boolean) => {
    if (next) {
      const anchor = selected ?? minDate ?? today;
      setMonth(new Date(anchor.getFullYear(), anchor.getMonth(), 1));
    }
    setOpen(next);
  };

  const apply = (next: string) => {
    onChange(next);
    setDraft(null);
    setError(null);
    setOpen(false);
  };

  /** On leaving the field or Enter: a good date applies, a bad one stays typed with its message. */
  const commit = () => {
    if (draft === null) return;
    if (draft.trim() === "") {
      if (clearable || !value) apply("");
      else setError("Escribe la fecha; este campo no puede quedar vacío.");
      return;
    }
    const checked = dateTextError(draft, min, max);
    if (checked.iso) {
      if (checked.iso !== value) onChange(checked.iso);
      setDraft(null);
      setError(null);
    } else {
      setError(checked.error);
    }
  };

  const describedByAll = [describedBy, error ? errorId : null].filter(Boolean).join(" ") || undefined;

  return (
    <div className="w-full">
      <Popover.Root open={open} onOpenChange={openChange}>
        <div
          ref={fieldRef}
          className={cn(
            "flex h-9 w-full items-center rounded-md border border-border-control bg-transparent text-sm text-text-primary",
            "transition-colors duration-150 focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-ring",
            (invalid || error) && "border-danger",
            disabled && "pointer-events-none cursor-not-allowed opacity-50",
            className
          )}
        >
          <input
            id={id}
            type="text"
            inputMode="numeric"
            autoComplete="off"
            value={text}
            disabled={disabled}
            placeholder={focused ? FORMAT_HINT : placeholder}
            title="Escribe la fecha (dd/mm/aaaa) o elígela en el calendario"
            aria-label={ariaLabel}
            aria-invalid={invalid || error ? true : undefined}
            aria-describedby={describedByAll}
            onFocus={() => setFocused(true)}
            onChange={(event) => {
              setDraft(event.target.value);
              setError(null);
            }}
            onBlur={() => {
              setFocused(false);
              commit();
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                commit();
              } else if (event.key === "Escape" && draft !== null) {
                event.preventDefault();
                setDraft(null);
                setError(null);
              }
            }}
            className="h-full min-w-0 flex-1 bg-transparent pl-2.5 tabular-nums outline-none placeholder:text-text-secondary"
          />
          <Popover.Trigger
            disabled={disabled}
            aria-label={ariaLabel ? `Abrir el calendario: ${ariaLabel}` : "Abrir el calendario"}
            className={cn(
              "flex h-full w-9 shrink-0 items-center justify-center rounded-r-md text-text-secondary outline-none",
              "hover:bg-canvas-subtle hover:text-text-primary data-[popup-open]:bg-canvas-subtle max-md:w-11",
              "focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring"
            )}
          >
            <CalendarDays className="size-4" aria-hidden="true" />
          </Popover.Trigger>
        </div>
        <Popover.Portal>
          {/* Under the whole field, not under the icon that opens it. */}
          <Popover.Positioner anchor={fieldRef} side="bottom" align="start" sideOffset={4} className="z-50">
            <Popover.Popup className="max-w-[calc(100vw-2rem)] rounded-lg border border-border bg-surface-raised p-3 text-text-primary shadow-modal outline-none">
              <Popover.Title className="sr-only">Elegir fecha</Popover.Title>
              <DayPicker
                mode="single"
                locale={es}
                labels={CALENDAR_LABELS}
                captionLayout="dropdown"
                numberOfMonths={1}
                month={month}
                onMonthChange={setMonth}
                selected={selected}
                onSelect={(date) => date && apply(toIso(date))}
                disabled={[...(minDate ? [{ before: minDate }] : []), ...(maxDate ? [{ after: maxDate }] : [])]}
                startMonth={bounds.startMonth}
                endMonth={bounds.endMonth}
                showOutsideDays={false}
                components={{ Chevron: CalendarChevron }}
                classNames={calendarClassNames("size-10 md:size-9")}
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
      {error && (
        <p id={errorId} role="alert" className="mt-1 text-xs text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
