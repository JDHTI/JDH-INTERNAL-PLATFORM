"use client";

import { Input } from "@/shared/components/ui/input";
import { cn } from "@/shared/lib/utils";

import { parsePercent } from "../lib/format";

/** A percentage typed in points («5», «2,5») with its sign beside it; the parent turns it into a fraction. */
export default function PercentInput({
  id,
  value,
  onChange,
  invalid,
}: {
  id: string;
  value: string;
  onChange: (next: string) => void;
  invalid?: boolean;
}) {
  const wrong = invalid ?? parsePercent(value) === undefined;
  return (
    <div className="relative">
      <Input
        id={id}
        value={value}
        inputMode="decimal"
        onChange={(event) => onChange(event.target.value)}
        aria-invalid={wrong || undefined}
        className={cn("pr-7 tabular-nums", wrong && "border-danger")}
      />
      <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-sm text-text-secondary" aria-hidden="true">
        %
      </span>
    </div>
  );
}
