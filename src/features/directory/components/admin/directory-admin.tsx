"use client";

import { useState } from "react";
import { CloudOff, Pencil, Plus, Search, Trash2, UserRoundSearch } from "lucide-react";

import Pager from "@/shared/components/pager";
import StatePanel from "@/shared/components/state-panel";
import TableSkeleton from "@/shared/components/table-skeleton";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import ConfirmDeleteDialog from "@/shared/components/ui/confirm-delete-dialog";
import { Dropdown } from "@/shared/components/ui/dropdown";
import { Input } from "@/shared/components/ui/input";
import { useDebouncedValue } from "@/shared/hooks/use-debounced-value";
import { errorMessage } from "@/shared/lib/api-client";
import { cn } from "@/shared/lib/utils";

import { useAdminEmployees, useAdminSites } from "../../hooks/use-directory";
import { useDirectoryMutation } from "../../hooks/use-directory-mutation";
import { createEmployee, deleteEmployee, updateEmployee } from "../../services/directory.service";
import {
  DIRECTORY_PAGE_SIZE,
  employeePosition,
  hasPosition,
  type AdminEmployee,
  type EmployeeChanges,
} from "../../types/directory.types";
import EmployeeAvatar from "../employee-avatar";
import EmployeeDialog from "./employee-dialog";
import SyncPanel from "./sync-panel";

const VISIBILITY_LABEL = { auto: "Automática", shown: "Siempre visible", hidden: "Oculta" } as const;

