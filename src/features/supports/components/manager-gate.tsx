"use client";

import { Lock } from "lucide-react";

import StatePanel from "@/shared/components/state-panel";

import { useSupportPermissions } from "../hooks/use-supports";

/** Write screens open only when the API says the caller manages supports, whatever the area. */
export default function ManagerGate({ action, children }: { action: string; children: React.ReactNode }) {
  const permissions = useSupportPermissions();
  if (permissions.isPending) {
    return <div className="h-72 animate-pulse rounded-lg bg-canvas-subtle" aria-busy="true" aria-label="Validando permisos" />;
  }
  if (permissions.data?.can_manage !== true) {
    return (
      <StatePanel icon={Lock} title={`Solo los gestores de apoyos pueden ${action}`}>
        Tu usuario puede consultar el maestro de apoyos, pero no modificarlo. Si lo necesitas, pide acceso a un
        administrador de la plataforma o al área BI.
      </StatePanel>
    );
  }
  return children;
}
