"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";

import { cn } from "@/shared/lib/utils";

import { formatDate, legacyAssignee, originLabel, personName } from "../lib/format";
import type { CaseSort, PqrsfCase } from "../types/pqrsf.types";
import { DueLabel, StatusBadge } from "./case-badges";

export const OPTIONAL_COLUMNS = [
  { id: "supplier", label: "Proveedor" },
  { id: "dependency", label: "Dependencia" },
  { id: "requester", label: "Usuario" },
  { id: "type", label: "Tipo" },
  { id: "origin", label: "Origen" },
] as const;

export type OptionalColumn = (typeof OPTIONAL_COLUMNS)[number]["id"];

type SortField = "code" | "received_on" | "due_on";

/**
 * Desktop: the P.13.F.01 columns in the spreadsheet's order, so the move from
 * Excel keeps the eye where it was. Phone: one card per case with the four
 * fields that decide the next move (DESIGN.md §10).
 */
export default function CasesTable({
  area,
  cases,
  sort,
  onSortChange,
  columns,
  isStale,
}: {
  area: string;
  cases: PqrsfCase[];
  sort: CaseSort;
  onSortChange: (sort: CaseSort) => void;
  columns: OptionalColumn[];
  isStale: boolean;
}) {
  const router = useRouter();
  const href = (item: PqrsfCase) => `/${area}/pqrsf/${item.id}`;
  const show = (column: OptionalColumn) => columns.includes(column);

  const header = (field: SortField, label: string, align: "left" | "right" = "left") => {
    const direction = sort === field ? "ascending" : sort === `-${field}` ? "descending" : "none";
    const Icon = direction === "ascending" ? ArrowUp : direction === "descending" ? ArrowDown : ArrowUpDown;
    return (
      <th
        scope="col"
        aria-sort={direction}
        className={cn("px-3 py-2 whitespace-nowrap", align === "right" && "text-right")}
      >
        <button
          type="button"
          onClick={() => {
            // Due dates read soonest first; codes and receptions, newest first.
            const first = field === "due_on" ? "ascending" : "descending";
            const next = direction === "none" ? first : direction === "ascending" ? "descending" : "ascending";
            onSortChange((next === "ascending" ? field : `-${field}`) as CaseSort);
          }}
          className={cn(
            "inline-flex items-center gap-1 rounded-sm uppercase hover:text-text-primary",
            direction !== "none" && "text-text-primary"
          )}
        >
          {label}
          <Icon className="size-3" aria-hidden="true" />
        </button>
      </th>
    );
  };

  return (
    <div className={cn("transition-opacity", isStale && "opacity-60")} aria-busy={isStale}>
      {/* The container scrolls sideways when every optional column is on at a
          narrow desktop width; the page itself never does. */}
      <div className="hidden overflow-x-auto rounded-lg border border-border md:block">
        <table className="w-full min-w-[60rem] text-sm">
          <thead className="bg-canvas-subtle text-left text-[11px] font-semibold tracking-[0.06em] text-text-secondary uppercase">
            <tr>
              {header("code", "Consecutivo")}
              {header("received_on", "Recepción", "right")}
              <th scope="col" className="px-3 py-2">Cliente</th>
              {show("supplier") && <th scope="col" className="px-3 py-2">Proveedor</th>}
              {show("dependency") && <th scope="col" className="px-3 py-2">Dependencia</th>}
              {show("requester") && <th scope="col" className="px-3 py-2">Usuario</th>}
              <th scope="col" className="px-3 py-2 text-right whitespace-nowrap">Documentos</th>
              <th scope="col" className="px-3 py-2">Ejecutivo comercial</th>
              <th scope="col" className="px-3 py-2">Responsable</th>
              <th scope="col" className="px-3 py-2">Sucursal</th>
              {show("type") && <th scope="col" className="px-3 py-2">Tipo</th>}
              {show("origin") && <th scope="col" className="px-3 py-2">Origen</th>}
              {header("due_on", "Vence", "right")}
              <th scope="col" className="px-3 py-2">Estado</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {cases.map((item) => (
              <tr
                key={item.id}
                // The code cell holds the real link for keyboard and screen
                // readers; the row click is a mouse shortcut on top of it.
                onClick={(event) => {
                  if ((event.target as HTMLElement).closest("a, button")) return;
                  if (window.getSelection()?.toString()) return;
                  router.push(href(item));
                }}
                className="h-10 cursor-pointer align-top hover:bg-primary-subtle"
              >
                <td className="px-3 py-2 whitespace-nowrap">
                  <Link
                    href={href(item)}
                    className="rounded-sm font-mono text-[13px] font-medium underline-offset-2 hover:underline"
                  >
                    {item.code}
                  </Link>
                </td>
                <td className="tabular px-3 py-2 text-right whitespace-nowrap">
                  {formatDate(item.received_on)}
                </td>
                <td className="max-w-56 px-3 py-2">
                  <Clipped text={item.customer_name} />
                  {item.customer_nit && (
                    <span className="tabular block truncate text-[13px] whitespace-nowrap text-text-secondary">
                      NIT {item.customer_nit}
                    </span>
                  )}
                </td>
                {show("supplier") && (
                  <td className="max-w-48 px-3 py-2">
                    <Clipped text={item.supplier_name} />
                  </td>
                )}
                {show("dependency") && (
                  <td className="max-w-40 px-3 py-2">
                    <Clipped text={item.dependency?.name} />
                  </td>
                )}
                {show("requester") && (
                  <td className="max-w-44 px-3 py-2">
                    <Clipped text={item.requester_name} />
                  </td>
                )}
                <td className="px-3 py-2 text-right whitespace-nowrap">
                  <Documents item={item} />
                </td>
                <td className="max-w-44 px-3 py-2">
                  <Clipped text={item.sales_executive_name} />
                </td>
                <td className="max-w-44 px-3 py-2">
                  <Assignee item={item} />
                </td>
                <td className="px-3 py-2 whitespace-nowrap">
                  {item.site?.name ?? <Empty />}
                </td>
                {show("type") && (
                  <td className="px-3 py-2 whitespace-nowrap">{item.request_type.name}</td>
                )}
                {show("origin") && (
                  <td className="px-3 py-2 whitespace-nowrap">{originLabel(item.origin)}</td>
                )}
                <td className="px-3 py-2 text-right">
                  <DueLabel item={item} />
                </td>
                <td className="px-3 py-2">
                  <StatusBadge status={item.status} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ul className="divide-y divide-border overflow-hidden rounded-lg border border-border md:hidden">
        {cases.map((item) => (
          <li key={item.id}>
            <Link
              href={href(item)}
              className="block space-y-1.5 p-3 hover:bg-primary-subtle focus-visible:outline-offset-[-2px]"
            >
              <span className="flex items-start justify-between gap-3">
                <span className="font-mono text-[13px] font-medium">{item.code}</span>
                <StatusBadge status={item.status} />
              </span>
              <span className="block truncate font-medium">
                {item.customer_name ?? "Sin cliente"}
              </span>
              <span className="block text-[13px]">
                <DueLabel item={item} layout="inline" />
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Empty() {
  return <span className="text-text-secondary">Sin dato</span>;
}

function Clipped({ text }: { text: string | null | undefined }) {
  if (!text) return <Empty />;
  return (
    <span className="block truncate" title={text}>
      {text}
    </span>
  );
}

/** "2 de 3 respondidos": the spreadsheet's extra rows, folded into one cell. */
function Documents({ item }: { item: PqrsfCase }) {
  if (item.item_count === 0) return <Empty />;
  const done = item.responded_count === item.item_count;
  return (
    <span className="tabular">
      {item.responded_count} de {item.item_count}
      <span className="block text-[13px] text-text-secondary">
        {done ? "respondidos" : "por responder"}
      </span>
    </span>
  );
}

function Assignee({ item }: { item: PqrsfCase }) {
  if (item.assignee) return <Clipped text={personName(item.assignee)} />;
  const legacy = legacyAssignee(item);
  if (legacy) {
    return (
      <span className="block truncate text-text-secondary" title={`Responsable (histórico): ${legacy}`}>
        {legacy} <span className="text-[13px]">(histórico)</span>
      </span>
    );
  }
  return <span className="text-text-secondary">Sin asignar</span>;
}
