"use client";

import { Lock } from "lucide-react";

import StatePanel from "@/shared/components/state-panel";

import { useSupportPermissions } from "../hooks/use-supports";

/**
 * Screens that only write (create, profiles, bulk load) are for managers. If
 * the permissions endpoint itself fails the screen still shows, and the API's
 * 403 on the write stays the real check.
 */
export default function ManagerGate({ action, children }: { action: string; children: React.ReactNode }) {
  const permissions = useSupportPermissions();
  if (permissions.isPending) {
    return <div className="h-72 animate-pulse rounded-lg bg-canvas-subtle" aria-busy="true" aria-label="Validando permisos" />;
  }
  if (permissions.data?.can_manage === false) {
    return (
      <StatePanel icon={Lock} title={`Solo los gestores de apoyos pueden ${action}`}>
        Tu usuario puede consultar el maestro de apoyos, pero no modificarlo. Si lo necesitas, pide acceso a un
        administrador de la plataforma o al área Comercial.
      </StatePanel>
    );
  }
  return children;
}
