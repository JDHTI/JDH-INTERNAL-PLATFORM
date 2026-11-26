"use client";

import { CloudOff, Lock, RefreshCw } from "lucide-react";

import StatePanel from "@/shared/components/state-panel";
import { Button } from "@/shared/components/ui/button";
import { errorMessage } from "@/shared/lib/api-client";

import { useServiceLevelPermissions } from "../hooks/use-service-level";
import type { ServiceLevelModuleKey, ServiceLevelPermissions } from "../types/service-level.types";

/**
 * Opens a view once GET /service-level/permissions says the person may read
 * it, so a role without the key sees why instead of a screen of 403s.
 */
export default function ServiceLevelAccess({
  module,
  children,
}: {
  module: ServiceLevelModuleKey;
  children: (permissions: ServiceLevelPermissions) => React.ReactNode;
}) {
  const permissions = useServiceLevelPermissions();

  if (permissions.isPending) {
    return <div className="h-72 animate-pulse rounded-lg bg-canvas-subtle" aria-busy="true" aria-label="Cargando tus permisos" />;
  }
  if (permissions.isError) {
    return (
      <StatePanel
        icon={CloudOff}
        tone="danger"
        title="No se pudieron consultar tus permisos de Nivel de servicio"
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
