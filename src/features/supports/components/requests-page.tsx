"use client";

import { useState } from "react";

import PageHeader from "@/shared/components/page-header";
import { ViewTab } from "@/shared/components/ui/view-tab";

import { useSupportPermissions } from "../hooks/use-supports";
import InternalRequestsBrowser from "./internal-requests-browser";
import RequestsBrowser from "./requests-browser";

type View = "internal" | "jdh";

/**
 * Two kinds of request live here: the internal supports asked from the quoter
 * (BI decides them) and the older JDH adjustments on an existing support. The
 * API decides who reviews and who only sees their own, per kind.
 */
export default function RequestsPage() {
  const permissions = useSupportPermissions();
  const data = permissions.data;
  const reviewInternal = data?.can_review_internal === true;
  const internal = reviewInternal || data?.can_request_internal === true;
  const reviewJdh = data?.can_review === true;
  const jdh = reviewJdh || data?.can_request === true;
  const [chosen, setChosen] = useState<View>("internal");
  const view: View = internal && jdh ? chosen : internal ? "internal" : "jdh";

  if (permissions.isPending) {
    return <div className="h-8 w-64 animate-pulse rounded-md bg-canvas-subtle" aria-busy="true" aria-label="Validando permisos" />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Solicitudes de apoyo"
        description={
          reviewInternal || reviewJdh
            ? "Revisa los apoyos que piden desde las cotizaciones, decide y consulta su historial."
            : "Consulta el estado y las decisiones de los apoyos que pediste."
        }
      />
      {internal && jdh && (
        <div role="tablist" aria-label="Tipo de solicitud" className="flex gap-1 border-b border-border">
          <ViewTab selected={view === "internal"} onSelect={() => setChosen("internal")} controls="requests-internal">
            Apoyo interno
          </ViewTab>
          <ViewTab selected={view === "jdh"} onSelect={() => setChosen("jdh")} controls="requests-jdh">
            Ajustes JDH
          </ViewTab>
        </div>
      )}
      {view === "internal" ? (
        <div id="requests-internal" role={internal && jdh ? "tabpanel" : undefined}>
          <InternalRequestsBrowser key={reviewInternal ? "review" : "own"} review={reviewInternal} />
        </div>
      ) : (
        <div id="requests-jdh" role={internal && jdh ? "tabpanel" : undefined}>
          {/* Keyed so the tray starts over on its own filters when the mode resolves. */}
          <RequestsBrowser key={reviewJdh ? "review" : "own"} review={reviewJdh} />
        </div>
      )}
    </div>
  );
}
