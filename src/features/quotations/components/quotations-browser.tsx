"use client";

import { useState } from "react";
import Link from "next/link";
import { Calculator, FileX2, Plus, Search } from "lucide-react";

import Pager from "@/shared/components/pager";
import StatePanel from "@/shared/components/state-panel";
import TableSkeleton from "@/shared/components/table-skeleton";
import { Button, buttonVariants } from "@/shared/components/ui/button";
import { Dropdown } from "@/shared/components/ui/dropdown";
import { Input } from "@/shared/components/ui/input";
import { useDebouncedValue } from "@/shared/hooks/use-debounced-value";
import { errorMessage } from "@/shared/lib/api-client";
import { cn } from "@/shared/lib/utils";

import { useQuotations } from "../hooks/use-quotations";
import { formatCount, formatDateTime } from "../lib/format";
import type { QuotationStatus, QuotationSummary } from "../types/quotations.types";
import { QuotationStatusBadge } from "./quotation-badges";
import { QuotationLoadError } from "./quotations-gate";
import { ToggleChip } from "./toggle-chip";

const PAGE_SIZE = 20;

const STATUS_FILTERS: { value: QuotationStatus | ""; label: string }[] = [
  { value: "", label: "Todos los estados" },
  { value: "borrador", label: "Borrador" },
  { value: "generado", label: "Generado" },
];

/** Saved quotations, newest first: the person's own by default, everyone's on request. */
export default function QuotationsBrowser({ basePath }: { basePath: string }) {
  const [mine, setMine] = useState(true);
  const [status, setStatus] = useState<QuotationStatus | "">("");
  const [text, setText] = useState("");
  const [page, setPage] = useState(1);
  const q = useDebouncedValue(text.trim());

  const quotations = useQuotations({ mine, status, q, page, size: PAGE_SIZE });
  const result = quotations.data;
  const items = result?.items ?? [];
  const filtered = status !== "" || q !== "";

  const reset = (apply: () => void) => {
    apply();
    setPage(1);
  };
  const clearFilters = () => reset(() => {
    setStatus("");
    setText("");
  });

  const newHref = `${basePath}/nueva`;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:flex-wrap sm:items-center">
          <div role="group" aria-label="De quién" className="flex gap-2">
            <ToggleChip active={mine} onClick={() => reset(() => setMine(true))}>
              Mis cotizaciones
            </ToggleChip>
            <ToggleChip active={!mine} onClick={() => reset(() => setMine(false))}>
              Todas
            </ToggleChip>
          </div>
          <div className="relative w-full sm:w-72">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-text-secondary" aria-hidden="true" />
            <Input
              type="search"
              value={text}
              onChange={(event) => reset(() => setText(event.target.value))}
              placeholder="Cliente o NIT"
              aria-label="Buscar cotizaciones por cliente o NIT"
              className="pl-9 max-md:h-11"
            />
          </div>
          <Dropdown
            aria-label="Filtrar por estado"
            options={STATUS_FILTERS}
            value={status}
            onValueChange={(next) => reset(() => setStatus(next as QuotationStatus | ""))}
            className="w-full sm:w-48"
          />
        </div>
        <Link href={newHref} className={cn(buttonVariants(), "w-full sm:w-auto max-md:h-11")}>
          <Plus aria-hidden="true" /> Nueva cotización
        </Link>
      </div>

      {quotations.isPending ? (
        <TableSkeleton rows={6} label="Cargando cotizaciones" />
      ) : quotations.isError && !result ? (
        <QuotationLoadError error={quotations.error} onRetry={() => void quotations.refetch()} subject="las cotizaciones" />
      ) : items.length === 0 ? (
        filtered ? (
          <StatePanel
            icon={FileX2}
            title="Ninguna cotización coincide con la búsqueda"
            action={<Button variant="outline" onClick={clearFilters}>Limpiar filtros</Button>}
          >
            Prueba con el NIT completo o quita el filtro de estado.
          </StatePanel>
        ) : (
          <StatePanel
            icon={Calculator}
            title={mine ? "Aún no tienes cotizaciones" : "Aún no hay cotizaciones"}
            action={
              <Link href={newHref} className={cn(buttonVariants({ variant: "outline" }), "max-md:h-11")}>
                <Plus aria-hidden="true" /> Cotizar un cliente
              </Link>
            }
          >
            Elige un cliente y una ventana de 6 o 12 meses: la cotización parte del último precio que pagó cada
            referencia y lo cruza con el costo, el margen objetivo y los apoyos vigentes.
          </StatePanel>
        )
      ) : (
        <div className={cn("space-y-3", quotations.isPlaceholderData && "opacity-60")}>
          <QuotationCards items={items} basePath={basePath} />
          <QuotationTable items={items} basePath={basePath} showAuthor={!mine} />
          {result && (
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs tabular-nums text-text-secondary">
                {formatCount(result.total)} {result.total === 1 ? "cotización" : "cotizaciones"}
              </span>
              <Pager page={result.page} size={result.size} total={result.total} count={items.length} onPageChange={setPage} />
            </div>
          )}
          {quotations.isError && (
            <p role="alert" className="text-sm text-danger">{errorMessage(quotations.error)}</p>
          )}
        </div>
      )}
    </div>
  );
}

