"use client";

import PageHeader from "@/shared/components/page-header";

import { useSupportPermissions } from "../hooks/use-supports";
import RequestsBrowser from "./requests-browser";

/** Whoever reviews gets the review tray; anyone else, their own requests. The API decides which. */
export default function RequestsPage() {
  const permissions = useSupportPermissions();
  const review = permissions.data?.can_review === true;

  return (
    <div className="space-y-6">
      {permissions.isPending ? (
        <div className="h-8 w-64 animate-pulse rounded-md bg-canvas-subtle" aria-busy="true" aria-label="Validando permisos" />
      ) : review ? (
        <PageHeader title="Solicitudes de apoyo JDH" description="Revisa propuestas individuales, decide y consulta su historial." />
      ) : (
        <PageHeader title="Mis solicitudes JDH" description="Consulta el estado y las decisiones de tus solicitudes de apoyo." />
      )}
      {/* Keyed so the tray starts over on its own filters when the mode resolves. */}
      <RequestsBrowser key={review ? "review" : "own"} review={review} />
    </div>
  );
}
