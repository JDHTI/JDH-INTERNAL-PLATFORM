"use client";

import { useState } from "react";

import { HandCoins } from "lucide-react";

import PageHeader from "@/shared/components/page-header";
import StatePanel from "@/shared/components/state-panel";
import { Button } from "@/shared/components/ui/button";

import { useSupportPermissions } from "../hooks/use-supports";
import { ToggleChip } from "@/shared/components/ui/toggle-chip";

import InternalRequestsBrowser from "./internal-requests-browser";
import JdhRequestsCleanup from "./jdh-requests-cleanup";
import MarginRequestDialog from "./margin-request-dialog";

/**
 * The internal supports asked from the quoter or from here (BI decides them).
 * The older JDH adjustments on an existing support no longer have a tray: one
 * kind of request, one list. The API decides who reviews and who only sees
 * their own.
 */
export default function RequestsPage() {
  const permissions = useSupportPermissions();
  const data = permissions.data;
  const review = data?.can_review_internal === true;
  const allowed = review || data?.can_request_internal === true;
  // Whoever quotes asks (BI, who approves, does not): by customer and reference, with no quotation.
  const canAskMargin = data?.can_request_internal === true && !review;
  const [asking, setAsking] = useState(false);
  // The old JDH requests come back only for whoever may delete them, in a tab of their own.
  const canDelete = data?.can_delete === true;
  const [tab, setTab] = useState<"internas" | "jdh">("internas");

  if (permissions.isPending) {
    return <div className="h-8 w-64 animate-pulse rounded-md bg-canvas-subtle" aria-busy="true" aria-label="Validando permisos" />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Solicitudes de apoyo"
        description={
          review
            ? "Revisa los apoyos que piden desde las cotizaciones, decide y consulta su historial."
            : "Consulta el estado y las decisiones de los apoyos que pediste."
        }
        aside={
          canAskMargin ? (
            <Button onClick={() => setAsking(true)} className="max-sm:h-11">
              <HandCoins aria-hidden="true" /> Pedir margen autorizado
            </Button>
          ) : undefined
        }
      />
      <MarginRequestDialog open={asking} onClose={() => setAsking(false)} />
      {canDelete && (
        <div role="group" aria-label="Qué solicitudes" className="flex flex-wrap gap-2">
          <ToggleChip active={tab === "internas"} onClick={() => setTab("internas")}>
            Apoyos internos
          </ToggleChip>
          <ToggleChip active={tab === "jdh"} onClick={() => setTab("jdh")}>
            Solicitudes JDH anteriores
          </ToggleChip>
        </div>
      )}
      {canDelete && tab === "jdh" ? (
        <JdhRequestsCleanup />
      ) : allowed ? (
        <InternalRequestsBrowser key={review ? "review" : "own"} review={review} />
      ) : (
        <StatePanel icon={HandCoins} title="Sin acceso a las solicitudes">
          Tu rol no pide ni revisa apoyos internos. Si los necesitas, pídele el permiso al administrador del área.
        </StatePanel>
      )}
    </div>
  );
}
