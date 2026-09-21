import Link from "next/link";

import {
  findAreaById,
  getModulesByArea,
  type ModuleItem,
} from "@/shared/config/areas.config";
import { cn } from "@/shared/lib/utils";

/**
 * Landing screen for an area: what the area covers and the real status of
 * every module in it. The statuses are the catalog itself, not a summary of
 * data that does not exist yet, so there is nothing here to invent.
 */
export default function AreaOverview({ areaId }: { areaId: string }) {
  const area = findAreaById(areaId);

  if (!area) {
    throw new Error(`Área desconocida: ${areaId}`);
  }

  const modules = getModulesByArea(area.id);
  const availableCount = modules.filter((module) => module.available).length;

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">{area.name}</h1>
        <p className="text-sm text-text-secondary">{area.remit}</p>
      </div>

      {modules.length === 0 ? (
        <div className="rounded-lg border border-border p-6">
          <h2 className="text-base font-semibold">Sin módulos declarados</h2>
          <p className="mt-1 max-w-prose text-sm text-text-secondary">
            Esta área todavía no tiene módulos en el catálogo. Se agregan en{" "}
            <code className="font-mono text-xs">
              src/shared/config/areas.config.ts
            </code>
            , junto con su ruta.
          </p>
        </div>
      ) : (
        <section className="space-y-3">
          <h2 className="text-sm font-medium text-text-secondary">
            {availableCount} de {modules.length}{" "}
            {modules.length === 1 ? "módulo disponible" : "módulos disponibles"}
          </h2>

          <ul className="divide-y divide-border overflow-hidden rounded-lg border border-border">
            {modules.map((module) => (
              <li key={module.id}>
                <ModuleRow module={module} />
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function ModuleRow({ module }: { module: ModuleItem }) {
  const Icon = module.icon;

  const content = (
    <>
      <Icon
        className="size-4 shrink-0 text-text-secondary"
        aria-hidden="true"
      />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium">
          {module.name}
        </span>
        <span className="block truncate text-xs text-text-secondary">
          {module.category}
        </span>
      </span>
      <span
        className={cn(
          "shrink-0 rounded-sm px-2 py-0.5 text-xs font-medium",
          module.available
            ? "bg-success-surface text-success"
            : "bg-canvas-subtle text-text-secondary"
        )}
      >
        {module.available ? "Disponible" : "Próximamente"}
      </span>
    </>
  );

  if (!module.available) {
    return (
      <div className="flex items-center gap-3 px-4 py-3 opacity-60">
        {content}
      </div>
    );
  }

  return (
    <Link
      href={module.path}
      className={cn(
        "flex items-center gap-3 px-4 py-3 transition-colors duration-150",
        "hover:bg-canvas-subtle",
        "focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring"
      )}
    >
      {content}
    </Link>
  );
}
