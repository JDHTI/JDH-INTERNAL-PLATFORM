"use client";

import { Lock } from "lucide-react";

import SessionRequired from "@/features/areas/components/session-required";
import { useSession } from "@/features/session/hooks/use-session";
import { isPlatformAdmin } from "@/features/session/types/session.types";
import StatePanel from "@/shared/components/state-panel";
import { ApiError, errorMessage } from "@/shared/lib/api-client";

export default function AdminGate({ children }: { children: React.ReactNode }) {
  const { data: user, error, isPending } = useSession();

  if (isPending) {
    return (
      <div className="space-y-3" aria-busy="true" aria-label="Cargando panel administrador">
        <div className="h-8 w-64 animate-pulse rounded-md bg-canvas-subtle" />
        <div className="h-20 animate-pulse rounded-lg bg-canvas-subtle" />
      </div>
    );
  }

  if (error instanceof ApiError && error.status === 401) {
    return <SessionRequired message={error.detail} />;
  }

  if (error) {
    return (
      <StatePanel icon={Lock} title="No se pudo validar tu sesión" tone="danger">
        {errorMessage(error)}
      </StatePanel>
    );
  }

  if (!user || !isPlatformAdmin(user.role)) {
    return (
      <StatePanel icon={Lock} title="No tienes permisos de administrador">
        Este espacio está reservado para la administración global de la plataforma.
      </StatePanel>
    );
  }

  return children;
}
