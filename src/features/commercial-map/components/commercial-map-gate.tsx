"use client";

import { CloudOff, Lock, RefreshCw } from "lucide-react";

import StatePanel from "@/shared/components/state-panel";
import { Button } from "@/shared/components/ui/button";
import { errorMessage } from "@/shared/lib/api-client";

import { useTerritoryPermissions } from "../hooks/use-commercial-map";
import type { TerritoryPermissions } from "../types/commercial-map.types";

/**
 * Asks the API what the person may do before drawing anything. The API
 * enforces it on every call; asking first avoids a map over a wall of 403s.
 */
export default function CommercialMapGate({
  children,
}: {
  children: (permissions: TerritoryPermissions) => React.ReactNode;
}) {
  const permissions = useTerritoryPermissions();

  if (permissions.isPending) {
    return (
      <div className="h-96 animate-pulse rounded-lg bg-canvas-subtle" aria-busy="true">
        <span className="sr-only">Validando tus permisos en el mapa comercial</span>
      </div>
    );
  }
  if (permissions.isError) {
    return (
      <StatePanel
        icon={CloudOff}
        tone="danger"
        title="No se pudo abrir el mapa comercial"
        action={
          <Button variant="outline" onClick={() => void permissions.refetch()}>
            <RefreshCw aria-hidden="true" /> Reintentar
          </Button>
        }
      >
        {errorMessage(permissions.error)}
      </StatePanel>
    );
  }
  if (!permissions.data.can_read) {
    return (
      <StatePanel icon={Lock} title="Tu rol no tiene acceso al mapa comercial">
        El mapa, las zonas y las rutas los ve quien tenga el permiso del módulo Mapa comercial en esta área. Pídele a
        un administrador de la plataforma que se lo dé a tu rol.
      </StatePanel>
    );
  }
  return children(permissions.data);
}
