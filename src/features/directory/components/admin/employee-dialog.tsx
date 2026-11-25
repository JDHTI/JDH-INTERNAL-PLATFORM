"use client";

import { useState, type FormEvent } from "react";

import { Button } from "@/shared/components/ui/button";
import { DatePicker } from "@/shared/components/ui/date-picker";
import { Dialog, DialogError, DialogFooter } from "@/shared/components/ui/dialog";
import { Dropdown } from "@/shared/components/ui/dropdown";
import { Field } from "@/shared/components/ui/field";
import { Input } from "@/shared/components/ui/input";

import type { AdminEmployee, EmployeeChanges, Site, Visibility } from "../../types/directory.types";

export const VISIBILITY_OPTIONS: { value: Visibility; label: string }[] = [
  { value: "auto", label: "Automática" },
  { value: "shown", label: "Mostrar siempre" },
  { value: "hidden", label: "Ocultar del directorio" },
];

interface Draft {
  full_name: string;
  email: string;
  department: string;
  position: string;
  site_id: string;
  birth_date: string;
  hire_date: string;
  visibility: Visibility;
  is_manager: boolean;
  is_active: boolean;
}

function toDraft(employee: AdminEmployee | null): Draft {
  return {
    full_name: employee?.full_name ?? "",
    email: employee?.email ?? "",
    department: employee?.department ?? "",
    position: employee?.position ?? "",
    site_id: employee?.site?.id ?? "",
    birth_date: employee?.birth_date ?? "",
    hire_date: employee?.hire_date ?? "",
    visibility: employee?.visibility ?? "auto",
    is_manager: employee?.is_manager ?? false,
    is_active: employee?.is_active ?? true,
  };
}

const orNull = (value: string) => value.trim() || null;

/** On someone synced from Entra the API ignores the fields Entra owns, so the form leaves them out. */
export default function EmployeeDialog({
  open,
  employee,
  sites,
  busy,
  error,
  onOpenChange,
  onSubmit,
}: {
  open: boolean;
  /** null adds a new person. */
  employee: AdminEmployee | null;
  sites: Site[];
  busy: boolean;
  error: string | null;
  onOpenChange: (open: boolean) => void;
  onSubmit: (changes: EmployeeChanges) => void;
}) {
  const [draft, setDraft] = useState<Draft>(() => toDraft(employee));
  const synced = employee?.is_synced ?? false;
  const set = <K extends keyof Draft>(key: K, value: Draft[K]) => setDraft((current) => ({ ...current, [key]: value }));

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const shared: EmployeeChanges = {
      position: draft.position.trim(),
      site_id: draft.site_id || null,
      birth_date: draft.birth_date || null,
      visibility: draft.visibility,
      is_manager: draft.is_manager,
    };
    onSubmit(
      synced
        ? shared
        : {
            ...shared,
            full_name: draft.full_name.trim(),
            email: orNull(draft.email),
            department: orNull(draft.department),
            hire_date: draft.hire_date || null,
            is_active: draft.is_active,
          }
    );
  };

  const siteOptions = [
    { value: "", label: "Sin sede" },
    ...sites.map((site) => ({
      value: site.id,
      label: site.is_active ? site.name : `${site.name} (inactiva)`,
    })),
  ];

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title={employee ? `Editar a ${employee.full_name}` : "Agregar persona"}
      description={
        employee
          ? synced
            ? "Nombre, correo, departamento, jefe y fecha de ingreso vienen de Microsoft Entra y se cambian allá."
            : "Esta persona no está en Microsoft Entra: todos sus datos se editan aquí."
          : "Solo para quien no tiene cuenta en Microsoft Entra. Quien la tiene aparece con la sincronización."
      }
      isForm
    >
      <form onSubmit={submit} className="space-y-5">
        <div className="grid gap-4 md:grid-cols-2">
          {!synced && (
            <>
              <Field label="Nombre completo" htmlFor="employee-name">
                <Input id="employee-name" value={draft.full_name} onChange={(e) => set("full_name", e.target.value)} required maxLength={200} />
              </Field>
              <Field label="Correo" htmlFor="employee-email" optional>
                <Input id="employee-email" type="email" value={draft.email} onChange={(e) => set("email", e.target.value)} maxLength={320} />
              </Field>
              <Field label="Departamento" htmlFor="employee-department" optional>
                <Input id="employee-department" value={draft.department} onChange={(e) => set("department", e.target.value)} maxLength={200} />
              </Field>
              <Field label="Fecha de ingreso" htmlFor="employee-hire" optional>
                <DatePicker id="employee-hire" value={draft.hire_date} onChange={(value) => set("hire_date", value)} clearable yearsBack={50} yearsAhead={1} />
              </Field>
            </>
          )}
          <Field label="Cargo" htmlFor="employee-position" optional hint={synced && employee?.job_title ? `En Entra: ${employee.job_title}` : undefined}>
            <Input id="employee-position" value={draft.position} onChange={(e) => set("position", e.target.value)} maxLength={200} />
          </Field>
          <Field label="Sede" htmlFor="employee-site" optional>
            <Dropdown id="employee-site" value={draft.site_id} onValueChange={(value) => set("site_id", value)} options={siteOptions} aria-label="Sede" />
          </Field>
          <Field label="Fecha de nacimiento" htmlFor="employee-birth" optional hint="El directorio muestra el día y el mes, nunca el año.">
            <DatePicker id="employee-birth" value={draft.birth_date} onChange={(value) => set("birth_date", value)} clearable yearsBack={90} yearsAhead={0} />
          </Field>
          <Field
            label="Visibilidad"
            htmlFor="employee-visibility"
            hint="Automática: aparece si la cuenta está habilitada y tiene correo corporativo."
          >
            <Dropdown
              id="employee-visibility"
              value={draft.visibility}
              onValueChange={(value) => set("visibility", value as Visibility)}
              options={VISIBILITY_OPTIONS}
              aria-label="Visibilidad"
            />
          </Field>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:gap-6">
          <label className="flex min-h-11 items-center gap-2 text-sm md:min-h-0">
            <input
              type="checkbox"
              checked={draft.is_manager}
              onChange={(e) => set("is_manager", e.target.checked)}
              className="size-4 accent-primary"
            />
            Tiene personas a cargo
          </label>
          {!synced && (
            <label className="flex min-h-11 items-center gap-2 text-sm md:min-h-0">
              <input
                type="checkbox"
                checked={draft.is_active}
                onChange={(e) => set("is_active", e.target.checked)}
                className="size-4 accent-primary"
              />
              Activa
            </label>
          )}
        </div>

        <DialogError message={error} />
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button type="submit" disabled={busy}>
            {busy ? "Guardando…" : employee ? "Guardar cambios" : "Agregar persona"}
          </Button>
        </DialogFooter>
      </form>
    </Dialog>
  );
}
