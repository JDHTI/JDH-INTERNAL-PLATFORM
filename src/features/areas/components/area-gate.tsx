"use client";

import { useEffect } from "react";
import { notFound } from "next/navigation";
import { CloudOff, Lock } from "lucide-react";

import StatePanel from "@/shared/components/state-panel";
import { LAST_AREA_STORAGE_KEY } from "@/shared/config/general.config";
import { Button } from "@/shared/components/ui/button";
import { ApiError, errorMessage } from "@/shared/lib/api-client";

import { useArea } from "../hooks/use-areas";
import SessionRequired from "./session-required";

/**
 * Resolves the URL's area before rendering it. The session lives in the
 * browser (dev header today, Entra token later), so this runs client-side.
 */
export default function AreaGate({
  slug,
  children,
}: {
  slug: string;
  children: React.ReactNode;
}) {
  const { data: area, error, isPending, refetch, isRefetching } =
    useArea(slug);

  if (isPending) {
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

  if (error instanceof ApiError && error.status === 403) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-semibold tracking-tight">Sin acceso</h1>
        <StatePanel icon={Lock} title={error.detail}>
          Pídele al responsable del área o a un administrador de la plataforma
          que te agregue como miembro.
        </StatePanel>
      </div>
    );
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

  return (
    <>
      <RememberArea slug={area.slug} />
      {children}
    </>
  );
}

/** The general view's "Espacio de trabajo" returns here. */
function RememberArea({ slug }: { slug: string }) {
  useEffect(() => {
    try {
      window.localStorage.setItem(LAST_AREA_STORAGE_KEY, slug);
    } catch {
      // Blocked storage: the link falls back to the first area.
    }
  }, [slug]);
  return null;
}
