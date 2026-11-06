"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ChartColumn,
  CloudOff,
  Database,
  Lock,
  Network,
  Workflow,
  type LucideIcon,
} from "lucide-react";

import { useSession } from "@/features/session/hooks/use-session";
import { isPlatformAdmin } from "@/features/session/types/session.types";
import PageHeader from "@/shared/components/page-header";
import StatePanel from "@/shared/components/state-panel";
import { Alert } from "@/shared/components/ui/alert";
import { Button, buttonVariants } from "@/shared/components/ui/button";
import { MODULE_CATEGORIES } from "@/shared/config/areas.config";
import { ACCESS_DENIED_PARAM, WORKSPACE_PATH } from "@/shared/config/general.config";
import { ApiError, errorMessage } from "@/shared/lib/api-client";

import { useAreas } from "../hooks/use-areas";
import SessionRequired from "./session-required";

const PILLARS: { icon: LucideIcon; title: string; body: string }[] = [
  {
    icon: Database,
    title: "Datos de SIESA",
    body: "Los maestros del ERP, como productos y vendedores, se leen del datawarehouse, que se alimenta de SIESA. Se consultan aquí, sin exportar archivos.",
  },
  {
    icon: Network,
    title: "Una sola fuente",
    body: "Todas las áreas trabajan sobre los mismos datos: lo que una actualiza, las demás lo ven igual y al mismo tiempo.",
  },
  {
    icon: ChartColumn,
    title: "Reportería",
    body: "Tableros e indicadores sobre esos mismos datos. Hoy está el monitoreo del datawarehouse; los reportes de cada área se suman a medida que se construyen.",
  },
  {
    icon: Workflow,
    title: "Automatizaciones",
    body: "Tareas que corren solas, como la sincronización programada con el datawarehouse. Cada proceso repetitivo que se automatice queda aquí.",
  },
];

const NAVIGATION: { title: string; body: string }[] = [
  {
    title: "Selector de área",
    body: "Arriba en la barra lateral. Lista las áreas en las que participas; al elegir una entras a su resumen, y desde ahí mismo cambias de área.",
  },
  {
    title: "Módulos",
    body: `Debajo del selector, agrupados en ${MODULE_CATEGORIES.join(", ").replace(/, ([^,]+)$/, " y $1")}. Solo aparecen los que tu rol permite en esa área.`,
  },
  {
    title: "Barra superior",
    body: "Indica dónde estás y reúne tus tareas pendientes, las notificaciones, las notas rápidas y la ayuda.",
  },
  {
    title: "Pie de la barra",
    body: "Vuelve a la intranet, cambia entre tema claro y oscuro, y cierra la sesión.",
  },
];

/**
 * `/workspace`: what the workspace is and how to move around it. The areas
 * themselves live in the sidebar's selector, so the first visit already
 * happens in the navigation the person will use every day.
 */
export default function WorkspaceGuide() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const denied = searchParams.get(ACCESS_DENIED_PARAM) === "area";
  const { error } = useAreas();

  if (error instanceof ApiError && error.status === 401) {
    return <SessionRequired message={error.detail} />;
  }

  return (
    <div className="space-y-10">
      <PageHeader
        title="Espacio de trabajo"
        description="La plataforma corporativa donde cada área de JDH trabaja con los datos de la empresa en un solo lugar."
      />

      {denied && (
        <Alert severity="info" onDismiss={() => router.replace(WORKSPACE_PATH)}>
          No tienes acceso a esa área. Si la necesitas, pídele acceso a su responsable o a un
          administrador de la plataforma.
        </Alert>
      )}

      <StartPanel />

      <section aria-labelledby="guide-what" className="space-y-4">
        <div className="space-y-2">
          <h2 id="guide-what" className="text-lg font-semibold">
            Qué es
          </h2>
          <p className="text-sm text-text-secondary">
            Reúne el trabajo diario de las áreas que hoy está repartido entre sistemas y archivos.
            Cada área tiene sus módulos, como proyectos, cotizaciones, apoyos, PQRSF o gestión
            documental, y cada persona ve lo que su rol le permite.
          </p>
        </div>
        <ul className="grid gap-x-8 gap-y-6 border-t border-border pt-6 sm:grid-cols-2 xl:grid-cols-4">
          {PILLARS.map(({ icon: Icon, title, body }) => (
            <li key={title} className="flex gap-3">
              <Icon className="mt-0.5 size-5 shrink-0 text-text-secondary" aria-hidden="true" />
              <div className="space-y-1">
                <h3 className="text-sm font-semibold">{title}</h3>
                <p className="text-sm text-text-secondary">{body}</p>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="guide-nav" className="space-y-4">
        <div className="space-y-2">
          <h2 id="guide-nav" className="text-lg font-semibold">
            Cómo se navega
          </h2>
          <p className="text-sm text-text-secondary">
            La barra lateral es la misma en todas las áreas. En el teléfono se abre con el botón de
            menú, arriba a la izquierda.
          </p>
        </div>
        <ol className="grid gap-x-8 sm:grid-cols-2 xl:grid-cols-4">
          {NAVIGATION.map(({ title, body }, index) => (
            <li key={title} className="flex gap-4 border-t border-border py-4">
              <span
                className="tabular flex size-6 shrink-0 items-center justify-center rounded-full bg-canvas-subtle text-xs font-semibold"
                aria-hidden="true"
              >
                {index + 1}
              </span>
              <div className="space-y-1">
                <h3 className="text-sm font-semibold">{title}</h3>
                <p className="text-sm text-text-secondary">{body}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}

/** Where to start: the sidebar's selector, or why there is no area to pick. */
function StartPanel() {
  const { data: areas, error, isPending, refetch, isRefetching } = useAreas();
  const { data: user } = useSession();

  if (isPending) {
    return <div className="h-28 animate-pulse rounded-lg bg-canvas-subtle" aria-busy="true" aria-label="Cargando tus áreas" />;
  }

  if (error) {
    return (
      <StatePanel
        icon={CloudOff}
        title="No se pudieron cargar tus áreas"
        tone="danger"
        action={
          <Button variant="outline" onClick={() => refetch()} disabled={isRefetching}>
            Reintentar
          </Button>
        }
      >
        {errorMessage(error)}
      </StatePanel>
    );
  }

  if (areas.length === 0) {
    return (
      <StatePanel
        icon={Lock}
        title="Aún no participas en ninguna área"
        action={
          <Link href="/" className={buttonVariants({ variant: "outline" })}>
            Volver a la intranet
          </Link>
        }
      >
        El responsable de un área o un administrador de la plataforma puede agregarte. La intranet
        sigue disponible mientras tanto.
      </StatePanel>
    );
  }

  const scope = isPlatformAdmin(user?.role)
    ? "Como administrador de la plataforma entras a todas las áreas."
    : user?.role === "moderator"
      ? "Como moderador consultas todas las áreas, sin editar."
      : areas.length === 1
        ? `Participas en ${areas[0].name}.`
        : `Participas en ${areas.length} áreas.`;

  return (
    <div className="space-y-1 rounded-lg border border-border bg-surface p-4 md:p-5">
      <h2 className="text-base font-semibold">Empieza por tu área</h2>
      <p className="text-sm text-text-secondary">
        {scope} Entra desde «Selecciona tu área», arriba en la barra lateral.
      </p>
    </div>
  );
}
