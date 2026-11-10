"use client";

import { useState } from "react";
import Link from "next/link";
import { Calculator, CheckCircle2, FileX2, Plus, Search } from "lucide-react";

import Pager from "@/shared/components/pager";
import StatePanel from "@/shared/components/state-panel";
import TableSkeleton from "@/shared/components/table-skeleton";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { Dropdown } from "@/shared/components/ui/dropdown";
import { Input } from "@/shared/components/ui/input";
import { useDebouncedValue } from "@/shared/hooks/use-debounced-value";
import { errorMessage } from "@/shared/lib/api-client";
import { cn } from "@/shared/lib/utils";

import { useSession } from "@/features/session/hooks/use-session";

import { useQuotationPermissions, useQuotations } from "../hooks/use-quotations";
import { STATUS_LABELS, formatCount, formatDateTime } from "../lib/format";
import type { QuotationStatus, QuotationSummary } from "../types/quotations.types";
import { QuotationStatusBadge } from "./quotation-badges";
import NewQuotationDialog from "./new-quotation-dialog";
import { QuotationLoadError } from "./quotations-gate";
import { ToggleChip } from "./toggle-chip";

const PAGE_SIZE = 20;

const STATUS_FILTERS: { value: QuotationStatus | ""; label: string }[] = [
  { value: "", label: "Todos los estados" },
  ...(Object.entries(STATUS_LABELS) as [QuotationStatus, string][]).map(([value, label]) => ({ value, label })),
];

/**
 * Saved quotations, newest first. The API lists only the ones each person
 * created, except for whoever validates (BI, admins) and moderators: they see
 * everyone's and choose between theirs and all.
 */
