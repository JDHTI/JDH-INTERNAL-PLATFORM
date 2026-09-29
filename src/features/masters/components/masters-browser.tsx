"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight, Eye, RefreshCw, Search } from "lucide-react";

import { useMaster, useMasterRecords, useMasters } from "@/features/masters/hooks/use-masters";
import type {
  MasterActiveFilter,
  MasterDetailDto,
  MasterFieldDto,
  MasterFieldRole,
  MasterFieldType,
  MasterRecordDto,
  MasterSourceSystem,
  MasterSummaryDto,
} from "@/features/masters/types/master.types";
import { Button } from "@/shared/components/ui/button";
import { Dialog } from "@/shared/components/ui/dialog";
import { Dropdown } from "@/shared/components/ui/dropdown";
import { Input } from "@/shared/components/ui/input";
import { useDebouncedValue } from "@/shared/hooks/use-debounced-value";
import { ApiError, errorMessage } from "@/shared/lib/api-client";
import { cn } from "@/shared/lib/utils";

const PAGE_SIZE = 50;

const SOURCE_LABELS: Record<MasterSourceSystem, string> = {
  siesa: "SIESA UnoEE",
  excel: "Excel",
  platform: "Plataforma",
};

const ROLE_LABELS: Record<MasterFieldRole, string> = {
  key: "Llave",
  company: "Compañía",
  code: "Código",
  name: "Nombre",
  active: "Estado",
  reference: "Referencia",
  attribute: "Atributo",
};

const TYPE_LABELS: Record<MasterFieldType, string> = {
  text: "Texto",
  integer: "Entero",
  numeric: "Número",
  boolean: "Sí / No",
  date: "Fecha",
  timestamp: "Fecha y hora",
};

const ACTIVE_OPTIONS: { value: MasterActiveFilter; label: string }[] = [
  { value: "all", label: "Todos los estados" },
  { value: "active", label: "Solo activos" },
  { value: "inactive", label: "Solo inactivos" },
];

const numberFormat = new Intl.NumberFormat("es-CO");
const dateTimeFormat = new Intl.DateTimeFormat("es-CO", { dateStyle: "medium", timeStyle: "short" });
const dateFormat = new Intl.DateTimeFormat("es-CO", { dateStyle: "medium" });

/**
 * Read-only view of the shared masters. Records are synced from the DWH by
 * the API, so nothing here writes: an edit belongs in the source system.
 */
export default function MastersBrowser() {
  const mastersQuery = useMasters();
  const [selectedSlug, setSelectedSlug] = useState<string>();
  const masters = mastersQuery.data ?? [];
  const active = masters.find((master) => master.slug === selectedSlug) ?? masters[0];

  if (mastersQuery.isPending) return <Skeleton label="Cargando maestros" className="h-96" />;
  if (mastersQuery.isError) {
    return <LoadError error={mastersQuery.error} onRetry={() => mastersQuery.refetch()} />;
  }
  if (masters.length === 0) {
    return (
      <Notice
        title="Aún no hay maestros registrados"
        description="Los maestros aparecen aquí cuando el equipo de datos los registra y ejecuta la primera sincronización con el DWH."
      />
    );
  }

  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(18rem,0.8fr)_minmax(0,1.6fr)]">
      <section className="self-start rounded-lg border border-border bg-surface">
        <div className="border-b border-border px-4 py-3">
          <h2 className="font-semibold">Maestros ({masters.length})</h2>
          <p className="text-xs text-text-secondary">Selecciona un maestro para ver su estructura y sus registros.</p>
        </div>
        {/* Top separators, as in the areas list: six rows fit and the sixth
            never draws a line against the card edge. */}
        <ul className="max-h-96 snap-y snap-mandatory overflow-y-auto overscroll-contain no-scrollbar">
          {masters.map((master) => (
            <li key={master.slug} className="h-16 snap-start border-t border-border first:border-t-0">
              <button
                type="button"
                onClick={() => setSelectedSlug(master.slug)}
                aria-current={active?.slug === master.slug ? "true" : undefined}
                className={cn(
                  "flex h-full w-full items-center justify-between gap-3 px-4 text-left transition-colors hover:bg-canvas-subtle",
                  "focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring",
                  active?.slug === master.slug && "bg-canvas-subtle"
                )}
              >
                <span className="min-w-0">
                  <span className="block truncate font-medium">{master.name}</span>
                  <span className="block truncate font-mono text-xs text-text-secondary">
                    {master.source_object ?? SOURCE_LABELS[master.source_system]}
                  </span>
                </span>
                <span className="shrink-0 text-xs tabular-nums text-text-secondary">
                  {numberFormat.format(master.record_count)}
                </span>
              </button>
            </li>
          ))}
        </ul>
      </section>

      {active && <MasterPanel key={active.slug} summary={active} />}
    </div>
  );
}

