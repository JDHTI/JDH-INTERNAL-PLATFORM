"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { CircleCheck, CloudOff, RefreshCw, TriangleAlert } from "lucide-react";

import StatePanel from "@/shared/components/state-panel";
import type { AutocompleteOption } from "@/shared/components/ui/autocomplete";
import { Button, buttonVariants } from "@/shared/components/ui/button";
import { ApiError, errorMessage } from "@/shared/lib/api-client";
import { useBreadcrumbLabel } from "@/shared/store/use-breadcrumb-store";

import { useCreateSupport, useFormSchema, useProfile, useSupportCatalogs } from "../hooks/use-supports";
import { choiceLabel, formatSupplierValue } from "../lib/format";
import {
  draftFromDefaults,
  fieldErrorsFrom,
  isEmptyValue,
  isFieldVisible,
  methodGatedFields,
  readDraft,
  withoutKey,
  type Draft,
} from "../lib/form-values";
import type { SupplierSupport, SupportCreateBody, SupportFormSchema } from "../types/support.types";
import BasePicker, { SUPPLIER_PICKER } from "./base-picker";
import SchemaFields from "./schema-fields";

interface FormState {
  draft: Draft;
  /** Fields the person typed in: a profile never overwrites them. */
  touched: string[];
  /** Fields the current profile filled; switching supplier clears the ones still untouched. */
  fromProfile: string[];
}

const EMPTY: FormState = { draft: {}, touched: [], fromProfile: [] };

/**
 * New support, rendered from `form-schema`. The supplier comes first: its
 * profile pre-fills the rest, and the calc method then decides which fields
 * apply and whether the value is typed as a percentage or in pesos.
 */
export default function SupportCreateForm({ area }: { area: string }) {
  const schemaQuery = useFormSchema();
  useBreadcrumbLabel(`/${area}/apoyos/nuevo`, "Nuevo apoyo");

  if (schemaQuery.isPending) {
    return <div className="h-96 animate-pulse rounded-lg bg-canvas-subtle" aria-busy="true" aria-label="Cargando el formulario" />;
  }
  if (schemaQuery.isError) {
    return (
      <StatePanel
        icon={CloudOff}
        tone="danger"
        title="No se pudo cargar el formulario de apoyos"
        action={
          <Button variant="outline" onClick={() => schemaQuery.refetch()}>
            <RefreshCw aria-hidden="true" /> Reintentar
          </Button>
        }
      >
        {errorMessage(schemaQuery.error)}
      </StatePanel>
    );
  }
  return <CreateForm area={area} schema={schemaQuery.data} />;
}

