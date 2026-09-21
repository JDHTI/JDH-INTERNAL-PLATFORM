import Link from "next/link";

import { MODULES } from "@/shared/config/modules.config";
import { cn } from "@/shared/lib/utils";

export default function HomePage() {
  const modules = MODULES.filter((module) => !module.pinned);

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Inicio</h1>
        <p className="text-sm text-text-secondary">
          Estado actual de los módulos de la plataforma.
        </p>
      </div>

      <ul className="divide-y divide-border overflow-hidden rounded-lg border border-border">
        {modules.map((module) => {
          const Icon = module.icon;

          return (
            <li key={module.id}>
              <ModuleRow
                available={module.available}
                href={module.path}
                name={module.name}
                category={module.category}
                icon={
                  <Icon
                    className="size-4 shrink-0 text-text-secondary"
                    aria-hidden="true"
                  />
                }
              />
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function ModuleRow({
  available,
  href,
  name,
  category,
  icon,
}: {
  available: boolean;
  href: string;
  name: string;
  category: string;
  icon: React.ReactNode;
}) {
  const content = (
    <>
      {icon}
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium">{name}</span>
        <span className="block truncate text-xs text-text-secondary">
          {category}
        </span>
      </span>
      <span
        className={cn(
          "shrink-0 rounded-sm px-2 py-0.5 text-xs font-medium",
          available
            ? "bg-success-surface text-success"
            : "bg-canvas-subtle text-text-secondary"
        )}
      >
        {available ? "Disponible" : "Próximamente"}
      </span>
    </>
  );

  if (!available) {
    return (
      <div className="flex items-center gap-3 px-4 py-3 opacity-60">
        {content}
      </div>
    );
  }

  return (
    <Link
      href={href}
      className="flex items-center gap-3 px-4 py-3 transition-colors duration-150 hover:bg-canvas-subtle focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring"
    >
      {content}
    </Link>
  );
}