function MasterPanel({ summary }: { summary: MasterSummaryDto }) {
  const detailQuery = useMaster(summary.slug);
  const [view, setView] = useState<"records" | "structure">("records");
  const fields = detailQuery.data?.fields;

  return (
    <section className="min-w-0 space-y-4">
      <div className="rounded-lg border border-border bg-surface p-4">
        <div className="min-w-0 space-y-1">
          <h2 className="truncate text-xl font-semibold">{summary.name}</h2>
          {summary.description && <p className="text-sm text-text-secondary">{summary.description}</p>}
        </div>
        <dl className="mt-4 grid gap-x-6 gap-y-3 text-sm sm:grid-cols-2 lg:grid-cols-3">
          <Meta label="Origen">{SOURCE_LABELS[summary.source_system]}</Meta>
          <Meta label="Objeto fuente" mono>{summary.source_object ?? "—"}</Meta>
          <Meta label="Un registro es">{summary.grain ?? "—"}</Meta>
          <Meta label="Llave natural" mono>
            {summary.natural_key.length > 0 ? summary.natural_key.join(" + ") : "—"}
          </Meta>
          <Meta label="Registros" tabular>{numberFormat.format(summary.record_count)}</Meta>
          <Meta label="Última sincronización">
            {summary.last_synced_at ? dateTimeFormat.format(new Date(summary.last_synced_at)) : "Sin sincronizar"}
          </Meta>
        </dl>
      </div>

      <div role="tablist" aria-label={`Vistas de ${summary.name}`} className="flex gap-1 border-b border-border">
        <ViewTab selected={view === "records"} onSelect={() => setView("records")} controls="master-records">
          Registros
        </ViewTab>
        <ViewTab selected={view === "structure"} onSelect={() => setView("structure")} controls="master-structure">
          Estructura{fields ? ` (${fields.length})` : ""}
        </ViewTab>
      </div>

      {view === "records" ? (
        <div id="master-records" role="tabpanel">
          <RecordsView slug={summary.slug} masterName={summary.name} detail={detailQuery.data} />
        </div>
      ) : (
        <div id="master-structure" role="tabpanel">
          {detailQuery.isPending ? (
            <Skeleton label="Cargando estructura" className="h-64" />
          ) : detailQuery.isError ? (
            <LoadError error={detailQuery.error} onRetry={() => detailQuery.refetch()} />
          ) : (
            <StructureView fields={detailQuery.data.fields} />
          )}
        </div>
      )}
    </section>
  );
}