function CreateForm({ area, schema }: { area: string; schema: SupportFormSchema }) {
  const catalogs = useSupportCatalogs().data;
  const create = useCreateSupport();
  const [supplier, setSupplier] = useState<AutocompleteOption | null>(null);
  const profile = useProfile(supplier?.value ?? null);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [appliedKey, setAppliedKey] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [created, setCreated] = useState<SupplierSupport | null>(null);

  // The profile is applied once per supplier (and per profile version) as it arrives. If it
  // cannot be read the form still opens, empty: the profile only saves typing.
  const profileReady = supplier !== null && (profile.isSuccess || profile.isError);
  const profileKey = profileReady ? `${supplier.value}:${profile.data?.version ?? "sin perfil"}` : null;
  if (profileKey !== null && profileKey !== appliedKey) {
    setAppliedKey(profileKey);
    setForm((current) => {
      const draft = { ...current.draft };
      for (const name of current.fromProfile) if (!current.touched.includes(name)) delete draft[name];
      const defaults = draftFromDefaults(profile.data?.defaults ?? {}, schema.fields);
      const fromProfile = Object.keys(defaults).filter((name) => !current.touched.includes(name));
      for (const name of fromProfile) draft[name] = defaults[name];
      return { ...current, draft, fromProfile };
    });
  }

  const gated = useMemo(() => methodGatedFields(schema), [schema]);
  const method = typeof form.draft.calc_method === "string" ? form.draft.calc_method : "";
  const rule = schema.methods[method];
  const specs = schema.fields.filter((spec) => spec.name !== "supplier_code" && isFieldVisible(spec.name, rule, gated));
  const required = new Set([...schema.required_always, ...(rule?.requires ?? [])]);

  const setValue = (name: string, value: string | string[]) => {
    setForm((current) => ({
      ...current,
      draft: { ...current.draft, [name]: value },
      touched: current.touched.includes(name) ? current.touched : [...current.touched, name],
    }));
    setErrors((current) => withoutKey(current, name));
  };

  const restart = () => {
    setForm(EMPTY);
    setAppliedKey(null);
    setErrors({});
    setFormError(null);
    setCreated(null);
  };

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    setFormError(null);
    if (!supplier) return;
    const { values, errors: found } = readDraft(specs, form.draft, rule);
    for (const name of required) {
      if (isEmptyValue(form.draft[name]) && specs.some((spec) => spec.name === name)) {
        found[name] = schema.fields.find((spec) => spec.name === name)?.type === "choice" ? "Elige una opción." : "Este dato es obligatorio para el método elegido.";
      }
    }
    if (typeof values.valid_from === "string" && typeof values.valid_to === "string" && values.valid_to < values.valid_from) {
      found.valid_to = "La fecha fin no puede ser anterior a la fecha de inicio.";
    }
    setErrors(found);
    if (Object.keys(found).length > 0) {
      setFormError(`Revisa ${Object.keys(found).length === 1 ? "el campo marcado" : `los ${Object.keys(found).length} campos marcados`}.`);
      return;
    }
    create.mutate({ ...values, supplier_code: supplier.value } as SupportCreateBody, {
      onSuccess: setCreated,
      onError: (failure) => {
        const byField = fieldErrorsFrom(failure);
        setErrors(byField);
        if (failure instanceof ApiError && failure.status === 403) {
          setFormError("Tu usuario puede consultar los apoyos, pero no crearlos.");
        } else {
          setFormError(Object.keys(byField).length > 0 ? "El API rechazó algunos datos: revisa los campos marcados." : errorMessage(failure));
        }
      },
    });
  };

  if (created) {
    return <Created area={area} support={created} supplierName={supplier?.label ?? ""} onAnother={restart} />;
  }

  return (
    <form onSubmit={submit} noValidate className="max-w-4xl space-y-6">
      <div className="space-y-2 rounded-lg border border-border p-4">
        <BasePicker
          config={SUPPLIER_PICKER}
          selected={supplier}
          onSelect={setSupplier}
          onClear={() => {
            setSupplier(null);
            setAppliedKey(null);
          }}
        />
        <ProfileNote area={area} supplier={supplier} isPending={profile.isFetching} isError={profile.isError} hasProfile={Boolean(profile.data)} filled={form.fromProfile.length} />
      </div>

      {profileReady && (
        <>
          <SchemaFields
            specs={specs}
            draft={form.draft}
            onChange={setValue}
            errors={errors}
            rule={rule}
            required={required}
            catalogs={catalogs}
          />
          <p className="text-[13px] text-text-secondary">
            Las escalas por volumen se agregan después, desde Editar en el maestro de apoyos.
          </p>
        </>
      )}

      {formError && (
        <p role="alert" className="rounded-md bg-danger-surface px-3 py-2 text-sm text-danger">
          {formError}
        </p>
      )}

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Link href={`/${area}/apoyos`} className={buttonVariants({ variant: "outline", className: "max-sm:h-11" })}>
          Cancelar
        </Link>
        <Button type="submit" disabled={!profileReady || create.isPending} className="max-sm:h-11">
          {create.isPending ? "Creando" : "Crear apoyo"}
        </Button>
      </div>
    </form>
  );
}

function ProfileNote({
  area,
  supplier,
  isPending,
  isError,
  hasProfile,
  filled,
}: {
  area: string;
  supplier: AutocompleteOption | null;
  isPending: boolean;
  isError: boolean;
  hasProfile: boolean;
  filled: number;
}) {
  const link = (label: string) =>
    supplier && (
      <Link href={`/${area}/apoyos/perfiles/${encodeURIComponent(supplier.value)}`} className="font-medium text-text-primary underline underline-offset-2">
        {label}
      </Link>
    );
  let text: React.ReactNode;
  if (!supplier) text = "Elige el proveedor para empezar. Si tiene perfil de apoyos, sus valores prellenan el formulario.";
  else if (isPending) text = "Buscando el perfil del proveedor.";
  else if (isError) text = "No se pudo leer el perfil del proveedor; el formulario empieza vacío.";
  else if (!hasProfile) text = <>Este proveedor no tiene perfil: el formulario empieza vacío. {link("Crear su perfil")}</>;
  else text = <>Se prellenaron {filled === 1 ? "1 campo" : `${filled} campos`} con el perfil del proveedor. {link("Ver el perfil")}</>;
  return (
    <p className="text-[13px] text-text-secondary" aria-live="polite">
      {text}
    </p>
  );
}

function Created({
  area,
  support,
  supplierName,
  onAnother,
}: {
  area: string;
  support: SupplierSupport;
  supplierName: string;
  onAnother: () => void;
}) {
  const conflicts = support.has_conflicts;
  return (
    <StatePanel
      icon={conflicts ? TriangleAlert : CircleCheck}
      title={conflicts ? "Apoyo creado, con conflictos" : "Apoyo creado"}
      action={
        <div className="flex flex-wrap gap-2">
          <Link href={`/${area}/apoyos`} className={buttonVariants({ variant: "primary", className: "max-sm:h-11" })}>
            Ir al maestro de apoyos
          </Link>
          <Button variant="outline" onClick={onAnother} className="max-sm:h-11">
            Crear otro apoyo
          </Button>
        </div>
      }
    >
      <p>
        {support.supplier_name ?? supplierName} · {choiceLabel("kind", support.kind ?? "")} ·{" "}
        {formatSupplierValue(support.calc_method, support.supplier_value)}
      </p>
      {conflicts && (
        <p className="mt-1">
          Se solapa con otro apoyo de la misma regla y periodo. Se guardó igual: revísalo en el maestro con el
          filtro Con conflictos.
        </p>
      )}
    </StatePanel>
  );
}
