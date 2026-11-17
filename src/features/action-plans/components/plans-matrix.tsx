"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BarChart3, ClipboardList, CloudOff, Download, Loader2, Plus, Search } from "lucide-react";
import { toast } from "sonner";

import PageHeader from "@/shared/components/page-header";
import Pager from "@/shared/components/pager";
import StatePanel from "@/shared/components/state-panel";
import { Button } from "@/shared/components/ui/button";
import { Dropdown } from "@/shared/components/ui/dropdown";
import { Input } from "@/shared/components/ui/input";
import { useDebouncedValue } from "@/shared/hooks/use-debounced-value";
import { errorMessage } from "@/shared/lib/api-client";
import { cn } from "@/shared/lib/utils";
import { useBreadcrumbLabel } from "@/shared/store/use-breadcrumb-store";

import { usePlanCatalog, usePlanPermissions, usePlans } from "../hooks/use-action-plans";
import { usePlanLabels } from "../hooks/use-plan-labels";
import { exportPlans } from "../services/action-plans.service";
import type { PlanFilters, PlanSummary } from "../types/action-plans.types";
import { NewPlanDialog } from "./plan-forms";
import { OverdueBadge, PlanEffectivenessBadge, PlanStatusBadge } from "./plan-badges";

const PAGE_SIZE = 25;
const STATUSES = ["abierta", "en_proceso", "cerrada"] as const;
const EFFECTIVENESS = ["si", "no", "pendiente"] as const;

const formatDate = new Intl.DateTimeFormat("es-CO", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "UTC" });
const dateOf = (iso: string) => formatDate.format(new Date(`${iso}T00:00:00Z`));

