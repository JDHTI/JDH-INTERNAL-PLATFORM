"use client";

import { CloudOff } from "lucide-react";

import StatePanel from "@/shared/components/state-panel";
import { Button } from "@/shared/components/ui/button";

/** The workspace could not check the session or load the area: the API did not answer. */
export default function WorkspaceError({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="space-y-6 p-6">
      <h1 className="text-2xl font-semibold tracking-tight">No se pudo abrir el espacio de trabajo</h1>
      <StatePanel
        icon={CloudOff}
        title="La plataforma no respondió"
        tone="danger"
        action={
          <Button variant="outline" onClick={() => reset()}>
            Reintentar
          </Button>
        }
      >
        Revisa tu conexión e intenta de nuevo. Si sigue sin responder, avísale a TI.
      </StatePanel>
    </div>
  );
}
