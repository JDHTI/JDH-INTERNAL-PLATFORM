"use client";

import { useMemo, useState } from "react";
import { ArrowDown, ArrowUp, CloudOff, FileX2, Paperclip, RefreshCw, Search, SlidersHorizontal, X } from "lucide-react";

import Pager from "@/shared/components/pager";
import StatePanel from "@/shared/components/state-panel";
import { Button } from "@/shared/components/ui/button";
import type { AutocompleteOption } from "@/shared/components/ui/autocomplete";
import { Dropdown } from "@/shared/components/ui/dropdown";
import { Input } from "@/shared/components/ui/input";
import { useDebouncedValue } from "@/shared/hooks/use-debounced-value";
import { ApiError, errorMessage } from "@/shared/lib/api-client";
import { toNumber } from "@/shared/lib/format";
import { cn } from "@/shared/lib/utils";

import { useCanManage, useFilterFields, useSupportCatalogs, useSupportPermissions, useSupportSearch } from "../hooks/use-supports";
import { requestEligible, requestSelectionError, sameRequestScope } from "../lib/request-selection";
import BatchRequestDialog from "./batch-request-dialog";
import {
  calcMethodLabel,
  choiceLabel,
  formatCop,
  formatDay,
  formatPct,
  formatSupplierValue,
  STATE_LABELS,
  toOptions,
} from "../lib/format";
import type {
  FilterCondition,
  PerUnit,
  SupplierSupport,
  SupportSearchBody,
  SupportSearchFilters,
  SupportState,
} from "../types/support.types";
import AdvancedFilters from "./advanced-filters";
import BasePicker, { CUSTOMER_PICKER, PRODUCT_PICKER, SUPPLIER_PICKER } from "./base-picker";
import BulkAttachDialog, { type ExistingDocument } from "./bulk-attach-dialog";
import SupportEditDialog from "./support-edit-dialog";
import { SupportActions, SupportVoidDialog } from "./support-actions";
import { AttachmentBadge, FlagBadges, StateBadge } from "./support-badges";
import SupportDetail from "./support-detail";

const PAGE_SIZE = 50;
const ALL = "";

const numberFormat = new Intl.NumberFormat("es-CO");

type PerUnitKey = "net_cost_per" | "supplier_amount_per";

interface Column {
  key: string;
  label: string;
  /** Field name in the API's catalog; the column only sorts if it lists it as sortable. */
  sortField?: string;
  align?: "right";
  /** A column with nothing to show in the current page is left out. */
  hasData?: (items: SupplierSupport[]) => boolean;
  cell: (support: SupplierSupport, open: () => void) => React.ReactNode;
}

const dash = <span aria-label="sin dato">—</span>;
const list = (values: string[]) => (values.length > 0 ? values.join(", ") : dash);

/**
 * The API converts to unit and box; the client never does. With no base
 * (`value_unit` null) there is nothing to convert, and the cell says so.
 */
function perUnitCell(support: SupplierSupport, key: PerUnitKey, side: keyof PerUnit) {
  const net = toNumber(support.derived?.net_cost_per?.[side]);
  const aid = toNumber(support.derived?.supplier_amount_per?.[side]);
  if (net === null && aid === null) {
    return (
      <>
        {dash}
        {support.value_unit === null && <span className="block text-xs text-text-secondary">sin base</span>}
      </>
    );
  }
  const main = key === "net_cost_per" ? net : aid;
  const sub = key === "net_cost_per" ? aid : net;
  return (
    <>
      <span className="block tabular-nums">{main === null ? dash : formatCop(main)}</span>
      {sub !== null && (
        <span className="block text-xs tabular-nums text-text-secondary">
          {key === "net_cost_per" ? "Apoyo" : "Neto"} {formatCop(sub)}
        </span>
      )}
    </>
  );
}

