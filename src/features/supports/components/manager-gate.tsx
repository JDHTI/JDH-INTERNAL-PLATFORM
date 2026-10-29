"use client";

import { usePathname } from "next/navigation";

import { Lock } from "lucide-react";

import StatePanel from "@/shared/components/state-panel";

import { useSupportPermissions } from "../hooks/use-supports";

/**
 * Administrative screens require confirmed permission outside Commercial.
 */
export default function ManagerGate({ action, children }: { action: string; children: React.ReactNode }) {
  const permissions = useSupportPermissions();
  const commercial = usePathname().startsWith("/comercial/");
  if (permissions.isPending) {
    return <div className="h-72 animate-pulse rounded-lg bg-canvas-subtle" aria-busy="true" aria-label="Validando permisos" />;
  }
  if (commercial || permissions.data?.can_manage !== true) {
    return (
      <StatePanel icon={Lock} title={`Solo los gestores de apoyos pueden ${action}`}>
        Tu usuario puede consultar el maestro de apoyos, pero no modificarlo. Si lo necesitas, pide acceso a un
        administrador de la plataforma o al área BI.
      </StatePanel>
    );
  }
  return children;
}
