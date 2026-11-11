"use client";

import { useId, useState } from "react";
import Link from "next/link";
import { ArrowLeft, CloudOff, Lock, Plus } from "lucide-react";
import { toast } from "sonner";

import PageHeader from "@/shared/components/page-header";
import StatePanel from "@/shared/components/state-panel";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { errorMessage } from "@/shared/lib/api-client";
import { cn } from "@/shared/lib/utils";
import { useBreadcrumbLabel } from "@/shared/store/use-breadcrumb-store";

import {
  useCatalog,
  useCreateDependency,
  useCreateDocumentType,
  useCreateStatus,
  useFormTypes,
  useUpdateDependency,
  useUpdateDocumentType,
  useUpdateRequestType,
  useUpdateStatus,
} from "../hooks/use-pqrsf";
import { inboxHref } from "../lib/inbox-state";
import type { TrackingCatalog } from "../types/pqrsf.types";
import { StatusBadge } from "./case-badges";
import NotificationSettingsPanel from "./notification-settings";
import { normalize } from "./pickers";
import {
  ActiveBadge,
  Actions,
  EditButton,
  EditDialog,
  SettingsTable,
  ToggleActive,
  pick,
  type FormField,
} from "./settings-parts";
import SubjectSettings, { OPTION_DESCRIPTION_LIMIT } from "./subject-settings";

type Tab = "types" | "subjects" | "statuses" | "dependencies" | "documents" | "timers";

const TABS: { id: Tab; label: string }[] = [
  { id: "types", label: "Tipos de solicitud" },
  { id: "subjects", label: "Asuntos y causales" },
  { id: "statuses", label: "Estados" },
  { id: "dependencies", label: "Dependencias" },
  { id: "documents", label: "Tipos de documento" },
  { id: "timers", label: "Temporizadores" },
];

// ── Screen ──

