"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { CloudOff, Lock } from "lucide-react";

import { useSession } from "@/features/session/hooks/use-session";
import { isPlatformAdmin } from "@/features/session/types/session.types";
import PageHeader from "@/shared/components/page-header";
import StatePanel from "@/shared/components/state-panel";
import { Alert } from "@/shared/components/ui/alert";
import { Button, buttonVariants } from "@/shared/components/ui/button";
import { visibleModules } from "@/shared/config/areas.config";
import { ACCESS_DENIED_PARAM, WORKSPACE_PATH } from "@/shared/config/general.config";
import { ApiError, errorMessage } from "@/shared/lib/api-client";
import { cn } from "@/shared/lib/utils";

import { useAreas } from "../hooks/use-areas";
import type { Area } from "../types/area.types";
import SessionRequired from "./session-required";

/**
 * The hub behind "Mi espacio de trabajo": one card per area the person may
 * enter. The API already filtered the list, so whoever lands here from an
 * area they cannot open sees the same cards plus a notice. Always shown,
 * even with a single area, so the way in is the same for everyone.
 */
export default function WorkspaceHub() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const denied = searchParams.get(ACCESS_DENIED_PARAM) === "area";
  const { data: areas, error, isPending, refetch, isRefetching } = useAreas();
  const { data: user } = useSession();
  const isAdmin = isPlatformAdmin(user?.role);
  const isModerator = user?.role === "moderator";

  if (error instanceof ApiError && error.status === 401) {
    return <SessionRequired message={error.detail} />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Espacio de trabajo"
        description={
          isAdmin
            ? "Como administrador de la plataforma entras a todas las áreas."
            : isModerator
              ? "Como moderador puedes consultar todas las áreas, sin editar."
              : "Las áreas en las que participas. Entra a una para trabajar en sus módulos."
        }
      />

      {denied && (
        <Alert severity="info" onDismiss={() => router.replace(WORKSPACE_PATH)}>
          No tienes acceso a esa área. Si la necesitas, pídele acceso a su responsable o a un
          administrador de la plataforma.
        </Alert>
      )}

      {isPending ? (
        <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3" aria-busy="true" aria-label="Cargando áreas">
          {[0, 1, 2].map((row) => (
            <li key={row} className="h-32 animate-pulse rounded-lg bg-canvas-subtle" />
          ))}
        </ul>
      ) : error ? (
        <StatePanel
          icon={CloudOff}
          title="No se pudieron cargar tus áreas"
          tone="danger"
          action={
            <Button variant="outline" onClick={() => refetch()} disabled={isRefetching}>
              Reintentar
            </Button>
          }
        >
          {errorMessage(error)}
        </StatePanel>
      ) : areas.length === 0 ? (
        <StatePanel
          icon={Lock}
          title="Aún no participas en ninguna área"
          action={
            <Link href="/" className={buttonVariants({ variant: "outline" })}>
              Volver a la vista general
            </Link>
          }
        >
          El responsable de un área o un administrador de la plataforma puede agregarte. La vista
          general sigue disponible mientras tanto.
        </StatePanel>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {areas.map((area) => (
            <li key={area.id}>
              <AreaCard area={area} isAdmin={isAdmin} isModerator={isModerator} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function roleLine(area: Area, isAdmin: boolean, isModerator: boolean): string {
  if (area.isResponsible) return "Responsable del área";
  if (area.myRole) return area.myRole.name;
  if (isAdmin) return "Administración de la plataforma";
  if (isModerator) return "Solo lectura";
  return "Miembro";
}

function AreaCard({
  area,
  isAdmin,
  isModerator,
}: {
  area: Area;
  isAdmin: boolean;
  isModerator: boolean;
}) {
  const Icon = area.icon;
  const available = visibleModules(area, isAdmin).filter((module) => module.available).length;

  return (
    <Link
      href={area.path}
      className={cn(
        "flex h-full flex-col gap-3 rounded-lg border border-border bg-surface p-4 transition-colors duration-150",
        "hover:bg-canvas-subtle",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
      )}
    >
      <span className="flex items-center gap-3">
        <span
          className="flex size-10 shrink-0 items-center justify-center rounded-md bg-primary-subtle text-primary"
          aria-hidden="true"
        >
          <Icon className="size-5" />
        </span>
        <span className="min-w-0">
          <span className="block truncate text-base font-semibold">{area.name}</span>
          <span className="block truncate text-xs text-text-secondary">
            {roleLine(area, isAdmin, isModerator)}
          </span>
        </span>
      </span>
      {area.remit && (
        <span className="line-clamp-2 text-sm text-text-secondary">{area.remit}</span>
      )}
      <span className="mt-auto text-xs text-text-secondary">
        {available === 1 ? "1 módulo disponible" : `${available} módulos disponibles`}
      </span>
    </Link>
  );
}
