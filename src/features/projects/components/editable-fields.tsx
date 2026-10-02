"use client";

import { useState } from "react";

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
 * Start and end date, committed when a field loses focus rather than on
 * change: typing a year in a date input passes through dates nobody meant
 * (0002-…), and saving each one would publish it to everyone watching.
 * Projects require a start; blocks and tasks do not.
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
  const [draft, setDraft] = useState<{ start: string; end: string } | null>(null);
  const shown = draft ?? { start: start ?? "", end: end ?? "" };

  const commit = () => {
    if (!draft) return;
    onCommit(draft.start || null, draft.end || null);
    setDraft(null);
  };

  return (
    <>
      <Field label="Fecha de inicio" htmlFor={`${id}-start`} optional={startOptional} error={error}>
        <Input
          id={`${id}-start`}
          type="date"
          value={shown.start}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${id}-start-error` : undefined}
          onChange={(event) => setDraft({ ...shown, start: event.target.value })}
          onBlur={commit}
        />
      </Field>
      <Field label="Fecha de fin" htmlFor={`${id}-end`} optional>
        <Input
          id={`${id}-end`}
          type="date"
          value={shown.end}
          min={shown.start || undefined}
          onChange={(event) => setDraft({ ...shown, end: event.target.value })}
          onBlur={commit}
        />
      </Field>
    </>
  );
}

/** The same check everywhere: an end before the start is the one invalid pair. */
export function dateRangeError(start: string | null, end: string | null): string | null {
  return start && end && end < start ? "La fecha de fin no puede ser anterior a la de inicio." : null;
}
