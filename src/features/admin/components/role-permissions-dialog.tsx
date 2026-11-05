"use client";

import { useState, type FormEvent } from "react";
import { Save } from "lucide-react";

import type { ModuleAction } from "@/features/areas/types/area.types";
import { Button } from "@/shared/components/ui/button";
import { Dialog, DialogError, DialogFooter } from "@/shared/components/ui/dialog";
import { Dropdown } from "@/shared/components/ui/dropdown";

import type { CatalogModuleDto, RoleGrantDto } from "../types/admin.types";

const WILDCARD = "*";
type Level = "none" | ModuleAction;

const LEVEL_OPTIONS: { value: Level; label: string }[] = [
  { value: "none", label: "Sin acceso" },
  { value: "read", label: "Lectura" },
  { value: "manage", label: "Gestión" },
];

/** Grants as the API keeps them, as one level per module plus the whole-area level. */
function toLevels(grants: RoleGrantDto[]): { area: Level; modules: Record<string, Level> } {
  const modules: Record<string, Level> = {};
  let area: Level = "none";
  for (const grant of grants) {
    if (grant.module === WILDCARD) area = grant.action;
    else modules[grant.module] = grant.action;
  }
  return { area, modules };
}

/** Back to grants, without the module rows the whole-area level already covers. */
function toGrants(area: Level, modules: Record<string, Level>): RoleGrantDto[] {
  const grants: RoleGrantDto[] = [];
  if (area !== "none") grants.push({ module: WILDCARD, action: area });
  if (area === "manage") return grants;
  for (const [module, level] of Object.entries(modules)) {
    if (level === "none" || level === area) continue;
    grants.push({ module, action: level });
  }
  return grants;
}

/**
 * What a role lets its members do, module by module. "Toda el área" is the
 * wildcard the API has; a module row can only add to it, so under full
 * management the rows are moot and under read they can only raise to manage.
 */
export const LEADER_ROLE_HELP =
  "El rol líder del área tiene todos sus permisos. No se elimina y sus permisos no cambian; sí se puede renombrar.";

export default function RolePermissionsDialog({
  open,
  onOpenChange,
  roleName,
  isLeader,
  modules,
  grants,
  busy,
  error,
  onSave,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  roleName: string;
  /** The fixed leader role: shown read-only, the API refuses to change it. */
  isLeader: boolean;
  modules: CatalogModuleDto[];
  grants: RoleGrantDto[];
  busy: boolean;
  error: string | null;
  onSave: (grants: RoleGrantDto[]) => void;
}) {
  if (isLeader) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange} title={`Permisos de ${roleName}`} description={LEADER_ROLE_HELP}>
        <ul className="divide-y divide-border rounded-md border border-border">
          <li className="flex items-center justify-between gap-3 bg-canvas-subtle px-3 py-2 text-sm">
            <span className="font-medium">Toda el área</span>
            <span>Gestión</span>
          </li>
          {modules.map((module) => (
            <li key={module.key} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
              <span className="min-w-0 truncate">{module.label}</span>
              <span className="text-text-secondary">Gestión</span>
            </li>
          ))}
        </ul>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cerrar
          </Button>
        </DialogFooter>
      </Dialog>
    );
  }

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title={`Permisos de ${roleName}`}
      description="Lectura permite consultar y descargar. Gestión permite crear, editar, aprobar y configurar, e incluye la lectura."
      isForm
    >
      {error && <DialogError message={error} />}
      {/* Keyed on open so a reopened dialog starts from what is saved, not from the last edit. */}
      {open && (
        <PermissionsForm
          modules={modules}
          grants={grants}
          busy={busy}
          onCancel={() => onOpenChange(false)}
          onSave={onSave}
        />
      )}
    </Dialog>
  );
}

function PermissionsForm({
  modules,
  grants,
  busy,
  onCancel,
  onSave,
}: {
  modules: CatalogModuleDto[];
  grants: RoleGrantDto[];
  busy: boolean;
  onCancel: () => void;
  onSave: (grants: RoleGrantDto[]) => void;
}) {
  const initial = toLevels(grants);
  const [area, setArea] = useState<Level>(initial.area);
  const [levels, setLevels] = useState<Record<string, Level>>(initial.modules);

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onSave(toGrants(area, levels));
  };

  const moduleOptions =
    area === "read"
      ? [
          { value: "none", label: "Lectura (por toda el área)" },
          { value: "manage", label: "Gestión" },
        ]
      : LEVEL_OPTIONS;

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="flex items-center justify-between gap-3 rounded-md border border-border bg-canvas-subtle px-3 py-2">
        <label htmlFor="permissions-area" className="text-sm font-medium">
          Toda el área
        </label>
        <Dropdown
          id="permissions-area"
          className="w-44"
          size="sm"
          value={area}
          onValueChange={(value) => setArea(value as Level)}
          options={LEVEL_OPTIONS}
          aria-label="Permiso sobre toda el área"
        />
      </div>

      <ul className="divide-y divide-border rounded-md border border-border">
        {modules.map((module) => {
          const current = levels[module.key] ?? "none";
          // Under read for the whole area a plain read grant is the same as none.
          const value = area === "read" && current === "read" ? "none" : current;
          return (
            <li key={module.key} className="flex items-center justify-between gap-3 px-3 py-2">
              <label htmlFor={`permissions-${module.key}`} className="min-w-0 truncate text-sm">
                {module.label}
              </label>
              <Dropdown
                id={`permissions-${module.key}`}
                className="w-44"
                size="sm"
                value={area === "manage" ? "manage" : value}
                onValueChange={(next) =>
                  setLevels((previous) => ({ ...previous, [module.key]: next as Level }))
                }
                options={moduleOptions}
                disabled={area === "manage"}
                aria-label={`Permiso sobre ${module.label}`}
              />
            </li>
          );
        })}
      </ul>

      <DialogFooter>
        <Button variant="outline" type="button" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit" disabled={busy}>
          <Save aria-hidden="true" /> {busy ? "Guardando…" : "Guardar permisos"}
        </Button>
      </DialogFooter>
    </form>
  );
}

/** One line for the role list: what the role grants, at a glance. */
export function grantsSummary(grants: RoleGrantDto[] | undefined): string {
  if (!grants) return "Cargando permisos…";
  const { area, modules } = toLevels(grants);
  if (area === "manage") return "Acceso completo";
  const granted = Object.values(modules).filter((level) => level !== "none").length;
  if (area === "read") {
    return granted > 0 ? `Lectura de toda el área y gestión en ${granted}` : "Lectura de toda el área";
  }
  if (granted === 0) return "Sin permisos: no abre ningún módulo";
  return granted === 1 ? "1 módulo" : `${granted} módulos`;
}