/** The action plan matrix (P.04.F.02): every action of the SIG, filtered, with its state at a glance. */
export default function PlansMatrix({ area }: { area: string }) {
  const router = useRouter();
  const permissions = usePlanPermissions();
  const catalog = usePlanCatalog();
  const labels = usePlanLabels();
  useBreadcrumbLabel(`/${area}/planes-accion`, "Planes de acción");

  const [search, setSearch] = useState("");
  const q = useDebouncedValue(search.trim());
  const [filters, setFilters] = useState<Omit<PlanFilters, "q">>({});
  const [page, setPage] = useState(1);
  const [creating, setCreating] = useState(false);
  const [exporting, setExporting] = useState(false);

  const active: PlanFilters = { ...filters, q: q || undefined };
  const plans = usePlans(active, page, PAGE_SIZE, permissions.data?.can_read ?? true);

  // A new filter starts on the first page.
  const set = (patch: Partial<PlanFilters>) => {
    setFilters((current) => ({ ...current, ...patch }));
    setPage(1);
  };
  const hasFilters = Object.values(active).some((value) => value !== undefined && value !== false && value !== "");
  const year = new Date().getFullYear();
  const canManage = permissions.data?.can_manage === true;
  const items = plans.data?.items ?? [];

  const exportMatrix = async () => {
    setExporting(true);
    try {
      await exportPlans(active);
    } catch (error) {
      toast.error(errorMessage(error), { duration: Infinity });
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Planes de acción"
        description="Seguimiento de las acciones correctivas, preventivas y de mejora del SIG (P.04.F.02)."
        aside={
          <div className="flex flex-wrap gap-2">
            <Link
              href={`/${area}/planes-accion/indicadores`}
              className="inline-flex h-9 items-center gap-1.5 rounded-md border border-border-control px-3 text-sm font-medium hover:bg-canvas-subtle max-md:h-11"
            >
              <BarChart3 className="size-4" aria-hidden="true" />
              Indicadores
            </Link>
            <Button variant="outline" className="max-md:h-11" onClick={exportMatrix} disabled={exporting}>
              {exporting ? <Loader2 className="animate-spin" aria-hidden="true" /> : <Download aria-hidden="true" />}
              Exportar Excel
            </Button>
            {canManage && (
              <Button className="max-md:h-11" onClick={() => setCreating(true)}>
                <Plus aria-hidden="true" />
                Nueva acción
              </Button>
            )}
          </div>
        }
      />

      <div className="space-y-3">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="relative sm:col-span-2 lg:col-span-1">
            <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-text-secondary" aria-hidden="true" />
            <Input
              type="search"
              aria-label="Buscar por código, cliente o hallazgo"
              placeholder="Código, cliente o hallazgo"
              className="pl-8 max-md:h-11"
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(1);
              }}
            />
          </div>
          <Dropdown
            aria-label="Origen"
            placeholder="Origen"
            clearable
            clearLabel="Quitar el origen"
            value={filters.origin ?? ""}
            onValueChange={(value) => set({ origin: value || undefined })}
            options={(catalog.data?.origins ?? []).map((option) => ({ value: option.value, label: option.label }))}
            className="max-md:h-11"
          />
          <Dropdown
            aria-label="Procedencia"
            placeholder="Procedencia"
            clearable
            clearLabel="Quitar la procedencia"
            value={filters.process_id ?? ""}
            onValueChange={(value) => set({ process_id: value || undefined })}
            options={(catalog.data?.processes ?? []).map((process) => ({
              value: process.id,
              label: `${process.code} · ${process.name}`,
            }))}
            className="max-md:h-11"
          />
          <Dropdown
            aria-label="Tipo de acción"
            placeholder="Tipo"
            clearable
            clearLabel="Quitar el tipo"
            value={filters.action_type ?? ""}
            onValueChange={(value) => set({ action_type: value || undefined })}
            options={(catalog.data?.action_types ?? []).map((option) => ({ value: option.value, label: option.label }))}
            className="max-md:h-11"
          />
        </div>

        <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
          <ChipGroup
            label="Estado"
            values={STATUSES}
            current={filters.status}
            text={labels.statuses}
            onChange={(value) => set({ status: value })}
          />
          <ChipGroup
            label="Eficacia"
            values={EFFECTIVENESS}
            current={filters.effectiveness}
            text={labels.effectiveness}
            onChange={(value) => set({ effectiveness: value })}
          />
          <div className="flex flex-wrap gap-1.5">
            <Chip pressed={filters.overdue === true} onClick={() => set({ overdue: filters.overdue ? undefined : true })}>
              Con vencidas
            </Chip>
            <Chip pressed={filters.mine === true} onClick={() => set({ mine: filters.mine ? undefined : true })}>
              Donde soy responsable
            </Chip>
          </div>
          <div className="flex items-center gap-2">
            <Dropdown
              aria-label="Año"
              placeholder="Año"
              clearable
              clearLabel="Quitar el año"
              value={filters.year ? String(filters.year) : ""}
              onValueChange={(value) => set({ year: value ? Number(value) : undefined })}
              options={[year, year - 1, year - 2, year - 3].map((value) => ({ value: String(value), label: String(value) }))}
              className="w-28 max-md:h-11"
            />
          </div>
          {hasFilters && (
            <button
              type="button"
              className="rounded-sm text-[13px] text-text-secondary underline underline-offset-4 hover:text-text-primary max-md:min-h-11"
              onClick={() => {
                setSearch("");
                setFilters({});
                setPage(1);
              }}
            >
              Quitar los filtros
            </button>
          )}
        </div>
      </div>

      {plans.isPending ? (
        <div className="h-64 animate-pulse rounded-lg bg-canvas-subtle" aria-busy="true">
          <span className="sr-only">Cargando las acciones</span>
        </div>
      ) : plans.isError ? (
        <StatePanel
          icon={CloudOff}
          tone="danger"
          title="No se cargaron las acciones"
          action={
            <Button variant="outline" onClick={() => plans.refetch()}>
              Reintentar
            </Button>
          }
        >
          {errorMessage(plans.error)}
        </StatePanel>
      ) : items.length === 0 ? (
        <StatePanel icon={ClipboardList} title={hasFilters ? "Ninguna acción coincide" : "Todavía no hay acciones"}>
          {hasFilters
            ? "Quita algún filtro para ver más."
            : canManage
              ? "Crea la primera con «Nueva acción», o ábrela desde un caso de PQRSF finalizado con fallo interno."
              : "Cuando Calidad registre una acción, aparece aquí."}
        </StatePanel>
      ) : (
        <div className={cn("space-y-3 transition-opacity", plans.isPlaceholderData && "opacity-60")}>
          <Table area={area} items={items} />
          <Pager page={page} size={PAGE_SIZE} total={plans.data.total} count={items.length} onPageChange={setPage} />
        </div>
      )}

      {creating && (
        <NewPlanDialog
          onClose={() => setCreating(false)}
          onCreated={(id) => router.push(`/${area}/planes-accion/${id}`)}
        />
      )}
    </div>
  );
}

// ── Pieces ──

function Chip({ pressed, onClick, children }: { pressed: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      onClick={onClick}
      className={cn(
        "inline-flex h-8 items-center rounded-md border px-2.5 text-[13px] font-medium whitespace-nowrap max-md:h-11",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
        pressed
          ? "border-primary bg-primary-subtle text-text-primary"
          : "border-border-control text-text-secondary hover:bg-canvas-subtle hover:text-text-primary"
      )}
    >
      {children}
    </button>
  );
}

