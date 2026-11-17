"use client";

import { useState } from "react";
import { CloudOff } from "lucide-react";

import StatePanel from "@/shared/components/state-panel";
import { Button } from "@/shared/components/ui/button";
import { ApiError, errorMessage } from "@/shared/lib/api-client";

import { usePqrsfSites, useUpdatePqrsfSite } from "../hooks/use-pqrsf";
import type { PqrsfSiteAdmin } from "../types/pqrsf.types";
import { ActiveBadge, Actions, EditButton, EditDialog, SettingsTable } from "./settings-parts";

const OM_CODE = /^[A-Za-z]{3}$/;

/**
 * The sites of the PQRSF catalog (the letters of the consecutive), with what the
 * improvement opportunity prints of each: its city, its address and the three
 * letters of its OM code («1181BOG»). Without the OM code a site cannot fill an OM.
 */
export default function PqrsfSitesAdmin() {
  const sites = usePqrsfSites();
  const update = useUpdatePqrsfSite();
  const [editing, setEditing] = useState<PqrsfSiteAdmin | null>(null);

  if (sites.isPending) {
    return (
      <div className="h-40 animate-pulse rounded-lg bg-canvas-subtle" aria-busy="true">
        <span className="sr-only">Cargando las sedes de PQRSF</span>
      </div>
    );
  }
  if (sites.isError) {
    return (
      <StatePanel
        icon={CloudOff}
        tone="danger"
        title="No se cargaron las sedes de PQRSF"
        action={
          <Button variant="outline" onClick={() => sites.refetch()}>
            Reintentar
          </Button>
        }
      >
        {errorMessage(sites.error)}
      </StatePanel>
    );
  }

  return (
    <>
      <SettingsTable
        caption="La ciudad, la dirección y el código de OM salen impresos en la oportunidad de mejora que se envía a un proveedor. El código son 3 letras, como BOG."
        headers={[{ label: "Sede" }, { label: "Ciudad" }, { label: "Dirección" }, { label: "Código de OM" }]}
      >
        {sites.data.map((site) => (
          <tr key={site.id}>
            <td className="px-3 py-2">
              <span className="flex flex-wrap items-center gap-2 font-medium">
                {site.name}
                {!site.is_active && <ActiveBadge active={false} />}
              </span>
              <span className="block font-mono text-[13px] text-text-secondary">{site.abbreviation}</span>
            </td>
            <td className="px-3 py-2">{site.city ?? <span className="text-text-secondary">Sin ciudad</span>}</td>
            <td className="px-3 py-2">{site.address ?? <span className="text-text-secondary">Sin dirección</span>}</td>
            <td className="px-3 py-2 font-mono">
              {site.om_code ?? <span className="font-sans text-text-secondary">Sin código</span>}
            </td>
            <Actions>
              <EditButton label={site.name} onClick={() => setEditing(site)} />
            </Actions>
          </tr>
        ))}
      </SettingsTable>

      {editing && (
        <EditDialog
          title={`Datos de OM de ${editing.name}`}
          isCreate={false}
          fields={[
            { key: "city", label: "Ciudad", kind: "text", optional: true, maxLength: 80 },
            { key: "address", label: "Dirección", kind: "text", optional: true, maxLength: 200 },
            {
              key: "om_code",
              label: "Código de OM",
              kind: "text",
              optional: true,
              maxLength: 3,
              hint: "Tres letras sin tildes, por ejemplo BOG. Cada sede lleva el suyo. Vacío, la sede no puede generar OM.",
            },
          ]}
          initial={{ city: editing.city ?? "", address: editing.address ?? "", om_code: editing.om_code ?? "" }}
          onSubmit={(values, changed) => {
            const code = String(values.om_code ?? "").trim();
            if (changed.includes("om_code") && code && !OM_CODE.test(code)) {
              return Promise.reject(new ApiError(422, "El código de OM son 3 letras, sin tildes ni números."));
            }
            const input: Partial<Pick<PqrsfSiteAdmin, "city" | "address" | "om_code">> = {};
            for (const key of changed) {
              // An empty text clears it: the API takes null for that.
              const text = String(values[key] ?? "").trim();
              if (key === "om_code") input.om_code = text ? text.toUpperCase() : null;
              if (key === "city") input.city = text || null;
              if (key === "address") input.address = text || null;
            }
            return update.mutateAsync({ id: editing.id, input });
          }}
          onClose={() => setEditing(null)}
        />
      )}
    </>
  );
}
