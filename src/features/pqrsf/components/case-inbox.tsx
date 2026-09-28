"use client";

import { useEffect, useEffectEvent, useId, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  CloudOff,
  Columns3,
  FileDown,
  Inbox,
  Loader2,
  Lock,
  Plus,
  SearchX,
  Settings2,
  SlidersHorizontal,
  X,
} from "lucide-react";
import { toast } from "sonner";

import StatePanel from "@/shared/components/state-panel";
import { Button, buttonVariants } from "@/shared/components/ui/button";
import { Dropdown } from "@/shared/components/ui/dropdown";
import { Input } from "@/shared/components/ui/input";
import { useDebouncedValue } from "@/shared/hooks/use-debounced-value";
import { ApiError, errorMessage } from "@/shared/lib/api-client";
import { cn } from "@/shared/lib/utils";

import { useCases, useCatalog, useSummary } from "../hooks/use-pqrsf";
import { formatDate, personName } from "../lib/format";
import {
  availableViews,
  hasRefinements,
  PAGE_SIZES,
  parseInboxState,
  rememberInboxQuery,
  resolveView,
  serializeInboxState,
  toApiFilters,
  VIEW_LABELS,
  viewCount,
  type InboxState,
  type InboxView,
} from "../lib/inbox-state";
import { exportCases } from "../services/pqrsf.service";
import type { CaseSort, Person, TrackingCatalog } from "../types/pqrsf.types";
import CasesTable, { OPTIONAL_COLUMNS, type OptionalColumn } from "./cases-table";
import ChecklistMenu from "./checklist-menu";
import { AssigneePicker } from "./pickers";

const persistentError = (message: string) => toast.error(message, { duration: Infinity });

// ── Optional columns, remembered per browser ──

const COLUMNS_KEY = "jdh-pqrsf-columns";
const columnListeners = new Set<() => void>();

function readColumns(): string {
  try {
    return window.localStorage.getItem(COLUMNS_KEY) ?? "";
  } catch {
    return "";
  }
}

function useStoredColumns(): [OptionalColumn[], (next: OptionalColumn[]) => void] {
  const raw = useSyncExternalStore(
    (listener) => {
      columnListeners.add(listener);
      return () => columnListeners.delete(listener);
    },
    readColumns,
    () => ""
  );
  const valid = OPTIONAL_COLUMNS.map((column) => column.id);
  const columns = raw
    .split(",")
    .filter((id): id is OptionalColumn => valid.includes(id as OptionalColumn));
  const setColumns = (next: OptionalColumn[]) => {
    try {
      window.localStorage.setItem(COLUMNS_KEY, next.join(","));
    } catch {
      // Blocked storage: the choice still applies until the page reloads.
    }
    columnListeners.forEach((listener) => listener());
  };
  return [columns, setColumns];
}

// ── Inbox ──

/**
 * The spreadsheet, as a screen: views with their counters, filters that live
 * in the URL, the dense table and an export that reopens in Excel.
 */
export default function CaseInbox({ area }: { area: string }) {
  const catalog = useCatalog();

  if (catalog.isPending) return <InboxSkeleton />;
  if (catalog.error) {
    return (
      <div className="space-y-6">
        <InboxHeading />
        {catalog.error instanceof ApiError && catalog.error.status === 403 ? (
          <StatePanel icon={Lock} title="No tienes acceso a PQRSF">
            {catalog.error.detail}. Pide acceso al área de Calidad o a un administrador de la
            plataforma.
          </StatePanel>
        ) : (
          <StatePanel
            icon={CloudOff}
            tone="danger"
            title="No se cargaron los catálogos de PQRSF"
            action={
              <Button variant="outline" onClick={() => catalog.refetch()}>
                Reintentar
              </Button>
            }
          >
            {errorMessage(catalog.error)}
          </StatePanel>
        )}
      </div>
    );
  }

  return <InboxScreen area={area} catalog={catalog.data} />;
}

function InboxHeading({ children }: { children?: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">PQRSF</h1>
        <p className="text-sm text-text-secondary">
          Seguimiento de peticiones, quejas, reclamos, sugerencias y felicitaciones. Reemplaza el
          formato P.13.F.01.
        </p>
      </div>
      {children}
    </div>
  );
}