export default function CatalogSettings({ area }: { area: string }) {
  const catalog = useCatalog(true);
  const [tab, setTab] = useState<Tab>("types");
  useBreadcrumbLabel(`/${area}/pqrsf/configuracion`, "Configuración");

  const heading = (
    <div className="space-y-3">
      <Link
        href={inboxHref(area)}
        className="inline-flex items-center gap-1.5 rounded-sm text-sm text-text-secondary hover:text-text-primary max-md:min-h-11"
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        Volver a la bandeja
      </Link>
      <PageHeader
        title="Configuración de PQRSF"
        description="Nada se borra: lo que ya no se usa se desactiva y los casos antiguos lo conservan."
      />
    </div>
  );

  if (catalog.isPending) {
    return (
      <div className="space-y-6" aria-busy="true">
        {heading}
        <span className="sr-only">Cargando catálogos</span>
        <div className="h-64 animate-pulse rounded-lg bg-canvas-subtle" />
      </div>
    );
  }
  if (catalog.error) {
    return (
      <div className="space-y-6">
        {heading}
        <StatePanel
          icon={CloudOff}
          tone="danger"
          title="No se cargaron los catálogos"
          action={
            <Button variant="outline" onClick={() => catalog.refetch()}>
              Reintentar
            </Button>
          }
        >
          {errorMessage(catalog.error)}
        </StatePanel>
      </div>
    );
  }
  if (!catalog.data.is_manager) {
    return (
      <div className="space-y-6">
        {heading}
        <StatePanel icon={Lock} title="Solo quien gestiona PQRSF cambia estos catálogos">
          Los gestores son los miembros del área de Calidad y los administradores de la
          plataforma. Si necesitas un tipo de documento o una dependencia nueva, pídeselo a
          Calidad.
        </StatePanel>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {heading}
      <nav aria-label="Catálogos" className="-mx-1 overflow-x-auto px-1">
        <ul className="flex gap-1">
          {TABS.map((item) => (
            <li key={item.id}>
              <button
                type="button"
                aria-pressed={tab === item.id}
                onClick={() => setTab(item.id)}
                className={cn(
                  "flex h-9 items-center rounded-md px-3 text-sm font-medium whitespace-nowrap max-md:h-11",
                  tab === item.id
                    ? "bg-primary-subtle text-text-primary shadow-[inset_0_-2px_0_var(--primary)]"
                    : "text-text-secondary hover:bg-canvas-subtle hover:text-text-primary"
                )}
              >
                {item.label}
              </button>
            </li>
          ))}
        </ul>
      </nav>
      {tab === "types" && <RequestTypesTable catalog={catalog.data} />}
      {tab === "subjects" && <SubjectSettings catalog={catalog.data} />}
      {tab === "statuses" && <StatusesTable catalog={catalog.data} />}
      {tab === "dependencies" && <DependenciesTable catalog={catalog.data} />}
      {tab === "documents" && <DocumentTypesTable catalog={catalog.data} />}
      {tab === "timers" && <NotificationSettingsPanel />}
    </div>
  );
}

// ── Request types ──

function RequestTypesTable({ catalog }: { catalog: TrackingCatalog }) {
  return (
    <div className="space-y-8">
      <FormTypesTable />
      <FollowUpTypesTable catalog={catalog} />
    </div>
  );
}

/** What the public form shows of each type: all five, case or not. */
function FormTypesTable() {
  const types = useFormTypes();
  const update = useUpdateRequestType();
  const [editing, setEditing] = useState<string | null>(null);
  const current = types.data?.find((type) => type.id === editing);

  return (
    <section aria-labelledby="form-types-heading" className="space-y-3">
      <h2 id="form-types-heading" className="text-base font-semibold">En el formulario público</h2>
      {types.isPending ? (
        <div className="h-48 animate-pulse rounded-lg bg-canvas-subtle" aria-busy="true">
          <span className="sr-only">Cargando los tipos del formulario</span>
        </div>
      ) : types.error ? (
        <StatePanel
          icon={CloudOff}
          tone="danger"
          title="No se cargaron los tipos del formulario"
          action={
            <Button variant="outline" onClick={() => types.refetch()}>
              Reintentar
            </Button>
          }
        >
          {errorMessage(types.error)}
        </StatePanel>
      ) : (
        <SettingsTable
          caption="La descripción es la línea que el cliente ve bajo cada tipo, y la que le ayuda a distinguir una queja de un reclamo. Una solicitud de documentos nunca lleva evidencias."
          headers={[{ label: "Tipo" }, { label: "Evidencias" }, { label: "Área" }]}
        >
          {types.data.map((type) => (
            <tr key={type.id}>
              <td className="px-3 py-2">
                <span className="flex flex-wrap items-center gap-2 font-medium">
                  {type.name}
                  {!type.is_active && <ActiveBadge active={false} />}
                </span>
                <span className="block max-w-xl text-[13px] text-text-secondary">
                  {type.description || "Sin descripción: el formulario solo muestra el nombre."}
                </span>
              </td>
              <td className="px-3 py-2 whitespace-nowrap">{type.allows_attachments ? "Admite" : "No admite"}</td>
              <td className="px-3 py-2 whitespace-nowrap">{type.asks_area ? "La pide" : "No la pide"}</td>
              <Actions>
                <EditButton label={type.name} onClick={() => setEditing(type.id)} />
              </Actions>
            </tr>
          ))}
        </SettingsTable>
      )}
      {current && (
        <EditDialog
          title={`${current.name} en el formulario`}
          isCreate={false}
          fields={[
            {
              key: "description",
              label: "Descripción",
              kind: "text",
              optional: true,
              maxLength: OPTION_DESCRIPTION_LIMIT,
              hint: `Una línea, máximo ${OPTION_DESCRIPTION_LIMIT} caracteres. Vacía, el formulario muestra solo el nombre.`,
            },
            { key: "allows_attachments", label: "Admite evidencias", kind: "checkbox", hint: "El cliente puede adjuntar fotos y video." },
            { key: "asks_area", label: "Pide el área", kind: "checkbox", hint: "El cliente elige a qué área va dirigida. Decide la dependencia solo cuando la causal, el asunto o la categoría del documento no la deciden." },
          ]}
          initial={{
            description: current.description ?? "",
            allows_attachments: current.allows_attachments,
            asks_area: Boolean(current.asks_area),
          }}
          onSubmit={(values, changed) => {
            const input: Record<string, unknown> = {};
            for (const key of changed) {
              // An empty description clears it (the API takes null for that).
              input[key] = key === "description" ? String(values.description).trim() || null : values[key];
            }
            return update.mutateAsync({ id: current.id, input }).then(() => toast.success(`«${current.name}» guardado.`));
          }}
          onClose={() => setEditing(null)}
        />
      )}
    </section>
  );
}

function FollowUpTypesTable({ catalog }: { catalog: TrackingCatalog }) {
  const update = useUpdateRequestType();
  const [editing, setEditing] = useState<string | null>(null);
  const current = catalog.request_types.find((type) => type.id === editing);

  return (
    <section aria-labelledby="follow-up-types-heading" className="space-y-3">
      <h2 id="follow-up-types-heading" className="text-base font-semibold">Seguimiento de los casos</h2>
      <SettingsTable
        caption="El prefijo abre el consecutivo, seguido del año y la sigla de la sucursal (P26AC0012). Cambiarlo no reescribe los códigos ya emitidos. Sin seguimiento, el caso recibe consecutivo pero no fecha límite. Las sugerencias y felicitaciones no abren caso y no están aquí."
        headers={[
          { label: "Tipo" },
          { label: "Prefijo" },
          { label: "Seguimiento" },
          { label: "Días por defecto", align: "right" },
        ]}
      >
        {catalog.request_types.map((type) => (
          <tr key={type.id} className="h-10">
            <td className="px-3 py-2 font-medium">{type.name}</td>
            <td className="px-3 py-2 font-mono text-[13px]">{type.prefix}</td>
            <td className="px-3 py-2">{type.requires_follow_up ? "Con seguimiento" : "Sin seguimiento"}</td>
            <td className="tabular px-3 py-2 text-right">{type.sla_days ?? "Sin tiempo"}</td>
            <Actions>
              <EditButton label={`seguimiento de ${type.name}`} onClick={() => setEditing(type.id)} />
            </Actions>
          </tr>
        ))}
        {current && (
          <EditDialog
            title={`Seguimiento de ${current.name}`}
            isCreate={false}
            fields={[
              { key: "prefix", label: "Prefijo", kind: "text", maxLength: 5, hint: "De 1 a 5 letras sin tildes." },
              { key: "requires_follow_up", label: "Con seguimiento", kind: "checkbox", hint: "Tiene fecha límite y responde por tiempos." },
              { key: "sla_days", label: "Días hábiles por defecto", kind: "number", min: 0, max: 365, optional: true, hint: "Se usa cuando el caso no tiene documentos." },
            ]}
            initial={{
              prefix: current.prefix,
              requires_follow_up: current.requires_follow_up,
              sla_days: current.sla_days === null ? "" : String(current.sla_days),
            }}
            onSubmit={(values, changed) => {
              const input: Record<string, unknown> = {};
              for (const key of changed) {
                input[key] =
                  key === "sla_days" ? (values.sla_days === "" ? null : Number(values.sla_days)) : values[key];
              }
              return update.mutateAsync({ id: current.id, input }).then(() => toast.success("Tipo de solicitud guardado."));
            }}
            onClose={() => setEditing(null)}
          />
        )}
      </SettingsTable>
    </section>
  );
}

// ── Statuses ──

function StatusesTable({ catalog }: { catalog: TrackingCatalog }) {
  const create = useCreateStatus();
  const update = useUpdateStatus();
  const [editing, setEditing] = useState<string | "new" | null>(null);
  const current = catalog.statuses.find((status) => status.id === editing);
  const statuses = [...catalog.statuses].sort((a, b) => a.sort_order - b.sort_order);

  const fields: FormField[] = [
    { key: "code", label: "Código", kind: "text", createOnly: true, maxLength: 40, hint: "Identificador fijo, en minúsculas y sin espacios (por ejemplo «en_revision»)." },
    { key: "name", label: "Nombre", kind: "text", maxLength: 120 },
    { key: "sort_order", label: "Orden", kind: "number", min: 0, hint: "Posición en listas y en el avance automático del caso." },
    { key: "is_initial", label: "Estado inicial", kind: "checkbox", hint: "Con el que nace todo caso. Solo puede haber uno." },
    { key: "is_terminal", label: "Estado final", kind: "checkbox", hint: "Cierra el caso y exige todos los documentos respondidos." },
  ];

  return (
    <SettingsTable
      caption="Los estados «leida» y «en_curso» mueven los casos solos al abrirlos y al registrar la primera respuesta. Si se desactivan, ese movimiento deja de ocurrir. Un estado nuevo se ve con insignia neutra."
      headers={[{ label: "Estado" }, { label: "Código" }, { label: "Orden", align: "right" }, { label: "Tipo" }, { label: "Situación" }]}
      action={
        <Button variant="secondary" size="sm" className="max-md:h-11" onClick={() => setEditing("new")}>
          <Plus aria-hidden="true" />
          Nuevo estado
        </Button>
      }
    >
      {statuses.map((status) => (
        <tr key={status.id} className="h-10">
          <td className="px-3 py-2"><StatusBadge status={status} /></td>
          <td className="px-3 py-2 font-mono text-[13px]">{status.code}</td>
          <td className="tabular px-3 py-2 text-right">{status.sort_order}</td>
          <td className="px-3 py-2">{status.is_initial ? "Inicial" : status.is_terminal ? "Final" : "Intermedio"}</td>
          <td className="px-3 py-2"><ActiveBadge active={status.is_active} /></td>
          <Actions>
            <ToggleActive
              name={status.name}
              active={status.is_active}
              onToggle={() => update.mutateAsync({ id: status.id, input: { is_active: !status.is_active } })}
            />
            <EditButton label={status.name} onClick={() => setEditing(status.id)} />
          </Actions>
        </tr>
      ))}
      {(editing === "new" || current) && (
        <EditDialog
          title={current ? `Editar ${current.name}` : "Nuevo estado"}
          isCreate={!current}
          fields={fields}
          initial={
            current
              ? { name: current.name, sort_order: String(current.sort_order), is_initial: current.is_initial, is_terminal: current.is_terminal }
              : { code: "", name: "", sort_order: String((statuses.at(-1)?.sort_order ?? 0) + 10), is_initial: false, is_terminal: false }
          }
          onSubmit={(values, changed) =>
            current
              ? update
                  .mutateAsync({ id: current.id, input: pick(values, changed, ["sort_order"]) })
                  .then(() => toast.success("Estado guardado."))
              : create
                  .mutateAsync(
                    pick(values, ["code", "name", "sort_order", "is_initial", "is_terminal"], ["sort_order"]) as Parameters<typeof create.mutateAsync>[0]
                  )
                  .then((created) => toast.success(`Estado «${created.name}» creado.`))
          }
          onClose={() => setEditing(null)}
        />
      )}
    </SettingsTable>
  );
}

// ── Dependencies ──

function DependenciesTable({ catalog }: { catalog: TrackingCatalog }) {
  const create = useCreateDependency();
  const update = useUpdateDependency();
  const [editing, setEditing] = useState<string | "new" | null>(null);
  const current = catalog.dependencies.find((item) => item.id === editing);
  const dependencies = [...catalog.dependencies].sort((a, b) => a.sort_order - b.sort_order);

  return (
    <SettingsTable
      caption="La dependencia interna que origina o atiende el caso (columna «Dependencia (Interno)» del Excel)."
      headers={[{ label: "Dependencia" }, { label: "Código" }, { label: "Orden", align: "right" }, { label: "Situación" }]}
      action={
        <Button variant="secondary" size="sm" className="max-md:h-11" onClick={() => setEditing("new")}>
          <Plus aria-hidden="true" />
          Nueva dependencia
        </Button>
      }
    >
      {dependencies.map((item) => (
        <tr key={item.id} className="h-10">
          <td className="px-3 py-2 font-medium">{item.name}</td>
          <td className="px-3 py-2 font-mono text-[13px]">{item.code}</td>
          <td className="tabular px-3 py-2 text-right">{item.sort_order}</td>
          <td className="px-3 py-2"><ActiveBadge active={item.is_active} /></td>
          <Actions>
            <ToggleActive
              name={item.name}
              active={item.is_active}
              onToggle={() => update.mutateAsync({ id: item.id, input: { is_active: !item.is_active } })}
            />
            <EditButton label={item.name} onClick={() => setEditing(item.id)} />
          </Actions>
        </tr>
      ))}
      {(editing === "new" || current) && (
        <EditDialog
          title={current ? `Editar ${current.name}` : "Nueva dependencia"}
          isCreate={!current}
          fields={[
            { key: "code", label: "Código", kind: "text", createOnly: true, maxLength: 40, hint: "Identificador fijo, en minúsculas y sin espacios." },
            { key: "name", label: "Nombre", kind: "text", maxLength: 120 },
            { key: "sort_order", label: "Orden", kind: "number", min: 0 },
          ]}
          initial={
            current
              ? { name: current.name, sort_order: String(current.sort_order) }
              : { code: "", name: "", sort_order: String((dependencies.at(-1)?.sort_order ?? 0) + 10) }
          }
          onSubmit={(values, changed) =>
            current
              ? update
                  .mutateAsync({ id: current.id, input: pick(values, changed, ["sort_order"]) })
                  .then(() => toast.success("Dependencia guardada."))
              : create
                  .mutateAsync(pick(values, ["code", "name", "sort_order"], ["sort_order"]) as Parameters<typeof create.mutateAsync>[0])
                  .then((created) => toast.success(`Dependencia «${created.name}» creada.`))
          }
          onClose={() => setEditing(null)}
        />
      )}
    </SettingsTable>
  );
}

// ── Document types ──

function DocumentTypesTable({ catalog }: { catalog: TrackingCatalog }) {
  const id = useId();
  const create = useCreateDocumentType();
  const update = useUpdateDocumentType();
  const [editing, setEditing] = useState<string | "new" | null>(null);
  const [filter, setFilter] = useState("");
  const current = catalog.document_types.find((item) => item.id === editing);
  const query = normalize(filter);
  const rows = [...catalog.document_types]
    .sort((a, b) => a.name.localeCompare(b.name, "es"))
    .filter((item) => normalize(item.name).includes(query));

  return (
    <div className="space-y-3">
      <div className="max-w-sm space-y-1.5">
        <label htmlFor={`${id}-filter`} className="block text-[13px] font-medium">
          Buscar tipo de documento
        </label>
        <Input
          id={`${id}-filter`}
          type="search"
          value={filter}
          onChange={(event) => setFilter(event.target.value)}
        />
      </div>
      <SettingsTable
        caption={`${catalog.document_types.length} tipos. El tiempo se congela en cada documento al crearlo: cambiarlo aquí aplica solo a los documentos nuevos.`}
        headers={[{ label: "Tipo de documento" }, { label: "Días hábiles", align: "right" }, { label: "Situación" }]}
        action={
          <Button variant="secondary" size="sm" className="max-md:h-11" onClick={() => setEditing("new")}>
            <Plus aria-hidden="true" />
            Nuevo tipo de documento
          </Button>
        }
      >
        {rows.length === 0 ? (
          <tr>
            <td colSpan={4} className="px-3 py-4 text-text-secondary">
              Ningún tipo de documento contiene «{filter}».
            </td>
          </tr>
        ) : (
          rows.map((item) => (
            <tr key={item.id} className="h-10">
              <td className="px-3 py-2 font-medium">{item.name}</td>
              <td className="tabular px-3 py-2 text-right">{item.sla_days}</td>
              <td className="px-3 py-2"><ActiveBadge active={item.is_active} /></td>
              <Actions>
                <ToggleActive
                  name={item.name}
                  active={item.is_active}
                  onToggle={() => update.mutateAsync({ id: item.id, input: { is_active: !item.is_active } })}
                />
                <EditButton label={item.name} onClick={() => setEditing(item.id)} />
              </Actions>
            </tr>
          ))
        )}
        {(editing === "new" || current) && (
          <EditDialog
            title={current ? `Editar ${current.name}` : "Nuevo tipo de documento"}
            isCreate={!current}
            fields={[
              { key: "name", label: "Nombre", kind: "text", maxLength: 200 },
              { key: "sla_days", label: "Tiempo de respuesta (días hábiles)", kind: "number", min: 0, max: 365 },
            ]}
            initial={current ? { name: current.name, sla_days: String(current.sla_days) } : { name: "", sla_days: "" }}
            onSubmit={(values, changed) =>
              current
                ? update
                    .mutateAsync({ id: current.id, input: pick(values, changed, ["sla_days"]) })
                    .then(() => toast.success("Tipo de documento guardado."))
                : create
                    .mutateAsync(pick(values, ["name", "sla_days"], ["sla_days"]) as Parameters<typeof create.mutateAsync>[0])
                    .then((created) => toast.success(`«${created.name}» creado.`))
            }
            onClose={() => setEditing(null)}
          />
        )}
      </SettingsTable>
    </div>
  );
}
