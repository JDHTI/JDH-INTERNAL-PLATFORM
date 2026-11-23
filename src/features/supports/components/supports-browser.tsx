"use client";

import { useId, useMemo, useState } from "react";
import { CalendarClock, CalendarX2, CloudOff, FileX2, Paperclip, RefreshCw, Search, Trash2, UserX, X } from "lucide-react";

import Pager from "@/shared/components/pager";
import StatePanel from "@/shared/components/state-panel";
import { Button } from "@/shared/components/ui/button";
import { Alert, type AlertSeverity } from "@/shared/components/ui/alert";
import { Badge } from "@/shared/components/ui/badge";
import type { AutocompleteOption } from "@/shared/components/ui/autocomplete";
import { Dropdown } from "@/shared/components/ui/dropdown";
import { Input } from "@/shared/components/ui/input";
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
  useSupportSummary,
} from "../hooks/use-supports";
import { PRICE_LABELS, STATE_LABELS, supportValueText } from "../lib/format";
import type {
  FilterCondition,
  RetireResult,
  SupplierSupport,
  SupportSearchBody,
  SupportSearchFilters,
  SupportStateFilter,
} from "../types/support.types";
import BusinessGroupPicker from "./business-group-picker";
import ReplacementAlerts from "./replacement-alerts";
import RetireDialog from "./retire-dialog";
import DeleteSupportsDialog from "./delete-supports-dialog";
import { COLUMNS, groupWideName, PriceValue, SortHeader, td, th, type Column, type SortDirection } from "./supports-columns";
import BasePicker, { CUSTOMER_PICKER, PRODUCT_PICKER, SUPPLIER_PICKER } from "@/shared/components/pickers/base-picker";
import BulkAttachDialog, { type ExistingDocument } from "./bulk-attach-dialog";
import SupportEditDialog from "./support-edit-dialog";
import { SupportActions, SupportVoidDialog } from "./support-actions";
import { AttachmentBadge, ExpiringMark, FlagBadges, StateBadge } from "./support-badges";
import SupportDetail from "./support-detail";
import SupportKpis from "./support-kpis";

const PAGE_SIZE = 50;
const ALL = "";

/** `nit_y_grupo`: customer_nits (the NIT and its group's supports); `solo_nit`: plus customer_nit_only; `grupo`: business_groups. */
type CustomerScope = "nit_y_grupo" | "solo_nit" | "grupo";

const CUSTOMER_SCOPE_OPTIONS: { value: CustomerScope; label: string }[] = [
  { value: "nit_y_grupo", label: "NIT y su grupo" },
  { value: "solo_nit", label: "Solo el NIT" },
  { value: "grupo", label: "Grupo empresarial" },
];

const numberFormat = new Intl.NumberFormat("es-CO");

/** The list opens on the newest supports. */
const DEFAULT_SORT = ["-valid_from"];

/** The class of the temporary discounts, which have a view of their own. */
export const TEMPORARY_KIND = "actividad_temporal";

/**
 * Which supports a view lists: the general master every class but the temporary activities,
 * which go in their own view (decided 2026-11-20). Same rules in both: what BI and Comercial see.
 */
export type SupportsView = "general" | "temporales";

/**
 * Master of supplier supports. Filtering, sorting and paging all happen in
 * the API (the table holds tens of thousands of rows); this view builds the
 * query and shows what comes back. Managers can also enable, edit and void
 * from the row menu; the API decides who may, and a 403 hides the column.
 * No column picker or advanced filter builder: nobody used them and they
 * crowded the bar (decided 2026-11-20).
 */