function InboxScreen({ area, catalog }: { area: string; catalog: TrackingCatalog }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const formId = useId();
  const isManager = catalog.is_manager;

  const state = parseInboxState(new URLSearchParams(searchParams.toString()));
  const view = resolveView(state.view, isManager);
  const filters = toApiFilters(state, view, isManager);

  const navigate = (next: InboxState) => {
    const query = serializeInboxState(next);
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  };
  /** Any change other than paging is a new listing: back to page 1 (§7.3). */
  const update = (patch: Partial<InboxState>) => navigate({ ...state, page: 1, ...patch });

  // Search text is typed locally and reaches the URL after the debounce.
  const [text, setText] = useState(state.q ?? "");
  const [syncedQ, setSyncedQ] = useState(state.q);
  if (syncedQ !== state.q) {
    // The URL changed from outside (a chip, the back button): follow it.
    setSyncedQ(state.q);
    setText(state.q ?? "");
  }
  const debouncedText = useDebouncedValue(text.trim());
  const commitSearch = useEffectEvent((value: string) => {
    const q = value || undefined;
    if (q !== state.q && value === text.trim()) update({ q });
  });
  useEffect(() => commitSearch(debouncedText), [debouncedText]);

  const query = searchParams.toString();
  useEffect(() => rememberInboxQuery(query), [query]);

  const [columns, setColumns] = useStoredColumns();
  const [assigneeFilter, setAssigneeFilter] = useState<Person | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  const cases = useCases({ ...filters, page: state.page, size: state.size });
  const allSummary = useSummary({ status_id: [] });
  const mineSummary = useSummary({ status_id: [], mine: true });

  const exportCurrent = async () => {
    setIsExporting(true);
    try {
      await exportCases(filters);
    } catch (error) {
      persistentError(errorMessage(error));
    } finally {
      setIsExporting(false);
    }
  };

  const clearRefinements = () => {
    setAssigneeFilter(null);
    navigate({ view: state.view, status_id: [], sort: state.sort, page: 1, size: state.size });
  };

  const statusName = (id: string) => catalog.statuses.find((s) => s.id === id)?.name ?? "Estado";
  const nameOf = (list: { id: string; name: string }[], id?: string) =>
    list.find((entry) => entry.id === id)?.name;

  const assigneeLabel =
    personName(assigneeFilter?.id === state.assignee_user_id ? assigneeFilter : null) ||
    personName(
      cases.data?.items.find((item) => item.assignee?.id === state.assignee_user_id)?.assignee
    ) ||
    "Responsable elegido";

  const chips: { key: string; label: string; clear: () => void }[] = [
    ...state.status_id.map((id) => ({
      key: `status-${id}`,
      label: `Estado: ${statusName(id)}`,
      clear: () => update({ status_id: state.status_id.filter((value) => value !== id) }),
    })),
  ];
  if (state.request_type_id)
    chips.push({
      key: "type",
      label: `Tipo: ${nameOf(catalog.request_types, state.request_type_id) ?? "Tipo"}`,
      clear: () => update({ request_type_id: undefined }),
    });
  if (isManager && state.assignee_user_id)
    chips.push({
      key: "assignee",
      label: `Responsable: ${assigneeLabel}`,
      clear: () => {
        setAssigneeFilter(null);
        update({ assignee_user_id: undefined });
      },
    });
  if (state.dependency_id)
    chips.push({
      key: "dependency",
      label: `Dependencia: ${nameOf(catalog.dependencies, state.dependency_id) ?? "Dependencia"}`,
      clear: () => update({ dependency_id: undefined }),
    });
  if (state.site_id)
    chips.push({
      key: "site",
      label: `Sucursal: ${nameOf(catalog.sites, state.site_id) ?? "Sucursal"}`,
      clear: () => update({ site_id: undefined }),
    });
  if (state.received_from)
    chips.push({
      key: "from",
      label: `Recibido desde ${formatDate(state.received_from)}`,
      clear: () => update({ received_from: undefined }),
    });
  if (state.received_to)
    chips.push({
      key: "to",
      label: `Recibido hasta ${formatDate(state.received_to)}`,
      clear: () => update({ received_to: undefined }),
    });
  if (state.q)
    chips.push({
      key: "q",
      label: `Búsqueda: «${state.q}»`,
      clear: () => update({ q: undefined }),
    });

  // The search box stays visible on phones, so it does not count as folded.
  const refinementCount = chips.filter((chip) => chip.key !== "q").length;
  const selectedStatuses = state.status_id;
  const statusSummary =
    selectedStatuses.length === 0
      ? "Todos los estados"
      : selectedStatuses.length === 1
        ? statusName(selectedStatuses[0])
        : `${selectedStatuses.length} estados`;

  const data = cases.data;
  const pages = data ? Math.max(1, Math.ceil(data.total / data.size)) : 1;
  const from = data && data.total > 0 ? (data.page - 1) * data.size + 1 : 0;
  const to = data ? Math.min(data.page * data.size, data.total) : 0;

  return (
    <div className="space-y-4">
      <InboxHeading>
        <div className="flex shrink-0 flex-wrap gap-2 lg:flex-nowrap lg:justify-end">
          {isManager && (
            <Link
              href={`/${area}/pqrsf/configuracion`}
              className={cn(buttonVariants({ variant: "ghost" }), "max-md:h-11")}
            >
              <Settings2 aria-hidden="true" />
              Configuración
            </Link>
          )}
          <Button
            variant="secondary"
            onClick={exportCurrent}
            disabled={isExporting}
            className="max-md:h-11"
            title="Descarga los casos de la vista y los filtros actuales, un renglón por documento"
          >
            {isExporting ? (
              <Loader2 className="animate-spin" aria-hidden="true" />
            ) : (
              <FileDown aria-hidden="true" />
            )}
            Exportar a Excel
          </Button>
          <Link
            href={`/${area}/pqrsf/nuevo`}
            className={cn(buttonVariants({ variant: "primary" }), "max-md:h-11")}
          >
            <Plus aria-hidden="true" />
            Nuevo caso
          </Link>
        </div>
      </InboxHeading>

      <ViewBar
        views={availableViews(isManager)}
        active={view}
        counts={(item) => viewCount(item, allSummary.data, mineSummary.data)}
        onSelect={(next) => update({ view: next })}
      />

      <form
        role="search"
        aria-label="Filtros de casos"
        onSubmit={(event) => event.preventDefault()}
        className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-[minmax(14rem,2fr)_repeat(3,minmax(0,1fr))]"
      >
        <FilterField label="Buscar" htmlFor={`${formId}-q`} className="sm:col-span-2 lg:col-span-1">
          <Input
            id={`${formId}-q`}
            type="search"
            value={text}
            onChange={(event) => setText(event.target.value)}
            placeholder="Consecutivo, cliente, NIT, proveedor, asunto"
          />
        </FilterField>
        {/* On a phone the seven refinements would push every case below the
            fold, so they fold behind one button that says how many are on. */}
        <Button
          variant="outline"
          className="h-11 md:hidden"
          aria-expanded={showFilters}
          aria-controls={`${formId}-refine`}
          onClick={() => setShowFilters(!showFilters)}
        >
          <SlidersHorizontal aria-hidden="true" />
          {showFilters ? "Ocultar filtros" : "Filtros"}
          {refinementCount > 0 && <span className="tabular">({refinementCount})</span>}
        </Button>
        <div id={`${formId}-refine`} className={cn("contents", !showFilters && "max-md:hidden")}>
        <FilterField label="Estado" htmlFor={`${formId}-status`}>
          <ChecklistMenu
            id={`${formId}-status`}
            label="Estado"
            summary={statusSummary}
            options={catalog.statuses.map((status) => ({ value: status.id, label: status.name }))}
            selected={selectedStatuses}
            onChange={(next) => update({ status_id: next })}
          />
        </FilterField>
        <FilterField label="Tipo" htmlFor={`${formId}-type`}>
          <Dropdown
            id={`${formId}-type`}
            aria-label="Tipo de solicitud"
            value={state.request_type_id ?? ""}
            onValueChange={(value) => update({ request_type_id: value || undefined })}
            options={[
              { value: "", label: "Todos los tipos" },
              ...catalog.request_types.map((type) => ({ value: type.id, label: type.name })),
            ]}
          />
        </FilterField>
        {isManager && (
          <FilterField label="Responsable" htmlFor={`${formId}-assignee`}>
            <AssigneePicker
              id={`${formId}-assignee`}
              value={
                state.assignee_user_id
                  ? (assigneeFilter ?? { id: state.assignee_user_id, display_name: assigneeLabel, email: null })
                  : null
              }
              onChange={(person) => {
                setAssigneeFilter(person);
                update({ assignee_user_id: person?.id });
              }}
              placeholder="Cualquiera"
            />
          </FilterField>
        )}
        <FilterField label="Dependencia" htmlFor={`${formId}-dependency`}>
          <Dropdown
            id={`${formId}-dependency`}
            aria-label="Dependencia"
            value={state.dependency_id ?? ""}
            onValueChange={(value) => update({ dependency_id: value || undefined })}
            options={[
              { value: "", label: "Todas las dependencias" },
              ...catalog.dependencies.map((item) => ({ value: item.id, label: item.name })),
            ]}
          />
        </FilterField>
        <FilterField label="Sucursal" htmlFor={`${formId}-site`}>
          <Dropdown
            id={`${formId}-site`}
            aria-label="Sucursal"
            value={state.site_id ?? ""}
            onValueChange={(value) => update({ site_id: value || undefined })}
            options={[
              { value: "", label: "Todas las sucursales" },
              ...catalog.sites.map((site) => ({ value: site.id, label: site.name })),
            ]}
          />
        </FilterField>
        <FilterField label="Recibido desde" htmlFor={`${formId}-from`}>
          <Input
            id={`${formId}-from`}
            type="date"
            value={state.received_from ?? ""}
            max={state.received_to}
            onChange={(event) => update({ received_from: event.target.value || undefined })}
          />
        </FilterField>
        <FilterField label="Recibido hasta" htmlFor={`${formId}-to`}>
          <Input
            id={`${formId}-to`}
            type="date"
            value={state.received_to ?? ""}
            min={state.received_from}
            onChange={(event) => update({ received_to: event.target.value || undefined })}
          />
        </FilterField>
        </div>
      </form>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        {chips.length > 0 ? (
          <ul className="flex flex-wrap items-center gap-2" aria-label="Filtros activos">
            {chips.map((chip) => (
              <li key={chip.key}>
                <button
                  type="button"
                  onClick={chip.clear}
                  aria-label={`Quitar filtro ${chip.label}`}
                  className="inline-flex h-8 max-w-72 items-center gap-1 rounded-sm bg-canvas-subtle pr-1.5 pl-2 text-[13px] font-medium hover:bg-primary-subtle max-md:h-11"
                >
                  <span className="truncate">{chip.label}</span>
                  <X className="size-3.5 shrink-0" aria-hidden="true" />
                </button>
              </li>
            ))}
            <li>
              <Button variant="ghost" size="sm" onClick={clearRefinements} className="max-md:h-11">
                Limpiar filtros
              </Button>
            </li>
          </ul>
        ) : (
          <p className="text-[13px] text-text-secondary">
            Vista <span className="font-medium text-text-primary">{VIEW_LABELS[view]}</span> sin
            filtros adicionales.
          </p>
        )}
        <div className="hidden w-44 shrink-0 md:block">
          <ChecklistMenu
            id={`${formId}-columns`}
            label="Columnas opcionales"
            summary={columns.length ? `${columns.length} columnas más` : "Más columnas"}
            icon={<Columns3 className="size-4 text-text-secondary" aria-hidden="true" />}
            options={OPTIONAL_COLUMNS.map((column) => ({ value: column.id, label: column.label }))}
            selected={columns}
            onChange={(next) => setColumns(next as OptionalColumn[])}
            align="right"
          />
        </div>
      </div>

      <section aria-labelledby={`${formId}-results`} className="space-y-3">
        <h2 id={`${formId}-results`} className="sr-only">
          Casos
        </h2>
        <Results
          query={cases}
          area={area}
          sort={state.sort}
          onSortChange={(sort: CaseSort) => update({ sort })}
          columns={columns}
          view={view}
          isFiltered={hasRefinements(state)}
          onClear={clearRefinements}
          onShowAll={() => update({ view: "todos" })}
          newCaseHref={`/${area}/pqrsf/nuevo`}
        />

        {data && data.total > 0 && (
          <nav
            aria-label="Paginación de casos"
            className="flex flex-wrap items-center justify-end gap-3"
          >
            <label className="flex items-center gap-2 text-[13px] text-text-secondary">
              Filas por página
              <Dropdown
                aria-label="Filas por página"
                size="sm"
                className="w-20"
                value={String(state.size)}
                onValueChange={(value) => update({ size: Number(value) })}
                options={PAGE_SIZES.map((size) => ({ value: String(size), label: String(size) }))}
              />
            </label>
            <span className="tabular text-[13px] text-text-secondary" aria-live="polite">
              {from}–{to} de {data.total}
            </span>
            <Button
              variant="outline"
              size="sm"
              className="max-md:h-11"
              disabled={state.page <= 1}
              onClick={() => navigate({ ...state, page: state.page - 1 })}
            >
              Anterior
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="max-md:h-11"
              disabled={state.page >= pages}
              onClick={() => navigate({ ...state, page: state.page + 1 })}
            >
              Siguiente
            </Button>
          </nav>
        )}
      </section>
    </div>
  );
}

