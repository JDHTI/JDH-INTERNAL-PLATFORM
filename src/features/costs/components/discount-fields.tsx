"use client";

import { useId } from "react";

import { Input } from "@/shared/components/ui/input";
import { cn } from "@/shared/lib/utils";

import { parsePercent } from "../lib/format";
import { REGIONALS, type Regional } from "../types/increase-requests.types";

/** Discounts as typed, in points: «5» is 5 %. */
export interface DiscountDraft {
  regular: string;
  regionals: Record<Regional, string>;
}

export const emptyDiscounts = (): DiscountDraft => ({
  regular: "",
  regionals: Object.fromEntries(REGIONALS.map((regional) => [regional, ""])) as Record<Regional, string>,
});

/** The draft as the API takes it: fractions, and only the regionals that were filled. */
export function discountsPayload(draft: DiscountDraft): {
  regular_discount_pct: string | null;
  regional_discounts: Partial<Record<Regional, string>>;
} | null {
  const regular = parsePercent(draft.regular);
  if (regular === undefined) return null;
  const regional_discounts: Partial<Record<Regional, string>> = {};
  for (const regional of REGIONALS) {
    const value = parsePercent(draft.regionals[regional]);
    if (value === undefined) return null;
    if (value !== null) regional_discounts[regional] = value;
  }
  return { regular_discount_pct: regular, regional_discounts };
}

export const regionalLabel = (regional: Regional) => (regional === "BOGOTA" ? "Bogotá" : regional.charAt(0) + regional.slice(1).toLowerCase());

/**
 * The regular discount and one per regional, in points. An empty regional takes
 * the regular one, so a reference is never repeated per regional.
 */
export default function DiscountFields({
  value,
  onChange,
  compact = false,
}: {
  value: DiscountDraft;
  onChange: (next: DiscountDraft) => void;
  compact?: boolean;
}) {
  const id = useId();
  const field = (key: string, label: string, text: string, set: (next: string) => void, placeholder?: string) => {
    const invalid = parsePercent(text) === undefined;
    return (
      <div key={key} className="min-w-0 space-y-1">
        <label htmlFor={`${id}-${key}`} className="block text-[13px] font-medium">
          {label}
        </label>
        <div className="relative">
          <Input
            id={`${id}-${key}`}
            value={text}
            inputMode="decimal"
            placeholder={placeholder}
            onChange={(event) => set(event.target.value)}
            aria-invalid={invalid || undefined}
            className={cn("pr-7 tabular-nums", invalid && "border-danger")}
          />
          <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-sm text-text-secondary" aria-hidden="true">
            %
          </span>
        </div>
      </div>
    );
  };
  const invalid = discountsPayload(value) === null;
  return (
    <div className="space-y-2">
      <div className={cn("grid gap-2", compact ? "grid-cols-2 sm:grid-cols-4 lg:grid-cols-7" : "grid-cols-2 sm:grid-cols-4")}>
        {field("regular", "Regular", value.regular, (regular) => onChange({ ...value, regular }))}
        {REGIONALS.map((regional) =>
          field(
            regional,
            regionalLabel(regional),
            value.regionals[regional],
            (text) => onChange({ ...value, regionals: { ...value.regionals, [regional]: text } }),
            "Regular"
          )
        )}
      </div>
      <p className={cn("text-xs", invalid ? "text-danger" : "text-text-secondary")} role={invalid ? "alert" : undefined}>
        {invalid
          ? "Cada descuento va de 0 a 100, con coma para los decimales: 2,5."
          : "En porcentaje. Una regional vacía toma el descuento regular."}
      </p>
    </div>
  );
}
