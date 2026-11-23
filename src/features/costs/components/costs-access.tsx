"use client";

import { CloudOff, Lock, RefreshCw } from "lucide-react";

import StatePanel from "@/shared/components/state-panel";
import { Button } from "@/shared/components/ui/button";
import { errorMessage } from "@/shared/lib/api-client";

import { useCostPermissions } from "../hooks/use-costs";
import type { CostModuleKey, CostPermissions } from "../types/costs.types";

/**
 * Opens a Costos view once GET /costs/permissions says the person may read
 * it, so a role without the key sees why instead of a screen of 403s. The
 * route already checked the area's modules; this is the API's own answer.
 */
export default function CostsAccess({
  module,
  children,
}: {
  module: CostModuleKey;
  children: (permissions: CostPermissions) => React.ReactNode;
}) {
  const permissions = useCostPermissions();

  if (permissions.isPending) {
    return <div className="h-72 animate-pulse rounded-lg bg-canvas-subtle" aria-busy="true" aria-label="Cargando tus permisos" />;
  }
  if (permissions.isError) {
    return (
      <StatePanel
        icon={CloudOff}
        tone="danger"
        title="No se pudieron consultar tus permisos de Costos"
        action={
          <Button variant="outline" onClick={() => permissions.refetch()}>
            <RefreshCw aria-hidden="true" /> Reintentar
          </Button>
        }
      >
        {errorMessage(permissions.error)}
      </StatePanel>
    );
  }
  if (!permissions.data.modules[module]?.can_read) {
    return (
      <StatePanel icon={Lock} title="Tu rol no tiene acceso a esta vista">
        Pide al líder de tu área o a TI que le den a tu rol el permiso de esta vista.
      </StatePanel>
    );
  }
  return children(permissions.data);
}
