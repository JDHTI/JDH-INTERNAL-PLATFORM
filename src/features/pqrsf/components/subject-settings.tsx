"use client";

import { useState } from "react";
import { CloudOff, ListTree, Plus } from "lucide-react";
import { toast } from "sonner";

import StatePanel from "@/shared/components/state-panel";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { errorMessage } from "@/shared/lib/api-client";

import {
  useCreateCause,
  useCreateSubject,
  useFormTypes,
  useSubjects,
  useUpdateCause,
  useUpdateSubject,
} from "../hooks/use-pqrsf";
import type {
  CauseAdmin,
  CauseInput,
  CauseRoute,
  SubjectAdmin,
  SubjectInput,
  TrackingCatalog,
} from "../types/pqrsf.types";
import {
  ActiveBadge,
  Actions,
  EditButton,
  EditDialog,
  SettingsTable,
  ToggleActive,
  type FormField,
  type Values,
} from "./settings-parts";

/** The API caps every option description (types, subjects, causes) at one short line. */
export const OPTION_DESCRIPTION_LIMIT = 120;

const ROUTE_LABELS: Record<CauseRoute, string> = {
  supplier: "Proveedor",
  internal: "Proceso interno",
  none: "Ninguna",
};

/** One choice instead of two flags: «exige» without «admite» cannot be picked. */
type ProductRule = "none" | "optional" | "required";

const PRODUCT_LABELS: Record<ProductRule, string> = {
  none: "No se piden",
  optional: "Opcionales",
  required: "Obligatorios",
};

const productRule = (cause: Pick<CauseAdmin, "allows_product" | "requires_product">): ProductRule =>
  cause.requires_product ? "required" : cause.allows_product ? "optional" : "none";

const productFlags = (rule: ProductRule) => ({
  allows_product: rule !== "none",
  requires_product: rule === "required",
});

const CODE_HINT =
  "Identificador fijo: minúsculas, sin tildes ni espacios (por ejemplo «producto_trocado»). No se cambia después.";
const DESCRIPTION_HINT = `Una línea, máximo ${OPTION_DESCRIPTION_LIMIT} caracteres. El cliente la ve bajo la opción.`;
const OTHER_HINT =
  "La opción que recoge lo que no está en la lista: el cliente debe describir la novedad.";

/**
 * Subjects and causes of the public form. Quality corrects the provisional
 * ones here, without a deployment. The cause decides where the case goes
 * (dependency) and how it is treated (route); the subject's dependency is the
 * fallback when its cause has none.
 */
