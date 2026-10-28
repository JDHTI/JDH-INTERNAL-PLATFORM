"use client";

import { useId, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CloudOff, Plus, RefreshCw, SearchX, Trash2 } from "lucide-react";

import StatePanel from "@/shared/components/state-panel";
import { Button, buttonVariants } from "@/shared/components/ui/button";
import ConfirmDeleteDialog from "@/shared/components/ui/confirm-delete-dialog";
import { Dropdown } from "@/shared/components/ui/dropdown";
import { Field } from "@/shared/components/ui/field";
import { Input } from "@/shared/components/ui/input";
import { Textarea } from "@/shared/components/ui/textarea";
import { ApiError, errorMessage } from "@/shared/lib/api-client";
import { useBreadcrumbLabel } from "@/shared/store/use-breadcrumb-store";

import {
  useCommercialSupplier,
  useDeleteProfile,
  useFormSchema,
  useProfile,
  useSaveProfile,
  useSupportCatalogs,
} from "../hooks/use-supports";
import {
  draftFromDefaults,
  fieldErrorsFrom,
  PROFILE_DEFAULT_FIELDS,
  readDraft,
  withoutKey,
  type Draft,
} from "../lib/form-values";
import type { ColumnMap, SupportFormSchema, SupportProfile } from "../types/support.types";
import SchemaFields from "./schema-fields";

/** The API takes up to 10 headers per field, 100 characters each. */
const MAX_HEADERS = 10;
const MAX_HEADER_LENGTH = 100;

interface ColumnRow {
  field: string;
  /** Headers as typed: several separated by commas. */
  headers: string;
}

const splitHeaders = (text: string) => text.split(",").map((item) => item.trim()).filter(Boolean);

const rowsOf = (map: ColumnMap): ColumnRow[] =>
  Object.entries(map).map(([field, headers]) => ({ field, headers: headers.join(", ") }));

/**
 * One supplier's profile: what pre-fills its supports and how its own file
 * names the columns. Loads the supplier and the profile (404 = none yet, so
 * saving creates it).
 */
export default function ProfileEditor({ area, code }: { area: string; code: string }) {
  const supplier = useCommercialSupplier(code);
  const profile = useProfile(code);
  const schema = useFormSchema();
  const [saved, setSaved] = useState(false);
  useBreadcrumbLabel(`/${area}/apoyos/perfiles`, "Perfiles de proveedor");
  useBreadcrumbLabel(`/${area}/apoyos/perfiles/${encodeURIComponent(code)}`, supplier.data?.name);

  if (supplier.isPending || profile.isPending || schema.isPending) {
    return <div className="h-96 animate-pulse rounded-lg bg-canvas-subtle" aria-busy="true" aria-label="Cargando el perfil" />;
  }
  if (supplier.isError && supplier.error instanceof ApiError && supplier.error.status === 404) {
    return (
      <StatePanel
        icon={SearchX}
        title={`No existe un proveedor con el código ${code}`}
        action={
          <Link href={`/${area}/apoyos/perfiles`} className={buttonVariants({ variant: "outline" })}>
            Volver a los perfiles
          </Link>
        }
      >
        Revisa el código o búscalo por nombre en la lista de perfiles.
      </StatePanel>
    );
  }
  const failed = profile.error ?? schema.error;
  if (failed || !schema.data) {
    return (
      <StatePanel
        icon={CloudOff}
        tone="danger"
        title="No se pudo cargar el perfil"
        action={
          <Button
            variant="outline"
            onClick={() => {
              profile.refetch();
              schema.refetch();
            }}
          >
            <RefreshCw aria-hidden="true" /> Reintentar
          </Button>
        }
      >
        {errorMessage(failed)}
      </StatePanel>
    );
  }

  const current = profile.data ?? null;
  return (
    <div className="max-w-4xl space-y-4">
      <div className="space-y-1">
        <h2 className="text-xl font-semibold tracking-tight">{supplier.data?.name ?? current?.supplier_name ?? `Proveedor ${code}`}</h2>
        <p className="text-sm text-text-secondary">
          <span className="font-mono">{code}</span> ·{" "}
          {current ? `Perfil actualizado por ${current.updated_by}` : "Sin perfil: al guardar se crea."}
        </p>
      </div>
      {saved && (
        <p role="status" className="rounded-md bg-success-surface px-3 py-2 text-sm text-success">
          Perfil guardado. El formulario de creación y la carga masiva ya usan estos valores.
        </p>
      )}
      {/* Keyed by version: after a save or another person's change, it starts from what the API holds. */}
      <ProfileForm
        key={current?.version ?? "nuevo"}
        area={area}
        code={code}
        profile={current}
        schema={schema.data}
        onSaved={() => setSaved(true)}
        onEdit={() => setSaved(false)}
      />
    </div>
  );
}

