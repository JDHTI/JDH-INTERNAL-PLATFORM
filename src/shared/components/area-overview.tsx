"use client";

import { Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

import { useArea } from "@/features/areas/hooks/use-areas";
import { useSession } from "@/features/session/hooks/use-session";
import { isPlatformAdmin } from "@/features/session/types/session.types";
import { Alert } from "@/shared/components/ui/alert";
import {
  moduleHref,
  visibleModules,
  type ModuleItem,
} from "@/shared/config/areas.config";
import { ACCESS_DENIED_PARAM } from "@/shared/config/general.config";
import { cn } from "@/shared/lib/utils";

/**
 * Landing screen for an area: what the area covers and the real status of
 * every module the person's role lets them see. The statuses are the catalog
 * itself, not a summary of data that does not exist yet, so there is nothing
 * here to invent. Rendered inside AreaGate, so the area is already cached
 * when this mounts.
 */
export default function AreaOverview({ slug }: { slug: string }) {
  const { data: area } = useArea(slug);
  const { data: user } = useSession();
  if (!area) return null;

  // Never empty: the document manager is generated for every area.
  const modules = visibleModules(area, isPlatformAdmin(user?.role));
  const availableCount = modules.filter((module) => module.available).length;

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">{area.name}</h1>
        {area.responsible && (
          <p className="text-sm text-text-secondary">
            Responsable:{" "}
            <span className="text-text-primary">
              {area.responsible.display_name ?? area.responsible.email}
            </span>
          </p>
        )}
      </div>

      <Suspense>
        <ModuleDeniedNotice path={area.path} />
      </Suspense>

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
    </div>
  );
}

/** Shown when AreaGate sent the person here from a module their role does not grant. */
function ModuleDeniedNotice({ path }: { path: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  if (searchParams.get(ACCESS_DENIED_PARAM) !== "modulo") return null;
  return (
    <Alert severity="info" onDismiss={() => router.replace(path)}>
      Tu rol en esta área no incluye ese módulo. Si lo necesitas, pídeselo al responsable del área
      o a un administrador de la plataforma.
    </Alert>
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
      href={moduleHref(module)}
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