function ChipGroup({
  label,
  values,
  current,
  text,
  onChange,
}: {
  label: string;
  values: readonly string[];
  current: string | undefined;
  text: (value: string) => string;
  onChange: (value: string | undefined) => void;
}) {
  return (
    <div role="group" aria-label={label} className="flex flex-wrap items-center gap-1.5">
      <span className="text-[13px] text-text-secondary">{label}</span>
      {values.map((value) => (
        <Chip key={value} pressed={current === value} onClick={() => onChange(current === value ? undefined : value)}>
          {text(value)}
        </Chip>
      ))}
    </div>
  );
}

function Table({ area, items }: { area: string; items: PlanSummary[] }) {
  const labels = usePlanLabels();
  const href = (item: PlanSummary) => `/${area}/planes-accion/${item.id}`;
  return (
    <>
      <div className="hidden overflow-x-auto rounded-lg border border-border md:block">
        <table className="w-full min-w-[56rem] text-left text-sm">
          <thead className="bg-canvas-subtle text-[11px] font-semibold tracking-[0.06em] text-text-secondary uppercase">
            <tr>
              <th scope="col" className="px-3 py-2">Código</th>
              <th scope="col" className="px-3 py-2">Origen</th>
              <th scope="col" className="px-3 py-2">Procedencia</th>
              <th scope="col" className="px-3 py-2 whitespace-nowrap">Fecha</th>
              <th scope="col" className="px-3 py-2">Hallazgo</th>
              <th scope="col" className="px-3 py-2 text-right whitespace-nowrap">Actividades</th>
              <th scope="col" className="px-3 py-2">Estado</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {items.map((item) => (
              <tr key={item.id} className="align-top hover:bg-primary-subtle">
                <td className="px-3 py-2 whitespace-nowrap">
                  <Link
                    href={href(item)}
                    className="rounded-sm font-mono text-[13px] font-medium underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                  >
                    {item.code}
                  </Link>
                  <span className="block text-[13px] text-text-secondary">{labels.action_types(item.action_type)}</span>
                </td>
                <td className="px-3 py-2">{labels.origins(item.origin)}</td>
                <td className="px-3 py-2">
                  <span className="font-mono text-[13px]">{item.process.code}</span>
                  <span className="block text-[13px] text-text-secondary">{item.process.name}</span>
                </td>
                <td className="tabular px-3 py-2 whitespace-nowrap">{dateOf(item.reported_on)}</td>
                <td className="max-w-md px-3 py-2">
                  <span className="line-clamp-2 break-words">{item.finding ?? <span className="text-text-secondary">Sin hallazgo</span>}</span>
                  {(item.reporter_name || item.city) && (
                    <span className="block truncate text-[13px] text-text-secondary">
                      {[item.reporter_name, item.city].filter(Boolean).join(" · ")}
                    </span>
                  )}
                </td>
                <td className="tabular px-3 py-2 text-right whitespace-nowrap">
                  {item.activities_done} de {item.activities}
                  {item.overdue > 0 && (
                    <span className="mt-1 block">
                      <OverdueBadge count={item.overdue} />
                    </span>
                  )}
                </td>
                <td className="px-3 py-2">
                  <span className="flex flex-wrap gap-1.5">
                    <PlanStatusBadge status={item.status} />
                    <PlanEffectivenessBadge effectiveness={item.effectiveness} />
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ul className="divide-y divide-border overflow-hidden rounded-lg border border-border md:hidden">
        {items.map((item) => (
          <li key={item.id}>
            <Link href={href(item)} className="block space-y-1.5 p-3 hover:bg-primary-subtle focus-visible:outline-offset-[-2px]">
              <span className="flex items-start justify-between gap-3">
                <span className="font-mono text-[13px] font-medium break-all">{item.code}</span>
                <PlanStatusBadge status={item.status} />
              </span>
              <span className="line-clamp-2 block break-words">{item.finding ?? "Sin hallazgo"}</span>
              <span className="block text-[13px] text-text-secondary">
                {labels.action_types(item.action_type)} · {item.process.code} · <span className="tabular">{dateOf(item.reported_on)}</span>
              </span>
              <span className="flex flex-wrap items-center gap-1.5">
                <PlanEffectivenessBadge effectiveness={item.effectiveness} />
                <OverdueBadge count={item.overdue} />
                <span className="tabular text-[13px] text-text-secondary">
                  {item.activities_done} de {item.activities} actividades
                </span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}
