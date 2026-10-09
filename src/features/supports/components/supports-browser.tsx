"use client";

import { useMemo, useState } from "react";
import { ArrowDown, ArrowUp, CloudOff, FileX2, RefreshCw, Search, SlidersHorizontal } from "lucide-react";

import Pager from "@/shared/components/pager";
import StatePanel from "@/shared/components/state-panel";
import { Button } from "@/shared/components/ui/button";
import { Dropdown } from "@/shared/components/ui/dropdown";
import { Input } from "@/shared/components/ui/input";
import { useDebouncedValue } from "@/shared/hooks/use-debounced-value";
import { ApiError, errorMessage } from "@/shared/lib/api-client";
import { cn } from "@/shared/lib/utils";

import { useFilterFields, useSupportCatalogs, useSupportSearch } from "../hooks/use-supports";
import {
  calcMethodLabel,
  formatDay,
  formatSupplierValue,
  humanize,
  STATE_LABELS,
  toOptions,
} from "../lib/format";
import type {
  FilterCondition,
  SupplierSupport,
  SupportSearchBody,
  SupportState,
} from "../types/support.types";
import AdvancedFilters from "./advanced-filters";
import { FlagBadges, StateBadge } from "./support-badges";
import SupportDetail from "./support-detail";

const PAGE_SIZE = 50;
const ALL = "";

const numberFormat = new Intl.NumberFormat("es-CO");

interface SortColumn {
  /** Field name in the API's catalog; the column only sorts if it lists it as sortable. */
  field: string;
  label: string;
}

const COLUMNS: (SortColumn & { className?: string })[] = [
  // SKU is what people search by, so it gets its own column ahead of the rest.
  { field: "product_sku", label: "SKU" },
  { field: "supplier.name", label: "Proveedor" },
  { field: "kind", label: "Tipo" },
  { field: "customer_name", label: "Cliente" },
  { field: "product.description", label: "Producto" },
  { field: "supplier_value", label: "Valor del apoyo", className: "text-right" },
  { field: "valid_from", label: "Estado y vigencia" },
];

/**
 * Read-only master of supplier supports. Filtering, sorting and paging all
 * happen in the API (the table holds tens of thousands of rows); this view
 * only builds the query and shows what comes back.
 */