function FilterField({
  label,
  htmlFor,
  className,
  children,
}: {
  label: string;
  htmlFor: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("min-w-0 space-y-1.5", className)}>
      <label htmlFor={htmlFor} className="block text-[13px] font-medium">
        {label}
      </label>
      {children}
    </div>
  );
}

/**
 * Views are the spreadsheet's saved filters, one tap each, with their count.
 * The two deadline views tint their count when it is not zero, next to the
 * view's name, so the urgent pile is visible before anyone opens it.
 */
const URGENT_TONE: Partial<Record<InboxView, string>> = {
  vencidos: "bg-danger-badge text-danger",
  "vencen-hoy": "bg-warning-badge text-warning",
};

function ViewBar({
  views,
  active,
  counts,
  onSelect,
}: {
  views: InboxView[];
  active: InboxView;
  counts: (view: InboxView) => number | undefined;
  onSelect: (view: InboxView) => void;
}) {
  return (
    <nav aria-label="Vistas rápidas" className="-mx-1 overflow-x-auto px-1 pb-1">
        <ul className="flex gap-1">
          {views.map((view) => {
            const count = counts(view);
            const isActive = view === active;
            return (
              <li key={view}>
                <button
                  type="button"
                  aria-pressed={isActive}
                  onClick={() => onSelect(view)}
                  className={cn(
                    "flex h-9 items-center gap-2 rounded-md px-3 text-sm font-medium whitespace-nowrap max-md:h-11",
                    "transition-colors duration-150",
                    // Selected, not a second primary action: the same grammar
                    // as a selected table row (DESIGN.md §7.3).
                    isActive
                      ? "bg-primary-subtle text-text-primary shadow-[inset_0_-2px_0_var(--primary)]"
                      : "text-text-secondary hover:bg-canvas-subtle hover:text-text-primary"
                  )}
                >
                  {VIEW_LABELS[view]}
                  <span
                    className={cn(
                      "tabular min-w-6 rounded-sm px-1.5 text-center text-[13px]",
                      count && URGENT_TONE[view]
                        ? URGENT_TONE[view]
                        : cn("text-text-primary", isActive ? "bg-surface" : "bg-canvas-subtle")
                    )}
                  >
                    {count ?? "–"}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </nav>
  );
}

function Results({
  query,
  area,
  sort,
  onSortChange,
  columns,
  view,
  isFiltered,
  onClear,
  onShowAll,
  newCaseHref,
}: {
  query: ReturnType<typeof useCases>;
  area: string;
  sort: CaseSort;
  onSortChange: (sort: CaseSort) => void;
  columns: OptionalColumn[];
  view: InboxView;
  isFiltered: boolean;
  onClear: () => void;
  onShowAll: () => void;
  newCaseHref: string;
}) {
  if (query.isPending) return <TableSkeleton />;

  if (query.error) {
    return (
      <StatePanel
        icon={CloudOff}
        tone="danger"
        title="No se cargaron los casos"
        action={
          <Button variant="outline" onClick={() => query.refetch()}>
            Reintentar
          </Button>
        }
      >
        {errorMessage(query.error)}
      </StatePanel>
    );
  }

  const items = query.data?.items ?? [];
  if (items.length > 0) {
    return (
      <CasesTable
        area={area}
        cases={items}
        sort={sort}
        onSortChange={onSortChange}
        columns={columns}
        isStale={query.isPlaceholderData}
      />
    );
  }

  if (isFiltered) {
    return (
      <StatePanel
        icon={SearchX}
        title="Ningún caso coincide con los filtros"
        action={
          <Button variant="outline" onClick={onClear}>
            Limpiar filtros
          </Button>
        }
      >
        La búsqueda recorre consecutivo, cliente, NIT, proveedor, ejecutivo, usuario y asunto
        dentro de la vista {VIEW_LABELS[view]}.
      </StatePanel>
    );
  }

  const empty: Record<InboxView, { title: string; body: string }> = {
    mios: {
      title: "No tienes casos abiertos asignados",
      body: "Cuando Calidad te asigne un caso aparece aquí. Los que registraste tú están en «Todos».",
    },
    "sin-asignar": {
      title: "Todos los casos abiertos tienen responsable",
      body: "Los casos nuevos del formulario público y los registros internos llegan aquí hasta que alguien los asigne.",
    },
    vencidos: {
      title: "No hay casos vencidos",
      body: "Ningún caso abierto pasó su fecha límite.",
    },
    "vencen-hoy": {
      title: "Ningún caso vence hoy",
      body: "Los casos abiertos con fecha límite de hoy aparecen aquí. Revisa «Vencidos» para los que ya pasaron.",
    },
    abiertos: {
      title: "No hay casos abiertos",
      body: "Todos los casos visibles para ti están finalizados.",
    },
    todos: {
      title: "Aún no hay casos",
      body: "Registra el primero o espera a que llegue una solicitud del formulario público.",
    },
  };

  return (
    <StatePanel
      icon={Inbox}
      title={empty[view].title}
      action={
        view === "todos" ? (
          <Link href={newCaseHref} className={buttonVariants({ variant: "secondary" })}>
            <Plus aria-hidden="true" />
            Registrar un caso
          </Link>
        ) : (
          <Button variant="outline" onClick={onShowAll}>
            Ver todos los casos
          </Button>
        )
      }
    >
      {empty[view].body}
    </StatePanel>
  );
}

function TableSkeleton() {
  return (
    <div className="overflow-hidden rounded-lg border border-border" aria-busy="true">
      <span className="sr-only">Cargando casos</span>
      <div className="h-9 bg-canvas-subtle" />
      {[0, 1, 2, 3, 4, 5].map((row) => (
        <div key={row} className="flex h-10 items-center gap-4 border-t border-border px-3">
          <div className="h-3 w-24 animate-pulse rounded-sm bg-canvas-subtle" />
          <div className="h-3 w-20 animate-pulse rounded-sm bg-canvas-subtle" />
          <div className="h-3 w-1/4 animate-pulse rounded-sm bg-canvas-subtle" />
          <div className="ml-auto h-3 w-24 animate-pulse rounded-sm bg-canvas-subtle" />
          <div className="h-5 w-20 animate-pulse rounded-sm bg-canvas-subtle" />
        </div>
      ))}
    </div>
  );
}

export function InboxSkeleton() {
  return (
    <div className="space-y-4" aria-busy="true">
      <span className="sr-only">Cargando PQRSF</span>
      <div className="h-8 w-40 animate-pulse rounded-md bg-canvas-subtle" />
      <div className="h-4 w-96 max-w-full animate-pulse rounded-sm bg-canvas-subtle" />
      <div className="flex gap-2">
        {[0, 1, 2, 3, 4].map((item) => (
          <div key={item} className="h-9 w-28 animate-pulse rounded-md bg-canvas-subtle" />
        ))}
      </div>
      <TableSkeleton />
    </div>
  );
}
