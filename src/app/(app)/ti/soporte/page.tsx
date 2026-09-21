import { LifeBuoy } from "lucide-react";

export default function SoporteTiPage() {
  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">
          Solicitudes de soporte
        </h1>
        <p className="text-sm text-text-secondary">
          Incidencias de equipos, accesos y sistemas de la compañía.
        </p>
      </div>

      {/* Empty state: names the cause and what unblocks it, and does not
          invent a contact address or ticketing channel that doesn't exist
          yet (R-38). This is the real destination the header's help icon
          links to, so it points the user at a person rather than a form
          that has nowhere to send its data. */}
      <div className="flex max-w-prose flex-col items-start gap-3 rounded-lg border border-border p-6">
        <LifeBuoy className="size-8 text-text-secondary" aria-hidden="true" />
        <div className="space-y-1">
          <h2 className="text-base font-semibold">Módulo sin conectar</h2>
          <p className="text-sm text-text-secondary">
            Todavía no hay un sistema de tickets conectado a la plataforma.
            Cuando exista, esta pantalla registra la solicitud, la asigna a un
            miembro de TI y permite seguir su estado. Mientras tanto,
            contacta directamente a tu compañero de TI.
          </p>
        </div>
      </div>
    </div>
  );
}
