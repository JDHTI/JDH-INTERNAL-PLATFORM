import { notFound } from "next/navigation";
import { MessageSquareWarning } from "lucide-react";

import { isAvailableModule } from "@/shared/config/areas.config";

export default async function PqrsfPage({
  params,
}: {
  params: Promise<{ area: string }>;
}) {
  const { area } = await params;
  if (!isAvailableModule(area, "pqrsf")) notFound();

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">PQRSF</h1>
        <p className="text-sm text-text-secondary">
          Peticiones, quejas, reclamos, sugerencias y felicitaciones.
        </p>
      </div>

      {/* Empty state: names the cause and what unblocks it, rather than a bare
          "no data". There is no create action yet because there is no backend
          to create against, and a button that does nothing is worse than none. */}
      <div className="flex flex-col items-start gap-3 rounded-lg border border-border p-6">
        <MessageSquareWarning
          className="size-8 text-text-secondary"
          aria-hidden="true"
        />
        <div className="space-y-1">
          <h2 className="text-base font-semibold">Módulo sin conectar</h2>
          <p className="max-w-prose text-sm text-text-secondary">
            La interfaz del módulo todavía no consume datos: falta el servicio de
            PQRSF en <code className="font-mono text-xs">internal-platform-api</code>.
            Cuando exista el endpoint, esta pantalla pasa a listar los casos con
            su radicado, estado y vencimiento de SLA.
          </p>
        </div>
      </div>
    </div>
  );
}
