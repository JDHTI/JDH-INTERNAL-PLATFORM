"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { CloudOff, Lock } from "lucide-react";

import SessionRequired from "@/features/areas/components/session-required";
import { useAreas } from "@/features/areas/hooks/use-areas";
import StatePanel from "@/shared/components/state-panel";
import { Button } from "@/shared/components/ui/button";
import { ApiError, errorMessage } from "@/shared/lib/api-client";

/**
 * Every screen belongs to an area, so the root has no content of its own and
 * hands off to the user's first area, in the order the API returns them.
 */
export default function RootPage() {
  const router = useRouter();
  const { data: areas, error, isPending, refetch, isRefetching } = useAreas();
  const first = areas?.[0];

  useEffect(() => {
    if (first) router.replace(first.path);
  }, [first, router]);

  if (isPending || first) {
    return (
      <div className="space-y-3" aria-busy="true" aria-label="Cargando áreas">
        <div className="h-8 w-48 animate-pulse rounded-md bg-canvas-subtle" />
        <div className="h-4 w-80 max-w-full animate-pulse rounded-sm bg-canvas-subtle" />
      </div>
    );
  }

  if (error instanceof ApiError && error.status === 401) {
    return <SessionRequired message={error.detail} />;
  }

  if (error) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-semibold tracking-tight">
          No se pudieron cargar tus áreas
        </h1>
        <StatePanel
          icon={CloudOff}
          title="La plataforma no respondió"
          tone="danger"
          action={
            <Button
              variant="outline"
              onClick={() => refetch()}
              disabled={isRefetching}
            >
              Reintentar
            </Button>
          }
        >
          {errorMessage(error)}
        </StatePanel>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">Sin áreas asignadas</h1>
      <StatePanel icon={Lock} title="Todavía no perteneces a ninguna área">
        Tu cuenta entró a la plataforma, pero nadie la ha agregado a un área.
        Pídele al responsable de tu área o a un administrador de la plataforma
        que te agregue como miembro.
      </StatePanel>
    </div>
  );
}
