import { Lightbulb } from "lucide-react";

export default function SugerenciasPage() {
  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Sugerencias</h1>
        <p className="text-sm text-text-secondary">
          Ideas y mejoras para la plataforma, desde cualquier área.
        </p>
      </div>

      {/* Empty state: names the cause and what unblocks it. There is no form
          yet because there is nowhere to send it, and a submit button that
          drops the text on the floor is worse than no form at all. */}
      <div className="flex max-w-prose flex-col items-start gap-3 rounded-lg border border-border p-6">
        <Lightbulb className="size-8 text-text-secondary" aria-hidden="true" />
        <div className="space-y-1">
          <h2 className="text-base font-semibold">Módulo sin conectar</h2>
          <p className="text-sm text-text-secondary">
            Falta el servicio de sugerencias en{" "}
            <code className="font-mono text-xs">internal-platform-api</code>.
            Cuando exista, esta pantalla recibe la sugerencia, la asocia al área
            de quien la envía y permite seguir su estado. Mientras tanto,
            escríbele a TI.
          </p>
        </div>
      </div>
    </div>
  );
}
