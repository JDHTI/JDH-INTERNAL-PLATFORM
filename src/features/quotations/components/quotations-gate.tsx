"use client";

import Link from "next/link";
import { BookOpen, CloudOff, Lock, RefreshCw } from "lucide-react";

import StatePanel from "@/shared/components/state-panel";
import { Button } from "@/shared/components/ui/button";
import { ApiError, errorMessage } from "@/shared/lib/api-client";

import { useQuotationPermissions } from "../hooks/use-quotations";

/**
 * Everything but the rules needs the commercial area (quotes), the validating
 * area (validates) or an administrator. The API enforces it too; asking first
 * avoids a screen of 403s.
 */
export default function QuotationsGate({ basePath, children }: { basePath: string; children: React.ReactNode }) {
  const permissions = useQuotationPermissions();

  if (permissions.isPending) {
    return <div className="h-72 animate-pulse rounded-lg bg-canvas-subtle" aria-busy="true" aria-label="Validando permisos" />;
  }
  if (permissions.isError) {
    return <QuotationLoadError error={permissions.error} onRetry={() => void permissions.refetch()} subject="el cotizador" />;
  }
  if (!permissions.data.can_manage && !permissions.data.can_validate) {
    return (
      <StatePanel
        icon={Lock}
        title="El cotizador es del área Comercial"
        action={
          <Link
            href={`${basePath}/reglas`}
            className="inline-flex h-9 items-center gap-1.5 rounded-md border border-border-control px-3 text-sm font-medium hover:bg-canvas-subtle focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring max-md:h-11"
          >
            <BookOpen className="size-4" aria-hidden="true" /> Ver las reglas del cotizador
          </Link>
        }
      >
        Las cotizaciones las arman los miembros del área Comercial y las valida el área BI. Si las necesitas, pide a un
        administrador de la plataforma que te agregue a una de esas áreas.
      </StatePanel>
    );
  }
  return children;
}

/** What failed, in words, and the way to try again (DESIGN.md §8). */
export function QuotationLoadError({
  error,
  onRetry,
  subject,
  action,
}: {
  error: Error;
  onRetry: () => void;
  /** "las cotizaciones", "esta cotización". */
  subject: string;
  /** Replaces the retry button, e.g. a link back to the list on a 404. */
  action?: React.ReactNode;
}) {
  const status = error instanceof ApiError ? error.status : null;
  const title =
    status === 404
      ? `No encontramos ${subject}`
      : status === 403
        ? `No tienes acceso a ${subject}`
        : status === 429
          ? "Demasiadas consultas seguidas"
          : status === 503
            ? "El datawarehouse no responde"
            : `No se pudo cargar ${subject}`;
  const description =
    status === 429
      ? "Espera unos segundos y vuelve a intentarlo."
      : status === 503
        ? `${errorMessage(error)} Las cotizaciones ya guardadas se siguen abriendo.`
        : errorMessage(error);
  return (
    <StatePanel
      icon={status === 403 ? Lock : CloudOff}
      tone="danger"
      title={title}
      action={
        action ?? (
          <Button variant="outline" onClick={onRetry}>
            <RefreshCw aria-hidden="true" /> Reintentar
          </Button>
        )
      }
    >
      {description}
    </StatePanel>
  );
}

/** The way into the rules, from the list and from each quotation. Open to everyone. */
export function QuotationRulesLink({ basePath }: { basePath: string }) {
  return (
    <Link
      href={`${basePath}/reglas`}
      className="inline-flex min-h-8 items-center gap-1.5 rounded-sm text-sm font-medium underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring max-md:min-h-11"
    >
      <BookOpen className="size-4" aria-hidden="true" /> Reglas del cotizador
    </Link>
  );
}