const COLUMNS: Column[] = [
  // SKU is what people search by, so it gets its own column ahead of the rest.
  {
    key: "sku",
    label: "SKU",
    sortField: "product_sku",
    cell: (s) => <span className="whitespace-nowrap font-mono text-[13px]">{s.product_sku ?? "—"}</span>,
  },
  {
    key: "brand",
    label: "Marca",
    sortField: "brand",
    cell: (s) => s.product_brand ?? s.brand ?? dash,
  },
  {
    key: "supplier",
    label: "Proveedor",
    sortField: "supplier.name",
    cell: (s, open) => (
      <>
        <button
          type="button"
          onClick={open}
          aria-label={`Ver detalle del apoyo de ${s.supplier_name ?? s.supplier_code ?? "proveedor"}`}
          className={cn(
            "block max-w-full truncate rounded-sm text-left font-medium hover:underline",
            "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          )}
        >
          {s.supplier_name ?? "Sin proveedor"}
        </button>
        <span className="block truncate font-mono text-xs text-text-secondary">{s.supplier_code ?? "—"}</span>
      </>
    ),
  },
  { key: "kind", label: "Tipo", sortField: "kind", cell: (s) => (s.kind ? choiceLabel("kind", s.kind) : dash) },
  {
    key: "customer",
    label: "Cliente",
    sortField: "customer_name",
    cell: (s) => (
      <>
        <span className="block truncate">{s.customer_name ?? s.customer_group ?? "Todos"}</span>
        <span className="block truncate font-mono text-xs text-text-secondary">{s.customer_nit ?? ""}</span>
      </>
    ),
  },
  {
    key: "regional",
    label: "Regional",
    hasData: (items) => items.some((s) => s.regionals.length > 0),
    cell: (s) => list(s.regionals),
  },
  {
    key: "business_unit",
    label: "Unidad de negocio",
    hasData: (items) => items.some((s) => s.business_units.length > 0),
    cell: (s) => list(s.business_units),
  },
  {
    key: "value",
    label: "Valor del apoyo",
    sortField: "supplier_value",
    align: "right",
    cell: (s) => (
      <>
        <span className="block tabular-nums">{formatSupplierValue(s.calc_method, s.supplier_value)}</span>
        <span className="block text-xs text-text-secondary">{calcMethodLabel(s.calc_method)}</span>
      </>
    ),
  },
  {
    key: "jdh",
    label: "Aporte JDH",
    sortField: "jdh_pct",
    align: "right",
    // JDH net cost is independent from the supplier value, including zero.
    cell: (s) => <span className="tabular-nums">{s.calc_method === "costo_neto" ? formatCop(s.jdh_net_cost) : formatPct(s.jdh_pct)}</span>,
  },
  { key: "net-unit", label: "Neto unitario", align: "right", cell: (s) => perUnitCell(s, "net_cost_per", "unit") },
  { key: "net-box", label: "Neto caja", align: "right", cell: (s) => perUnitCell(s, "net_cost_per", "box") },
  {
    key: "pack",
    label: "Und/caja",
    align: "right",
    cell: (s) => <span className="tabular-nums">{toNumber(s.pack_factor) ? numberFormat.format(Number(s.pack_factor)) : dash}</span>,
  },
  {
    key: "state",
    label: "Estado y vigencia",
    sortField: "valid_from",
    cell: (s) => (
      <div className="whitespace-nowrap">
        <StateBadge value={s.state} />
        <span className="mt-0.5 block text-xs tabular-nums text-text-secondary">
          {formatDay(s.valid_from)} a {s.valid_to ? formatDay(s.valid_to) : "indefinido"}
        </span>
      </div>
    ),
  },
  {
    key: "flags",
    label: "Marcas",
    cell: (s) => (
      <span className="flex flex-wrap gap-1.5">
        <AttachmentBadge support={s} />
        <FlagBadges support={s} />
      </span>
    ),
  },
];

const alignClass = (column: Column) => (column.align === "right" ? "text-right" : undefined);

/**
 * Master of supplier supports. Filtering, sorting and paging all happen in
 * the API (the table holds tens of thousands of rows); this view builds the
 * query and shows what comes back. Managers can also enable, edit and void
 * from the row menu; the API decides who may, and a 403 hides the column.
 */
export default function SupportsBrowser({
  specialCase,
  readOnly = false,
}: {
  readOnly?: boolean;
  /** A special case to scope the list to, from its "ver apoyos" link. */
  specialCase?: { id: string; code: string };
}) {
  const fieldsQuery = useFilterFields();
  const catalogsQuery = useSupportCatalogs();
  const fields = useMemo(() => fieldsQuery.data ?? [], [fieldsQuery.data]);
  const catalogs = catalogsQuery.data;

  const [customer, setCustomer] = useState<AutocompleteOption | null>(null);
  const [supplier, setSupplier] = useState<AutocompleteOption | null>(null);
  const [product, setProduct] = useState<AutocompleteOption | null>(null);
  const [caseScope, setCaseScope] = useState(specialCase ?? null);
  const [text, setText] = useState("");
  const [state, setState] = useState<string>(ALL);
  const [kind, setKind] = useState<string>(ALL);
  const [needsReview, setNeedsReview] = useState(false);
  const [hasIssues, setHasIssues] = useState(false);
  const [hasConflicts, setHasConflicts] = useState(false);
  const [withoutAttachments, setWithoutAttachments] = useState(false);
  // Ticked rows, kept across pages and filters until attached or cleared.
  const [selected, setSelected] = useState<string[]>([]);
  const [requestSelected, setRequestSelected] = useState<SupplierSupport[]>([]);
  const [batchOpen, setBatchOpen] = useState(false);
  const permissions = useSupportPermissions();
  const canRequest = readOnly && permissions.data?.can_request === true;
  const [composeId, setComposeId] = useState<string | null>(null);
  const [bulkAttach, setBulkAttach] = useState<{ document: ExistingDocument | null } | null>(null);
  const [advanced, setAdvanced] = useState<{ match: "all" | "any"; conditions: FilterCondition[] }>({
    match: "all",
    conditions: [],
  });
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [sort, setSort] = useState<string[]>(["-valid_from"]);
  const [page, setPage] = useState(1);
  const [openId, setOpenId] = useState<string | null>(null);
  const [editId, setEditId] = useState<string | null>(null);
  const [voidId, setVoidId] = useState<string | null>(null);
  const [denied, setDenied] = useState(false);
  const canWrite = useCanManage() && !denied && !readOnly;
  const canSelect = canWrite || canRequest;
  const [notice, setNotice] = useState<string | null>(null);
  const q = useDebouncedValue(text.trim());

  const sortable = new Set(fields.filter((field) => field.sortable).map((field) => field.field));

  const body = useMemo<SupportSearchBody>(() => {
    // The quick dropdowns only filter on fields the catalog really offers.
    const has = (name: string) => fields.some((field) => field.field === name);
    const quick: FilterCondition[] = [];
    if (kind !== ALL && has("kind")) quick.push({ field: "kind", op: "eq", value: kind });
    if (caseScope) quick.push({ field: "special_case_id", op: "eq", value: caseScope.id });
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
      customer_nits: customer ? [customer.value] : undefined,
      supplier_codes: supplier ? [supplier.value] : undefined,
      product_skus: product ? [product.value] : undefined,
      // No state hides voided supports; "anulado" is the only way to list them.
      state: state === ALL ? undefined : (state as SupportState),
      needs_review: needsReview || undefined,
      has_issues: hasIssues || undefined,
      has_conflicts: hasConflicts || undefined,
      has_attachments: withoutAttachments ? false : undefined,
      sort,
      page,
      size: PAGE_SIZE,
    };
  }, [q, customer, supplier, product, caseScope, state, kind, needsReview, hasIssues, hasConflicts, withoutAttachments, advanced, sort, page, fields]);

  const search = useSupportSearch(body);
  const result = search.data;
  const items = useMemo(() => result?.items ?? [], [result]);

  // The dialogs follow the live row, so a refetch after a 409 hands them the new version.
  const editing = items.find((item) => item.id === editId) ?? null;
  const voiding = items.find((item) => item.id === voidId) ?? null;

  const columns = COLUMNS.filter((column) => !column.hasData || column.hasData(items));

  const filtered =
    q !== "" ||
    customer !== null ||
    supplier !== null ||
    product !== null ||
    caseScope !== null ||
    state !== ALL ||
    kind !== ALL ||
    needsReview ||
    hasIssues ||
    hasConflicts ||
    withoutAttachments ||
    advanced.conditions.length > 0;

  // The collective upload reuses the list's filters; with none it would reach every support.
  const attachFilters: SupportSearchFilters | null = filtered ? searchFiltersOf(body) : null;

  const selectionIds = readOnly ? requestSelected.map(record => record.id) : selected;
  const requestAnchor = requestSelected[0] ?? items.find(requestEligible);
  const selectablePage = readOnly ? items.filter(record => requestEligible(record) && requestAnchor && sameRequestScope(requestAnchor, record)) : items;
  const pageIds = selectablePage.map(item => item.id);
  const pageSelected = pageIds.length > 0 && pageIds.every(itemId => selectionIds.includes(itemId));
  const selectionDisabled = (record: SupplierSupport) => readOnly && !selectionIds.includes(record.id) && (!requestEligible(record) || requestSelected.length >= 100 || (requestSelected.length > 0 && !sameRequestScope(requestSelected[0], record)));
  const toggleSelected = (itemId: string) => {
    if (!readOnly) { setSelected(current => current.includes(itemId) ? current.filter(x => x !== itemId) : [...current, itemId]); return; }
    if (selectionIds.includes(itemId)) { setRequestSelected(current => current.filter(record => record.id !== itemId)); return; }
    const record = items.find(item => item.id === itemId);
    if (!record) return;
    const next = [...requestSelected, record];
    const error = requestSelectionError(next);
    if (error) setNotice(error); else { setRequestSelected(next); setNotice(null); }
  };
  const togglePage = () => {
    if (!readOnly) { setSelected(current => pageSelected ? current.filter(x => !pageIds.includes(x)) : [...new Set([...current, ...pageIds])]); return; }
    const next = pageSelected ? requestSelected.filter(record => !pageIds.includes(record.id)) : [...requestSelected, ...selectablePage.filter(record => !selectionIds.includes(record.id))];
    const error = next.length ? requestSelectionError(next) : null;
    if (error) setNotice(error); else setRequestSelected(next);
  };

  const reset = (apply: () => void) => {
    apply();
    setPage(1);
  };

  const clearFilters = () => {
    setCustomer(null);
    setSupplier(null);
    setProduct(null);
    setCaseScope(null);
    setText("");
    setState(ALL);
    setKind(ALL);
    setNeedsReview(false);
    setHasIssues(false);
    setHasConflicts(false);
    setWithoutAttachments(false);
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

  const onForbidden = () => {
    setDenied(true);
    setNotice("Tu usuario puede consultar los apoyos, pero no modificarlos.");
  };

  const actions = (support: SupplierSupport) => (
    <SupportActions
      support={support}
      onEdit={() => setEditId(support.id)}
      onAttach={() => {
        setOpenId(support.id);
        setComposeId(support.id);
      }}
      onVoid={() => setVoidId(support.id)}
      onForbidden={onForbidden}
      onFailure={setNotice}
    />
  );

  return (
    <div className="space-y-4">
      {canRequest && <div className="space-y-2 rounded-lg border border-border bg-surface p-3">
        <p className="text-sm">Marca los apoyos para solicitar JDH. Puedes seleccionar hasta 100 del mismo proveedor y cliente; cada registro tendrá su propuesta.</p>
        {requestSelected.length > 0 && <><p className="text-sm font-medium">{requestSelected.length} seleccionados · {requestSelected[0].supplier_name ?? requestSelected[0].supplier_code} · {requestSelected[0].customer_name ?? requestSelected[0].customer_group ?? "Todos los clientes"} · NIT {requestSelected[0].customer_nit ?? "sin NIT"}</p>
          <div className="flex flex-wrap gap-2"><Button onClick={() => setBatchOpen(true)}>Solicitar apoyo JDH ({requestSelected.length})</Button><Button variant="outline" onClick={() => setRequestSelected([])}>Quitar selección</Button></div>
          <details className="text-sm"><summary className="cursor-pointer">Ver selección y quitar registros</summary><ul>{requestSelected.map(record => <li key={record.id} className="flex items-center justify-between gap-2 py-1"><span>{record.product_sku ?? "Todos los productos"} · {record.program ?? record.id}</span><Button variant="ghost" onClick={() => setRequestSelected(current => current.filter(item => item.id !== record.id))}>Quitar</Button></li>)}</ul></details>
        </>}
      </div>}
      <div className="grid gap-3 md:grid-cols-3">
        <BasePicker
          config={CUSTOMER_PICKER}
          selected={customer}
          onSelect={(option) => reset(() => setCustomer(option))}
          onClear={() => reset(() => setCustomer(null))}
        />
        <BasePicker
          config={SUPPLIER_PICKER}
          selected={supplier}
          onSelect={(option) => reset(() => setSupplier(option))}
          onClear={() => reset(() => setSupplier(null))}
        />
        <BasePicker
          config={PRODUCT_PICKER}
          selected={product}
          onSelect={(option) => reset(() => setProduct(option))}
          onClear={() => reset(() => setProduct(null))}
        />
      </div>

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
            placeholder="Buscar por texto: programa, marca, referencia externa"
            aria-label="Buscar apoyos por texto"
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
        <Check label="Por revisar" checked={needsReview} onChange={(value) => reset(() => setNeedsReview(value))} />
        <Check label="Con novedades" checked={hasIssues} onChange={(value) => reset(() => setHasIssues(value))} />
        <Check label="Con conflictos" checked={hasConflicts} onChange={(value) => reset(() => setHasConflicts(value))} />
        <Check label="Sin soporte" checked={withoutAttachments} onChange={(value) => reset(() => setWithoutAttachments(value))} />
        {caseScope && (
          <span className="inline-flex items-center gap-1 rounded-sm bg-canvas-subtle py-0.5 pl-2 pr-0.5">
            Caso {caseScope.code}
            <button
              type="button"
              onClick={() => reset(() => setCaseScope(null))}
              aria-label={`Quitar el filtro del caso ${caseScope.code}`}
              className="flex size-6 items-center justify-center rounded-sm text-text-secondary hover:bg-surface hover:text-text-primary focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ring"
            >
              <X className="size-3.5" aria-hidden="true" />
            </button>
          </span>
        )}
        {canWrite && selected.length > 0 && (
          <span className="inline-flex items-center gap-1 rounded-sm bg-canvas-subtle py-0.5 pl-2 pr-0.5 tabular-nums">
            {selected.length === 1 ? "1 seleccionado" : `${selected.length} seleccionados`}
            <button
              type="button"
              onClick={() => setSelected([])}
              aria-label="Quitar la selección"
              className="flex size-6 items-center justify-center rounded-sm text-text-secondary hover:bg-surface hover:text-text-primary focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ring"
            >
              <X className="size-3.5" aria-hidden="true" />
            </button>
          </span>
        )}
        {canWrite && (
          <Button variant="outline" size="sm" className="ml-auto max-md:h-11" onClick={() => setBulkAttach({ document: null })}>
            <Paperclip aria-hidden="true" />
            Adjuntar soporte
          </Button>
        )}
        <Button
          variant="outline"
          size="sm"
          className={cn(!canWrite && "ml-auto")}
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

      {notice && (
        <p role="alert" className="flex items-start justify-between gap-3 rounded-md bg-danger-surface px-3 py-2 text-sm text-danger">
          {notice}
          <button
            type="button"
            onClick={() => setNotice(null)}
            aria-label="Cerrar aviso"
            className="shrink-0 rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            <X className="size-4" aria-hidden="true" />
          </button>
        </p>
      )}

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
              <li key={support.id} className={cn("flex items-start", support.state === "inactivo" && "opacity-60")}>
                {canSelect && <RowCheck support={support} checked={selectionIds.includes(support.id)} disabled={selectionDisabled(support)} onChange={() => toggleSelected(support.id)} />}
                <button
                  type="button"
                  onClick={() => setOpenId(support.id)}
                  className={cn(
                    "flex min-h-14 min-w-0 flex-1 flex-col gap-1.5 px-3 py-2.5 text-left",
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
                    <AttachmentBadge support={support} />
                    <FlagBadges support={support} />
                  </span>
                </button>
                {canWrite && <span className="p-1.5">{actions(support)}</span>}
              </li>
            ))}
          </ul>

          <div className="hidden overflow-x-auto rounded-lg border border-border bg-surface md:block">
            <table className="w-full min-w-max text-left text-sm">
              <thead className="bg-canvas-subtle text-[11px] font-semibold uppercase tracking-[0.06em] text-text-secondary">
                <tr>
                  {canSelect && (
                    <th scope="col" className="w-10 px-3 py-2">
                      <input
                        type="checkbox"
                        checked={pageSelected}
                        disabled={pageIds.length === 0}
                        onChange={togglePage}
                        aria-label={readOnly ? "Seleccionar apoyos de esta página del mismo proveedor y cliente" : "Seleccionar los apoyos de esta página"}
                        className="size-4 accent-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                      />
                    </th>
                  )}
                  {columns.map((column) => {
                    const sortField = column.sortField && sortable.has(column.sortField) ? column.sortField : null;
                    return (
                      <th
                        key={column.key}
                        scope="col"
                        aria-sort={sortField ? sortState(sortField) : undefined}
                        className={cn("px-3 py-2", alignClass(column))}
                      >
                        {sortField ? (
                          <button
                            type="button"
                            onClick={() => toggleSort(sortField)}
                            className={cn(
                              "inline-flex items-center gap-1 rounded-sm uppercase tracking-[0.06em] hover:text-text-primary",
                              "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                            )}
                          >
                            {column.label}
                            {sortState(sortField) === "ascending" && <ArrowUp className="size-3.5" aria-hidden="true" />}
                            {sortState(sortField) === "descending" && <ArrowDown className="size-3.5" aria-hidden="true" />}
                          </button>
                        ) : (
                          column.label
                        )}
                      </th>
                    );
                  })}
                  {canWrite && (
                    <th scope="col" className="w-12 px-3 py-2">
                      <span className="sr-only">Acciones</span>
                    </th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {items.map((support) => (
                  // A disabled support stays in the list, muted: it is reversible, not gone.
                  <tr key={support.id} className={cn("hover:bg-primary-subtle", support.state === "inactivo" && "opacity-60")}>
                    {canSelect && (
                      <td className="px-3 py-2">
                        <input
                          type="checkbox"
                          checked={selectionIds.includes(support.id)}
                          disabled={selectionDisabled(support)}
                          title={readOnly ? "Solo acuerdos vigentes del mismo proveedor y cliente; máximo 100" : undefined}
                          onChange={() => toggleSelected(support.id)}
                          aria-label={`Seleccionar el apoyo de ${support.supplier_name ?? "proveedor"}${support.product_sku ? `, SKU ${support.product_sku}` : ""}`}
                          className="size-4 accent-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                        />
                      </td>
                    )}
                    {columns.map((column) => (
                      <td key={column.key} className={cn("max-w-56 px-3 py-2", alignClass(column))}>
                        {column.cell(support, () => setOpenId(support.id))}
                      </td>
                    ))}
                    {canWrite && <td className="px-3 py-1 text-right">{actions(support)}</td>}
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

      <SupportDetail
        id={openId}
        onClose={() => {
          setOpenId(null);
          setComposeId(null);
        }}
        canWrite={canWrite}
        jdhContext={readOnly ? "commercial" : "manage"}
        composing={composeId !== null && composeId === openId}
        onComposingChange={(composing) => setComposeId(composing ? openId : null)}
        onLinkElsewhere={(attachment) => {
          setOpenId(null);
          setComposeId(null);
          setBulkAttach({ document: { id: attachment.document_id, name: attachment.name } });
        }}
      />
      {batchOpen && <BatchRequestDialog records={requestSelected} onClose={() => setBatchOpen(false)} onSuccess={() => { setBatchOpen(false); setRequestSelected([]); setNotice("Solicitudes enviadas. Cada registro conserva su decisión BI independiente."); }} />}
      <BulkAttachDialog
        open={bulkAttach !== null}
        onClose={() => setBulkAttach(null)}
        selectedIds={selected}
        filters={attachFilters}
        document={bulkAttach?.document ?? null}
      />
      <SupportEditDialog support={editing} onClose={() => setEditId(null)} onForbidden={onForbidden} />
      <SupportVoidDialog support={voiding} onClose={() => setVoidId(null)} onForbidden={onForbidden} />
    </div>
  );
}

/** Customer or product the support applies to, for the compact mobile row. */
function subject(support: SupplierSupport): string {
  const parts = [support.customer_name ?? support.customer_group, support.product_brand ?? support.brand].filter(Boolean);
  return parts.length > 0 ? parts.join(" · ") : "Aplica a todos los clientes y productos";
}

function searchFiltersOf(body: SupportSearchBody): SupportSearchFilters {
  const filters: Partial<SupportSearchBody> = { ...body };
  delete filters.page;
  delete filters.size;
  delete filters.sort;
  return filters as SupportSearchFilters;
}

/** Row tick on the mobile list; its own 44px target, apart from the row that opens the detail. */
function RowCheck({ support, checked, disabled, onChange }: { support: SupplierSupport; checked: boolean; disabled?: boolean; onChange: () => void }) {
  return (
    <label className="flex size-11 shrink-0 cursor-pointer items-center justify-center">
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={onChange}
        aria-label={`Seleccionar el apoyo de ${support.supplier_name ?? "proveedor"}${support.product_sku ? `, SKU ${support.product_sku}` : ""}`}
        className="size-4 accent-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
      />
    </label>
  );
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