export default function SupportsBrowser({ view = "general" }: { view?: SupportsView }) {
  const fieldsQuery = useFilterFields();
  const catalogsQuery = useSupportCatalogs();
  const fields = useMemo(() => fieldsQuery.data ?? [], [fieldsQuery.data]);
  const catalogs = catalogsQuery.data;

  const [customer, setCustomer] = useState<AutocompleteOption | null>(null);
  // How the customer filter reads (API #115): a NIT with its business group's supports, the NIT's
  // own only, or a whole business group.
  const [customerScope, setCustomerScope] = useState<CustomerScope>("nit_y_grupo");
  const [group, setGroup] = useState<string | null>(null);
  const scopeId = useId();
  const [supplier, setSupplier] = useState<AutocompleteOption | null>(null);
  const [product, setProduct] = useState<AutocompleteOption | null>(null);
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
  const [deleteOpen, setDeleteOpen] = useState(false);
  const permissions = useSupportPermissions();
  // Whoever does not manage only reads: margins are asked as internal supports, from the quoter
  // or from «Solicitudes de apoyo», not by ticking rows here.
  const readOnly = permissions.data?.can_manage !== true;
  const [composeId, setComposeId] = useState<string | null>(null);
  const [bulkAttach, setBulkAttach] = useState<{ document: ExistingDocument | null } | null>(null);
  const [sort, setSort] = useState<string[]>(DEFAULT_SORT);
  const [page, setPage] = useState(1);
  const [openId, setOpenId] = useState<string | null>(null);
  const [editId, setEditId] = useState<string | null>(null);
  const [voidId, setVoidId] = useState<string | null>(null);
  const [denied, setDenied] = useState(false);
  const canWrite = useCanManage() && !denied && !readOnly;
  const canSelect = canWrite;
  // Deleting for good is BI's leader's and the superadmins' (`can_delete`); the API checks it again.
  const canDelete = canWrite && permissions.data?.can_delete === true;
  const alerts = useReplacementAlerts(canWrite);
  const [alertsOpen, setAlertsOpen] = useState(false);
  const [notice, setNotice] = useState<{ severity: AlertSeverity; message: string } | null>(null);
  const q = useDebouncedValue(text.trim());

  const sortable = new Set(fields.filter((field) => field.sortable).map((field) => field.field));

  const body = useMemo<SupportSearchBody>(() => {
    // The quick dropdowns only filter on fields the catalog really offers.
    const has = (name: string) => fields.some((field) => field.field === name);
    const quick: FilterCondition[] = [];
    // The view's own class first: the temporary activities, or every class but them.
    if (has("kind")) {
      if (view === "temporales") quick.push({ field: "kind", op: "eq", value: TEMPORARY_KIND });
      else if (kind !== ALL) quick.push({ field: "kind", op: "eq", value: kind });
      else quick.push({ field: "kind", op: "neq", value: TEMPORARY_KIND });
    }
    return {
      match: "all",
      conditions: quick,
      q: q || undefined,
      customer_nits: customerScope !== "grupo" && customer ? [customer.value] : undefined,
      customer_nit_only: customerScope === "solo_nit" && customer ? true : undefined,
      business_groups: customerScope === "grupo" && group ? [group] : undefined,
      supplier_codes: supplier ? [supplier.value] : undefined,
      product_skus: product ? [product.value] : undefined,
      // No state hides voided supports; "anulado" is the only way to list them.
      state: state === ALL ? undefined : (state as SupportStateFilter),
      needs_review: needsReview || undefined,
      has_issues: hasIssues || undefined,
      has_conflicts: hasConflicts || undefined,
      has_attachments: withoutAttachments ? false : undefined,
      sort,
      page,
      size: PAGE_SIZE,
    };
  }, [q, customer, customerScope, group, supplier, product, state, kind, view, needsReview, hasIssues, hasConflicts, withoutAttachments, sort, page, fields]);

  const search = useSupportSearch(body);
  // The KPIs and «Por vencer» belong to the general master, the tactical supports (decided 2026-11-20).
  const summary = useSupportSummary(body, view === "general");
  const result = search.data;
  const items = useMemo(() => result?.items ?? [], [result]);

  // The dialogs follow the live row, so a refetch after a 409 hands them the new version.
  const editing = items.find((item) => item.id === editId) ?? null;
  const voiding = items.find((item) => item.id === voidId) ?? null;

  const methodLabel = useCalcMethodLabel();
  const kindLabel = useKindLabel();
  // The cost sub-column is BI's only.
  const columns = COLUMNS.filter((column) => !column.costOnly || !readOnly);
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
    (customerScope !== "grupo" && customer !== null) ||
    (customerScope === "grupo" && group !== null) ||
    supplier !== null ||
    product !== null ||
    state !== ALL ||
    kind !== ALL ||
    needsReview ||
    hasIssues ||
    hasConflicts ||
    withoutAttachments;

  // The collective upload reuses the list's filters; with none it would reach every support.
  const attachFilters: SupportSearchFilters | null = filtered ? searchFiltersOf(body) : null;
  // A mass void or expiry by filter reaches exactly what the list shows.
  const retireFilter = filtered ? { body: retireFiltersOf(body), total: result?.total ?? 0 } : null;

  const selectionIds = selected;
  const pageIds = items.map(item => item.id);
  const pageSelected = pageIds.length > 0 && pageIds.every(itemId => selectionIds.includes(itemId));
  const rememberVersions = (records: SupplierSupport[]) =>
    setSelectedVersions((current) => ({ ...current, ...Object.fromEntries(records.map((record) => [record.id, record.version])) }));
  const toggleSelected = (itemId: string) => {
    const record = items.find((item) => item.id === itemId);
    if (record) rememberVersions([record]);
    setSelected(current => current.includes(itemId) ? current.filter(x => x !== itemId) : [...current, itemId]);
  };
  const togglePage = () => {
    if (!pageSelected) rememberVersions(items);
    setSelected(current => pageSelected ? current.filter(x => !pageIds.includes(x)) : [...new Set([...current, ...pageIds])]);
  };

  const reset = (apply: () => void) => {
    apply();
    setPage(1);
  };

  const clearFilters = () => {
    setCustomer(null);
    setGroup(null);
    setCustomerScope("nit_y_grupo");
    setSupplier(null);
    setProduct(null);
    setText("");
    setState(ALL);
    setKind(ALL);
    setNeedsReview(false);
    setHasIssues(false);
    setHasConflicts(false);
    setWithoutAttachments(false);
    setPage(1);
  };

  const changeSort = (field: string | null, direction: SortDirection = "asc") => {
    setSort(field === null ? DEFAULT_SORT : [direction === "desc" ? `-${field}` : field]);
    setPage(1);
  };

  // Only the classes a support can be loaded with today (the bulk load's three); the temporary
  // activities have their own view, so the general one offers the other two.
  const kindOptions = [
    { value: ALL, label: "Todas las clases" },
    ...(catalogs?.active_kinds ?? [])
      .filter((code) => code !== TEMPORARY_KIND)
      .map((code) => ({ value: code, label: kindLabel(code) })),
  ];
  const stateOptions = [
    { value: ALL, label: "Todos los estados" },
    ...Object.entries(STATE_LABELS).flatMap(([value, label]) =>
      // «Por vencer» right after «Vigente», of which it is a part.
      value === "vigente" && view === "general" ? [{ value, label }, { value: "por_vencer", label: "Por vencer" }] : [{ value, label }]
    ),
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

  // A seller sees the supports of their portfolio's NITs plus the general ones; with no customers, none.
  if (permissions.data?.customer_scope === "none") {
    return (
      <StatePanel icon={UserX} title="No tienes clientes asignados">
        No hay apoyos para mostrar. Pide a un administrador que te vincule a tu código de vendedor.
      </StatePanel>
    );
  }

  return (
    <div className="space-y-4">
      {view === "general" && !summary.isError && (
        <SupportKpis summary={summary.data} active={state as SupportStateFilter | ""} onSelect={(next) => reset(() => setState(next))} />
      )}
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-[12rem_1fr_1fr_1fr]">
        {/* What the customer filter covers; a business group's support is one row, «Todo el grupo». */}
        <div className="min-w-0 space-y-1.5">
          <label htmlFor={scopeId} className="block text-[13px] font-medium">Filtrar cliente por</label>
          <Dropdown
            id={scopeId}
            value={customerScope}
            onValueChange={(next) =>
              reset(() => {
                const scope = next as CustomerScope;
                // A customer and a group are different pickers: switching between them starts empty.
                if (scope === "grupo") setCustomer(null);
                else setGroup(null);
                setCustomerScope(scope);
              })
            }
            options={CUSTOMER_SCOPE_OPTIONS}
          />
        </div>
        {customerScope === "grupo" ? (
          <BusinessGroupPicker
            selected={group}
            onSelect={(next) => reset(() => setGroup(next))}
            onClear={() => reset(() => setGroup(null))}
          />
        ) : (
          <BasePicker
            config={CUSTOMER_PICKER}
            selected={customer}
            onSelect={(option) => reset(() => setCustomer(option))}
            onClear={() => reset(() => setCustomer(null))}
          />
        )}
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
            placeholder="Marca o texto del apoyo"
            aria-label="Buscar apoyos por marca o texto del apoyo"
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
        {/* The temporary activities are a single class: their view has nothing to choose here. */}
        {view === "general" && (
          <Dropdown
            className="lg:w-56"
            value={kind}
            onValueChange={(value) => reset(() => setKind(value))}
            options={kindOptions}
            aria-label="Filtrar por clase de apoyo"
          />
        )}
        {canWrite && (
          <div className="flex flex-wrap items-center gap-2 lg:ml-auto">
            <Button variant="outline" size="sm" className="max-md:h-11" onClick={() => setBulkAttach({ document: null })}>
              <Paperclip aria-hidden="true" />
              Adjuntar soporte
            </Button>
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
        <Check label="Por revisar" checked={needsReview} onChange={(value) => reset(() => setNeedsReview(value))} />
        <Check label="Con novedades" checked={hasIssues} onChange={(value) => reset(() => setHasIssues(value))} />
        <Check label="Con conflictos" checked={hasConflicts} onChange={(value) => reset(() => setHasConflicts(value))} />
        <Check label="Sin soporte" checked={withoutAttachments} onChange={(value) => reset(() => setWithoutAttachments(value))} />
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
        {canDelete && (selected.length > 0 || filtered) && (
          <Button variant="danger" size="sm" className="max-md:h-11" onClick={() => setDeleteOpen(true)}>
            <Trash2 aria-hidden="true" />
            Eliminar
          </Button>
        )}
        {filtered && (
          <Button variant="ghost" size="sm" onClick={clearFilters}>
            Limpiar filtros
          </Button>
        )}
        </span>
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
                {canSelect && <RowCheck support={support} checked={selectionIds.includes(support.id)} onChange={() => toggleSelected(support.id)} />}
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
                  <span className="flex flex-wrap items-center gap-1.5">
                    <StateBadge value={support.state} />
                    <ExpiringMark support={support} />
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
                        aria-label="Seleccionar los apoyos de esta página"
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
      <DeleteSupportsDialog
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        selection={selected.map((supportId) => ({ id: supportId, version: selectedVersions[supportId] }))}
        filter={retireFilter}
        onForbidden={onForbidden}
        onDone={(deleted) => {
          setDeleteOpen(false);
          setSelected([]);
          setSelectedVersions({});
          setNotice({
            severity: "success",
            message: deleted === 1 ? "Se eliminó 1 apoyo." : `Se eliminaron ${deleted.toLocaleString("es-CO")} apoyos.`,
          });
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
  const group = groupWideName(support);
  const parts = [group ? `Todo el grupo · ${group}` : (support.customer_name ?? support.customer_group), support.product_brand ?? support.brand].filter(Boolean);
  return parts.length > 0 ? parts.join(" · ") : "Aplica a todos los clientes y productos";
}

/** The filters `POST /retire` reads; it would silently drop any other, and reach more than the list shows. */
function retireFiltersOf(body: SupportSearchBody): SupportSearchFilters {
  return {
    match: body.match,
    conditions: body.conditions,
    q: body.q,
    customer_nits: body.customer_nits,
    customer_nit_only: body.customer_nit_only,
    business_groups: body.business_groups,
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