function ProfileForm({
  area,
  code,
  profile,
  schema,
  onSaved,
  onEdit,
}: {
  area: string;
  code: string;
  profile: SupportProfile | null;
  schema: SupportFormSchema;
  onSaved: () => void;
  onEdit: () => void;
}) {
  const id = useId();
  const router = useRouter();
  const catalogs = useSupportCatalogs().data;
  const save = useSaveProfile();
  const remove = useDeleteProfile();
  const specs = schema.fields.filter((spec) => PROFILE_DEFAULT_FIELDS.includes(spec.name));
  const fieldOptions = schema.fields.map((spec) => ({ value: spec.name, label: spec.label }));

  const [draft, setDraft] = useState<Draft>(() => draftFromDefaults(profile?.defaults ?? {}, schema.fields));
  const [rows, setRows] = useState<ColumnRow[]>(() => rowsOf(profile?.column_map ?? {}));
  const [sheet, setSheet] = useState(profile?.sheet ?? "");
  const [notes, setNotes] = useState(profile?.notes ?? "");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [rowErrors, setRowErrors] = useState<Record<number, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const method = typeof draft.calc_method === "string" ? draft.calc_method : "";
  const rule = schema.methods[method];

  const edited = () => {
    onEdit();
    setFormError(null);
  };
  const setValue = (name: string, value: string | string[]) => {
    setDraft((current) => ({ ...current, [name]: value }));
    setErrors((current) => withoutKey(current, name));
    edited();
  };
  const setRow = (index: number, patch: Partial<ColumnRow>) => {
    setRows((current) => current.map((row, i) => (i === index ? { ...row, ...patch } : row)));
    setRowErrors({});
    edited();
  };

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    const { values, errors: found } = readDraft(specs, draft, rule, { fractionsAsText: true });
    const columnMap: ColumnMap = {};
    const badRows: Record<number, string> = {};
    rows.forEach((row, index) => {
      const headers = splitHeaders(row.headers);
      if (!row.field && headers.length === 0) return;
      if (!row.field) badRows[index] = "Elige el campo que llenan estas columnas.";
      else if (headers.length === 0) badRows[index] = "Escribe al menos un encabezado del archivo.";
      else {
        const merged = [...new Set([...(columnMap[row.field] ?? []), ...headers])];
        if (merged.length > MAX_HEADERS) badRows[index] = `Un campo admite hasta ${MAX_HEADERS} encabezados.`;
        else if (headers.some((header) => header.length > MAX_HEADER_LENGTH)) badRows[index] = `Cada encabezado admite hasta ${MAX_HEADER_LENGTH} caracteres.`;
        else columnMap[row.field] = merged;
      }
    });
    setErrors(found);
    setRowErrors(badRows);
    if (Object.keys(found).length > 0 || Object.keys(badRows).length > 0) {
      setFormError("Revisa los campos marcados.");
      return;
    }
    save.mutate(
      {
        supplierCode: code,
        body: {
          defaults: values as Record<string, string | string[]>,
          column_map: columnMap,
          sheet: sheet.trim() || null,
          notes: notes.trim() || null,
          ...(profile ? { version: profile.version } : {}),
        },
      },
      {
        onSuccess: onSaved,
        onError: (failure) => {
          const byField = fieldErrorsFrom(failure);
          setErrors(byField);
          if (failure instanceof ApiError && failure.status === 409) {
            setFormError("Otra persona cambió este perfil mientras lo editabas. Se cargó la versión nueva: revisa los datos y guarda de nuevo.");
          } else if (failure instanceof ApiError && failure.status === 403) {
            setFormError("Tu usuario puede consultar los perfiles, pero no modificarlos.");
          } else {
            setFormError(errorMessage(failure));
          }
        },
      }
    );
  };

  return (
    <form onSubmit={submit} noValidate className="space-y-8">
      <section className="space-y-4" aria-labelledby={`${id}-defaults`}>
        <div className="space-y-1">
          <h3 id={`${id}-defaults`} className="text-base font-semibold">Valores por defecto</h3>
          <p className="text-[13px] text-text-secondary">
            Prellenan el formulario de creación, y en la carga masiva se aplican a toda fila que no traiga su
            propia columna. Lo que quede vacío no se prellena.
          </p>
        </div>
        <SchemaFields specs={specs} draft={draft} onChange={setValue} errors={errors} rule={rule} required={new Set()} catalogs={catalogs} />
      </section>

      <section className="space-y-4" aria-labelledby={`${id}-file`}>
        <div className="space-y-1">
          <h3 id={`${id}-file`} className="text-base font-semibold">Archivo del proveedor</h3>
          <p className="text-[13px] text-text-secondary">
            Cómo nombra este proveedor sus columnas, cuando no usa los encabezados de la plantilla. Escribe los
            encabezados tal como vienen en su archivo, varios separados por coma; no importan tildes ni mayúsculas.
          </p>
        </div>

        {rows.length > 0 && (
          <ul className="space-y-3">
            {rows.map((row, index) => (
              <li key={index} className="space-y-1">
                <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)_auto] sm:items-center">
                  <Dropdown
                    aria-label={`Campo de la fila ${index + 1}`}
                    value={row.field}
                    onValueChange={(field) => setRow(index, { field })}
                    options={fieldOptions}
                    placeholder="Campo del apoyo"
                  />
                  <Input
                    aria-label={`Encabezados del archivo para la fila ${index + 1}`}
                    aria-invalid={rowErrors[index] ? true : undefined}
                    placeholder="Encabezados, por ejemplo % APOYO DIVERSEY"
                    value={row.headers}
                    onChange={(event) => setRow(index, { headers: event.target.value })}
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={`Quitar la fila ${index + 1}`}
                    className="max-sm:size-11 max-sm:justify-self-end"
                    onClick={() => {
                      setRows((current) => current.filter((_, i) => i !== index));
                      setRowErrors({});
                      edited();
                    }}
                  >
                    <Trash2 aria-hidden="true" />
                  </Button>
                </div>
                {rowErrors[index] && <p className="text-[13px] text-danger">{rowErrors[index]}</p>}
              </li>
            ))}
          </ul>
        )}
        <Button
          variant="outline"
          size="sm"
          className="max-sm:h-11"
          onClick={() => {
            setRows((current) => [...current, { field: "", headers: "" }]);
            edited();
          }}
        >
          <Plus aria-hidden="true" /> Agregar columna
        </Button>

        <div className="grid gap-x-4 gap-y-5 sm:grid-cols-2">
          <Field label="Hoja del libro" htmlFor={`${id}-sheet`} optional hint="Vacío: la primera hoja que tenga encabezados.">
            <Input id={`${id}-sheet`} maxLength={100} value={sheet} onChange={(event) => { setSheet(event.target.value); edited(); }} />
          </Field>
        </div>
      </section>

      <Field label="Notas" htmlFor={`${id}-notes`} optional>
        <Textarea id={`${id}-notes`} rows={3} maxLength={1000} value={notes} onChange={(event) => { setNotes(event.target.value); edited(); }} />
      </Field>

      {formError && (
        <p role="alert" className="rounded-md bg-danger-surface px-3 py-2 text-sm text-danger">
          {formError}
        </p>
      )}

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center">
        {profile && (
          <Button variant="danger" className="max-sm:h-11 sm:mr-auto" onClick={() => setConfirmDelete(true)}>
            <Trash2 aria-hidden="true" /> Borrar perfil
          </Button>
        )}
        <Link href={`/${area}/apoyos/perfiles`} className={buttonVariants({ variant: "outline", className: "max-sm:h-11 sm:ml-auto" })}>
          Volver a los perfiles
        </Link>
        <Button type="submit" disabled={save.isPending} className="max-sm:h-11">
          {save.isPending ? "Guardando" : profile ? "Guardar cambios" : "Crear perfil"}
        </Button>
      </div>

      <ConfirmDeleteDialog
        open={confirmDelete}
        onOpenChange={(open) => {
          setConfirmDelete(open);
          setDeleteError(null);
        }}
        title="Borrar el perfil"
        confirmLabel={remove.isPending ? "Borrando" : "Borrar perfil"}
        isPending={remove.isPending}
        error={deleteError}
        onConfirm={() =>
          remove.mutate(code, {
            onSuccess: () => router.push(`/${area}/apoyos/perfiles`),
            onError: (failure) => setDeleteError(errorMessage(failure)),
          })
        }
      >
        Se borran sus valores por defecto y el mapeo de columnas. Los apoyos ya creados con este perfil no
        cambian.
      </ConfirmDeleteDialog>
    </form>
  );
}
