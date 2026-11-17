"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { CircleCheck, CloudOff, RefreshCw, TriangleAlert } from "lucide-react";

import StatePanel from "@/shared/components/state-panel";
import type { AutocompleteOption } from "@/shared/components/ui/autocomplete";
import { Button, buttonVariants } from "@/shared/components/ui/button";
import { ApiError, errorMessage } from "@/shared/lib/api-client";
import { useBreadcrumbLabel } from "@/shared/store/use-breadcrumb-store";

import { useCreateSupport, useFormSchema, useKindLabel, useProfile, useSupportCatalogs } from "../hooks/use-supports";
import { formatSupplierValue } from "../lib/format";
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
import { overlapsOf } from "../lib/overlaps";
import type {
  SupplierSupport,
  SupportCatalogs,
  SupportCreateBody,
  SupportFormSchema,
  SupportOverlap,
} from "../types/support.types";
import BasePicker, { SUPPLIER_PICKER } from "@/shared/components/pickers/base-picker";
import OverlapDialog from "./overlap-dialog";
import SchemaFields from "./schema-fields";

interface FormState {
  draft: Draft;
  /** Fields the person typed in: a profile never overwrites them. */
  touched: string[];
  /** Fields the current profile filled; switching supplier clears the ones still untouched. */
  fromProfile: string[];
}

const EMPTY: FormState = { draft: {}, touched: [], fromProfile: [] };

/** Chosen above the form (the supplier) or typed elsewhere (the JDH percentage, in the requests panel). */
const HIDDEN_FIELDS = ["supplier_code", "jdh_pct"];

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
  const [created, setCreated] = useState<SupplierSupport[] | null>(null);
  // A create the API refused for crossing live supports, kept to send again with the choice.
  const [crossing, setCrossing] = useState<{
    body: SupportCreateBody;
    byGroup: boolean;
    overlaps: SupportOverlap[];
    error: string | null;
  } | null>(null);

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
  const kind = typeof form.draft.kind === "string" ? form.draft.kind : "";
  const rule = schema.methods[method];
  const methodsFor = (code: string) => methodsOfKind(catalogs, code);
  const hasGroup = !isEmptyValue(form.draft.customer_group);
  const hasCustomer = !isEmptyValue(form.draft.customer_nit);
  // The JDH percentage is requested through the JDH panel; the supported margin replaces it here.
  // A business group and a customer exclude each other: the group creates one support per customer.
  const specs = schema.fields
    .filter(
      (spec) =>
        !HIDDEN_FIELDS.includes(spec.name) &&
        isFieldVisible(spec.name, rule, gated) &&
        !(hasGroup && CUSTOMER_FIELDS.includes(spec.name)) &&
        !(hasCustomer && spec.name === "customer_group")
    )
    .map((spec) => {
      // Only the rules v2 classes are created, each with its own types.
      if (spec.name === "kind" && catalogs?.active_kinds) return { ...spec, choices: catalogs.active_kinds };
      if (spec.name === "calc_method") return { ...spec, choices: methodsFor(kind) ?? spec.choices };
      return spec;
    });
  const required = new Set([...schema.required_always, ...(rule?.requires ?? [])]);

  const setValue = (name: string, value: string | string[]) => {
    setForm((current) => {
      const draft = { ...current.draft, [name]: value };
      // A type the new class does not admit is dropped, so it never reaches the API as a 422.
      const allowed = name === "kind" && typeof value === "string" ? methodsFor(value) : null;
      if (allowed && typeof draft.calc_method === "string" && draft.calc_method && !allowed.includes(draft.calc_method)) {
        delete draft.calc_method;
      }
      return {
        ...current,
        draft,
        touched: current.touched.includes(name) ? current.touched : [...current.touched, name],
      };
    });
    setErrors((current) => withoutKey(current, name));
  };

  const send = (body: SupportCreateBody, byGroup: boolean) => {
    create.mutate(
      { body, byGroup },
      {
        onSuccess: (supports) => {
          setCrossing(null);
          setCreated(supports);
        },
        onError: (failure) => {
          const overlaps = overlapsOf(failure);
          if (overlaps) {
            setCrossing({ body, byGroup, overlaps, error: crossing ? errorMessage(failure) : null });
            return;
          }
          setCrossing(null);
          const byField = fieldErrorsFrom(failure);
          setErrors(byField);
          if (failure instanceof ApiError && failure.status === 403) {
            setFormError("Tu usuario puede consultar los apoyos, pero no crearlos.");
          } else {
            setFormError(Object.keys(byField).length > 0 ? "El API rechazó algunos datos: revisa los campos marcados." : errorMessage(failure));
          }
        },
      }
    );
  };

  const restart = () => {
    setForm(EMPTY);
    setAppliedKey(null);
    setErrors({});
    setFormError(null);
    setCreated(null);
    setCrossing(null);
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
    const byGroup = typeof values.customer_group === "string" && !values.customer_nit;
    send({ ...values, supplier_code: supplier.value } as SupportCreateBody, byGroup);
  };

  if (created) {
    return <Created area={area} supports={created} supplierName={supplier?.label ?? ""} onAnother={restart} />;
  }

  return (
    <>
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
          {create.isPending ? "Creando" : hasGroup ? "Crear un apoyo por cliente del grupo" : "Crear apoyo"}
        </Button>
      </div>
    </form>
    <OverlapDialog
      overlaps={crossing?.overlaps ?? null}
      pending={create.isPending}
      error={crossing?.error ?? null}
      onCancel={() => setCrossing(null)}
      onResolve={(choice) => crossing && send({ ...crossing.body, ...choice }, crossing.byGroup)}
    />
    </>
  );
}