export default function SupportsBrowser() {
  const fieldsQuery = useFilterFields();
  const catalogsQuery = useSupportCatalogs();
  const fields = useMemo(() => fieldsQuery.data ?? [], [fieldsQuery.data]);
  const catalogs = catalogsQuery.data;

  const [text, setText] = useState("");
  const [state, setState] = useState<string>(ALL);
  const [kind, setKind] = useState<string>(ALL);
  const [needsReview, setNeedsReview] = useState(false);
  const [hasIssues, setHasIssues] = useState(false);
  const [hasConflicts, setHasConflicts] = useState(false);
  const [advanced, setAdvanced] = useState<{ match: "all" | "any"; conditions: FilterCondition[] }>({
    match: "all",
    conditions: [],
  });
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [sort, setSort] = useState<string[]>(["-valid_from"]);
  const [page, setPage] = useState(1);
  const [openId, setOpenId] = useState<string | null>(null);
  const q = useDebouncedValue(text.trim());

  const sortable = new Set(fields.filter((field) => field.sortable).map((field) => field.field));

  const body = useMemo<SupportSearchBody>(() => {
    // The quick dropdowns only filter on fields the catalog really offers.
    const has = (name: string) => fields.some((field) => field.field === name);
    const quick: FilterCondition[] = [];
    if (kind !== ALL && has("kind")) quick.push({ field: "kind", op: "eq", value: kind });
    return {
      match: "all",
      // The builder's own all/any applies inside its group, so a quick filter
      // is never loosened by choosing "alguna condición".
      conditions: [
        ...quick,
        ...(advanced.conditions.length > 0
          ? [{ match: advanced.match, conditions: advanced.conditions }]
          : []),
      ],
      q: q || undefined,
      // No state hides voided supports; "anulado" is the only way to list them.
      state: state === ALL ? undefined : (state as SupportState),
      needs_review: needsReview || undefined,
      has_issues: hasIssues || undefined,
      has_conflicts: hasConflicts || undefined,
      sort,
      page,
      size: PAGE_SIZE,
    };
  }, [q, state, kind, needsReview, hasIssues, hasConflicts, advanced, sort, page, fields]);

  const search = useSupportSearch(body);
  const result = search.data;
  const items = result?.items ?? [];

  const filtered =
    q !== "" ||
    state !== ALL ||
    kind !== ALL ||
    needsReview ||
    hasIssues ||
    hasConflicts ||
    advanced.conditions.length > 0;

  const reset = (apply: () => void) => {
    apply();
    setPage(1);
  };

  const clearFilters = () => {
    setText("");
    setState(ALL);
    setKind(ALL);
    setNeedsReview(false);
    setHasIssues(false);
    setHasConflicts(false);
    setAdvanced({ match: "all", conditions: [] });
    setPage(1);
  };

  const toggleSort = (field: string) => {
    setSort((current) => {
      const [head] = current;
      if (head === field) return [`-${field}`];
      if (head === `-${field}`) return [field];
      return [field];
    });
    setPage(1);
  };

  const sortState = (field: string): "ascending" | "descending" | "none" =>
    sort[0] === field ? "ascending" : sort[0] === `-${field}` ? "descending" : "none";

  const kindOptions = [{ value: ALL, label: "Todos los tipos" }, ...toOptions(catalogs?.kinds)];
  const stateOptions = [
    { value: ALL, label: "Todos los estados" },
    ...Object.entries(STATE_LABELS).map(([value, label]) => ({ value, label })),
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 lg:flex-row">
        <div className="relative flex-1">
          <Search
            className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-text-secondary"
            aria-hidden="true"
          />
          <Input
            type="search"
            value={text}
            onChange={(event) => reset(() => setText(event.target.value))}
            placeholder="Buscar por proveedor, cliente, NIT, SKU o marca"
            aria-label="Buscar apoyos"
            className="pl-9"
          />
        </div>
        <Dropdown
          className="lg:w-48"
          value={state}
          onValueChange={(value) => reset(() => setState(value))}
          options={stateOptions}
          aria-label="Filtrar por estado"
        />
        <Dropdown
          className="lg:w-52"
          value={kind}
          onValueChange={(value) => reset(() => setKind(value))}
          options={kindOptions}
          aria-label="Filtrar por tipo de apoyo"
        />
      </div>

      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
        <Check label="Con novedades" checked={hasIssues} onChange={(value) => reset(() => setHasIssues(value))} />
        <Check label="Con conflictos" checked={hasConflicts} onChange={(value) => reset(() => setHasConflicts(value))} />
        <Check label="Por revisar" checked={needsReview} onChange={(value) => reset(() => setNeedsReview(value))} />
        <Button
          variant="outline"
          size="sm"
          className="ml-auto"
          onClick={() => setShowAdvanced((value) => !value)}
          aria-expanded={showAdvanced}
          aria-controls="supports-advanced"
          disabled={fieldsQuery.isError}
        >
          <SlidersHorizontal aria-hidden="true" />
          Filtros avanzados{advanced.conditions.length > 0 ? ` (${advanced.conditions.length})` : ""}
        </Button>
        {filtered && (
          <Button variant="ghost" size="sm" onClick={clearFilters}>
            Limpiar filtros
          </Button>
        )}
      </div>

      {/* Kept mounted while hidden so a half-built query survives closing the panel. */}
      <div id="supports-advanced" hidden={!showAdvanced}>
        {fieldsQuery.isPending ? (
          <div className="h-24 animate-pulse rounded-lg bg-canvas-subtle" aria-busy="true" aria-label="Cargando campos" />
        ) : (
          <AdvancedFilters
            fields={fields}
            onApply={(match, conditions) => reset(() => setAdvanced({ match, conditions }))}
          />
        )}
      </div>

      {search.isPending ? (
        <div className="h-72 animate-pulse rounded-lg bg-canvas-subtle" aria-busy="true" aria-label="Cargando apoyos" />
      ) : search.isError && !result ? (
        <LoadError error={search.error} onRetry={() => search.refetch()} />
      ) : items.length === 0 ? (
        filtered ? (
          <StatePanel
            icon={FileX2}
            title="Ningún apoyo coincide con los filtros"
            action={<Button variant="outline" onClick={clearFilters}>Limpiar filtros</Button>}
          >
            Prueba con otro texto o quita alguna condición.
          </StatePanel>
        ) : (
          <StatePanel icon={FileX2} title="Aún no hay apoyos registrados">
            Los apoyos aparecen aquí cuando termina la importación del archivo de apoyos de proveedores.
          </StatePanel>
        )
      ) : (
        <div className={cn("space-y-3", search.isPlaceholderData && "opacity-60")}>
          <ul className="divide-y divide-border rounded-lg border border-border bg-surface md:hidden">
            {items.map((support) => (
              <li key={support.id}>
                <button
                  type="button"
                  onClick={() => setOpenId(support.id)}
                  className={cn(
                    "flex min-h-14 w-full flex-col gap-1.5 px-3 py-2.5 text-left",
                    "focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring"
                  )}
                >
                  <span className="flex items-start justify-between gap-3">
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium">{support.supplier_name ?? "Sin proveedor"}</span>
                      {support.product_sku && (
                        <span className="block truncate font-mono text-xs">SKU {support.product_sku}</span>
                      )}
                      <span className="block truncate text-xs text-text-secondary">{subject(support)}</span>
                    </span>
                    <span className="shrink-0 text-sm font-medium tabular-nums">
                      {formatSupplierValue(support.calc_method, support.supplier_value)}
                    </span>
                  </span>
                  <span className="flex flex-wrap gap-1.5">
                    <StateBadge value={support.state} />
                    <FlagBadges support={support} />
                  </span>
                </button>
              </li>
            ))}
          </ul>

          <div className="hidden overflow-x-auto rounded-lg border border-border bg-surface md:block">
            <table className="w-full min-w-[64rem] text-left text-sm">
              <thead className="bg-canvas-subtle text-[11px] font-semibold uppercase tracking-[0.06em] text-text-secondary">
                <tr>
                  {COLUMNS.map((column) => (
                    <th
                      key={column.field}
                      scope="col"
                      aria-sort={sortable.has(column.field) ? sortState(column.field) : undefined}
                      className={cn("px-3 py-2", column.className)}
                    >
                      {sortable.has(column.field) ? (
                        <button
                          type="button"
                          onClick={() => toggleSort(column.field)}
                          className={cn(
                            "inline-flex items-center gap-1 rounded-sm uppercase tracking-[0.06em] hover:text-text-primary",
                            "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                          )}
                        >
                          {column.label}
                          {sortState(column.field) === "ascending" && <ArrowUp className="size-3.5" aria-hidden="true" />}
                          {sortState(column.field) === "descending" && <ArrowDown className="size-3.5" aria-hidden="true" />}
                        </button>
                      ) : (
                        column.label
                      )}
                    </th>
                  ))}
                  <th scope="col" className="px-3 py-2">Marcas</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {items.map((support) => (
                  <tr key={support.id} className="hover:bg-primary-subtle">
                    <td className="whitespace-nowrap px-3 py-2 font-mono text-[13px]">{support.product_sku ?? "—"}</td>
                    <td className="max-w-56 px-3 py-2">
                      <button
                        type="button"
                        onClick={() => setOpenId(support.id)}
                        aria-label={`Ver detalle del apoyo de ${support.supplier_name ?? support.supplier_code ?? "proveedor"}`}
                        className={cn(
                          "block max-w-full truncate rounded-sm text-left font-medium hover:underline",
                          "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                        )}
                      >
                        {support.supplier_name ?? "Sin proveedor"}
                      </button>
                      <span className="block truncate font-mono text-xs text-text-secondary">{support.supplier_code ?? "—"}</span>
                    </td>
                    <td className="px-3 py-2">{humanize(support.kind)}</td>
                    <td className="max-w-48 px-3 py-2">
                      <span className="block truncate">{support.customer_name ?? support.customer_group ?? "Todos"}</span>
                      <span className="block truncate font-mono text-xs text-text-secondary">{support.customer_nit ?? ""}</span>
                    </td>
                    <td className="max-w-56 px-3 py-2">
                      <span className="block truncate">{support.product_description ?? support.product_brand ?? support.brand ?? "Todos"}</span>
                    </td>
                    <td className="px-3 py-2 text-right">
                      <span className="block tabular-nums">{formatSupplierValue(support.calc_method, support.supplier_value)}</span>
                      <span className="block text-xs text-text-secondary">{calcMethodLabel(support.calc_method)}</span>
                    </td>
                    <td className="whitespace-nowrap px-3 py-2">
                      <span className="block">
                        <StateBadge value={support.state} />
                      </span>
                      <span className="mt-0.5 block text-xs tabular-nums text-text-secondary">
                        {formatDay(support.valid_from)} a {support.valid_to ? formatDay(support.valid_to) : "indefinido"}
                      </span>
                    </td>
                    <td className="px-3 py-2">
                      <span className="flex flex-wrap gap-1.5">
                        <FlagBadges support={support} />
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {result && (
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs text-text-secondary tabular-nums">
                {numberFormat.format(result.total)} {result.total === 1 ? "apoyo" : "apoyos"}
              </span>
              <Pager page={result.page} size={result.size} total={result.total} count={items.length} onPageChange={setPage} />
            </div>
          )}
          {search.isError && (
            <p role="alert" className="text-sm text-danger">
              {errorMessage(search.error)}
            </p>
          )}
        </div>
      )}

      <SupportDetail id={openId} onClose={() => setOpenId(null)} />
    </div>
  );
}

/** Customer or product the support applies to, for the compact mobile row. */
function subject(support: SupplierSupport): string {
  const parts = [
    support.customer_name ?? support.customer_group,
    support.product_description ?? support.product_brand ?? support.brand,
  ].filter(Boolean);
  return parts.length > 0 ? parts.join(" · ") : "Aplica a todos los clientes y productos";
}

function Check({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <label className="inline-flex min-h-8 items-center gap-2 max-md:min-h-11">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="size-4 accent-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
      />
      {label}
    </label>
  );
}

function LoadError({ error, onRetry }: { error: Error; onRetry: () => void }) {
  const status = error instanceof ApiError ? error.status : null;
  const title =
    status === 404
      ? "El maestro de apoyos todavía no está disponible"
      : status === 429
        ? "Demasiadas consultas seguidas"
        : "No se pudieron cargar los apoyos";
  const description =
    status === 404
      ? "El API aún no publica este módulo. Cuando se despliegue, los apoyos aparecerán aquí sin cambios en esta pantalla."
      : status === 429
        ? "Espera unos segundos y vuelve a intentarlo."
        : errorMessage(error);
  return (
    <StatePanel
      icon={CloudOff}
      tone="danger"
      title={title}
      action={
        <Button variant="outline" onClick={onRetry}>
          <RefreshCw aria-hidden="true" /> Reintentar
        </Button>
      }
    >
      {description}
    </StatePanel>
  );
}
