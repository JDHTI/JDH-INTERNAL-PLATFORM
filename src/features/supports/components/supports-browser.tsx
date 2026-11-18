"use client";

import { useMemo, useState, useSyncExternalStore } from "react";
import { CalendarClock, CalendarX2, CloudOff, Columns3, FileX2, Paperclip, RefreshCw, Search, SlidersHorizontal, X } from "lucide-react";

import Pager from "@/shared/components/pager";
import StatePanel from "@/shared/components/state-panel";
import { Button, buttonVariants } from "@/shared/components/ui/button";
import { Alert, type AlertSeverity } from "@/shared/components/ui/alert";
import { Badge } from "@/shared/components/ui/badge";
import type { AutocompleteOption } from "@/shared/components/ui/autocomplete";
import { Dropdown } from "@/shared/components/ui/dropdown";
import { Input } from "@/shared/components/ui/input";
import { Menu, MenuCheckboxItem, MenuLabel } from "@/shared/components/ui/menu";
import { useDebouncedValue } from "@/shared/hooks/use-debounced-value";
import { ApiError, errorMessage } from "@/shared/lib/api-client";
import { cn } from "@/shared/lib/utils";

import {
  useCalcMethodLabel,
  useCanManage,
  useFilterFields,
  useKindLabel,
  useReplacementAlerts,
  useSupportCatalogs,
  useSupportPermissions,
  useSupportSearch,
} from "../hooks/use-supports";
import { requestEligible, requestSelectionError, sameRequestScope } from "../lib/request-selection";
import BatchRequestDialog from "./batch-request-dialog";
import { PRICE_LABELS, STATE_LABELS, supportValueText, toOptions } from "../lib/format";
import type {
  FilterCondition,
  RetireResult,
  SupplierSupport,
  SupportSearchBody,
  SupportSearchFilters,
  SupportState,
} from "../types/support.types";
import AdvancedFilters from "./advanced-filters";
import ReplacementAlerts from "./replacement-alerts";
import RetireDialog from "./retire-dialog";
import { COLUMNS, HIDEABLE, hideKeyOf, PriceValue, SortHeader, td, th, type Column, type SortDirection } from "./supports-columns";
import BasePicker, { CUSTOMER_PICKER, PRODUCT_PICKER, SUPPLIER_PICKER } from "@/shared/components/pickers/base-picker";
import BulkAttachDialog, { type ExistingDocument } from "./bulk-attach-dialog";
import SupportEditDialog from "./support-edit-dialog";
import { SupportActions, SupportVoidDialog } from "./support-actions";
import { AttachmentBadge, FlagBadges, StateBadge } from "./support-badges";
import SupportDetail from "./support-detail";

const PAGE_SIZE = 50;
const ALL = "";

const numberFormat = new Intl.NumberFormat("es-CO");

/** The list opens on the newest supports. */
const DEFAULT_SORT = ["-valid_from"];

/*
 * Columns the person hid, kept in this browser. A per-viewer convenience: a
 * blocked storage keeps the choice in memory until the page reloads, and the
 * server render (no storage) shows every column.
 */
const HIDDEN_COLUMNS_KEY = "jdh-supports-hidden-columns";
const hiddenListeners = new Set<() => void>();
let hiddenSnapshot: string | null = null;

function hiddenColumnsSnapshot(): string {
  if (hiddenSnapshot === null) {
    try {
      hiddenSnapshot = window.localStorage.getItem(HIDDEN_COLUMNS_KEY) ?? "[]";
    } catch {
      hiddenSnapshot = "[]";
    }
  }
  return hiddenSnapshot;
}

function subscribeHiddenColumns(listener: () => void) {
  hiddenListeners.add(listener);
  return () => hiddenListeners.delete(listener);
}

function parseHiddenColumns(snapshot: string): string[] {
  try {
    const stored: unknown = JSON.parse(snapshot);
    return Array.isArray(stored) ? stored.filter((value): value is string => typeof value === "string") : [];
  } catch {
    return [];
  }
}

function writeHiddenColumns(keys: string[]) {
  hiddenSnapshot = JSON.stringify(keys);
  try {
    window.localStorage.setItem(HIDDEN_COLUMNS_KEY, hiddenSnapshot);
  } catch {
    // Kept in memory only.
  }
  hiddenListeners.forEach((listener) => listener());
}

/**
 * Master of supplier supports. Filtering, sorting and paging all happen in
 * the API (the table holds tens of thousands of rows); this view builds the
 * query and shows what comes back. Managers can also enable, edit and void
 * from the row menu; the API decides who may, and a 403 hides the column.
 */