function RecordsView({
  slug,
  masterName,
  detail,
}: {
  slug: string;
  masterName: string;
  detail: MasterDetailDto | undefined;
}) {
  const [text, setText] = useState("");
  const [activeFilter, setActiveFilter] = useState<MasterActiveFilter>("all");
  const [offset, setOffset] = useState(0);
  const [openRecord, setOpenRecord] = useState<MasterRecordDto | null>(null);
  const q = useDebouncedValue(text.trim());

  const recordsQuery = useMasterRecords({ slug, q, active: activeFilter, offset, limit: PAGE_SIZE });
  const page = recordsQuery.data;
  const records = page?.items ?? [];
  const filtered = q !== "" || activeFilter !== "all";
  // vendedores, productos, supervisores and regionales carry no company in
  // the DWH; a column of dashes there says nothing.
  const showCompany = detail ? detail.fields.some((field) => field.role === "company") : true;

  const clearFilters = () => {
    setText("");
    setActiveFilter("all");
    setOffset(0);
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-2 sm:flex-row">
        <div className="relative flex-1">
          <Search
            className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-text-secondary"
            aria-hidden="true"
          />
          <Input
            type="search"
            value={text}
            onChange={(event) => {
              setText(event.target.value);
              setOffset(0);
            }}
            placeholder="Buscar por código o nombre"
            aria-label={`Buscar en ${masterName}`}
            className="pl-9"
          />
        </div>
        <Dropdown
          className="sm:w-48"
          value={activeFilter}
          onValueChange={(value) => {
            setActiveFilter(value as MasterActiveFilter);
            setOffset(0);
          }}
          options={ACTIVE_OPTIONS}
          aria-label="Filtrar por estado"
        />
      </div>

      {recordsQuery.isPending ? (
        <Skeleton label="Cargando registros" className="h-64" />
      ) : recordsQuery.isError ? (
        <LoadError error={recordsQuery.error} onRetry={() => recordsQuery.refetch()} />
      ) : records.length === 0 ? (
        filtered ? (
          <Notice
            title="Ningún registro coincide con la búsqueda"
            description="Prueba con otro código o nombre, o quita el filtro de estado."
            action={<Button variant="outline" onClick={clearFilters}>Limpiar filtros</Button>}
          />
        ) : (
          <Notice
            title="Este maestro aún no tiene registros"
            description="Los registros llegan con la próxima sincronización con el DWH."
          />
        )
      ) : (
        <div className={cn("space-y-3", recordsQuery.isPlaceholderData && "opacity-60")}>
          <ul className="divide-y divide-border rounded-lg border border-border bg-surface sm:hidden">
            {records.map((record) => (
              <li key={record.id}>
                <button
                  type="button"
                  onClick={() => setOpenRecord(record)}
                  className={cn(
                    "flex min-h-14 w-full items-center justify-between gap-3 px-3 py-2 text-left",
                    "focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring"
                  )}
                >
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium">{record.name ?? "Sin nombre"}</span>
                    <span className="block truncate font-mono text-xs text-text-secondary">{record.code ?? "—"}</span>
                  </span>
                  <ActiveBadge value={record.is_active} />
                </button>
              </li>
            ))}
          </ul>

          <div className="hidden overflow-hidden rounded-lg border border-border bg-surface sm:block">
            <table className="w-full text-left text-sm">
              <thead className="bg-canvas-subtle text-[11px] font-semibold uppercase tracking-[0.06em] text-text-secondary">
                <tr>
                  <th scope="col" className="px-3 py-2">Código</th>
                  <th scope="col" className="px-3 py-2">Nombre</th>
                  {showCompany && <th scope="col" className="px-3 py-2 text-right">Cía</th>}
                  <th scope="col" className="px-3 py-2">Estado</th>
                  <th scope="col" className="w-16 px-3 py-2"><span className="sr-only">Acciones</span></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {records.map((record) => (
                  <tr key={record.id} className="h-10 hover:bg-primary-subtle">
                    <td className="px-3 py-2 font-mono text-[13px]">{record.code ?? "—"}</td>
                    <td className="max-w-0 truncate px-3 py-2">{record.name ?? "Sin nombre"}</td>
                    {showCompany && (
                      <td className="px-3 py-2 text-right tabular-nums">{record.company_id ?? "—"}</td>
                    )}
                    <td className="px-3 py-2"><ActiveBadge value={record.is_active} /></td>
                    <td className="px-3 py-1 text-right">
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => setOpenRecord(record)}
                        aria-label={`Ver detalle de ${record.name ?? record.code ?? "registro"}`}
                      >
                        <Eye aria-hidden="true" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {page && (
            <div className="flex items-center justify-end gap-3 text-xs text-text-secondary">
              <span className="tabular-nums">
                {numberFormat.format(page.offset + 1)}–{numberFormat.format(page.offset + records.length)} de{" "}
                {numberFormat.format(page.total)}
              </span>
              <span className="flex gap-1">
                <Button
                  variant="outline"
                  size="icon-sm"
                  onClick={() => setOffset((value) => Math.max(0, value - PAGE_SIZE))}
                  disabled={offset === 0}
                  aria-label="Página anterior"
                >
                  <ChevronLeft aria-hidden="true" />
                </Button>
                <Button
                  variant="outline"
                  size="icon-sm"
                  onClick={() => setOffset((value) => value + PAGE_SIZE)}
                  disabled={page.offset + records.length >= page.total}
                  aria-label="Página siguiente"
                >
                  <ChevronRight aria-hidden="true" />
                </Button>
              </span>
            </div>
          )}
        </div>
      )}

      <Dialog
        open={openRecord !== null}
        onOpenChange={(open) => {
          if (!open) setOpenRecord(null);
        }}
        title={openRecord?.name ?? openRecord?.code ?? "Registro"}
        description={masterName}
      >
        {openRecord && <RecordDetail record={openRecord} fields={detail?.fields} showCompany={showCompany} />}
      </Dialog>
    </div>
  );
}

function RecordDetail({
  record,
  fields,
  showCompany,
}: {
  record: MasterRecordDto;
  fields: MasterFieldDto[] | undefined;
  showCompany: boolean;
}) {
  const known = new Map((fields ?? []).map((field) => [field.name, field]));
  const attributeNames = [
    ...(fields ?? [])
      .filter((field) => field.role === "attribute" || field.role === "reference")
      .map((field) => field.name)
      .filter((name) => name in record.attributes),
    ...Object.keys(record.attributes).filter((name) => !known.has(name)),
  ];

  return (
    <dl className="divide-y divide-border text-sm">
      <DetailRow label="Código" mono>{record.code ?? "—"}</DetailRow>
      <DetailRow label="Nombre">{record.name ?? "—"}</DetailRow>
      {showCompany && <DetailRow label="Compañía" tabular>{record.company_id ?? "—"}</DetailRow>}
      <DetailRow label="Estado"><ActiveBadge value={record.is_active} /></DetailRow>
      {attributeNames.map((name) => {
        const field = known.get(name);
        return (
          <DetailRow
            key={name}
            label={field?.label ?? name}
            mono={field?.role === "reference"}
            note={field?.is_pii ? "Dato personal" : undefined}
          >
            {formatValue(record.attributes[name], field?.data_type)}
          </DetailRow>
        );
      })}
      <DetailRow label="Llave en el DWH" mono>{record.source_key}</DetailRow>
      <DetailRow label="Sincronizado">
        {record.synced_at ? dateTimeFormat.format(new Date(record.synced_at)) : "—"}
      </DetailRow>
    </dl>
  );
}

function StructureView({ fields }: { fields: MasterFieldDto[] }) {
  if (fields.length === 0) {
    return (
      <Notice
        title="Este maestro aún no declara campos"
        description="La estructura se publica junto con la definición del maestro en el API."
      />
    );
  }
  return (
    <ul className="divide-y divide-border rounded-lg border border-border bg-surface">
      {fields.map((field) => (
        <li key={field.name} className="flex flex-col gap-1 px-3 py-2 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
          <span className="min-w-0">
            <span className="block truncate text-sm font-medium">{field.label}</span>
            <span className="block truncate font-mono text-xs text-text-secondary">{field.name}</span>
          </span>
          <span className="flex flex-wrap gap-1.5 text-xs">
            <Chip>{ROLE_LABELS[field.role]}</Chip>
            <Chip>{TYPE_LABELS[field.data_type]}</Chip>
            <Chip>{field.is_nullable ? "Opcional" : "Obligatorio"}</Chip>
            {field.references && <Chip>Apunta a {field.references}</Chip>}
            {field.is_pii && <Chip tone="warning">Dato personal</Chip>}
          </span>
        </li>
      ))}
    </ul>
  );
}

function ViewTab({
  selected,
  onSelect,
  controls,
  children,
}: {
  selected: boolean;
  onSelect: () => void;
  controls: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={selected}
      aria-controls={selected ? controls : undefined}
      onClick={onSelect}
      className={cn(
        "border-b-2 px-3 py-2 text-sm font-medium transition-colors",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
        selected
          ? "border-primary text-text-primary"
          : "border-transparent text-text-secondary hover:text-text-primary"
      )}
    >
      {children}
    </button>
  );
}

function Meta({
  label,
  mono = false,
  tabular = false,
  children,
}: {
  label: string;
  mono?: boolean;
  tabular?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="min-w-0">
      <dt className="text-xs text-text-secondary">{label}</dt>
      <dd className={cn("truncate", mono && "font-mono text-[13px]", tabular && "tabular-nums")}>{children}</dd>
    </div>
  );
}

function DetailRow({
  label,
  mono = false,
  tabular = false,
  note,
  children,
}: {
  label: string;
  mono?: boolean;
  tabular?: boolean;
  note?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid gap-1 py-2 sm:grid-cols-[10rem_minmax(0,1fr)] sm:gap-3">
      <dt className="text-text-secondary">
        {label}
        {note && <span className="block text-xs">{note}</span>}
      </dt>
      <dd className={cn("break-words", mono && "font-mono text-[13px]", tabular && "tabular-nums")}>{children}</dd>
    </div>
  );
}

function ActiveBadge({ value }: { value: boolean | null }) {
  if (value === null) return <Chip>Sin estado</Chip>;
  return value ? <Chip tone="success">Activo</Chip> : <Chip>Inactivo</Chip>;
}

function Chip({ tone, children }: { tone?: "success" | "warning"; children: React.ReactNode }) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center rounded-sm px-2 py-0.5 text-xs font-medium",
        tone === "success"
          ? "bg-success-surface text-success"
          : tone === "warning"
            ? "bg-warning-surface text-warning"
            : "bg-canvas-subtle text-text-primary"
      )}
    >
      {children}
    </span>
  );
}

