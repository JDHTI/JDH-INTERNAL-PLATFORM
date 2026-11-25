"use client";

import { CloudOff, Lock, RefreshCw } from "lucide-react";

import StatePanel from "@/shared/components/state-panel";
import { Button } from "@/shared/components/ui/button";
import { errorMessage } from "@/shared/lib/api-client";

import { useCostSettings, useCostSettingsPermissions } from "../hooks/use-cost-settings";
import BranchRulesBlock from "./branch-rules-block";
import ChangesBlock from "./changes-block";
import ParametersBlock from "./parameters-block";

function LoadError({ error, onRetry, subject }: { error: Error; onRetry: () => void; subject: string }) {
  return (
    <StatePanel
      icon={CloudOff}
      tone="danger"
      title={`No se pudo cargar ${subject}`}
      action={
        <Button variant="outline" onClick={onRetry}>
          <RefreshCw aria-hidden="true" /> Reintentar
        </Button>
      }
    >
      {errorMessage(error)}
    </StatePanel>
  );
}

/**
 * «Ajuste de costos»: the quoter's cost rules in one place. The permissions come first (open:
 * false, not a 403), so whoever cannot read sees why; without `can_manage` everything is read-only.
 */
export default function CostSettingsScreen() {
  const permissions = useCostSettingsPermissions();
  const canRead = permissions.data?.can_read === true;
  const settings = useCostSettings(canRead);

  if (permissions.isPending || (canRead && settings.isPending)) {
    return <div className="h-96 animate-pulse rounded-lg bg-canvas-subtle" aria-busy="true" aria-label="Cargando el ajuste de costos" />;
  }
  if (permissions.isError) {
    return <LoadError error={permissions.error} onRetry={() => void permissions.refetch()} subject="tus permisos del ajuste de costos" />;
  }
  if (!canRead) {
    return (
      <StatePanel icon={Lock} title="No tienes acceso al ajuste de costos">
        Tu rol en el área no incluye este módulo. Pídelo al líder del área.
      </StatePanel>
    );
  }
  if (settings.isError && !settings.data) {
    return <LoadError error={settings.error} onRetry={() => void settings.refetch()} subject="el ajuste de costos" />;
  }

  const data = settings.data!;
  const canManage = data.can_manage && permissions.data?.can_manage === true;
  return (
    <div className="space-y-8">
      <ParametersBlock parameters={data.parameters} canManage={canManage} />
      <BranchRulesBlock rules={data.branch_rules} canManage={canManage} />
      <ChangesBlock changes={data.changes} parameters={data.parameters} />
    </div>
  );
}
