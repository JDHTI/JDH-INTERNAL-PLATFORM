"use client";

import { useState, type FormEvent } from "react";
import { CloudOff, MapPin, Pencil, Plus, Trash2 } from "lucide-react";

import StatePanel from "@/shared/components/state-panel";
import TableSkeleton from "@/shared/components/table-skeleton";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import ConfirmDeleteDialog from "@/shared/components/ui/confirm-delete-dialog";
import { Dialog, DialogError, DialogFooter } from "@/shared/components/ui/dialog";
import { Field } from "@/shared/components/ui/field";
import { Input } from "@/shared/components/ui/input";
import { errorMessage } from "@/shared/lib/api-client";

import { useAdminSites } from "../../hooks/use-directory";
import { useDirectoryMutation } from "../../hooks/use-directory-mutation";
import { createSite, deleteSite, updateSite } from "../../services/directory.service";
import type { Site } from "../../types/directory.types";

/** The company's physical sites. Distinct from the PQRSF site catalog. */
export default function SitesAdmin() {
  const sites = useAdminSites();
  const mutation = useDirectoryMutation();
  const [editing, setEditing] = useState<Site | "new" | null>(null);
  const [deleting, setDeleting] = useState<Site | null>(null);

  const open = (target: Site | "new") => {
    mutation.setError(null);
    setEditing(target);
  };

  const save = async (body: { name: string; address: string | null; is_active: boolean }) => {
    const outcome =
      editing === "new"
        ? await mutation.run("save", () => createSite(body), "Sede creada.")
        : editing
          ? await mutation.run("save", () => updateSite(editing.id, body), "Sede actualizada.")
          : { ok: false };
    if (outcome.ok) setEditing(null);
  };

  const remove = async () => {
    if (!deleting) return;
    const outcome = await mutation.run("delete", () => deleteSite(deleting.id), "Sede eliminada.");
    if (outcome.ok) setDeleting(null);
  };

  const items = sites.data?.items ?? [];

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => open("new")}>
          <Plus aria-hidden="true" />
          Nueva sede
        </Button>
      </div>

      {sites.isPending ? (
        <TableSkeleton rows={5} label="Cargando sedes" />
      ) : sites.isError ? (
        <StatePanel
          icon={CloudOff}
          title="No se pudieron cargar las sedes"
          tone="danger"
          action={<Button variant="outline" onClick={() => sites.refetch()}>Reintentar</Button>}
        >
          {errorMessage(sites.error)}
        </StatePanel>
      ) : items.length === 0 ? (
        <StatePanel icon={MapPin} title="Todavía no hay sedes">
          La importación desde la intranet las trae, o puedes crearlas aquí.
        </StatePanel>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full min-w-[36rem] text-left text-sm">
            <thead className="bg-canvas-subtle text-xs text-text-secondary">
              <tr>
                <th scope="col" className="px-3 py-2 font-medium">Sede</th>
                <th scope="col" className="px-3 py-2 font-medium">Dirección</th>
                <th scope="col" className="px-3 py-2 text-right font-medium">Personas visibles</th>
                <th scope="col" className="px-3 py-2 font-medium">Estado</th>
                <th scope="col" className="px-3 py-2"><span className="sr-only">Acciones</span></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {items.map((site) => (
                <tr key={site.id}>
                  <td className="px-3 py-2 font-medium">{site.name}</td>
                  <td className="px-3 py-2 text-text-secondary">{site.address ?? "Sin dirección"}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{site.employee_count}</td>
                  <td className="px-3 py-2">
                    <Badge tone={site.is_active ? "success" : "neutral"}>{site.is_active ? "Activa" : "Inactiva"}</Badge>
                  </td>
                  <td className="px-3 py-2">
                    <span className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon" onClick={() => open(site)} aria-label={`Editar ${site.name}`}>
                        <Pencil aria-hidden="true" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          mutation.setError(null);
                          setDeleting(site);
                        }}
                        aria-label={`Eliminar ${site.name}`}
                      >
                        <Trash2 aria-hidden="true" />
                      </Button>
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {editing && (
        <SiteDialog
          key={editing === "new" ? "new" : editing.id}
          site={editing === "new" ? null : editing}
          busy={mutation.busy === "save"}
          error={mutation.error}
          onClose={() => setEditing(null)}
          onSubmit={save}
        />
      )}

      <ConfirmDeleteDialog
        open={deleting !== null}
        onOpenChange={(value) => !value && setDeleting(null)}
        title={deleting ? `¿Eliminar ${deleting.name}?` : "Eliminar sede"}
        confirmLabel="Eliminar sede"
        onConfirm={remove}
        isPending={mutation.busy === "delete"}
        error={mutation.error}
      >
        No se puede eliminar mientras tenga personas asignadas. Para dejar de usarla sin moverlas, márcala como inactiva.
      </ConfirmDeleteDialog>
    </div>
  );
}

function SiteDialog({
  site,
  busy,
  error,
  onClose,
  onSubmit,
}: {
  site: Site | null;
  busy: boolean;
  error: string | null;
  onClose: () => void;
  onSubmit: (body: { name: string; address: string | null; is_active: boolean }) => void;
}) {
  const [name, setName] = useState(site?.name ?? "");
  const [address, setAddress] = useState(site?.address ?? "");
  const [active, setActive] = useState(site?.is_active ?? true);

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onSubmit({ name: name.trim(), address: address.trim() || null, is_active: active });
  };

  return (
    <Dialog open onOpenChange={(value) => !value && onClose()} title={site ? `Editar ${site.name}` : "Nueva sede"} isForm>
      <form onSubmit={submit} className="space-y-4">
        <Field label="Nombre" htmlFor="site-name">
          <Input id="site-name" value={name} onChange={(e) => setName(e.target.value)} required maxLength={150} />
        </Field>
        <Field label="Dirección" htmlFor="site-address" optional>
          <Input id="site-address" value={address} onChange={(e) => setAddress(e.target.value)} maxLength={300} />
        </Field>
        <label className="flex min-h-11 items-center gap-2 text-sm md:min-h-0">
          <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} className="size-4 accent-primary" />
          Activa
        </label>
        <DialogError message={error} />
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button type="submit" disabled={busy}>{busy ? "Guardando…" : site ? "Guardar cambios" : "Crear sede"}</Button>
        </DialogFooter>
      </form>
    </Dialog>
  );
}