function formatValue(value: unknown, type: MasterFieldType | undefined): React.ReactNode {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "boolean") return value ? "Sí" : "No";
  if (typeof value === "number") return <span className="tabular-nums">{numberFormat.format(value)}</span>;
  if (typeof value === "string" && (type === "date" || type === "timestamp")) {
    const date = new Date(value);
    if (!Number.isNaN(date.getTime())) {
      return type === "date" ? dateFormat.format(date) : dateTimeFormat.format(date);
    }
  }
  return typeof value === "string" ? value : JSON.stringify(value);
}

function Skeleton({ label, className }: { label: string; className?: string }) {
  return <div className={cn("animate-pulse rounded-lg bg-canvas-subtle", className)} aria-busy="true" aria-label={label} />;
}

function Notice({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="space-y-2 rounded-lg border border-border bg-surface p-6">
      <h3 className="font-semibold">{title}</h3>
      <p className="text-sm text-text-secondary">{description}</p>
      {action && <div className="pt-1">{action}</div>}
    </div>
  );
}

/**
 * 404 on the list means the API has not shipped the masters module yet, which
 * is a different situation from a failed request and reads differently.
 */
function LoadError({ error, onRetry }: { error: Error; onRetry: () => void }) {
  const status = error instanceof ApiError ? error.status : null;
  const title =
    status === 404
      ? "El servicio de maestros todavía no está disponible"
      : status === 403
        ? "No tienes acceso a los maestros"
        : "No se pudieron cargar los maestros";
  const description =
    status === 404
      ? "El API aún no publica este módulo. Cuando el equipo de plataforma lo despliegue, los maestros aparecerán aquí sin cambios en esta pantalla."
      : status === 403
        ? "Los maestros solo están disponibles para administradores globales. Pide acceso al equipo de TI."
        : errorMessage(error);

  return (
    <div className="space-y-3 rounded-lg border border-border bg-surface p-6" role="alert">
      <h3 className="font-semibold">{title}</h3>
      <p className="text-sm text-text-secondary">{description}</p>
      {status !== 403 && (
        <Button variant="outline" onClick={onRetry}>
          <RefreshCw aria-hidden="true" /> Reintentar
        </Button>
      )}
    </div>
  );
}