/** Customer fields a business group replaces. */
const CUSTOMER_FIELDS = ["customer_nit", "customer_name", "customer_branch_id"];

/** The types a class admits; null when the API does not say (older builds), so nothing is narrowed. */
function methodsOfKind(catalogs: SupportCatalogs | undefined, kind: string): string[] | null {
  const byKind = catalogs?.methods_by_kind;
  if (!byKind) return null;
  if (kind) return byKind[kind] ?? null;
  // Before a class is chosen, every type some active class admits.
  return [...new Set((catalogs.active_kinds ?? Object.keys(byKind)).flatMap((code) => byKind[code] ?? []))];
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
  supports,
  supplierName,
  onAnother,
}: {
  area: string;
  /** One, or one per customer of a business group. */
  supports: SupplierSupport[];
  supplierName: string;
  onAnother: () => void;
}) {
  const kindLabel = useKindLabel();
  const support = supports[0];
  const conflicts = supports.some((item) => item.has_conflicts);
  const many = supports.length > 1;
  if (!support) {
    // A group without active customers creates nothing; the API says so with a 422 first, but just in case.
    return (
      <StatePanel icon={TriangleAlert} title="No se creó ningún apoyo" action={<Button variant="outline" onClick={onAnother}>Volver al formulario</Button>}>
        El grupo no tiene clientes activos.
      </StatePanel>
    );
  }
  return (
    <StatePanel
      icon={conflicts ? TriangleAlert : CircleCheck}
      title={many ? `${supports.length} apoyos creados${conflicts ? ", con conflictos" : ""}` : conflicts ? "Apoyo creado, con conflictos" : "Apoyo creado"}
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
        {support.supplier_name ?? supplierName} · {kindLabel(support.kind)} ·{" "}
        {formatSupplierValue(support.calc_method, support.supplier_value)}
      </p>
      {many && (
        <p className="mt-1">
          Uno por cada cliente activo del grupo {support.customer_group ?? support.business_group ?? ""}.
        </p>
      )}
      {conflicts && (
        <p className="mt-1">
          {many ? "Algunos tienen conflictos" : "Tiene conflictos"} con otros apoyos. Se guardó igual: revísalo en el
          maestro con el filtro Con conflictos.
        </p>
      )}
    </StatePanel>
  );
}
