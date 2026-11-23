import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";

import { cn } from "@/shared/lib/utils";

import type { SortOrder } from "../types/costs.types";

/** A column the API sorts by; one at a time, clicking again flips the order. */
export default function SortHeader<T extends string>({
  label,
  column,
  sort,
  order,
  onSort,
  numeric = false,
  className,
}: {
  label: string;
  column: T;
  sort: T;
  order: SortOrder;
  onSort: (column: T) => void;
  numeric?: boolean;
  className?: string;
}) {
  const active = sort === column;
  const Icon = !active ? ArrowUpDown : order === "desc" ? ArrowDown : ArrowUp;
  return (
    <th
      scope="col"
      aria-sort={active ? (order === "asc" ? "ascending" : "descending") : undefined}
      className={cn("px-3 py-2", numeric && "text-right", className)}
    >
      <button
        type="button"
        onClick={() => onSort(column)}
        className={cn(
          "inline-flex min-h-8 items-center gap-1 rounded-sm font-semibold uppercase tracking-[0.06em] hover:text-text-primary max-md:min-h-11",
          "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
          active && "text-text-primary"
        )}
      >
        {label}
        <Icon className="size-3 shrink-0" aria-hidden="true" />
      </button>
    </th>
  );
}