export default function QuotationsBrowser({ basePath }: { basePath: string }) {
  // The gate around this screen has already loaded the permissions.
  const permissions = useQuotationPermissions().data;
  const { data: user } = useSession();
  const canManage = permissions?.can_manage === true;
  const canValidate = permissions?.can_validate === true;
  const seesAll = canValidate || user?.role === "moderator";
  const [mine, setMine] = useState(!seesAll);
  // Everyone opens on every status, Comercial and BI alike (decided 2026-11-09); the pending ones are one pick away.
  const [status, setStatus] = useState<QuotationStatus | "">("");
  const [text, setText] = useState("");
  const [page, setPage] = useState(1);
  const [creating, setCreating] = useState(false);
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

  return (
    <div className="space-y-4">
      <NewQuotationDialog basePath={basePath} open={creating} onOpenChange={setCreating} />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:flex-wrap sm:items-center">
          {canManage && seesAll && (
            <div role="group" aria-label="De quién" className="flex gap-2">
              <ToggleChip active={mine} onClick={() => reset(() => setMine(true))}>
                Mis cotizaciones
              </ToggleChip>
              <ToggleChip active={!mine} onClick={() => reset(() => setMine(false))}>
                Todas
              </ToggleChip>
            </div>
          )}
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
            className="w-full sm:w-56"
          />
        </div>
        {canManage && (
          <Button onClick={() => setCreating(true)} className="w-full sm:w-auto max-md:h-11">
            <Plus aria-hidden="true" /> Nueva cotización
          </Button>
        )}
      </div>

      {quotations.isPending ? (
        <TableSkeleton rows={6} label="Cargando cotizaciones" />
      ) : quotations.isError && !result ? (
        <QuotationLoadError error={quotations.error} onRetry={() => void quotations.refetch()} subject="las cotizaciones" />
      ) : items.length === 0 ? (
        canValidate && !mine && status === "pendiente_validacion" && q === "" ? (
          <StatePanel
            icon={CheckCircle2}
            title="No hay cotizaciones por validar"
            action={<Button variant="outline" onClick={clearFilters}>Ver todas las cotizaciones</Button>}
          >
            Cuando un asesor confirme una lista de precios, aparecerá aquí para que la valides o la devuelvas.
          </StatePanel>
        ) : filtered ? (
          <StatePanel
            icon={FileX2}
            title="Ninguna cotización coincide con la búsqueda"
            action={<Button variant="outline" onClick={clearFilters}>Limpiar filtros</Button>}
          >
            Prueba con el NIT completo o quita el filtro de estado.
          </StatePanel>
        ) : !canManage ? (
          <StatePanel icon={Calculator} title="Aún no hay cotizaciones">
            Las arma el área Comercial; las que confirmen aparecerán aquí para validarlas.
          </StatePanel>
        ) : (
          <StatePanel
            icon={Calculator}
            title={mine ? "Aún no tienes cotizaciones" : "Aún no hay cotizaciones"}
            action={
              <Button variant="outline" onClick={() => setCreating(true)} className="max-md:h-11">
                <Plus aria-hidden="true" /> Cotizar un cliente
              </Button>
            }
          >
            Elige un cliente y una ventana de 6 o 12 meses: la cotización parte del último precio que pagó cada
            referencia y lo cruza con el costo, el margen objetivo y los apoyos vigentes.
          </StatePanel>
        )
      ) : (
        <div className={cn("space-y-3", quotations.isPlaceholderData && "opacity-60")}>
          <QuotationCards items={items} basePath={basePath} showAuthor={!mine} />
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
            <th scope="col" className="px-3 py-2 text-right" title="Referencias cuyo último precio deja el margen bajo el objetivo, contando el apoyo">
              Bajo objetivo
            </th>
            {showAuthor && <th scope="col" className="px-3 py-2">Creada por</th>}
            <th scope="col" className="px-3 py-2">Actualizada</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {items.map((item) => (
            // The customer's link stretches over the whole row (`after:inset-0`): a click anywhere
            // opens the quotation, and keyboard and screen readers still meet one link per row.
            <tr key={item.id} className="relative h-10 cursor-pointer hover:bg-primary-subtle">
              <td className="max-w-80 px-3 py-2">
                <Link
                  href={`${basePath}/${item.id}`}
                  aria-label={`Abrir la cotización de ${item.customer_name}`}
                  className={cn(
                    "block truncate font-medium outline-none",
                    "after:absolute after:inset-0 after:content-['']",
                    "focus-visible:after:outline-2 focus-visible:after:-outline-offset-2 focus-visible:after:outline-ring"
                  )}
                >
                  {item.customer_name}
                </Link>
                <CustomerSubline item={item} />
              </td>
              <td className="hidden px-3 py-2 xl:table-cell">{item.channel ?? "—"}</td>
              <td className="px-3 py-2">
                <ListTarget item={item} />
              </td>
              <td className="hidden px-3 py-2 text-right tabular-nums xl:table-cell">{item.window_months} meses</td>
              <td className="px-3 py-2"><QuotationStatusBadge status={item.status} label={item.status_label} /></td>
              <td className="px-3 py-2 text-right tabular-nums">{formatCount(item.line_count)}</td>
              <td className="px-3 py-2 text-right tabular-nums">{formatCount(item.changed_count)}</td>
              <td className={cn("px-3 py-2 text-right tabular-nums", item.below_rule_count > 0 && "font-semibold text-danger")}>
                {formatCount(item.below_rule_count)}
              </td>
              <td className="px-3 py-2 text-right tabular-nums">{formatCount(item.below_target_count)}</td>
              {showAuthor && <td className="px-3 py-2">{item.created_by}</td>}
              <td className="whitespace-nowrap px-3 py-2 tabular-nums">{formatDateTime(item.updated_at)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Under the customer's name: its NIT, or that it is a temporary customer not yet in SIESA. */
function CustomerSubline({ item }: { item: QuotationSummary }) {
  if (item.is_temporary_customer) {
    return (
      <span className="flex items-center gap-1.5 text-[13px] text-text-secondary">
        <Badge tone="warning" className="px-1.5 py-0 text-xs">Temporal</Badge>
        {item.customer_nit ? <span className="font-mono">NIT {item.customer_nit}</span> : "Sin NIT"}
      </span>
    );
  }
  return <span className="block font-mono text-[13px] text-text-secondary">NIT {item.customer_nit}</span>;
}

/**
 * The customer's list, and once confirmed what happens to it: written over
 * (update) or a new list created with its own code.
 */
function ListTarget({ item }: { item: QuotationSummary }) {
  const creates = item.list_action === "creacion" && item.export_price_list_id && item.export_price_list_id !== item.price_list_id;
  return (
    <>
      <span className="block font-mono text-[13px]">
        {item.price_list_id ?? "—"}
        {creates && (
          <>
            <span aria-hidden="true" className="font-sans text-text-secondary"> → </span>
            <span className="sr-only">, lista nueva </span>
          </>
        )}
        {creates && item.export_price_list_id}
      </span>
      {item.status !== "borrador" && item.list_action_label && (
        <span className="block text-xs text-text-secondary">{item.list_action_label}</span>
      )}
    </>
  );
}

/** Phones: customer, status and the one number that needs action (DESIGN.md §10). */
function QuotationCards({ items, basePath, showAuthor }: { items: QuotationSummary[]; basePath: string; showAuthor: boolean }) {
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
              <CustomerSubline item={item} />
              {showAuthor && <span className="block truncate text-xs text-text-secondary">Creada por {item.created_by}</span>}
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
