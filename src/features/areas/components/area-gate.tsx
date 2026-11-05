"use client";

import { useEffect } from "react";
import { notFound, usePathname, useRouter } from "next/navigation";
import { CloudOff } from "lucide-react";

import StatePanel from "@/shared/components/state-panel";
import {
  activeModuleId,
  getModulesByArea,
  type ModuleItem,
} from "@/shared/config/areas.config";
import { ACCESS_DENIED_PARAM, WORKSPACE_PATH } from "@/shared/config/general.config";
import { Button } from "@/shared/components/ui/button";
import { ApiError, errorMessage } from "@/shared/lib/api-client";

import { useArea } from "../hooks/use-areas";
import { canUseModule, type Area } from "../types/area.types";
import SessionRequired from "./session-required";

/**
 * The module the route belongs to when the person's role does not grant it.
 * Administration is left to AdminGate, which answers by global role.
 */
function deniedModule(area: Area, pathname: string): ModuleItem | null {
  const modules = getModulesByArea(area.slug);
  const current = modules.find((candidate) => candidate.id === activeModuleId(modules, pathname));
  if (!current || current.adminOnly) return null;
  return canUseModule(area, current.permission) ? null : current;
}

/**
 * Resolves the URL's area before rendering it. The server layout already
 * turned away whoever has no session or no access; this runs again on the
 * client because it also decides module by module as the person navigates
 * inside the area, which a layout does not see.
 */
export default function AreaGate({
  slug,
  children,
}: {
  slug: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { data: area, error, isPending, refetch, isRefetching } =
    useArea(slug);

  const forbidden = error instanceof ApiError && error.status === 403;
  const blocked = area ? deniedModule(area, pathname) : null;

  useEffect(() => {
    if (forbidden) router.replace(`${WORKSPACE_PATH}?${ACCESS_DENIED_PARAM}=area`);
  }, [forbidden, router]);

  useEffect(() => {
    if (area && blocked) router.replace(`${area.path}?${ACCESS_DENIED_PARAM}=modulo`);
  }, [area, blocked, router]);

  if (isPending || forbidden || blocked) {
    return (
      <div className="space-y-3" aria-busy="true" aria-label="Cargando área">
        <div className="h-8 w-48 animate-pulse rounded-md bg-canvas-subtle" />
        <div className="h-4 w-80 max-w-full animate-pulse rounded-sm bg-canvas-subtle" />
      </div>
    );
  }

  if (error instanceof ApiError && error.status === 404) notFound();

  if (error instanceof ApiError && error.status === 401) {
    return <SessionRequired message={error.detail} />;
  }

  if (error || !area) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-semibold tracking-tight">
          No se pudo abrir el área
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

  return children;
}
