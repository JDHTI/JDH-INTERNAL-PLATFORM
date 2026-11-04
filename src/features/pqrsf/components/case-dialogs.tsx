"use client";

import { useId, useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/shared/components/ui/button";
import { Dialog, DialogError, DialogFooter } from "@/shared/components/ui/dialog";
import { Dropdown } from "@/shared/components/ui/dropdown";
import { Field, Textarea } from "@/shared/components/ui/field";
import { Input } from "@/shared/components/ui/input";
import { errorMessage } from "@/shared/lib/api-client";

import {
  useAddItem,
  useAssignCase,
  useCaseDetail,
  useChangeStatus,
  useDeleteCase,
  useUpdateCase,
} from "../hooks/use-pqrsf";
import { personName, todayIso } from "../lib/format";
import { PICKUP_ORDER_LABELS } from "../lib/pickup-order";
import type {
  DocumentType,
  Person,
  PickupOrderAnswer,
  PqrsfCase,
  TrackingCatalog,
  UpdateCaseInput,
} from "../types/pqrsf.types";
import { Thumbnail } from "./intake-request";
import { AssigneePicker, DocumentTypePicker, SuggestionInput } from "./pickers";

function Submit({ isPending, children }: { isPending: boolean; children: React.ReactNode }) {
  return (
    <Button type="submit" disabled={isPending}>
      {isPending && <Loader2 className="animate-spin" aria-hidden="true" />}
      {children}
    </Button>
  );
}

// ── Status ──

/**
 * Moving to a final status is where the API checks pending documents and
 * delay causes; its message shows here, next to the choice that caused it.
 * Reopening a closed case asks for the reason in the note.
 */
export function StatusDialog({
  item,
  catalog,
  open,
  onOpenChange,
  initialStatusId,
}: {
  item: PqrsfCase;
  catalog: TrackingCatalog;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Preselected target, when the choice was already made in a menu. */
  initialStatusId?: string;
}) {
  const id = useId();
  const mutation = useChangeStatus(item.id);
  const targets = catalog.statuses.filter((status) => status.is_active && status.id !== item.status.id);
  const isClosed = item.closed_at !== null;
  // A reopened case is back at work, not back at the inbox: «En curso» when it exists.
  const [statusId, setStatusId] = useState(() => {
    if (initialStatusId) return initialStatusId;
    if (!isClosed) return "";
    const open = targets.filter((status) => !status.is_terminal);
    return (open.find((status) => status.code === "en_curso") ?? open.at(-1))?.id ?? "";
  });
  const [note, setNote] = useState("");
  const target = targets.find((status) => status.id === statusId);
  const isReopening = isClosed && target !== undefined && !target.is_terminal;

  const close = (next: boolean) => {
    if (!next) mutation.reset();
    onOpenChange(next);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={close}
      isForm
      title={isClosed ? `Reabrir ${item.code}` : `Cambiar estado de ${item.code}`}
      description={`Estado actual: ${item.status.name}.`}
    >
      <form
        className="space-y-4"
        onSubmit={(event) => {
          event.preventDefault();
          if (!statusId) return;
          mutation.mutate(
            { status_id: statusId, note: note.trim() || null },
            {
              onSuccess: (updated) => {
                toast.success(`${updated.code} quedó en «${updated.status.name}».`);
                setNote("");
                setStatusId("");
                close(false);
              },
            }
          );
        }}
      >
        <Field label="Nuevo estado" htmlFor={`${id}-status`}>
          <Dropdown
            id={`${id}-status`}
            value={statusId}
            onValueChange={setStatusId}
            placeholder="Elige el estado"
            options={targets.map((status) => ({
              value: status.id,
              label: status.is_terminal ? `${status.name} (cierra el caso)` : status.name,
            }))}
          />
        </Field>
        <Field
          label={isReopening ? "Por qué se reabre" : "Nota"}
          htmlFor={`${id}-note`}
          optional={!isReopening}
          hint={
            isReopening
              ? "Queda en la línea de tiempo del caso."
              : "Se muestra en la línea de tiempo junto al cambio."
          }
        >
          <Textarea
            id={`${id}-note`}
            value={note}
            maxLength={2000}
            required={isReopening}
            onChange={(event) => setNote(event.target.value)}
            aria-describedby={`${id}-note-hint`}
          />
        </Field>
        <DialogError message={mutation.error ? errorMessage(mutation.error) : null} />
        <DialogFooter>
          <Button variant="outline" onClick={() => close(false)}>
            Cancelar
          </Button>
          <Submit isPending={mutation.isPending}>
            {isReopening ? "Reabrir caso" : "Cambiar estado"}
          </Submit>
        </DialogFooter>
      </form>
    </Dialog>
  );
}

// ── Assignment ──

export function AssignDialog({
  item,
  open,
  onOpenChange,
}: {
  item: PqrsfCase;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const id = useId();
  const mutation = useAssignCase(item.id);
  const [person, setPerson] = useState<Person | null>(item.assignee);
  const [note, setNote] = useState("");
  const unchanged = (person?.id ?? null) === (item.assignee?.id ?? null);

  const close = (next: boolean) => {
    if (!next) {
      mutation.reset();
      setPerson(item.assignee);
      setNote("");
    }
    onOpenChange(next);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={close}
      isForm
      title={`Asignar ${item.code}`}
      description={
        item.assignee
          ? `Hoy lo tiene ${personName(item.assignee)}.`
          : "El caso no tiene responsable."
      }
    >
      <form
        className="space-y-4"
        onSubmit={(event) => {
          event.preventDefault();
          mutation.mutate(
            { assignee_user_id: person?.id ?? null, note: note.trim() || null },
            {
              onSuccess: (updated) => {
                toast.success(
                  updated.assignee
                    ? `${updated.code} asignado a ${personName(updated.assignee)}.`
                    : `${updated.code} quedó sin responsable.`
                );
                close(false);
              },
            }
          );
        }}
      >
        <Field
          label="Responsable"
          htmlFor={`${id}-person`}
          hint="Escribe nombre o correo. Solo aparecen personas que ya iniciaron sesión."
        >
          <AssigneePicker
            id={`${id}-person`}
            value={person}
            onChange={setPerson}
            placeholder="Buscar persona"
            aria-describedby={`${id}-person-hint`}
          />
        </Field>
        {item.assignee && (
          <Button
            variant="ghost"
            size="sm"
            disabled={person === null}
            onClick={() => setPerson(null)}
          >
            Dejar sin responsable
          </Button>
        )}
        <Field label="Nota" htmlFor={`${id}-note`} optional>
          <Textarea
            id={`${id}-note`}
            value={note}
            maxLength={2000}
            onChange={(event) => setNote(event.target.value)}
          />
        </Field>
        <DialogError message={mutation.error ? errorMessage(mutation.error) : null} />
        <DialogFooter>
          <Button variant="outline" onClick={() => close(false)}>
            Cancelar
          </Button>
          <Button type="submit" disabled={mutation.isPending || unchanged}>
            {mutation.isPending && <Loader2 className="animate-spin" aria-hidden="true" />}
            {person ? "Asignar" : "Quitar responsable"}
          </Button>
        </DialogFooter>
      </form>
    </Dialog>
  );
}

// ── Header fields ──

type EditableField = keyof UpdateCaseInput;

const TEXT_FIELDS = [
  "subject",
  "description",
  "customer_name",
  "customer_nit",
  "supplier_name",
  "sales_executive_name",
  "requester_name",
  "requester_email",
] as const;

function initialForm(item: PqrsfCase) {
  return {
    received_on: item.received_on,
    site_id: item.site?.id ?? "",
    dependency_id: item.dependency?.id ?? "",
    subject: item.subject ?? "",
    description: item.description ?? "",
    customer_name: item.customer_name ?? "",
    customer_nit: item.customer_nit ?? "",
    supplier_name: item.supplier_name ?? "",
    sales_executive_name: item.sales_executive_name ?? "",
    requester_name: item.requester_name ?? "",
    requester_email: item.requester_email ?? "",
  };
}

/** Sends only what changed; an emptied field is sent as null, which clears it. */
export function EditCaseDialog({
  item,
  catalog,
  open,
  onOpenChange,
}: {
  item: PqrsfCase;
  catalog: TrackingCatalog;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const id = useId();
  const mutation = useUpdateCase(item.id);
  const [form, setForm] = useState(() => initialForm(item));
  const set = (key: keyof typeof form) => (value: string) =>
    setForm((current) => ({ ...current, [key]: value }));

  const original = initialForm(item);
  const changes: UpdateCaseInput = {};
  if (form.received_on !== original.received_on) changes.received_on = form.received_on;
  if (form.site_id !== original.site_id) changes.site_id = form.site_id || null;
  if (form.dependency_id !== original.dependency_id)
    changes.dependency_id = form.dependency_id || null;
  for (const key of TEXT_FIELDS) {
    if (form[key].trim() !== original[key]) changes[key as EditableField] = (form[key].trim() || null) as never;
  }
  const hasChanges = Object.keys(changes).length > 0;

  const close = (next: boolean) => {
    if (!next) {
      mutation.reset();
      setForm(initialForm(item));
    }
    onOpenChange(next);
  };

  const text = (key: (typeof TEXT_FIELDS)[number], label: string, extra?: React.ComponentProps<"input">) => (
    <Field label={label} htmlFor={`${id}-${key}`} optional>
      <Input
        id={`${id}-${key}`}
        value={form[key]}
        onChange={(event) => set(key)(event.target.value)}
        {...extra}
      />
    </Field>
  );

  return (
    <Dialog open={open} onOpenChange={close} isForm title={`Editar datos de ${item.code}`}>
      <form
        className="space-y-4"
        onSubmit={(event) => {
          event.preventDefault();
          if (!hasChanges) return close(false);
          mutation.mutate(changes, {
            onSuccess: () => {
              toast.success("Datos del caso guardados.");
              mutation.reset();
              onOpenChange(false);
            },
          });
        }}
      >
        <div className="grid gap-x-4 gap-y-5 sm:grid-cols-2">
          <Field label="Fecha de recepción" htmlFor={`${id}-received`}>
            <Input
              id={`${id}-received`}
              type="date"
              required
              max={todayIso()}
              value={form.received_on}
              onChange={(event) => set("received_on")(event.target.value)}
            />
          </Field>
          <Field label="Sucursal" htmlFor={`${id}-site`} optional>
            <Dropdown
              id={`${id}-site`}
              value={form.site_id}
              onValueChange={set("site_id")}
              options={[
                { value: "", label: "Sin sucursal" },
                ...catalog.sites.map((site) => ({ value: site.id, label: site.name })),
              ]}
            />
          </Field>
          <Field label="Dependencia" htmlFor={`${id}-dependency`} optional>
            <Dropdown
              id={`${id}-dependency`}
              value={form.dependency_id}
              onValueChange={set("dependency_id")}
              options={[
                { value: "", label: "Sin dependencia" },
                ...catalog.dependencies.map((dependency) => ({
                  value: dependency.id,
                  label: dependency.name,
                })),
              ]}
            />
          </Field>
          <Field label="Cliente" htmlFor={`${id}-customer`} optional>
            <SuggestionInput
              id={`${id}-customer`}
              field="customer"
              value={form.customer_name}
              onValueChange={set("customer_name")}
              maxLength={200}
            />
          </Field>
          {text("customer_nit", "NIT del cliente", { maxLength: 30, inputMode: "numeric" })}
          <Field label="Ejecutivo comercial" htmlFor={`${id}-executive`} optional>
            <SuggestionInput
              id={`${id}-executive`}
              field="sales_executive"
              value={form.sales_executive_name}
              onValueChange={set("sales_executive_name")}
              maxLength={200}
            />
          </Field>
          <Field label="Usuario solicitante" htmlFor={`${id}-requester`} optional>
            <SuggestionInput
              id={`${id}-requester`}
              field="requester"
              value={form.requester_name}
              onValueChange={set("requester_name")}
              maxLength={200}
            />
          </Field>
          {text("requester_email", "Correo del solicitante", { type: "email", maxLength: 320 })}
          {/* With products the supplier comes from them; the API refuses a typed one. */}
          {(item.products ?? []).length === 0 && (
            <Field label="Proveedor" htmlFor={`${id}-supplier`} optional>
              <SuggestionInput
                id={`${id}-supplier`}
                field="supplier"
                value={form.supplier_name}
                onValueChange={set("supplier_name")}
                maxLength={200}
              />
            </Field>
          )}
          <div className="sm:col-span-2">
            {text("subject", "Asunto", { maxLength: 200 })}
          </div>
          <div className="sm:col-span-2">
            <Field label="Descripción" htmlFor={`${id}-description`} optional>
              <Textarea
                id={`${id}-description`}
                value={form.description}
                maxLength={10000}
                onChange={(event) => set("description")(event.target.value)}
              />
            </Field>
          </div>
        </div>
        <DialogError message={mutation.error ? errorMessage(mutation.error) : null} />
        <DialogFooter>
          <Button variant="outline" onClick={() => close(false)}>
            Cancelar
          </Button>
          <Button type="submit" disabled={mutation.isPending || !hasChanges}>
            {mutation.isPending && <Loader2 className="animate-spin" aria-hidden="true" />}
            Guardar cambios
          </Button>
        </DialogFooter>
      </form>
    </Dialog>
  );
}

// ── Follow-up of the products ──

/**
 * The pickup order and the delivery date: they come with the request, and the
 * order number is often known later, once the order is in the ERP.
 */
export function EditFollowUpDialog({
  item,
  onOpenChange,
}: {
  item: PqrsfCase;
  onOpenChange: (open: boolean) => void;
}) {
  const id = useId();
  const mutation = useUpdateCase(item.id);
  const original = {
    answer: item.classification?.pickup_order_requested ?? "",
    number: item.classification?.pickup_order_number ?? "",
    delivery: item.classification?.delivery_date ?? "",
  };
  const [answer, setAnswer] = useState<string>(original.answer);
  const [number, setNumber] = useState(original.number);
  const [delivery, setDelivery] = useState(original.delivery);

  const changes: UpdateCaseInput = {};
  if (answer !== original.answer) {
    changes.pickup_order_requested = (answer || null) as PickupOrderAnswer | null;
  }
  // The number only goes with «Sí»; another answer clears it on the server.
  const sentNumber = answer === "yes" ? number.trim() : "";
  if (answer === "yes" && sentNumber !== original.number) {
    changes.pickup_order_number = sentNumber || null;
  }
  if (delivery !== original.delivery) changes.delivery_date = delivery || null;
  const hasChanges = Object.keys(changes).length > 0;

  const close = () => {
    mutation.reset();
    onOpenChange(false);
  };

  return (
    <Dialog
      open
      onOpenChange={(next) => !next && close()}
      isForm
      title={`Orden de recogida y entrega de ${item.code}`}
    >
      <form
        className="space-y-4"
        onSubmit={(event) => {
          event.preventDefault();
          if (!hasChanges) return close();
          mutation.mutate(changes, {
            onSuccess: () => {
              toast.success("Orden de recogida y fecha de entrega guardadas.");
              close();
            },
          });
        }}
      >
        <div className="grid gap-x-4 gap-y-5 sm:grid-cols-2">
          <Field label="¿Se solicitó la orden de recogida?" htmlFor={`${id}-answer`} optional>
            <Dropdown
              id={`${id}-answer`}
              value={answer}
              onValueChange={setAnswer}
              options={[
                { value: "", label: "Sin respuesta" },
                ...Object.entries(PICKUP_ORDER_LABELS).map(([value, label]) => ({ value, label })),
              ]}
            />
          </Field>
          <Field
            label="Número de la orden de recogida"
            htmlFor={`${id}-number`}
            optional
            hint={answer === "yes" ? undefined : "Se indica cuando ya se solicitó."}
          >
            <Input
              id={`${id}-number`}
              value={answer === "yes" ? number : ""}
              disabled={answer !== "yes"}
              maxLength={40}
              onChange={(event) => setNumber(event.target.value)}
              aria-describedby={answer === "yes" ? undefined : `${id}-number-hint`}
            />
          </Field>
          <Field label="Fecha de entrega del pedido" htmlFor={`${id}-delivery`} optional>
            <Input
              id={`${id}-delivery`}
              type="date"
              max={todayIso()}
              value={delivery}
              onChange={(event) => setDelivery(event.target.value)}
            />
          </Field>
        </div>
        <DialogError message={mutation.error ? errorMessage(mutation.error) : null} />
        <DialogFooter>
          <Button variant="outline" onClick={close}>
            Cancelar
          </Button>
          <Button type="submit" disabled={mutation.isPending || !hasChanges}>
            {mutation.isPending && <Loader2 className="animate-spin" aria-hidden="true" />}
            Guardar cambios
          </Button>
        </DialogFooter>
      </form>
    </Dialog>
  );
}

// ── Deletion ──

/**
 * The one irreversible action on a case, so it asks why: the reason stays in
 * the history next to who deleted it, even though the case is gone. Solid red
 * only on the confirm button (DESIGN.md §7.1).
 */
export function DeleteCaseDialog({
  item,
  open,
  onOpenChange,
  onDeleted,
}: {
  item: PqrsfCase;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDeleted: () => void;
}) {
  const id = useId();
  const mutation = useDeleteCase(item.id);
  const [reason, setReason] = useState("");

  const close = (next: boolean) => {
    if (mutation.isPending) return;
    if (!next) {
      mutation.reset();
      setReason("");
    }
    onOpenChange(next);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={close}
      isForm
      title={`Eliminar ${item.code}`}
      description="Se borran el caso y sus documentos solicitados. No se puede deshacer."
    >
      <form
        className="space-y-4"
        onSubmit={(event) => {
          event.preventDefault();
          if (!reason.trim()) return;
          mutation.mutate(reason.trim(), {
            onSuccess: () => {
              toast.success(`${item.code} fue eliminado. Su historial se conserva.`);
              onDeleted();
            },
          });
        }}
      >
        <ul className="space-y-1 rounded-md bg-canvas-subtle px-3 py-2 text-sm">
          <li>
            {item.request_type.name} de {item.customer_name ?? "cliente sin nombre"}, en estado{" "}
            {item.status.name}.
          </li>
          <li>
            El historial del caso no se borra: queda quién lo eliminó, cuándo y por qué.
          </li>
          {item.request_id && (
            <li>La solicitud original del formulario público y sus adjuntos se conservan.</li>
          )}
        </ul>
        <Field
          label="Motivo"
          htmlFor={`${id}-reason`}
          hint="Por ejemplo: duplicado de otro caso, registro de prueba."
        >
          <Textarea
            id={`${id}-reason`}
            value={reason}
            required
            maxLength={2000}
            onChange={(event) => setReason(event.target.value)}
            aria-describedby={`${id}-reason-hint`}
          />
        </Field>
        <DialogError message={mutation.error ? errorMessage(mutation.error) : null} />
        <DialogFooter>
          <Button variant="outline" onClick={() => close(false)} disabled={mutation.isPending}>
            Cancelar
          </Button>
          <Button
            type="submit"
            disabled={mutation.isPending || !reason.trim()}
            className="bg-danger text-text-on-primary hover:bg-danger/90"
          >
            {mutation.isPending && <Loader2 className="animate-spin" aria-hidden="true" />}
            Eliminar caso
          </Button>
        </DialogFooter>
      </form>
    </Dialog>
  );
}

// ── Attachments ──

/**
 * What the customer attached in the public form, without leaving the inbox.
 * The list does not carry attachments, so the case is loaded on open.
 */
export function AttachmentsDialog({
  item,
  open,
  onOpenChange,
}: {
  item: PqrsfCase;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const detail = useCaseDetail(item.id);
  const attachments = detail.data?.request?.attachments ?? [];

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title={`Adjuntos de ${item.code}`}
      description="Clic en un archivo para descargarlo."
    >
      {detail.isPending ? (
        <p className="flex items-center gap-2 text-sm text-text-secondary">
          <Loader2 className="size-4 animate-spin" aria-hidden="true" />
          Cargando adjuntos
        </p>
      ) : detail.error ? (
        <DialogError message={errorMessage(detail.error)} />
      ) : attachments.length === 0 ? (
        <p className="text-sm text-text-secondary">La solicitud no trae adjuntos.</p>
      ) : (
        <ul className="grid grid-cols-2 gap-3">
          {attachments.map((attachment) => (
            <li key={attachment.id}>
              <Thumbnail caseId={item.id} attachment={attachment} />
            </li>
          ))}
        </ul>
      )}
      <DialogFooter>
        <Button variant="outline" onClick={() => onOpenChange(false)}>
          Cerrar
        </Button>
      </DialogFooter>
    </Dialog>
  );
}

// ── New requested document ──

export function AddItemDialog({
  item,
  catalog,
  open,
  onOpenChange,
}: {
  item: PqrsfCase;
  catalog: TrackingCatalog;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const id = useId();
  const mutation = useAddItem(item.id);
  const [type, setType] = useState<DocumentType | null>(null);
  const [description, setDescription] = useState("");
  const [quantity, setQuantity] = useState("");
  const [error, setError] = useState<string | null>(null);

  const close = (next: boolean) => {
    if (!next) {
      mutation.reset();
      setType(null);
      setDescription("");
      setQuantity("");
      setError(null);
    }
    onOpenChange(next);
  };

  return (
    <Dialog open={open} onOpenChange={close} isForm title={`Agregar documento a ${item.code}`}>
      <form
        className="space-y-4"
        onSubmit={(event) => {
          event.preventDefault();
          if (!type && !description.trim()) {
            setError("Elige un tipo de documento o describe el documento.");
            return;
          }
          setError(null);
          mutation.mutate(
            {
              document_type_id: type?.id ?? null,
              description: description.trim() || null,
              quantity: quantity ? Number(quantity) : null,
            },
            {
              onSuccess: () => {
                toast.success("Documento agregado.");
                close(false);
              },
            }
          );
        }}
      >
        <Field
          label="Tipo de documento"
          htmlFor={`${id}-type`}
          hint={
            type
              ? `Tiempo establecido: ${type.sla_days} ${type.sla_days === 1 ? "día hábil" : "días hábiles"}.`
              : "Escribe parte del nombre para buscarlo."
          }
          error={error}
        >
          <DocumentTypePicker
            id={`${id}-type`}
            documentTypes={catalog.document_types}
            value={type}
            onChange={setType}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? `${id}-type-error` : `${id}-type-hint`}
          />
        </Field>
        <Field
          label="Descripción"
          htmlFor={`${id}-description`}
          optional
          hint="Para un documento que no está en el catálogo. Sin tipo, no tiene fecha límite."
        >
          <Input
            id={`${id}-description`}
            value={description}
            maxLength={300}
            onChange={(event) => setDescription(event.target.value)}
            aria-describedby={`${id}-description-hint`}
          />
        </Field>
        <Field label="Cantidad" htmlFor={`${id}-quantity`} optional>
          <Input
            id={`${id}-quantity`}
            type="number"
            min={1}
            max={100000}
            inputMode="numeric"
            className="tabular w-32"
            value={quantity}
            onChange={(event) => setQuantity(event.target.value)}
          />
        </Field>
        <DialogError message={mutation.error ? errorMessage(mutation.error) : null} />
        <DialogFooter>
          <Button variant="outline" onClick={() => close(false)}>
            Cancelar
          </Button>
          <Submit isPending={mutation.isPending}>Agregar documento</Submit>
        </DialogFooter>
      </form>
    </Dialog>
  );
}
