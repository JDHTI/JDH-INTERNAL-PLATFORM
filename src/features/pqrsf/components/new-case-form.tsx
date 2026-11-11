"use client";

import { useId, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, CloudOff, Loader2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import PageHeader from "@/shared/components/page-header";
import StatePanel from "@/shared/components/state-panel";
import { Button, buttonVariants } from "@/shared/components/ui/button";
import { DialogError } from "@/shared/components/ui/dialog";
import { Dropdown } from "@/shared/components/ui/dropdown";
import { Field, Textarea } from "@/shared/components/ui/field";
import { Input } from "@/shared/components/ui/input";
import { errorMessage } from "@/shared/lib/api-client";
import { cn } from "@/shared/lib/utils";
import { useBreadcrumbLabel } from "@/shared/store/use-breadcrumb-store";

import { useCatalog, useCreateCase } from "../hooks/use-pqrsf";
import { addBusinessDays } from "../lib/business-days";
import { formatDate, todayIso } from "../lib/format";
import { inboxHref } from "../lib/inbox-state";
import type { DocumentType, Person, TrackingCatalog } from "../types/pqrsf.types";
import { AssigneePicker, DocumentTypePicker, SuggestionInput } from "./pickers";

interface DocumentRow {
  key: number;
  type: DocumentType | null;
  quantity: string;
}

export default function NewCaseScreen({ area }: { area: string }) {
  const catalog = useCatalog();
  useBreadcrumbLabel(`/${area}/pqrsf/nuevo`, "Nuevo caso");

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
        title="Nuevo caso"
        description="Para lo que llega por correo, teléfono o en persona. Lo del formulario público ya entra solo a la bandeja."
      />
    </div>
  );

  if (catalog.isPending) {
    return (
      <div className="space-y-6" aria-busy="true">
        {heading}
        <span className="sr-only">Cargando formulario</span>
        <div className="grid max-w-4xl gap-5 sm:grid-cols-2">
          {[0, 1, 2, 3, 4, 5].map((field) => (
            <div key={field} className="space-y-1.5">
              <div className="h-4 w-28 animate-pulse rounded-sm bg-canvas-subtle" />
              <div className="h-9 animate-pulse rounded-md bg-canvas-subtle" />
            </div>
          ))}
        </div>
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
          title="No se cargaron los catálogos del formulario"
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

  return (
    <div className="space-y-6">
      {heading}
      <NewCaseForm area={area} catalog={catalog.data} />
    </div>
  );
}

function NewCaseForm({ area, catalog }: { area: string; catalog: TrackingCatalog }) {
  const id = useId();
  const router = useRouter();
  const create = useCreateCase();
  const today = todayIso();
  const activeTypes = catalog.request_types.filter((type) => type.is_active);

  const [requestTypeId, setRequestTypeId] = useState(
    activeTypes.find((type) => type.code === "peticion")?.id ?? activeTypes[0]?.id ?? ""
  );
  const [receivedOn, setReceivedOn] = useState(today);
  const [siteId, setSiteId] = useState("");
  const [dependencyId, setDependencyId] = useState("");
  const [customer, setCustomer] = useState("");
  const [nit, setNit] = useState("");
  const [executive, setExecutive] = useState("");
  const [requester, setRequester] = useState("");
  const [requesterEmail, setRequesterEmail] = useState("");
  const [supplier, setSupplier] = useState("");
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [assignee, setAssignee] = useState<Person | null>(null);
  const [dateError, setDateError] = useState<string | null>(null);

  const nextKey = useRef(1);
  const [rows, setRows] = useState<DocumentRow[]>([{ key: 0, type: null, quantity: "" }]);
  const focusRow = useRef<number | null>(null);

  const requestType = activeTypes.find((type) => type.id === requestTypeId);
  const filledRows = rows.filter((row) => row.type !== null);

  const addRow = () => {
    const key = nextKey.current++;
    focusRow.current = key;
    setRows((current) => [...current, { key, type: null, quantity: "" }]);
  };
  const updateRow = (key: number, patch: Partial<DocumentRow>) =>
    setRows((current) => current.map((row) => (row.key === key ? { ...row, ...patch } : row)));
  const removeRow = (key: number) =>
    setRows((current) =>
      current.length === 1 ? [{ key: nextKey.current++, type: null, quantity: "" }] : current.filter((row) => row.key !== key)
    );

  const validDate = receivedOn !== "" && receivedOn <= today;
  const caseDue = !validDate
    ? null
    : filledRows.length > 0
      ? filledRows
          .map((row) => addBusinessDays(receivedOn, row.type!.sla_days))
          .sort()
          .at(-1)!
      : requestType?.requires_follow_up && requestType.sla_days !== null
        ? addBusinessDays(receivedOn, requestType.sla_days)
        : null;

  return (
    <form
      noValidate
      className="max-w-4xl space-y-8"
      onSubmit={(event) => {
        event.preventDefault();
        if (!validDate) {
          setDateError("La fecha de recepción no puede ser futura ni quedar vacía.");
          return;
        }
        const clean = (value: string) => value.trim() || null;
        create.mutate(
          {
            request_type_id: requestTypeId,
            received_on: receivedOn,
            site_id: siteId || null,
            dependency_id: dependencyId || null,
            customer_name: clean(customer),
            customer_nit: clean(nit),
            sales_executive_name: clean(executive),
            requester_name: clean(requester),
            requester_email: clean(requesterEmail),
            supplier_name: clean(supplier),
            subject: clean(subject),
            description: clean(description),
            assignee_user_id: catalog.is_manager ? (assignee?.id ?? null) : null,
            items: filledRows.map((row) => ({
              document_type_id: row.type!.id,
              quantity: row.quantity ? Number(row.quantity) : null,
            })),
          },
          {
            onSuccess: (created) => {
              toast.success(`Caso ${created.code} creado. Ese es el número para el cliente.`);
              router.push(`/${area}/pqrsf/${created.id}`);
            },
          }
        );
      }}
    >
      <fieldset className="space-y-5">
        <legend className="mb-4 text-base font-semibold">Solicitud</legend>
        <div className="grid gap-x-4 gap-y-5 sm:grid-cols-2">
          <Field
            label="Tipo de solicitud"
            htmlFor={`${id}-type`}
            hint={
              requestType
                ? requestType.requires_follow_up
                  ? `Consecutivo ${requestType.prefix}-${receivedOn.slice(0, 4) || today.slice(0, 4)}-…`
                  : "Recibe consecutivo pero no tiene fecha límite."
                : undefined
            }
          >
            <Dropdown
              id={`${id}-type`}
              value={requestTypeId}
              onValueChange={setRequestTypeId}
              options={activeTypes.map((type) => ({ value: type.id, label: type.name }))}
              aria-describedby={`${id}-type-hint`}
            />
          </Field>
          <Field label="Fecha de recepción" htmlFor={`${id}-received`} error={dateError}>
            <Input
              id={`${id}-received`}
              type="date"
              required
              max={today}
              value={receivedOn}
              onChange={(event) => setReceivedOn(event.target.value)}
              onBlur={() =>
                setDateError(
                  receivedOn && receivedOn <= today
                    ? null
                    : "La fecha de recepción no puede ser futura ni quedar vacía."
                )
              }
              aria-invalid={dateError ? true : undefined}
              aria-describedby={dateError ? `${id}-received-error` : undefined}
            />
          </Field>
          <Field label="Sucursal" htmlFor={`${id}-site`} optional>
            <Dropdown
              id={`${id}-site`}
              value={siteId}
              onValueChange={setSiteId}
              placeholder="Elige la sucursal"
              options={[
                { value: "", label: "Sin sucursal" },
                ...catalog.sites.filter((site) => site.is_active).map((site) => ({ value: site.id, label: site.name })),
              ]}
            />
          </Field>
          <Field label="Dependencia" htmlFor={`${id}-dependency`} optional>
            <Dropdown
              id={`${id}-dependency`}
              value={dependencyId}
              onValueChange={setDependencyId}
              placeholder="Elige la dependencia"
              options={[
                { value: "", label: "Sin dependencia" },
                ...catalog.dependencies
                  .filter((dependency) => dependency.is_active)
                  .map((dependency) => ({ value: dependency.id, label: dependency.name })),
              ]}
            />
          </Field>
          <div className="sm:col-span-2">
            <Field label="Asunto" htmlFor={`${id}-subject`} optional>
              <Input
                id={`${id}-subject`}
                value={subject}
                maxLength={200}
                onChange={(event) => setSubject(event.target.value)}
              />
            </Field>
          </div>
          <div className="sm:col-span-2">
            <Field label="Descripción" htmlFor={`${id}-description`} optional>
              <Textarea
                id={`${id}-description`}
                value={description}
                maxLength={10000}
                onChange={(event) => setDescription(event.target.value)}
              />
            </Field>
          </div>
        </div>
      </fieldset>

      <fieldset className="space-y-5">
        <legend className="mb-1 text-base font-semibold">Personas</legend>
        <p className="text-[13px] text-text-secondary">
          Cliente, ejecutivo, usuario y proveedor sugieren lo que ya se escribió en otros casos.
          Elegir la sugerencia evita duplicar el mismo nombre con otra ortografía.
        </p>
        <div className="grid gap-x-4 gap-y-5 sm:grid-cols-2">
          <Field label="Cliente" htmlFor={`${id}-customer`} optional>
            <SuggestionInput
              id={`${id}-customer`}
              field="customer"
              value={customer}
              onValueChange={setCustomer}
              maxLength={200}
            />
          </Field>
          <Field label="NIT del cliente" htmlFor={`${id}-nit`} optional>
            <Input
              id={`${id}-nit`}
              value={nit}
              maxLength={30}
              inputMode="numeric"
              className="tabular"
              onChange={(event) => setNit(event.target.value)}
            />
          </Field>
          <Field label="Ejecutivo comercial" htmlFor={`${id}-executive`} optional>
            <SuggestionInput
              id={`${id}-executive`}
              field="sales_executive"
              value={executive}
              onValueChange={setExecutive}
              maxLength={200}
            />
          </Field>
          <Field label="Proveedor" htmlFor={`${id}-supplier`} optional>
            <SuggestionInput
              id={`${id}-supplier`}
              field="supplier"
              value={supplier}
              onValueChange={setSupplier}
              maxLength={200}
            />
          </Field>
          <Field label="Usuario solicitante" htmlFor={`${id}-requester`} optional>
            <SuggestionInput
              id={`${id}-requester`}
              field="requester"
              value={requester}
              onValueChange={setRequester}
              maxLength={200}
            />
          </Field>
          <Field label="Correo del solicitante" htmlFor={`${id}-email`} optional>
            <Input
              id={`${id}-email`}
              type="email"
              value={requesterEmail}
              maxLength={320}
              onChange={(event) => setRequesterEmail(event.target.value)}
            />
          </Field>
          {catalog.is_manager && (
            <Field
              label="Responsable"
              htmlFor={`${id}-assignee`}
              optional
              hint="Sin responsable, el caso queda en «Sin asignar»."
            >
              <AssigneePicker
                id={`${id}-assignee`}
                value={assignee}
                onChange={setAssignee}
                placeholder="Buscar persona"
                aria-describedby={`${id}-assignee-hint`}
              />
            </Field>
          )}
        </div>
      </fieldset>

      <fieldset className="space-y-3">
        <legend className="mb-1 text-base font-semibold">Documentos solicitados</legend>
        <p id={`${id}-docs-hint`} className="text-[13px] text-text-secondary">
          Una fila por documento, como en el Excel. Enter en la cantidad agrega otra fila. La fecha
          límite es una referencia calculada con días hábiles; la definitiva la fija la plataforma
          al guardar.
        </p>

        <div className="overflow-hidden rounded-lg border border-border">
          <div
            aria-hidden="true"
            className="hidden grid-cols-[minmax(0,1fr)_6rem_7rem_7.5rem_2.5rem] gap-3 bg-canvas-subtle px-3 py-2 text-[11px] font-semibold tracking-[0.06em] text-text-secondary uppercase md:grid"
          >
            <span>Tipo de documento</span>
            <span className="text-right">Cantidad</span>
            <span className="text-right">Establecido</span>
            <span className="text-right">Fecha límite</span>
            <span />
          </div>
          <ol className="divide-y divide-border">
            {rows.map((row, index) => {
              const due = row.type && validDate ? addBusinessDays(receivedOn, row.type.sla_days) : null;
              const label = `fila ${index + 1}`;
              return (
                <li
                  key={row.key}
                  className="grid gap-2 p-3 md:grid-cols-[minmax(0,1fr)_6rem_7rem_7.5rem_2.5rem] md:items-center md:gap-3 md:py-2"
                >
                  <div>
                    <label htmlFor={`${id}-doc-${row.key}`} className="mb-1 block text-[13px] font-medium md:sr-only">
                      Tipo de documento, {label}
                    </label>
                    <DocumentTypePicker
                      id={`${id}-doc-${row.key}`}
                      documentTypes={catalog.document_types}
                      value={row.type}
                      onChange={(type) => updateRow(row.key, { type })}
                      placeholder="Escribe para buscar"
                      aria-describedby={`${id}-docs-hint`}
                      ref={(element: HTMLInputElement | null) => {
                        if (element && focusRow.current === row.key) {
                          focusRow.current = null;
                          element.focus();
                        }
                      }}
                    />
                  </div>
                  <div>
                    <label htmlFor={`${id}-qty-${row.key}`} className="mb-1 block text-[13px] font-medium md:sr-only">
                      Cantidad, {label}
                    </label>
                    <Input
                      id={`${id}-qty-${row.key}`}
                      type="number"
                      min={1}
                      max={100000}
                      inputMode="numeric"
                      className="tabular max-md:w-32 md:text-right"
                      value={row.quantity}
                      onChange={(event) => updateRow(row.key, { quantity: event.target.value })}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") {
                          event.preventDefault();
                          addRow();
                        }
                      }}
                    />
                  </div>
                  <p className="tabular text-sm md:text-right">
                    <span className="text-text-secondary md:sr-only">Establecido: </span>
                    {row.type ? (
                      `${row.type.sla_days} días háb.`
                    ) : (
                      <span className="text-text-secondary">Sin tipo</span>
                    )}
                  </p>
                  <p className="tabular text-sm md:text-right">
                    <span className="text-text-secondary md:sr-only">Fecha límite: </span>
                    {due ? formatDate(due) : <span className="text-text-secondary">Sin fecha</span>}
                  </p>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    className="max-md:size-11 md:justify-self-end"
                    aria-label={`Quitar ${label}`}
                    title="Quitar fila"
                    onClick={() => removeRow(row.key)}
                  >
                    <Trash2 aria-hidden="true" />
                  </Button>
                </li>
              );
            })}
          </ol>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <Button variant="secondary" size="sm" className="max-md:h-11" onClick={addRow}>
            <Plus aria-hidden="true" />
            Agregar fila
          </Button>
          <p className="text-sm" aria-live="polite">
            <span className="text-text-secondary">Fecha límite del caso: </span>
            <span className="tabular font-medium">
              {caseDue ? formatDate(caseDue) : "sin fecha límite"}
            </span>
          </p>
        </div>
      </fieldset>

      <div className="space-y-4 border-t border-border pt-6">
        <DialogError message={create.error ? errorMessage(create.error) : null} />
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end [&>*]:w-full sm:[&>*]:w-auto">
          <Link href={inboxHref(area)} className={cn(buttonVariants({ variant: "outline", size: "lg" }))}>
            Cancelar
          </Link>
          <Button type="submit" size="lg" disabled={create.isPending || !requestTypeId}>
            {create.isPending && <Loader2 className="animate-spin" aria-hidden="true" />}
            Crear caso
          </Button>
        </div>
      </div>
    </form>
  );
}
