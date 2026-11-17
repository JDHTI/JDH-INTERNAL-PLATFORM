"use client";

import Link from "next/link";
import { ClipboardCheck, CloudOff } from "lucide-react";

import PageHeader from "@/shared/components/page-header";
import StatePanel from "@/shared/components/state-panel";
import { Button } from "@/shared/components/ui/button";
import { errorMessage } from "@/shared/lib/api-client";
import { useBreadcrumbLabel } from "@/shared/store/use-breadcrumb-store";

import { usePlanCatalog, usePlans } from "../hooks/use-action-plans";
import { usePlanLabels } from "../hooks/use-plan-labels";
import { OverdueBadge, PlanEffectivenessBadge, PlanStatusBadge } from "./plan-badges";

/** The route a responsible without the module reaches their actions by (and where the bell lands). */
export const MY_PLANS_PATH = "/mis-planes-de-accion";

const dateFormat = new Intl.DateTimeFormat("es-CO", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "UTC" });

/**
 * The actions where the person is named as responsible, open ones first. It
 * needs no module: the API returns only what they are named in. From here they
 * open an action to mark their rows as done and upload evidence.
 */
export default function MyPlans() {
  useBreadcrumbLabel(MY_PLANS_PATH, "Mis planes de acción");
  usePlanCatalog();
  const labels = usePlanLabels();
  const plans = usePlans({ mine: true }, 1, 100);
  const items = [...(plans.data?.items ?? [])].sort(
    (a, b) => Number(b.status !== "cerrada") - Number(a.status !== "cerrada") || b.overdue - a.overdue || b.reported_on.localeCompare(a.reported_on)
  );

  return (
    <div className="space-y-6">
      <PageHeader title="Mis planes de acción" description="Las acciones del SIG donde eres responsable de una corrección o una actividad." />

      {plans.isPending ? (
        <div className="h-48 animate-pulse rounded-lg bg-canvas-subtle" aria-busy="true">
          <span className="sr-only">Cargando tus acciones</span>
        </div>
      ) : plans.isError ? (
        <StatePanel
          icon={CloudOff}
          tone="danger"
          title="No se cargaron tus acciones"
          action={
            <Button variant="outline" onClick={() => plans.refetch()}>
              Reintentar
            </Button>
          }
        >
          {errorMessage(plans.error)}
        </StatePanel>
      ) : items.length === 0 ? (
        <StatePanel icon={ClipboardCheck} title="No tienes acciones asignadas">
          Cuando Calidad te nombre responsable de una actividad, aparece aquí y te llega un aviso en la campana.
        </StatePanel>
      ) : (
        <ul className="space-y-3">
          {items.map((item) => (
            <li key={item.id}>
              <Link
                href={`${MY_PLANS_PATH}/${item.id}` as never}
                className="block space-y-1.5 rounded-lg border border-border p-3 hover:bg-primary-subtle focus-visible:outline-offset-2"
              >
                <span className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-mono text-sm font-medium break-all">{item.code}</span>
                  <span className="flex flex-wrap items-center gap-1.5">
                    <PlanStatusBadge status={item.status} />
                    <PlanEffectivenessBadge effectiveness={item.effectiveness} />
                    <OverdueBadge count={item.overdue} />
                  </span>
                </span>
                <span className="line-clamp-2 block text-sm break-words">{item.finding ?? "Sin hallazgo"}</span>
                <span className="block text-[13px] text-text-secondary">
                  {labels.action_types(item.action_type)} · {item.process.code} {item.process.name} ·{" "}
                  <span className="tabular">{dateFormat.format(new Date(`${item.reported_on}T00:00:00Z`))}</span> ·{" "}
                  <span className="tabular">
                    {item.activities_done} de {item.activities}
                  </span>{" "}
                  actividades realizadas
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
