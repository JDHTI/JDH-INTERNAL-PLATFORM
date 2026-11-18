"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { CircleCheck, CloudOff, RefreshCw, TriangleAlert } from "lucide-react";

import StatePanel from "@/shared/components/state-panel";
import type { AutocompleteOption } from "@/shared/components/ui/autocomplete";
import { Button } from "@/shared/components/ui/button";
import { Dialog, DialogFooter } from "@/shared/components/ui/dialog";
import { ApiError, errorMessage } from "@/shared/lib/api-client";

import { useCreateSupport, useFormSchema, useKindLabel, useProfile, useSupportCatalogs } from "../hooks/use-supports";
import { supportValueText } from "../lib/format";
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
import DiscardDialog from "./discard-dialog";
import OverlapDialog from "./overlap-dialog";
import PromoCheck from "./promo-check";
import SchemaFields from "./schema-fields";
import SupportPreview from "./support-preview";

interface FormState {
  draft: Draft;
  /** Fields the person typed in: a profile never overwrites them. */
  touched: string[];
  /** Fields the current profile filled; switching supplier clears the ones still untouched. */
  fromProfile: string[];
}

const EMPTY: FormState = { draft: {}, touched: [], fromProfile: [] };

/**
 * The only fields the form asks, in BI's order (the template's): everything
 * else the schema describes is left to the API's defaults or to editing.
 * Each field still shows only when the chosen type uses it.
 */
const CREATE_FIELDS: { name: string; section: "Apoyo" | "Alcance"; label?: string }[] = [
  { name: "kind", section: "Apoyo" },
  { name: "calc_method", section: "Apoyo" },
  { name: "supplier_value", section: "Apoyo" },
  // Only «% Margen Garantizado» asks for it: its value is the price and this is the margin.
  { name: "target_margin_pct", section: "Apoyo" },
  { name: "value_unit", section: "Apoyo" },
  { name: "supported_margin_pct", section: "Apoyo" },
  { name: "valid_from", section: "Apoyo" },
  { name: "valid_to", section: "Apoyo" },
  { name: "customer_nit", section: "Alcance", label: "NIT y cliente" },
  { name: "customer_branch_id", section: "Alcance" },
  { name: "customer_group", section: "Alcance" },
  { name: "product_sku", section: "Alcance" },
  { name: "supplier_sku", section: "Alcance" },
  { name: "regionals", section: "Alcance" },
  { name: "business_units", section: "Alcance" },
  { name: "channels", section: "Alcance" },
  { name: "warehouse", section: "Alcance" },
];

/** The value goes per unit or per box; the box is turned into units with the product master's UM Emp. factor. */
const VALUE_UNITS = ["unidad", "caja"];

/**
 * The schema's help speaks about the bulk file (date formats, codes, what a
 * blank column means). Here only what helps to fill the field is said; the
 * type's own help still shows under «Tipo apoyo», and the value says % or $.
 */
const HELP: Record<string, string> = {
  value_unit: "La caja se lleva a unidad con el factor UM Emp. del maestro de productos.",
  supported_margin_pct: "Con él sale el precio apoyado mínimo: (costo − apoyo) / (1 − margen).",
  valid_to: "Vacía, sin fecha de fin.",
  customer_nit: "Vacío, todos los clientes.",
  customer_group: "Crea un apoyo por cada cliente activo del grupo.",
  product_sku: "Vacío, el SKU del proveedor lo identifica.",
};

/**
 * New support, in a modal over the master. The supplier comes first: its
 * profile pre-fills the fields, and the type then decides which apply and
 * whether the value is typed as a percentage or in pesos.
 */
export default function SupportCreateDialog({ area, open, onClose }: { area: string; open: boolean; onClose: () => void }) {
  // A new key per opening: closing and opening again starts an empty form.
  const [session, setSession] = useState(0);
  const [dirty, setDirty] = useState(false);
  const [confirmClose, setConfirmClose] = useState(false);
  const close = () => {
    setSession((value) => value + 1);
    setDirty(false);
    onClose();
  };
  return (
    <>
      <Dialog
        open={open}
        onOpenChange={(next) => {
          if (next) return;
          if (dirty) setConfirmClose(true);
          else close();
        }}
        title="Nuevo apoyo"
        description="A qué proveedor, cliente y referencia aplica, cuánto da y por cuánto tiempo."
        isForm
        wide
      >
        {open && <SupportCreateForm key={session} area={area} onClose={close} onDirtyChange={setDirty} />}
      </Dialog>
      <DiscardDialog
        open={confirmClose}
        onCancel={() => setConfirmClose(false)}
        onDiscard={() => {
          setConfirmClose(false);
          close();
        }}
      />
    </>
  );
}

function SupportCreateForm({
  area,
  onClose,
  onDirtyChange,
}: {
  area: string;
  onClose: () => void;
  onDirtyChange: (dirty: boolean) => void;
}) {
  const schemaQuery = useFormSchema();

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
  return <CreateForm area={area} schema={schemaQuery.data} onClose={onClose} onDirtyChange={onDirtyChange} />;
}

