"use client";

import { useState } from "react";
import Link from "next/link";
import { AppWindow, Loader2, MoreHorizontal, Pencil, Plus, Power, RefreshCw, Trash2 } from "lucide-react";
import { toast } from "sonner";

import PageHeader from "@/shared/components/page-header";
import StatePanel from "@/shared/components/state-panel";
import TableSkeleton from "@/shared/components/table-skeleton";
import { Button, buttonVariants } from "@/shared/components/ui/button";
import ConfirmDeleteDialog from "@/shared/components/ui/confirm-delete-dialog";
import { Menu, MenuItem, MenuSeparator } from "@/shared/components/ui/menu";
import { errorMessage } from "@/shared/lib/api-client";
import { cn } from "@/shared/lib/utils";

import { useAppOverview, useCheckApplication, useDeleteApplication, useUpdateApplication } from "../hooks/use-app-monitoring";
import { appsPath } from "../lib/format";
import type { Aplicativo } from "../types/app-monitoring.types";
import ApplicationDialog from "./application-dialog";
import { announceCheck, ApplicationBadge, CheckCycle, LoadError, TargetLine } from "./parts";

const thead = "bg-canvas-subtle text-[11px] font-semibold uppercase tracking-[0.06em] text-text-secondary";

const nameLink =
  "rounded-sm font-medium text-text-primary underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring";

/**
 * The applications the API checks, in their configured order: add one, change
 * its address or thresholds, turn it off, or check it on the spot. Each name
 * opens its page with the check history.
 */