const linkClass =
  "rounded-sm font-medium hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring";

function QuotationTable({ items, basePath, showAuthor }: { items: QuotationSummary[]; basePath: string; showAuthor: boolean }) {
  return (
    <div className="hidden overflow-x-auto rounded-lg border border-border bg-surface md:block">
      <table className="w-full min-w-max text-left text-sm">
        <caption className="sr-only">Cotizaciones</caption>
        <thead className="bg-canvas-subtle text-[11px] font-semibold uppercase tracking-[0.06em] text-text-secondary">
          <tr>
            <th scope="col" className="px-3 py-2">Cliente</th>
            <th scope="col" className="hidden px-3 py-2 xl:table-cell">Canal</th>
            <th scope="col" className="px-3 py-2">Lista</th>
            <th scope="col" className="hidden px-3 py-2 text-right xl:table-cell">Ventana</th>
            <th scope="col" className="px-3 py-2">Estado</th>
            <th scope="col" className="px-3 py-2 text-right">Referencias</th>
            <th scope="col" className="px-3 py-2 text-right">Cambiadas</th>
            <th scope="col" className="px-3 py-2 text-right">No cumplen</th>
            <th scope="col" className="px-3 py-2">Actualizada</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {items.map((item) => (
            <tr key={item.id} className="h-10 hover:bg-primary-subtle">
              <td className="max-w-80 px-3 py-2">
                <Link href={`${basePath}/${item.id}`} className={cn("block truncate", linkClass)}>
                  {item.customer_name}
                </Link>
                <span className="block font-mono text-[13px] text-text-secondary">NIT {item.customer_nit}</span>
              </td>
              <td className="hidden px-3 py-2 xl:table-cell">{item.channel ?? "—"}</td>
              <td className="px-3 py-2 font-mono text-[13px]">{item.price_list_id ?? "—"}</td>
              <td className="hidden px-3 py-2 text-right tabular-nums xl:table-cell">{item.window_months} meses</td>
              <td className="px-3 py-2"><QuotationStatusBadge status={item.status} label={item.status_label} /></td>
              <td className="px-3 py-2 text-right tabular-nums">{formatCount(item.line_count)}</td>
              <td className="px-3 py-2 text-right tabular-nums">{formatCount(item.changed_count)}</td>
              <td className={cn("px-3 py-2 text-right tabular-nums", item.below_rule_count > 0 && "font-semibold text-danger")}>
                {formatCount(item.below_rule_count)}
              </td>
              <td className="px-3 py-2">
                <span className="block whitespace-nowrap tabular-nums">{formatDateTime(item.updated_at)}</span>
                {showAuthor && <span className="block text-xs text-text-secondary">{item.created_by}</span>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Phones: customer, status and the one number that needs action (DESIGN.md §10). */
function QuotationCards({ items, basePath }: { items: QuotationSummary[]; basePath: string }) {
  return (
    <ul className="space-y-2 md:hidden">
      {items.map((item) => (
        <li key={item.id}>
          <Link
            href={`${basePath}/${item.id}`}
            className="block space-y-2 rounded-lg border border-border bg-surface p-3 hover:bg-primary-subtle focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            <span className="block min-w-0">
              <span className="block truncate font-medium">{item.customer_name}</span>
              <span className="block font-mono text-[13px] text-text-secondary">NIT {item.customer_nit}</span>
            </span>
            <span className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
              <QuotationStatusBadge status={item.status} label={item.status_label} />
              <span className="tabular-nums">
                {formatCount(item.changed_count)} de {formatCount(item.line_count)} cambiadas
              </span>
              {item.below_rule_count > 0 && (
                <span className="font-semibold tabular-nums text-danger">{formatCount(item.below_rule_count)} no cumplen la regla</span>
              )}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
