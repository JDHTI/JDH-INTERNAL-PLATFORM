"use client";

import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";

import { Menu, MenuItem, MenuLabel, MenuRadioGroup, MenuRadioItem, MenuSeparator } from "@/shared/components/ui/menu";
import { cn } from "@/shared/lib/utils";

import type { SortOrder } from "../types/costs.types";

/** The quoter's table grammar: tight header, cells aligned to the top. */
export const th = "h-11 px-2.5 py-1.5 align-middle leading-tight";
export const td = "px-2.5 py-2 align-top";

const TEXT_SORTS = ["sku", "supplier"];

/** How each direction reads: text alphabetically, dates by age, figures by size. */
function orderWords(field: string): Record<SortOrder, string> {
  if (TEXT_SORTS.includes(field)) return { asc: "De la A a la Z", desc: "De la Z a la A" };
  if (field === "date") return { asc: "Más antigua primero", desc: "Más reciente primero" };
  return { asc: "Menor a mayor", desc: "Mayor a menor" };
}

/**
 * A grouped column's header, sorting by any of its fields from a menu like the
 * quoter's; one field at a time. A column without fields is plain text.
 */
export default function SortHeader<T extends string>({
  label,
  fields = [],
  sort,
  order,
  onSort,
  onReset,
  className,
}: {
  label: string;
  /** The API's sort fields this column holds, with their names in the menu. */
  fields?: [field: T, name: string][];
  sort: T;
  order: SortOrder;
  onSort: (field: T, order: SortOrder) => void;
  /** Back to the list's default order. */
  onReset: () => void;
  className?: string;
}) {
  if (fields.length === 0) {
    return (
      <th scope="col" className={cn(th, className)}>
        {label}
      </th>
    );
  }
  const active = fields.find(([field]) => field === sort) ?? null;
  const Icon = !active ? ArrowUpDown : order === "desc" ? ArrowDown : ArrowUp;
  const words = active ? `${fields.length > 1 ? `${active[1]}: ` : ""}${orderWords(active[0])[order]}` : null;
  return (
    <th scope="col" aria-sort={active ? (order === "asc" ? "ascending" : "descending") : undefined} className={cn(th, className)}>
      <Menu
        trigger={
          <>
            <span>{label}</span>
            <Icon className={cn("size-3 shrink-0", active ? "text-text-primary" : "text-text-secondary")} aria-hidden="true" />
          </>
        }
        triggerLabel={`Ordenar por ${label}${words ? `. Ahora: ${words}` : ""}`}
        triggerTitle={words ? `${label}, ordenado: ${words}` : `Ordenar por ${label}`}
        triggerClassName={cn(
          "inline-flex min-h-8 max-w-full items-center gap-1 rounded-sm font-semibold uppercase tracking-[0.06em] hover:text-text-primary",
          "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
          active && "text-text-primary"
        )}
      >
        <MenuRadioGroup
          value={active ? `${active[0]}:${order}` : ""}
          label={`Orden por ${label}`}
          onValueChange={(next) => {
            const separator = next.lastIndexOf(":");
            onSort(next.slice(0, separator) as T, next.slice(separator + 1) as SortOrder);
          }}
        >
          {fields.map(([field, name], index) => (
            <div key={field}>
              {fields.length > 1 && (
                <>
                  {index > 0 && <MenuSeparator />}
                  <MenuLabel>{name}</MenuLabel>
                </>
              )}
              <MenuRadioItem value={`${field}:asc`}>{orderWords(field).asc}</MenuRadioItem>
              <MenuRadioItem value={`${field}:desc`}>{orderWords(field).desc}</MenuRadioItem>
            </div>
          ))}
        </MenuRadioGroup>
        {active && (
          <>
            <MenuSeparator />
            <MenuItem onClick={onReset}>Quitar el orden</MenuItem>
          </>
        )}
      </Menu>
    </th>
  );
}
