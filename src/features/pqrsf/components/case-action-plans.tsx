"use client";

import { useId } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Route } from "next";
import { useQueryClient } from "@tanstack/react-query";
import { ClipboardCheck, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { PlanEffectivenessBadge, PlanStatusBadge } from "@/features/action-plans/components/plan-badges";
import { useCreatePlanFromCase, usePlanPermissions, usePlans } from "@/features/action-plans/hooks/use-action-plans";
import { usePlanLabels } from "@/features/action-plans/hooks/use-plan-labels";
import { Button } from "@/shared/components/ui/button";
import { errorMessage } from "@/shared/lib/api-client";

import { pqrsfKeys } from "../hooks/use-pqrsf";
import type { PqrsfCase } from "../types/pqrsf.types";

/**
 * The corrective actions that came from this case, and the way to open one. A
 * case finalized with a failure in a JDH process is where an action is
 * suggested; Calidad can open one from any case it works. The action arrives
 * filled from the case, and the case records that it was opened.
 */
export default function CaseActionPlans({ item, area }: { item: PqrsfCase; area: string }) {
  const id = useId();
  const router = useRouter();
  const queryClient = useQueryClient();
  const labels = usePlanLabels();
  const permissions = usePlanPermissions();
  const plans = usePlans({ case_id: item.id }, 1, 20);
  const create = useCreatePlanFromCase();

  const list = plans.data?.items ?? [];
  const canOpen = permissions.data?.can_manage === true && item.permissions.can_work;
  const suggested = item.internal_failure === true && list.length === 0;

  if (plans.isPending || (list.length === 0 && !canOpen)) return null;

  const open = () =>
    create.mutate(item.id, {
      onSuccess: (detail) => {
        toast.success(`Acción ${detail.plan.code} abierta.`);
        // The case records «Abrió la acción correctiva …».
        queryClient.invalidateQueries({ queryKey: pqrsfKeys.detail(item.id), exact: true });
        router.push(`/${area}/planes-accion/${detail.plan.id}` as Route);
      },
      onError: (error) => toast.error(errorMessage(error), { duration: Infinity }),
    });

  return (
    <section aria-labelledby={`${id}-heading`} className="space-y-3">
      <h2 id={`${id}-heading`} className="text-base font-semibold">
        Acciones correctivas
      </h2>

      {list.length > 0 && (
        <ul className="space-y-2">
          {list.map((plan) => (
            <li key={plan.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg border border-border px-3 py-2 text-sm">
              <Link href={`/${area}/planes-accion/${plan.id}` as Route} className="rounded-sm font-mono underline-offset-4 hover:underline max-md:min-h-11 max-md:leading-[2.75rem]">
                {plan.code}
              </Link>
              <span className="text-text-secondary">{labels.action_types(plan.action_type)}</span>
              <PlanStatusBadge status={plan.status} />
              <PlanEffectivenessBadge effectiveness={plan.effectiveness} />
            </li>
          ))}
        </ul>
      )}

      {suggested && (
        <p className="max-w-prose text-sm">
          El caso se finalizó con fallo en un proceso de JDH. Una acción correctiva deja el análisis y el plan para que no se repita.
        </p>
      )}

      {canOpen && (
        <Button variant={suggested ? "primary" : "outline"} size="sm" className="max-md:h-11" disabled={create.isPending} onClick={open}>
          {create.isPending ? <Loader2 className="animate-spin" aria-hidden="true" /> : <ClipboardCheck aria-hidden="true" />}
          {list.length > 0 ? "Abrir otra acción correctiva" : "Abrir acción correctiva"}
        </Button>
      )}
    </section>
  );
}