export default function SubjectSettings({ catalog }: { catalog: TrackingCatalog }) {
  const subjects = useSubjects();
  // All five types: the follow-up catalog leaves out suggestions and compliments.
  const formTypes = useFormTypes();
  const requestTypes = formTypes.data ?? catalog.request_types;
  const createSubject = useCreateSubject();
  const updateSubject = useUpdateSubject();
  const createCause = useCreateCause();
  const updateCause = useUpdateCause();
  const [editingSubject, setEditingSubject] = useState<string | "new" | null>(null);
  const [editingCause, setEditingCause] = useState<{ subjectId: string; causeId: string | null } | null>(null);

  const dependencyName = (id: string | null) =>
    id ? catalog.dependencies.find((item) => item.id === id)?.name ?? "Dependencia desconocida" : null;
  const typeName = (code: string) => requestTypes.find((type) => type.code === code)?.name ?? code;

  const dependencyOptions = (currentId: string | null) => [
    { value: "", label: "Sin dependencia" },
    ...[...catalog.dependencies]
      .filter((item) => item.is_active || item.id === currentId)
      .sort((a, b) => a.sort_order - b.sort_order)
      .map((item) => ({ value: item.id, label: item.is_active ? item.name : `${item.name} (inactiva)` })),
  ];

  if (subjects.isPending) {
    return (
      <div className="space-y-3" aria-busy="true">
        <span className="sr-only">Cargando asuntos y causales</span>
        <div className="h-24 animate-pulse rounded-lg bg-canvas-subtle" />
        <div className="h-24 animate-pulse rounded-lg bg-canvas-subtle" />
      </div>
    );
  }
  if (subjects.error) {
    return (
      <StatePanel
        icon={CloudOff}
        tone="danger"
        title="No se cargaron los asuntos"
        action={
          <Button variant="outline" onClick={() => subjects.refetch()}>
            Reintentar
          </Button>
        }
      >
        {errorMessage(subjects.error)}
      </StatePanel>
    );
  }

  const list = [...subjects.data].sort((a, b) => a.sort_order - b.sort_order);
  const subject = list.find((item) => item.id === editingSubject);
  const causeSubject = list.find((item) => item.id === editingCause?.subjectId);
  const cause = causeSubject?.causes.find((item) => item.id === editingCause?.causeId);

  const subjectFields = (currentDependency: string | null): FormField[] => [
    { key: "code", label: "Código", kind: "text", createOnly: true, maxLength: 40, hint: CODE_HINT },
    { key: "name", label: "Nombre", kind: "text", maxLength: 120 },
    { key: "description", label: "Descripción", kind: "text", optional: true, maxLength: OPTION_DESCRIPTION_LIMIT, hint: DESCRIPTION_HINT },
    {
      key: "request_type_codes",
      label: "Tipos que lo ofrecen",
      kind: "multi",
      options: requestTypes.map((type) => ({ value: type.code, label: type.name })),
      hint: "Al menos uno. El asunto solo aparece cuando el cliente elige uno de estos tipos.",
    },
    {
      key: "dependency_id",
      label: "Dependencia",
      kind: "select",
      optional: true,
      options: dependencyOptions(currentDependency),
      hint: "Atiende el caso cuando la causal no tiene dependencia propia.",
    },
    { key: "is_other", label: "Es «Otro»", kind: "checkbox", hint: OTHER_HINT },
    { key: "sort_order", label: "Orden", kind: "number", min: 0, hint: "Posición en el formulario." },
  ];

  const causeFields = (currentDependency: string | null): FormField[] => [
    { key: "code", label: "Código", kind: "text", createOnly: true, maxLength: 40, hint: `${CODE_HINT} Único entre todas las causales.` },
    { key: "name", label: "Nombre", kind: "text", maxLength: 120 },
    { key: "description", label: "Descripción", kind: "text", optional: true, maxLength: OPTION_DESCRIPTION_LIMIT, hint: DESCRIPTION_HINT },
    {
      key: "dependency_id",
      label: "Dependencia",
      kind: "select",
      optional: true,
      options: dependencyOptions(currentDependency),
      hint: "El área a la que va el caso. Sin dependencia, va a la del asunto.",
    },
    {
      key: "route",
      label: "Ruta de tratamiento",
      kind: "select",
      options: (Object.keys(ROUTE_LABELS) as CauseRoute[]).map((value) => ({ value, label: ROUTE_LABELS[value] })),
      hint: "Proveedor: se puede escalar al fabricante. Proceso interno: es una falla de JDH. Ninguna: se decide al revisar el caso.",
    },
    {
      key: "products",
      label: "Productos",
      kind: "select",
      options: (Object.keys(PRODUCT_LABELS) as ProductRule[]).map((value) => ({ value, label: PRODUCT_LABELS[value] })),
      hint: "Si el formulario muestra la sección de productos (factura, referencia, lote, vencimiento, cantidad) y si exige al menos uno.",
    },
    { key: "is_other", label: "Es «Otro»", kind: "checkbox", hint: OTHER_HINT },
    { key: "sort_order", label: "Orden", kind: "number", min: 0, hint: "Posición dentro del asunto." },
  ];

  /** Turns the dialog's strings into the API's shape: empty means none, numbers are numbers. */
  const toInput = (values: Values, keys: string[]) => {
    const input: Record<string, unknown> = {};
    for (const key of keys) {
      const value = values[key];
      if (key === "code") input.code = String(value).trim().toLowerCase();
      else if (key === "description") input.description = String(value).trim() || null;
      else if (key === "dependency_id") input.dependency_id = value || null;
      else if (key === "sort_order") input.sort_order = Number(value);
      else if (key === "products") Object.assign(input, productFlags(value as ProductRule));
      else input[key] = value;
    }
    return input;
  };

  const nextOrder = (items: { sort_order: number }[]) =>
    String(Math.max(0, ...items.map((item) => item.sort_order)) + 10);

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="max-w-prose text-[13px] text-text-secondary">
          Lo que el cliente elige en el formulario público. La causal decide a qué dependencia va el
          caso y cómo se trata; el cliente no ve ninguna de las dos. Los asuntos y causales actuales
          son provisionales hasta tener la matriz oficial de Calidad.
        </p>
        <Button variant="secondary" size="sm" className="max-md:h-11" onClick={() => setEditingSubject("new")}>
          <Plus aria-hidden="true" />
          Nuevo asunto
        </Button>
      </div>

      {list.length === 0 && (
        <StatePanel icon={ListTree} title="Aún no hay asuntos">
          Sin asuntos, la queja, el reclamo y la petición piden el asunto escrito. Crea el primero
          con «Nuevo asunto».
        </StatePanel>
      )}

      {list.map((item) => {
        const causes = [...item.causes].sort((a, b) => a.sort_order - b.sort_order);
        const dependency = dependencyName(item.dependency_id);
        return (
          <article
            key={item.id}
            aria-labelledby={`subject-${item.id}`}
            className="space-y-3 rounded-lg border border-border p-3 md:p-4"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0 space-y-1">
                <h2 id={`subject-${item.id}`} className="flex flex-wrap items-center gap-2 text-base font-semibold">
                  {item.name}
                  {item.is_other && <Badge>«Otro»</Badge>}
                  <ActiveBadge active={item.is_active} />
                </h2>
                <p className="text-[13px] text-text-secondary">
                  {item.description || "Sin descripción en el formulario"}
                </p>
                <dl className="flex flex-wrap gap-x-4 gap-y-1 text-[13px]">
                  <div className="flex gap-1">
                    <dt className="text-text-secondary">Código</dt>
                    <dd className="font-mono">{item.code}</dd>
                  </div>
                  <div className="flex gap-1">
                    <dt className="text-text-secondary">Tipos</dt>
                    <dd>{item.request_type_codes.map(typeName).join(", ")}</dd>
                  </div>
                  <div className="flex gap-1">
                    <dt className="text-text-secondary">Dependencia</dt>
                    <dd>{dependency ?? "Sin dependencia"}</dd>
                  </div>
                  <div className="flex gap-1">
                    <dt className="text-text-secondary">Orden</dt>
                    <dd className="tabular">{item.sort_order}</dd>
                  </div>
                </dl>
              </div>
              <div className="flex items-center gap-1">
                <ToggleActive
                  name={item.name}
                  active={item.is_active}
                  onToggle={() => updateSubject.mutateAsync({ id: item.id, input: { is_active: !item.is_active } })}
                />
                <EditButton label={item.name} onClick={() => setEditingSubject(item.id)} />
              </div>
            </div>

            {causes.length === 0 ? (
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-md bg-canvas-subtle px-3 py-2.5">
                <p className="text-[13px] text-text-secondary">
                  Sin causales: el formulario no pide causal para este asunto.
                </p>
                <NewCauseButton onClick={() => setEditingCause({ subjectId: item.id, causeId: null })} />
              </div>
            ) : (
              <SettingsTable
                caption={`${causes.length} ${causes.length === 1 ? "causal" : "causales"}`}
                action={<NewCauseButton onClick={() => setEditingCause({ subjectId: item.id, causeId: null })} />}
                headers={[
                  { label: "Causal" },
                  { label: "Código" },
                  { label: "Dependencia" },
                  { label: "Ruta" },
                  { label: "Productos" },
                  { label: "Situación" },
                ]}
              >
                {causes.map((row) => (
                  <CauseRow
                    key={row.id}
                    cause={row}
                    dependency={dependencyName(row.dependency_id) ?? `Del asunto${dependency ? ` (${dependency})` : ""}`}
                    onToggle={() => updateCause.mutateAsync({ id: row.id, input: { is_active: !row.is_active } })}
                    onEdit={() => setEditingCause({ subjectId: item.id, causeId: row.id })}
                  />
                ))}
              </SettingsTable>
            )}
          </article>
        );
      })}

      {(editingSubject === "new" || subject) && (
        <EditDialog
          title={subject ? `Editar asunto «${subject.name}»` : "Nuevo asunto"}
          isCreate={!subject}
          fields={subjectFields(subject?.dependency_id ?? null)}
          initial={
            subject
              ? {
                  name: subject.name,
                  description: subject.description ?? "",
                  request_type_codes: subject.request_type_codes,
                  dependency_id: subject.dependency_id ?? "",
                  is_other: subject.is_other,
                  sort_order: String(subject.sort_order),
                }
              : {
                  code: "",
                  name: "",
                  description: "",
                  request_type_codes: [],
                  dependency_id: "",
                  is_other: false,
                  sort_order: nextOrder(list),
                }
          }
          onSubmit={(values, changed) =>
            subject
              ? updateSubject
                  .mutateAsync({ id: subject.id, input: toInput(values, changed) })
                  .then(() => toast.success("Asunto guardado."))
              : createSubject
                  .mutateAsync(
                    toInput(values, ["code", "name", "description", "request_type_codes", "dependency_id", "is_other", "sort_order"]) as unknown as SubjectInput
                  )
                  .then((created: SubjectAdmin) => toast.success(`Asunto «${created.name}» creado.`))
          }
          onClose={() => setEditingSubject(null)}
        />
      )}

      {editingCause && causeSubject && (
        <EditDialog
          title={cause ? `Editar causal «${cause.name}»` : `Nueva causal de «${causeSubject.name}»`}
          isCreate={!cause}
          fields={causeFields(cause?.dependency_id ?? null)}
          initial={
            cause
              ? {
                  name: cause.name,
                  description: cause.description ?? "",
                  dependency_id: cause.dependency_id ?? "",
                  route: cause.route,
                  products: productRule(cause),
                  is_other: cause.is_other,
                  sort_order: String(cause.sort_order),
                }
              : {
                  code: "",
                  name: "",
                  description: "",
                  dependency_id: "",
                  route: "none",
                  products: "none",
                  is_other: false,
                  sort_order: nextOrder(causeSubject.causes),
                }
          }
          onSubmit={(values, changed) =>
            cause
              ? updateCause
                  .mutateAsync({ id: cause.id, input: toInput(values, changed) })
                  .then(() => toast.success("Causal guardada."))
              : createCause
                  .mutateAsync({
                    subjectId: causeSubject.id,
                    input: toInput(values, ["code", "name", "description", "dependency_id", "route", "products", "is_other", "sort_order"]) as unknown as CauseInput,
                  })
                  .then((created: CauseAdmin) => toast.success(`Causal «${created.name}» creada.`))
          }
          onClose={() => setEditingCause(null)}
        />
      )}
    </section>
  );
}

