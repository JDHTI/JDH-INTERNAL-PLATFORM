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

/**
 * How «Toda el área» reads (2026-11-24): the whole area read only, the whole area managed, or
 * each module on its own. Read for the whole area no longer lets a module go up to manage: a role
 * that says «solo lectura» manages nothing.
 */
type Scope = "custom" | "read" | "manage";

const SCOPE_OPTIONS: { value: Scope; label: string }[] = [
  { value: "custom", label: "Personalizado" },
  { value: "read", label: "Solo lectura" },
  { value: "manage", label: "Gestión" },
];

const LEVEL_OPTIONS: { value: Level; label: string }[] = [
  { value: "none", label: "Sin acceso" },
  { value: "read", label: "Lectura" },
  { value: "manage", label: "Gestión" },
];

/** The grants as the API keeps them: the wildcard's action, if any, and one level per module row. */
function splitGrants(grants: RoleGrantDto[]): { wildcard: ModuleAction | null; rows: Record<string, ModuleAction> } {
  const rows: Record<string, ModuleAction> = {};
  let wildcard: ModuleAction | null = null;
  for (const grant of grants) {
    if (grant.module === WILDCARD) wildcard = grant.action;
    else rows[grant.module] = grant.action;
  }
  return { wildcard, rows };
}

/**
 * The form's starting point. A role saved the old way, `*` read plus modules in manage, opens as
 * «Personalizado» with every module of the area in read and those in manage: saved again, it
 * keeps exactly what it could do, written out row by row.
 */
function toForm(grants: RoleGrantDto[], active: string[]): { scope: Scope; levels: Record<string, Level> } {
  const { wildcard, rows } = splitGrants(grants);
  const raised = Object.keys(rows).some((module) => rows[module] === "manage" && active.includes(module));
  if (wildcard === "manage") return { scope: "manage", levels: rows };
  if (wildcard === "read" && !raised) return { scope: "read", levels: {} };
  if (wildcard === "read") {
    return { scope: "custom", levels: { ...Object.fromEntries(active.map((module) => [module, "read" as Level])), ...rows } };
  }
  return { scope: "custom", levels: rows };
}

/**
 * Back to grants. «Solo lectura» and «Gestión» are the wildcard alone; «Personalizado» is one row
 * per module, never the wildcard, and only for the modules switched on in the area (`active`). A
 * grant on a module the area switched off is not sent: the API keeps it as it is (it counts again
 * when the module is switched back on), and builds before that refused it on save with «no está
 * activo en el área».
 */
function toGrants(scope: Scope, levels: Record<string, Level>, active: Set<string>): RoleGrantDto[] {
  if (scope !== "custom") return [{ module: WILDCARD, action: scope }];
  return Object.entries(levels)
    .filter(([module, level]) => level !== "none" && active.has(module))
    .map(([module, level]) => ({ module, action: level as ModuleAction }));
}

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
      description="Lectura permite consultar y descargar. Gestión permite crear, editar, aprobar y configurar, e incluye la lectura. «Solo lectura» y «Gestión» valen para todos los módulos del área; con «Personalizado» eliges módulo por módulo."
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
  const active = modules.map((module) => module.key);
  const [initial] = useState(() => toForm(grants, active));
  const [scope, setScope] = useState<Scope>(initial.scope);
  const [levels, setLevels] = useState<Record<string, Level>>(initial.levels);
  const whole = scope !== "custom";

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onSave(toGrants(scope, levels, new Set(active)));
  };

  const chooseScope = (next: Scope) => {
    // From a whole-area level to «Personalizado» with nothing chosen yet: start from what the
    // role had, every module at that level, and lower the ones it should not have.
    if (next === "custom" && whole && active.every((module) => (levels[module] ?? "none") === "none")) {
      setLevels(Object.fromEntries(active.map((module) => [module, scope])));
    }
    setScope(next);
  };

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
          value={scope}
          onValueChange={(value) => chooseScope(value as Scope)}
          options={SCOPE_OPTIONS}
          aria-label="Permiso sobre toda el área"
        />
      </div>

      {scope === "custom" && active.every((module) => (levels[module] ?? "none") === "none") && (
        <p className="text-[13px] text-text-secondary">Con todos los módulos en «Sin acceso», el rol no abre nada.</p>
      )}

      <ul className="divide-y divide-border rounded-md border border-border">
        {modules.map((module) => (
          <li key={module.key} className="flex items-center justify-between gap-3 px-3 py-2">
            <label htmlFor={`permissions-${module.key}`} className="min-w-0 truncate text-sm">
              {module.label}
            </label>
            <Dropdown
              id={`permissions-${module.key}`}
              className="w-44"
              size="sm"
              // Under a whole-area level every module shows that level and cannot move.
              value={whole ? scope : levels[module.key] ?? "none"}
              onValueChange={(next) => setLevels((previous) => ({ ...previous, [module.key]: next as Level }))}
              options={LEVEL_OPTIONS}
              disabled={whole}
              aria-label={`Permiso sobre ${module.label}`}
            />
          </li>
        ))}
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

/**
 * One line for the role list: what the role grants, at a glance. With `active`, a grant on a
 * module the area switched off is not counted: it opens nothing while it is off.
 */
export function grantsSummary(grants: RoleGrantDto[] | undefined, active?: Set<string>): string {
  if (!grants) return "Cargando permisos…";
  const { wildcard, rows } = splitGrants(grants);
  if (wildcard === "manage") return "Acceso completo";
  const counted = Object.entries(rows).filter(([module]) => !active || active.has(module));
  const managed = counted.filter(([, level]) => level === "manage").length;
  if (wildcard === "read" && managed === 0) return "Solo lectura de toda el área";
  // The old way, `*` read plus modules in manage, is a custom role: every module of the area opens.
  const opened = wildcard === "read" && active ? active.size : counted.length;
  if (opened === 0) return "Sin permisos: no abre ningún módulo";
  return `Personalizado: ${opened} ${opened === 1 ? "módulo" : "módulos"} (${managed === 0 ? "solo lectura" : `${managed} con gestión`})`;
}