export default function SupportsBrowser({
  specialCase,
}: {
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
  // The version each ticked row had when ticked: a mass void or expiry sends it, so a row changed meanwhile is a 409.
  const [selectedVersions, setSelectedVersions] = useState<Record<string, number>>({});
  const [retireOpen, setRetireOpen] = useState(false);
  const [requestSelected, setRequestSelected] = useState<SupplierSupport[]>([]);
  const [batchOpen, setBatchOpen] = useState(false);
  const permissions = useSupportPermissions();
  // Whoever does not manage reads, and ticks rows to request a JDH support when allowed.
  const readOnly = permissions.data?.can_manage !== true;
  const canRequest = readOnly && permissions.data?.can_request === true;
  const [composeId, setComposeId] = useState<string | null>(null);
  const [bulkAttach, setBulkAttach] = useState<{ document: ExistingDocument | null } | null>(null);
  const [advanced, setAdvanced] = useState<{ match: "all" | "any"; conditions: FilterCondition[] }>({
    match: "all",
    conditions: [],
  });
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [sort, setSort] = useState<string[]>(DEFAULT_SORT);
  const [page, setPage] = useState(1);
  const [openId, setOpenId] = useState<string | null>(null);
  const [editId, setEditId] = useState<string | null>(null);
  const [voidId, setVoidId] = useState<string | null>(null);
  const [denied, setDenied] = useState(false);
  const canWrite = useCanManage() && !denied && !readOnly;
  const canSelect = canWrite || canRequest;
  const alerts = useReplacementAlerts(canWrite);
  const [alertsOpen, setAlertsOpen] = useState(false);
  const [notice, setNotice] = useState<{ severity: AlertSeverity; message: string } | null>(null);
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

  const methodLabel = useCalcMethodLabel();
  const kindLabel = useKindLabel();
  const hiddenRaw = useSyncExternalStore(subscribeHiddenColumns, hiddenColumnsSnapshot, () => "[]");
  const hiddenColumns = useMemo(() => parseHiddenColumns(hiddenRaw), [hiddenRaw]);
  const toggleColumn = (key: string, shown: boolean) =>
    writeHiddenColumns(shown ? hiddenColumns.filter((hidden) => hidden !== key) : [...hiddenColumns, key]);
  // The «price» key hides the whole price group; the cost sub-column is BI's only.
  const columns = COLUMNS.filter((column) => !hiddenColumns.includes(hideKeyOf(column)) && (!column.costOnly || !readOnly));
  const grouped = columns.some((column) => column.group);
  // The group header row: a cell per column outside a group (spanning both rows), one per group run.
  const groupHeads = columns.reduce<{ column: Column; span: number }[]>((runs, column) => {
    const last = runs[runs.length - 1];
    if (column.group && last?.column.group?.key === column.group.key) last.span += 1;
    else runs.push({ column, span: 1 });
    return runs;
  }, []);

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
  // A mass void or expiry by filter reaches exactly what the list shows.
  const retireFilter = filtered ? { body: retireFiltersOf(body), total: result?.total ?? 0 } : null;

  const selectionIds = readOnly ? requestSelected.map(record => record.id) : selected;
  const requestAnchor = requestSelected[0] ?? items.find(requestEligible);
  const selectablePage = readOnly ? items.filter(record => requestEligible(record) && requestAnchor && sameRequestScope(requestAnchor, record)) : items;
  const pageIds = selectablePage.map(item => item.id);
  const pageSelected = pageIds.length > 0 && pageIds.every(itemId => selectionIds.includes(itemId));
  const selectionDisabled = (record: SupplierSupport) => readOnly && !selectionIds.includes(record.id) && (!requestEligible(record) || requestSelected.length >= 100 || (requestSelected.length > 0 && !sameRequestScope(requestSelected[0], record)));
  const rememberVersions = (records: SupplierSupport[]) =>
    setSelectedVersions((current) => ({ ...current, ...Object.fromEntries(records.map((record) => [record.id, record.version])) }));
  const toggleSelected = (itemId: string) => {
    if (!readOnly) {
      const record = items.find((item) => item.id === itemId);
      if (record) rememberVersions([record]);
      setSelected(current => current.includes(itemId) ? current.filter(x => x !== itemId) : [...current, itemId]);
      return;
    }
    if (selectionIds.includes(itemId)) { setRequestSelected(current => current.filter(record => record.id !== itemId)); return; }
    const record = items.find(item => item.id === itemId);
    if (!record) return;
    const next = [...requestSelected, record];
    const error = requestSelectionError(next);
    if (error) setNotice({ severity: "danger", message: error }); else { setRequestSelected(next); setNotice(null); }
  };
  const togglePage = () => {
    if (!readOnly) {
      if (!pageSelected) rememberVersions(selectablePage);
      setSelected(current => pageSelected ? current.filter(x => !pageIds.includes(x)) : [...new Set([...current, ...pageIds])]);
      return;
    }
    const next = pageSelected ? requestSelected.filter(record => !pageIds.includes(record.id)) : [...requestSelected, ...selectablePage.filter(record => !selectionIds.includes(record.id))];
    const error = next.length ? requestSelectionError(next) : null;
    if (error) setNotice({ severity: "danger", message: error }); else setRequestSelected(next);
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

  const changeSort = (field: string | null, direction: SortDirection = "asc") => {
    setSort(field === null ? DEFAULT_SORT : [direction === "desc" ? `-${field}` : field]);
    setPage(1);
  };

  const kindOptions = [
    { value: ALL, label: "Todas las clases" },
    ...toOptions(catalogs?.kinds).map((option) => ({ ...option, label: kindLabel(option.value) })),
  ];
  const stateOptions = [
    { value: ALL, label: "Todos los estados" },
    ...Object.entries(STATE_LABELS).map(([value, label]) => ({ value, label })),
  ];

  const onForbidden = () => {
    setDenied(true);
    setNotice({ severity: "danger", message: "Tu usuario puede consultar los apoyos, pero no modificarlos." });
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
      onFailure={message => setNotice({ severity: "danger", message })}
    />
  );

  return (
    <div className="space-y-4">
      {canRequest && <div className="space-y-2 rounded-lg border border-border bg-surface p-3">
        <p className="text-sm">Marca los apoyos para pedir a BI un margen mínimo autorizado JDH. Puedes seleccionar hasta 100 del mismo proveedor y cliente; cada registro tendrá su propuesta.</p>
        {requestSelected.length > 0 && <><p className="text-sm font-medium">{requestSelected.length} seleccionados · {requestSelected[0].supplier_name ?? requestSelected[0].supplier_code} · {requestSelected[0].customer_name ?? requestSelected[0].customer_group ?? "Todos los clientes"} · NIT {requestSelected[0].customer_nit ?? "sin NIT"}</p>
          <div className="flex flex-wrap gap-2"><Button onClick={() => setBatchOpen(true)}>Solicitar margen JDH ({requestSelected.length})</Button><Button variant="outline" onClick={() => setRequestSelected([])}>Quitar selección</Button></div>
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

      {/* Text, state and class on the left; the table's own tools on the right, in the same row. */}
      <div className="flex flex-col gap-2 lg:flex-row lg:items-center">
        <div className="relative lg:w-72">
          <Search
            className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-text-secondary"
            aria-hidden="true"
          />
          <Input
            type="search"
            value={text}
            onChange={(event) => reset(() => setText(event.target.value))}
            placeholder="Programa, marca o ref. externa"
            aria-label="Buscar apoyos por programa, marca o referencia externa"
            className="pl-9"
          />
        </div>
        <Dropdown
          className="lg:w-44"
          value={state}
          onValueChange={(value) => reset(() => setState(value))}
          options={stateOptions}
          aria-label="Filtrar por estado"
        />
        <Dropdown
          className="lg:w-56"
          value={kind}
          onValueChange={(value) => reset(() => setKind(value))}
          options={kindOptions}
          aria-label="Filtrar por clase de apoyo"
        />
        <div className="flex flex-wrap items-center gap-2 lg:ml-auto">
          {canWrite && (
            <Button variant="outline" size="sm" className="max-md:h-11" onClick={() => setBulkAttach({ document: null })}>
              <Paperclip aria-hidden="true" />
              Adjuntar soporte
            </Button>
          )}
          <Menu
            align="end"
            trigger={
              <>
                <Columns3 aria-hidden="true" />
                Columnas
                {hiddenColumns.length === 1 ? " (1 oculta)" : hiddenColumns.length > 1 ? ` (${hiddenColumns.length} ocultas)` : ""}
              </>
            }
            triggerClassName={buttonVariants({ variant: "outline", size: "sm", className: "max-md:hidden" })}
          >
            <MenuLabel>Columnas de la tabla</MenuLabel>
            {HIDEABLE.map((column) => (
              <MenuCheckboxItem
                key={column.key}
                checked={!hiddenColumns.includes(column.key)}
                onCheckedChange={(shown) => toggleColumn(column.key, shown)}
              >
                {column.label}
              </MenuCheckboxItem>
            ))}
          </Menu>
          <Button
            variant="outline"
            size="sm"
            className="max-md:h-11"
            onClick={() => setShowAdvanced((value) => !value)}
            aria-expanded={showAdvanced}
            aria-controls="supports-advanced"
            disabled={fieldsQuery.isError}
          >
            <SlidersHorizontal aria-hidden="true" />
            Filtros avanzados{advanced.conditions.length > 0 ? ` (${advanced.conditions.length})` : ""}
          </Button>
        </div>
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
              onClick={() => {
                setSelected([]);
                setSelectedVersions({});
              }}
              aria-label="Quitar la selección"
              className="flex size-6 items-center justify-center rounded-sm text-text-secondary hover:bg-surface hover:text-text-primary focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ring"
            >
              <X className="size-3.5" aria-hidden="true" />
            </button>
          </span>
        )}
        {/* Actions that depend on what is listed or ticked stay with the quick filters. */}
        <span className="flex flex-wrap items-center gap-2 md:ml-auto">
        {canWrite && (alerts.data?.length ?? 0) > 0 && (
          <Button variant="outline" size="sm" className="max-md:h-11" onClick={() => setAlertsOpen(true)}>
            <CalendarClock aria-hidden="true" />
            Programados
            <Badge tone="warning" className="tabular-nums">{alerts.data?.length}</Badge>
          </Button>
        )}
        {canWrite && (selected.length > 0 || filtered) && (
          <Button variant="outline" size="sm" className="max-md:h-11" onClick={() => setRetireOpen(true)}>
            <CalendarX2 aria-hidden="true" />
            Anular o vencer
          </Button>
        )}
        {filtered && (
          <Button variant="ghost" size="sm" onClick={clearFilters}>
            Limpiar filtros
          </Button>
        )}
        </span>
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

      {notice && <Alert severity={notice.severity} onDismiss={() => setNotice(null)}>{notice.message}</Alert>}

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
                      <span className="block truncate text-sm">
                        <span className="font-semibold tabular-nums">{support.product_sku ?? "Todo el portafolio"}</span>
                        {support.product_sku && support.product_description && ` · ${support.product_description}`}
                      </span>
                      <span className="block truncate text-xs">{support.supplier_name ?? "Sin proveedor"}</span>
                      <span className="block truncate text-xs text-text-secondary">{subject(support)}</span>
                    </span>
                    <span className="shrink-0 text-sm font-medium tabular-nums">
                      {supportValueText(support)}
                    </span>
                  </span>
                  {/* The three prices, full label above each value: the phone has no room for them side by side in a line. */}
                  <span className="grid w-full grid-cols-3 gap-2 text-xs">
                    {MOBILE_PRICES.map(([field, label]) => (
                      <span key={field} className="min-w-0">
                        <span className="block text-text-secondary">{label}</span>
                        <PriceValue support={support} field={field} align="left" />
                      </span>
                    ))}
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
            <table className="w-full min-w-[72rem] table-fixed text-left text-sm">
              <caption className="sr-only">Apoyos de proveedores</caption>
              <colgroup>
                {canSelect && <col style={{ width: 40 }} />}
                {columns.map((column) => (
                  <col key={column.key} style={column.width ? { width: column.width } : undefined} />
                ))}
                {canWrite && <col style={{ width: 52 }} />}
              </colgroup>
              <thead className="bg-canvas-subtle text-[11px] font-semibold uppercase tracking-[0.06em] text-text-secondary">
                <tr>
                  {canSelect && (
                    <th scope="col" rowSpan={grouped ? 2 : undefined} className={cn(th, "w-10")}>
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
                  {groupHeads.map(({ column, span }) =>
                    column.group ? (
                      <th key={column.group.key} scope="colgroup" colSpan={span} className={cn(th, "h-7 border-b border-border pb-0 text-center")}>
                        {column.group.label}
                      </th>
                    ) : (
                      <SortHeader key={column.key} column={column} sortable={sortable} sort={sort} onSort={changeSort} rowSpan={grouped ? 2 : undefined} />
                    )
                  )}
                  {canWrite && (
                    <th scope="col" rowSpan={grouped ? 2 : undefined} className={th}>
                      <span className="sr-only">Acciones</span>
                    </th>
                  )}
                </tr>
                {grouped && (
                  <tr>
                    {columns.filter((column) => column.group).map((column) => (
                      <SortHeader key={column.key} column={column} sortable={sortable} sort={sort} onSort={changeSort} />
                    ))}
                  </tr>
                )}
              </thead>
              <tbody className="divide-y divide-border">
                {items.map((support) => (
                  // A disabled support stays in the list, muted: it is reversible, not gone.
                  <tr key={support.id} className={cn("hover:bg-primary-subtle", support.state === "inactivo" && "opacity-60")}>
                    {canSelect && (
                      <td className={td}>
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
                      <td key={column.key} className={cn(td, column.align === "right" && "text-right", column.tight && "px-1.5", column.middle && "align-middle")}>
                        {column.cell(support, { open: () => setOpenId(support.id), methodLabel, seesCost: !readOnly })}
                      </td>
                    ))}
                    {canWrite && <td className={cn(td, "py-1.5 pl-0 text-right")}>{actions(support)}</td>}
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
      {batchOpen && <BatchRequestDialog records={requestSelected} onClose={() => setBatchOpen(false)} onSuccess={() => { setBatchOpen(false); setRequestSelected([]); setNotice({ severity: "success", message: "Solicitudes enviadas. Cada registro conserva su decisión BI independiente." }); }} />}
      <BulkAttachDialog
        open={bulkAttach !== null}
        onClose={() => setBulkAttach(null)}
        selectedIds={selected}
        filters={attachFilters}
        document={bulkAttach?.document ?? null}
      />
      <ReplacementAlerts open={alertsOpen} onClose={() => setAlertsOpen(false)} alerts={alerts.data ?? []} />
      <RetireDialog
        open={retireOpen}
        onClose={() => setRetireOpen(false)}
        selection={selected.map((supportId) => ({ id: supportId, version: selectedVersions[supportId] }))}
        filter={retireFilter}
        onForbidden={onForbidden}
        onDone={(done) => {
          setRetireOpen(false);
          setSelected([]);
          setSelectedVersions({});
          setNotice({ severity: "success", message: retiredMessage(done) });
        }}
      />
      <SupportEditDialog support={editing} onClose={() => setEditId(null)} onForbidden={onForbidden} />
      <SupportVoidDialog support={voiding} onClose={() => setVoidId(null)} onForbidden={onForbidden} />
    </div>
  );
}

/** The prices the mobile row shows, named as everywhere else. */
const MOBILE_PRICES = [
  ["list_price", PRICE_LABELS.list.full],
  ["suggested_price_per", PRICE_LABELS.suggested.full],
  ["supported_price_per", PRICE_LABELS.minimum.full],
] as const;

/** Customer or product the support applies to, for the compact mobile row. */
function subject(support: SupplierSupport): string {
  const parts = [support.customer_name ?? support.customer_group, support.product_brand ?? support.brand].filter(Boolean);
  return parts.length > 0 ? parts.join(" · ") : "Aplica a todos los clientes y productos";
}

/** The filters `POST /retire` reads; it would silently drop any other, and reach more than the list shows. */
function retireFiltersOf(body: SupportSearchBody): SupportSearchFilters {
  return {
    match: body.match,
    conditions: body.conditions,
    q: body.q,
    customer_nits: body.customer_nits,
    supplier_codes: body.supplier_codes,
    product_skus: body.product_skus,
    state: body.state,
    needs_review: body.needs_review,
    has_issues: body.has_issues,
    has_conflicts: body.has_conflicts,
    has_attachments: body.has_attachments,
  };
}

/** "Se vencieron 12 apoyos y se anularon 2." The expiry voids the ones not yet started. */
function retiredMessage(result: RetireResult): string {
  const count = (n: number) => `${n.toLocaleString("es-CO")} ${n === 1 ? "apoyo" : "apoyos"}`;
  const parts = [
    result.expired.length > 0 && `se ${result.expired.length === 1 ? "venció" : "vencieron"} ${count(result.expired.length)}`,
    result.voided.length > 0 && `se ${result.voided.length === 1 ? "anuló" : "anularon"} ${count(result.voided.length)}`,
  ].filter((part): part is string => Boolean(part));
  if (parts.length === 0) return "No cambió ningún apoyo.";
  const text = parts.join(" y ");
  return `${text.charAt(0).toUpperCase()}${text.slice(1)}.`;
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