/** Directory administration: the nightly sync, then everyone in the directory. */
export default function DirectoryAdmin() {
  const [query, setQuery] = useState("");
  const q = useDebouncedValue(query.trim());
  const [siteId, setSiteId] = useState("");
  const [includeHidden, setIncludeHidden] = useState(true);
  const [includeInactive, setIncludeInactive] = useState(false);
  const [page, setPage] = useState(1);

  // null: closed. "new": adding. An employee: editing that one.
  const [editing, setEditing] = useState<AdminEmployee | "new" | null>(null);
  const [deleting, setDeleting] = useState<AdminEmployee | null>(null);
  const mutation = useDirectoryMutation();

  const employees = useAdminEmployees({ q, siteId, includeHidden, includeInactive, page });
  const sites = useAdminSites();
  const siteList = sites.data?.items ?? [];

  const resetPage = <T,>(setter: (value: T) => void) => (value: T) => {
    setter(value);
    setPage(1);
  };

  const save = async (changes: EmployeeChanges) => {
    const outcome =
      editing === "new"
        ? await mutation.run("save", () => createEmployee({ ...changes, full_name: changes.full_name ?? "" }), "Persona agregada al directorio.")
        : editing
          ? await mutation.run("save", () => updateEmployee(editing.id, changes), "Cambios guardados.")
          : { ok: false };
    if (outcome.ok) setEditing(null);
  };

  const remove = async () => {
    if (!deleting) return;
    const outcome = await mutation.run("delete", () => deleteEmployee(deleting.id), "Persona eliminada del directorio.");
    if (outcome.ok) setDeleting(null);
  };

  const items = employees.data?.items ?? [];
  const filtered = Boolean(q || siteId || !includeHidden || includeInactive);

  return (
    <div className="space-y-6">
      <SyncPanel />

      <section aria-labelledby="employees-heading" className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 id="employees-heading" className="text-base font-semibold">
            Personas
          </h2>
          <Button
            variant="outline"
            onClick={() => {
              mutation.setError(null);
              setEditing("new");
            }}
          >
            <Plus aria-hidden="true" />
            Agregar persona sin cuenta en Entra
          </Button>
        </div>

        {/* One row only from xl: the sidebar takes 260px of the screen. */}
        <div className="flex flex-col gap-2 xl:flex-row xl:items-center">
          <div className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-text-secondary" aria-hidden="true" />
            <Input
              type="search"
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setPage(1);
              }}
              placeholder="Nombre, cargo o correo"
              aria-label="Buscar personas"
              className="h-11 pl-9 sm:h-9"
            />
          </div>
          <Dropdown
            className="xl:w-56"
            value={siteId}
            onValueChange={resetPage(setSiteId)}
            options={[{ value: "", label: "Todas las sedes" }, ...siteList.map((site) => ({ value: site.id, label: site.name }))]}
            aria-label="Sede"
          />
          <div className="flex flex-wrap gap-x-4">
            <label className="flex min-h-11 items-center gap-2 text-sm md:min-h-9">
              <input type="checkbox" checked={includeHidden} onChange={(e) => resetPage(setIncludeHidden)(e.target.checked)} className="size-4 accent-primary" />
              Incluir ocultas
            </label>
            <label className="flex min-h-11 items-center gap-2 text-sm md:min-h-9">
              <input type="checkbox" checked={includeInactive} onChange={(e) => resetPage(setIncludeInactive)(e.target.checked)} className="size-4 accent-primary" />
              Incluir inactivas
            </label>
          </div>
        </div>

        {employees.isPending ? (
          <TableSkeleton rows={8} label="Cargando personas" />
        ) : employees.isError ? (
          <StatePanel
            icon={CloudOff}
            title="No se pudo cargar el directorio"
            tone="danger"
            action={<Button variant="outline" onClick={() => employees.refetch()}>Reintentar</Button>}
          >
            {errorMessage(employees.error)}
          </StatePanel>
        ) : items.length === 0 ? (
          <StatePanel icon={UserRoundSearch} title={filtered ? "Nadie coincide con los filtros" : "El directorio está vacío"}>
            {filtered
              ? "Cambia la búsqueda o los filtros."
              : "Corre la sincronización con Entra para traer a las personas de la compañía."}
          </StatePanel>
        ) : (
          <>
            <div className={cn("overflow-x-auto rounded-lg border border-border", employees.isPlaceholderData && "opacity-60")}>
              <table className="w-full min-w-[52rem] text-left text-sm">
                <thead className="bg-canvas-subtle text-xs text-text-secondary">
                  <tr>
                    <th scope="col" className="px-3 py-2 font-medium">Persona</th>
                    <th scope="col" className="px-3 py-2 font-medium">Cargo</th>
                    <th scope="col" className="px-3 py-2 font-medium">Sede</th>
                    <th scope="col" className="px-3 py-2 font-medium">Origen</th>
                    <th scope="col" className="px-3 py-2 font-medium">Directorio</th>
                    <th scope="col" className="px-3 py-2 font-medium"><span className="sr-only">Acciones</span></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {items.map((employee) => (
                    <tr key={employee.id}>
                      <td className="px-3 py-2">
                        <span className="flex items-center gap-3">
                          <EmployeeAvatar employee={employee} />
                          <span className="min-w-0">
                            <span className="block truncate font-medium">{employee.full_name}</span>
                            <span className="block truncate text-xs text-text-secondary">{employee.email ?? "Sin correo"}</span>
                          </span>
                        </span>
                      </td>
                      <td className={cn("px-3 py-2", !hasPosition(employee) && "text-text-secondary")}>
                        {employeePosition(employee)}
                      </td>
                      <td className="px-3 py-2 text-text-secondary">{employee.site?.name ?? "Sin sede"}</td>
                      <td className="px-3 py-2 text-text-secondary">{employee.is_synced ? "Entra" : "Manual"}</td>
                      <td className="px-3 py-2">
                        <span className="flex flex-wrap items-center gap-1.5">
                          <Badge tone={employee.is_public ? "success" : "neutral"}>
                            {!employee.is_active ? "Inactiva" : employee.is_public ? "Visible" : "No visible"}
                          </Badge>
                          <span className="text-xs text-text-secondary">{VISIBILITY_LABEL[employee.visibility]}</span>
                        </span>
                      </td>
                      <td className="px-3 py-2">
                        <span className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              mutation.setError(null);
                              setEditing(employee);
                            }}
                            aria-label={`Editar a ${employee.full_name}`}
                          >
                            <Pencil aria-hidden="true" />
                          </Button>
                          {!employee.is_synced && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                mutation.setError(null);
                                setDeleting(employee);
                              }}
                              aria-label={`Eliminar a ${employee.full_name}`}
                            >
                              <Trash2 aria-hidden="true" />
                            </Button>
                          )}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pager page={page} size={DIRECTORY_PAGE_SIZE} total={employees.data?.total ?? 0} count={items.length} onPageChange={setPage} />
          </>
        )}
      </section>

      {editing && (
        <EmployeeDialog
          key={editing === "new" ? "new" : editing.id}
          open
          employee={editing === "new" ? null : editing}
          sites={siteList}
          busy={mutation.busy === "save"}
          error={mutation.error}
          onOpenChange={(open) => !open && setEditing(null)}
          onSubmit={save}
        />
      )}

      <ConfirmDeleteDialog
        open={deleting !== null}
        onOpenChange={(open) => !open && setDeleting(null)}
        title={deleting ? `¿Eliminar a ${deleting.full_name}?` : "Eliminar persona"}
        confirmLabel="Eliminar"
        onConfirm={remove}
        isPending={mutation.busy === "delete"}
        error={mutation.error}
      >
        Sale del directorio y no se puede deshacer. Solo aplica a personas agregadas a mano.
      </ConfirmDeleteDialog>
    </div>
  );
}
