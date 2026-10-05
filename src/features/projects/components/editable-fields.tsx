"use client";

import { useState } from "react";

import { DatePicker } from "@/shared/components/ui/date-picker";
import { Field, Textarea } from "@/shared/components/ui/field";
import { Input } from "@/shared/components/ui/input";

/*
 * Fields that save on their own. Someone else's edit lands in them live; a
 * field being typed in keeps the typed text until it is left, and then the
 * last save wins.
 */

/**
 * Shows the saved value until the field is edited; from the first keystroke
 * to leaving it, the typed text wins over anything arriving live.
 */
function useDraft(value: string, onCommit: (text: string) => void) {
  const [draft, setDraft] = useState<string | null>(null);
  return {
    value: draft ?? value,
    onChange: (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setDraft(event.target.value),
    onBlur: () => {
      if (draft !== null) onCommit(draft);
      setDraft(null);
    },
  };
}

export function SavedOnBlurInput({
  value,
  onCommit,
  ...props
}: Omit<React.ComponentProps<"input">, "value" | "onChange" | "onBlur"> & {
  value: string;
  onCommit: (text: string) => void;
}) {
  const draft = useDraft(value, onCommit);
  return (
    <Input
      {...props}
      {...draft}
      onKeyDown={(event) => {
        if (event.key === "Enter") event.currentTarget.blur();
      }}
    />
  );
}

export function SavedOnBlurTextarea({
  value,
  onCommit,
  ...props
}: Omit<React.ComponentProps<"textarea">, "value" | "onChange" | "onBlur"> & {
  value: string;
  onCommit: (text: string) => void;
}) {
  const draft = useDraft(value, onCommit);
  return <Textarea {...props} {...draft} className="min-h-28" />;
}

/**
 * Start and end date, saved on each pick: the calendar only produces whole
 * dates, so nothing half-typed reaches the people watching live.
 * Projects require a start; epics and tasks do not.
 */
export function DateFields({
  id,
  start,
  end,
  error,
  startOptional = false,
  onCommit,
}: {
  id: string;
  start: string | null;
  end: string | null;
  error: string | null;
  startOptional?: boolean;
  onCommit: (start: string | null, end: string | null) => void;
}) {
  return (
    <>
      <Field label="Fecha de inicio" htmlFor={`${id}-start`} optional={startOptional} error={error}>
        <DatePicker
          id={`${id}-start`}
          value={start ?? ""}
          clearable={startOptional}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${id}-start-error` : undefined}
          onChange={(next) => onCommit(next || null, end)}
        />
      </Field>
      <Field label="Fecha de fin" htmlFor={`${id}-end`} optional>
        <DatePicker
          id={`${id}-end`}
          value={end ?? ""}
          min={start || undefined}
          clearable
          onChange={(next) => onCommit(start, next || null)}
        />
      </Field>
    </>
  );
}

/** The same check everywhere: an end before the start is the one invalid pair. */
export function dateRangeError(start: string | null, end: string | null): string | null {
  return start && end && end < start ? "La fecha de fin no puede ser anterior a la de inicio." : null;
}
