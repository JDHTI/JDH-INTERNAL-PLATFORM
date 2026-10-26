"use client";

import { cn } from "@/shared/lib/utils";

import { describedBy } from "./form-field";

export interface Choice {
  id: string;
  name: string;
  description?: string | null;
}

/**
 * A single choice where each option carries its short description underneath,
 * always visible. It replaces a dropdown on purpose: the descriptions are what
 * tell a queja from a reclamo, and a closed list or a tooltip hides them, worst
 * of all on a phone, where most people file from the delivery.
 */
export default function ChoiceList({
  id,
  name,
  legend,
  hint,
  options,
  value,
  error,
  columns = 1,
  onChange,
}: {
  /** Given to the first option, so the error summary can link to it. */
  id: string;
  name: string;
  legend: string;
  hint?: string;
  options: Choice[];
  value: string;
  error?: string;
  columns?: 1 | 2;
  onChange: (id: string) => void;
}) {
  return (
    <fieldset
      role="radiogroup"
      aria-labelledby={`${id}-legend`}
      aria-describedby={describedBy(id, Boolean(hint), Boolean(error))}
      aria-required="true"
      aria-invalid={Boolean(error) || undefined}
      className="flex min-w-0 flex-col gap-1.5 sm:col-span-2"
    >
      <legend id={`${id}-legend`} className="mb-1.5 text-[13px] font-medium leading-[1.4]">
        {legend}
        <span className="ml-0.5 text-danger" aria-hidden="true">*</span>
      </legend>
      {hint && (
        <p id={`${id}-hint`} className="-mt-1 text-[13px] text-text-secondary">
          {hint}
        </p>
      )}
      <div
        className={cn(
          "grid gap-1.5",
          columns === 2 && "sm:grid-cols-2"
        )}
      >
        {options.map((option, index) => {
          const checked = option.id === value;
          const optionId = `${id}-option-${index}`;
          return (
            <label
              key={option.id}
              className={cn(
                "flex min-h-11 cursor-pointer items-start gap-2.5 rounded-md border px-3 py-2.5 text-sm",
                "has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-ring-control",
                checked ? "border-primary bg-primary-subtle" : "border-border-control hover:bg-canvas-subtle",
                error && !checked && "border-danger"
              )}
            >
              <input
                id={index === 0 ? id : undefined}
                type="radio"
                name={name}
                value={option.id}
                checked={checked}
                onChange={() => onChange(option.id)}
                // The name names the option; the description is read after it.
                aria-labelledby={`${optionId}-name`}
                aria-describedby={option.description ? `${optionId}-description` : undefined}
                className="mt-0.5 size-4 shrink-0 accent-[var(--primary)] focus-visible:outline-none"
              />
              <span className="min-w-0">
                <span id={`${optionId}-name`} className={cn("block break-words", checked && "font-medium")}>
                  {option.name}
                </span>
                {option.description && (
                  <span
                    id={`${optionId}-description`}
                    className="mt-0.5 block break-words text-[13px] text-text-secondary"
                  >
                    {option.description}
                  </span>
                )}
              </span>
            </label>
          );
        })}
      </div>
      {error && (
        <p id={`${id}-error`} className="text-[13px] text-danger">
          {error}
        </p>
      )}
    </fieldset>
  );
}