export default function ApplicationsManager({ area }: { area: string }) {
  const overview = useAppOverview();
  const data = overview.data;
  const [editing, setEditing] = useState<Aplicativo | "new" | null>(null);
  const [deleting, setDeleting] = useState<Aplicativo | null>(null);
  const apps = [...(data?.aplicativos ?? [])].sort((a, b) => a.orden - b.orden || a.nombre.localeCompare(b.nombre, "es"));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Aplicativos"
        description="Las plataformas que la API chequea en su health y en su UI. Agrega una, cambia su dirección o sus umbrales, o apágala sin desplegar."
        aside={
          <div className="flex shrink-0 flex-col gap-3 md:items-end">
            <CheckCycle overview={data} />
            {data && (
              <Button onClick={() => setEditing("new")} className="max-md:h-11">
                <Plus aria-hidden="true" />
                Agregar aplicativo
              </Button>
            )}
          </div>
        }
      />

      {overview.isPending ? (
        <TableSkeleton label="Cargando los aplicativos" />
      ) : overview.isError && !data ? (
        <LoadError error={overview.error} onRetry={() => overview.refetch()} what="los aplicativos" />
      ) : apps.length === 0 ? (
        <StatePanel
          icon={AppWindow}
          title="Todavía no hay aplicativos"
          action={
            <Button variant="outline" onClick={() => setEditing("new")} className="max-md:h-11">
              <Plus aria-hidden="true" />
              Agregar el primero
            </Button>
          }
        >
          Con la dirección del servidor basta: la API chequea /api/health y la raíz de la UI, y los resultados aparecen aquí y en el tablero.
        </StatePanel>
      ) : (
        <>
          <div className="hidden overflow-x-auto rounded-lg border border-border bg-surface md:block">
            <table className="w-full text-left text-sm">
              <caption className="sr-only">Aplicativos monitoreados y el último chequeo de su API y su UI</caption>
              <thead className={thead}>
                <tr>
                  <th scope="col" className="px-3 py-2">Aplicativo</th>
                  <th scope="col" className="px-3 py-2">Último chequeo · disponibilidad 24 h</th>
                  <th scope="col" className="px-3 py-2">
                    <span className="sr-only">Acciones</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {apps.map((app) => (
                  <tr key={app.id} className="hover:bg-primary-subtle">
                    {/* The state is in each target's badge; only "Deshabilitado" needs saying here. */}
                    <td className="max-w-80 px-3 py-2 align-top">
                      <span className="flex flex-wrap items-center gap-2">
                        <Link href={appsPath(area, app.id)} className={nameLink}>
                          {app.nombre}
                        </Link>
                        {!app.habilitado && <ApplicationBadge app={app} />}
                      </span>
                      <span className="block truncate font-mono text-[13px] text-text-secondary">{app.url_base}</span>
                    </td>
                    <td className="space-y-1 px-3 py-2 align-top">
                      <TargetLine target="api" summary={app.api} />
                      <TargetLine target="ui" summary={app.ui} checksUi={app.verificar_ui} />
                    </td>
                    <td className="px-2 py-1.5 align-top">
                      <RowActions app={app} onEdit={() => setEditing(app)} onDelete={() => setDeleting(app)} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <ul className="divide-y divide-border rounded-lg border border-border bg-surface md:hidden">
            {apps.map((app) => (
              <li key={app.id} className="space-y-2 px-3 py-3">
                <div className="flex items-start justify-between gap-3">
                  <span className="min-w-0">
                    <Link href={appsPath(area, app.id)} className={cn(nameLink, "inline-flex min-h-11 items-center")}>
                      {app.nombre}
                    </Link>
                    <span className="block truncate font-mono text-[13px] text-text-secondary">{app.url_base}</span>
                  </span>
                  <ApplicationBadge app={app} />
                </div>
                <TargetLine target="api" summary={app.api} />
                <TargetLine target="ui" summary={app.ui} checksUi={app.verificar_ui} />
                <RowActions app={app} onEdit={() => setEditing(app)} onDelete={() => setDeleting(app)} />
              </li>
            ))}
          </ul>
        </>
      )}

      {editing && <ApplicationDialog app={editing === "new" ? null : editing} onClose={() => setEditing(null)} />}
      {deleting && <DeleteDialog app={deleting} onClose={() => setDeleting(null)} />}
    </div>
  );
}

/** «Probar ahora» stays in sight, it is what people come here for; the rest lives in the menu. */
export function RowActions({
  app,
  onEdit,
  onDelete,
  className,
}: {
  app: Aplicativo;
  onEdit: () => void;
  onDelete: () => void;
  className?: string;
}) {
  const check = useCheckApplication();
  const update = useUpdateApplication();

  const probe = () =>
    check.mutate(app.id, {
      onSuccess: announceCheck,
      onError: (error) => toast.error(errorMessage(error), { duration: Infinity }),
    });
  const toggleEnabled = () =>
    update.mutate(
      { id: app.id, input: { habilitado: !app.habilitado } },
      {
        onSuccess: (saved) => toast.success(`«${saved.nombre}» ${saved.habilitado ? "habilitado" : "deshabilitado"}.`),
        onError: (error) => toast.error(errorMessage(error), { duration: Infinity }),
      }
    );

  return (
    <div className={cn("flex items-center justify-end gap-1 max-md:justify-start", className)}>
      <Button variant="ghost" size="sm" onClick={probe} disabled={check.isPending} className="max-md:h-11">
        {check.isPending ? <Loader2 className="animate-spin" aria-hidden="true" /> : <RefreshCw aria-hidden="true" />}
        Probar ahora
      </Button>
      <Menu
        align="end"
        triggerLabel={`Más acciones para ${app.nombre}`}
        triggerTitle="Más acciones"
        triggerClassName={buttonVariants({ variant: "ghost", size: "icon-sm", className: "max-md:size-11" })}
        trigger={<MoreHorizontal aria-hidden="true" />}
      >
        <MenuItem onClick={onEdit}>
          <Pencil aria-hidden="true" /> Editar
        </MenuItem>
        <MenuItem onClick={toggleEnabled} disabled={update.isPending}>
          <Power aria-hidden="true" /> {app.habilitado ? "Deshabilitar" : "Habilitar"}
        </MenuItem>
        <MenuSeparator />
        <MenuItem onClick={onDelete}>
          <Trash2 aria-hidden="true" /> Eliminar
        </MenuItem>
      </Menu>
    </div>
  );
}

export function DeleteDialog({ app, onClose, onDeleted }: { app: Aplicativo; onClose: () => void; onDeleted?: () => void }) {
  const remove = useDeleteApplication();
  return (
    <ConfirmDeleteDialog
      open
      onOpenChange={(open) => !open && onClose()}
      title={`¿Eliminar ${app.nombre}?`}
      confirmLabel="Eliminar aplicativo"
      isPending={remove.isPending}
      error={remove.error ? errorMessage(remove.error) : null}
      onConfirm={() =>
        remove.mutate(app.id, {
          onSuccess: () => {
            toast.success(`«${app.nombre}» eliminado.`);
            onClose();
            onDeleted?.();
          },
        })
      }
    >
      Se borra con todo su historial de chequeos y deja de aparecer en el tablero. Si solo quieres dejar de chequearlo, deshabilítalo.
    </ConfirmDeleteDialog>
  );
}