function CreateForm({
  area,
  schema,
  onClose,
  onDirtyChange,
}: {
  area: string;
  schema: SupportFormSchema;
  onClose: () => void;
  onDirtyChange: (dirty: boolean) => void;
}) {
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
  // Only the template's fields, in its order. A business group and a customer exclude each
  // other: the group creates one support per customer.
  const specs = CREATE_FIELDS.flatMap(({ name, section, label }) => {
    const spec = schema.fields.find((candidate) => candidate.name === name);
    if (!spec || !isFieldVisible(name, rule, gated)) return [];
    if (hasGroup && CUSTOMER_FIELDS.includes(name)) return [];
    if (hasCustomer && name === "customer_group") return [];
    const shown = { ...spec, group: section, label: label ?? spec.label, help: HELP[name] ?? "" };
    // Only the rules v2 classes are created, each with its own types.
    if (name === "kind" && catalogs?.active_kinds) return [{ ...shown, choices: catalogs.active_kinds }];
    if (name === "calc_method") return [{ ...shown, choices: methodsFor(kind) ?? spec.choices }];
    if (name === "value_unit") return [{ ...shown, choices: spec.choices.filter((code) => VALUE_UNITS.includes(code)) }];
    return [shown];
  });
  const required = new Set([...schema.required_always, ...(rule?.requires ?? [])]);
  // A margin exception (margen_minimo) keeps its margin in `min_margin_pct`: the API requires
  // it there and the quoter and the order validator read it there. The form asks it as the one
  // field BI knows, «Excepción margen mínimo autorizado JDH», and sends it where it belongs.
  const isException = method === "margen_minimo";
  if (isException) {
    required.delete("min_margin_pct");
    required.add("supported_margin_pct");
  }
  // Promotional warehouses (group 23): off unless ticked here or in the supplier's profile.
  const promo = form.draft.promo_warehouses === "true";
  const toBody = (values: Record<string, string | number | string[]>, supplierCode: string): SupportCreateBody => {
    const body: SupportCreateBody = { ...(values as SupportCreateBody), supplier_code: supplierCode };
    if (promo) body.promo_warehouses = true;
    if (isException && body.supported_margin_pct !== undefined) {
      body.min_margin_pct = body.supported_margin_pct;
      delete body.supported_margin_pct;
    }
    return body;
  };

  // What the preview needs to price it: supplier, a reference, class, type and the value.
  const typed = readDraft(specs, form.draft, rule);
  const missing = [
    !supplier && "el proveedor",
    !typed.values.product_sku && !typed.values.supplier_sku && "la referencia (SKU JDH o SKU proveedor)",
    (!kind || !method) && "la clase y el tipo",
    rule && rule.value_kind !== "none" && typed.values.supplier_value === undefined && "el valor",
    isException && typed.values.supported_margin_pct === undefined && "el margen mínimo autorizado",
  ].filter((part): part is string => Boolean(part));
  const previewBody: SupportCreateBody | null =
    supplier && missing.length === 0 && Object.keys(typed.errors).length === 0 ? toBody(typed.values, supplier.value) : null;
  const missingText =
    Object.keys(typed.errors).length > 0
      ? "Corrige los números marcados para ver las cifras."
      : missing.length > 0
        ? `Para ver las cifras falta ${missing.length === 1 ? missing[0] : `${missing.slice(0, -1).join(", ")} y ${missing[missing.length - 1]}`}.`
        : null;

  const setValue = (name: string, value: string | string[]) => {
    onDirtyChange(true);
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
          onDirtyChange(false);
        },
        onError: (failure) => {
          const overlaps = overlapsOf(failure);
          if (overlaps) {
            setCrossing({ body, byGroup, overlaps, error: crossing ? errorMessage(failure) : null });
            return;
          }
          setCrossing(null);
          const byField = fieldErrorsFrom(failure);
          // The exception's margin is typed in the «Excepción…» field: its error goes there.
          if (byField.min_margin_pct && !byField.supported_margin_pct) byField.supported_margin_pct = byField.min_margin_pct;
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
    send(toBody(values, supplier.value), byGroup);
  };

  if (created) {
    return <Created supports={created} supplierName={supplier?.label ?? ""} onAnother={restart} onClose={onClose} />;
  }

  // Only the profile values that landed in a field the form shows count as pre-filled.
  const filled = form.fromProfile.filter((name) => specs.some((spec) => spec.name === name)).length;

  return (
    <>
    <form onSubmit={submit} noValidate className="space-y-6">
      <div className="space-y-2">
        <BasePicker
          config={SUPPLIER_PICKER}
          selected={supplier}
          onSelect={(option) => {
            onDirtyChange(true);
            setSupplier(option);
          }}
          onClear={() => {
            setSupplier(null);
            setAppliedKey(null);
          }}
        />
        <ProfileNote area={area} supplier={supplier} isPending={profile.isFetching} isError={profile.isError} hasProfile={Boolean(profile.data)} filled={filled} />
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
            after={{
              warehouse: (
                <PromoCheck checked={promo} onChange={(checked) => setValue("promo_warehouses", String(checked))} />
              ),
            }}
          />
          <SupportPreview body={previewBody} missing={missingText} />
        </>
      )}

      {formError && (
        <p role="alert" className="rounded-md bg-danger-surface px-3 py-2 text-sm text-danger">
          {formError}
        </p>
      )}

      <DialogFooter>
        <Button variant="outline" onClick={onClose} disabled={create.isPending}>
          Cancelar
        </Button>
        <Button type="submit" disabled={!profileReady || create.isPending}>
          {create.isPending ? "Creando" : hasGroup ? "Crear un apoyo por cliente del grupo" : "Crear apoyo"}
        </Button>
      </DialogFooter>
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
const CUSTOMER_FIELDS = ["customer_nit", "customer_branch_id"];

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
  supports,
  supplierName,
  onAnother,
  onClose,
}: {
  /** One, or one per customer of a business group. */
  supports: SupplierSupport[];
  supplierName: string;
  onAnother: () => void;
  onClose: () => void;
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
          <Button onClick={onClose} className="max-sm:h-11">
            Volver al maestro
          </Button>
          <Button variant="outline" onClick={onAnother} className="max-sm:h-11">
            Crear otro apoyo
          </Button>
        </div>
      }
    >
      <p>
        {support.supplier_name ?? supplierName} · {kindLabel(support.kind)} ·{" "}
        {supportValueText(support)}
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
