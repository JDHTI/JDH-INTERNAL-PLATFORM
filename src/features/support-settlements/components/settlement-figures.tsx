import { ArrowRight } from "lucide-react";

import type { Decimal } from "@/shared/lib/format";

import { formatPercent } from "../lib/format";

/** The margin of the sale and, after the arrow, the margin with the supplier's money back. */
export function MarginShift({ margin, recomposed }: { margin: Decimal | null; recomposed: Decimal | null }) {
  return (
    <span className="inline-flex items-center gap-1 tabular-nums">
      <span className="text-text-secondary">{formatPercent(margin)}</span>
      <ArrowRight className="size-3 shrink-0 text-text-secondary" aria-hidden="true" />
      <span className="sr-only">recompuesto</span>
      <span className="font-semibold">{formatPercent(recomposed)}</span>
    </span>
  );
}