function NewCauseButton({ onClick }: { onClick: () => void }) {
  return (
    <Button variant="secondary" size="sm" className="max-md:h-11" onClick={onClick}>
      <Plus aria-hidden="true" />
      Nueva causal
    </Button>
  );
}

function CauseRow({
  cause,
  dependency,
  onToggle,
  onEdit,
}: {
  cause: CauseAdmin;
  dependency: string;
  onToggle: () => Promise<unknown>;
  onEdit: () => void;
}) {
  return (
    <tr>
      <td className="px-3 py-2">
        <span className="flex flex-wrap items-center gap-2 font-medium">
          {cause.name}
          {cause.is_other && <Badge>«Otro»</Badge>}
        </span>
        {cause.description && (
          <span className="block max-w-sm text-[13px] text-text-secondary">{cause.description}</span>
        )}
      </td>
      <td className="px-3 py-2 font-mono text-[13px]">{cause.code}</td>
      <td className="px-3 py-2">{dependency}</td>
      <td className="px-3 py-2 whitespace-nowrap">{ROUTE_LABELS[cause.route]}</td>
      <td className="px-3 py-2 whitespace-nowrap">{PRODUCT_LABELS[productRule(cause)]}</td>
      <td className="px-3 py-2"><ActiveBadge active={cause.is_active} /></td>
      <Actions>
        <ToggleActive name={cause.name} active={cause.is_active} onToggle={onToggle} />
        <EditButton label={cause.name} onClick={onEdit} />
      </Actions>
    </tr>
  );
}
