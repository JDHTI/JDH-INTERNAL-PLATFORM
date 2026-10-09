"use client";

import { useId, useState } from "react";
import { Ban, MoreHorizontal, Pencil, Power, PowerOff } from "lucide-react";

import { Button, buttonVariants } from "@/shared/components/ui/button";
import { Dialog, DialogError, DialogFooter } from "@/shared/components/ui/dialog";
import { Field } from "@/shared/components/ui/field";
import { Input } from "@/shared/components/ui/input";
import { Menu, MenuItem, MenuSeparator } from "@/shared/components/ui/menu";
import { ApiError, errorMessage } from "@/shared/lib/api-client";

import { useUpdateSupport, useVoidSupport } from "../hooks/use-supports";
import type { SupplierSupport } from "../types/support.types";

/** 403 means the user cannot write; 409 means the row changed under them. */
export function failureMessage(error: unknown): string {
  if (error instanceof ApiError && error.status === 409) {
    return "Otra persona modificó este apoyo. Se actualizó la lista: intenta de nuevo.";
  }
  return errorMessage(error);
}

/**
 * Row actions. Enabling is a reversible switch; voiding keeps the row and
 * asks for a reason. Nothing here deletes anything.
 */
export function SupportActions({
  support,
  onEdit,
  onVoid,
  onForbidden,
  onFailure,
}: {
  support: SupplierSupport;
  onEdit: () => void;
  onVoid: () => void;
  onForbidden: () => void;
  onFailure: (message: string) => void;
}) {
  const update = useUpdateSupport();
  const voided = support.state === "anulado";
  const disabled = support.state === "inactivo";

  const toggle = () =>
    update.mutate(
      { id: support.id, patch: { version: support.version, is_enabled: disabled } },
      {
        onError: (error) => {
          if (error instanceof ApiError && error.status === 403) onForbidden();
          else onFailure(failureMessage(error));
        },
      }
    );

  return (
    <Menu
      align="end"
      trigger={<MoreHorizontal className="size-4" aria-hidden="true" />}
      triggerClassName={buttonVariants({ variant: "ghost", size: "icon-sm" })}
      triggerLabel={`Acciones del apoyo de ${support.supplier_name ?? support.supplier_code ?? "proveedor"}`}
      disabled={update.isPending}
    >
      <MenuItem onClick={onEdit} disabled={voided}>
        <Pencil aria-hidden="true" /> Editar
      </MenuItem>
      <MenuItem onClick={toggle} disabled={voided}>
        {disabled ? <Power aria-hidden="true" /> : <PowerOff aria-hidden="true" />}
        {disabled ? "Activar" : "Desactivar"}
      </MenuItem>
      <MenuSeparator />
      <MenuItem onClick={onVoid} disabled={voided}>
        <Ban aria-hidden="true" /> Anular
      </MenuItem>
    </Menu>
  );
}

export function SupportVoidDialog({
  support,
  onClose,
  onForbidden,
}: {
  support: SupplierSupport | null;
  onClose: () => void;
  onForbidden: () => void;
}) {
  return (
    <Dialog
      open={support !== null}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      title="Anular apoyo"
      description="El apoyo no se borra: queda anulado, con su motivo, y deja de contar. No se puede reactivar desde aquí."
      isForm
    >
      {support && <VoidForm key={support.id} support={support} onClose={onClose} onForbidden={onForbidden} />}
    </Dialog>
  );
}

function VoidForm({
  support,
  onClose,
  onForbidden,
}: {
  support: SupplierSupport;
  onClose: () => void;
  onForbidden: () => void;
}) {
  const id = useId();
  const voidSupport = useVoidSupport();
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    voidSupport.mutate(
      { id: support.id, version: support.version, reason: reason.trim() },
      {
        onSuccess: onClose,
        onError: (failure) => {
          if (failure instanceof ApiError && failure.status === 403) {
            onForbidden();
            onClose();
          } else {
            setError(failureMessage(failure));
          }
        },
      }
    );
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <Field label="Motivo de la anulación" htmlFor={`${id}-reason`}>
        <Input id={`${id}-reason`} value={reason} onChange={(event) => setReason(event.target.value)} autoFocus />
      </Field>
      <DialogError message={error} />
      <DialogFooter>
        <Button variant="outline" onClick={onClose} disabled={voidSupport.isPending}>
          Cancelar
        </Button>
        <Button
          type="submit"
          disabled={reason.trim() === "" || voidSupport.isPending}
          className="bg-danger text-text-on-primary hover:bg-danger/90"
        >
          Anular apoyo
        </Button>
      </DialogFooter>
    </form>
  );
}
