"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ListRestart, Loader2 } from "lucide-react";

import BasePicker, { type BasePickerConfig } from "@/shared/components/pickers/base-picker";
import type { AutocompleteOption } from "@/shared/components/ui/autocomplete";
import { Button } from "@/shared/components/ui/button";
import { Dialog, DialogError, DialogFooter } from "@/shared/components/ui/dialog";
import { ToggleChip } from "@/shared/components/ui/toggle-chip";
import { errorMessage } from "@/shared/lib/api-client";

import { useCreateListUpdate, useQuotationPermissions } from "../hooks/use-quotations";
import { formatCount } from "../lib/format";
import { QUOTATIONS_BASE } from "../services/quotations.service";

const text = (value: unknown) => (typeof value === "string" ? value : "");

/** SIESA lists by code (exact, any case) or by part of the name; names repeat, so the code always shows. */
function listPicker(canValidate: boolean): BasePickerConfig {
  return {
    label: "Lista de precios",
    placeholder: "Código (10U) o nombre de la lista",
    endpoint: `${QUOTATIONS_BASE}/price-lists`,
    minChars: 1,
    emptyText: "Ninguna lista coincide. Prueba con el código exacto o con otra palabra del nombre.",
    toOption: (row) => {
      const branches = typeof row.active_branches === "number" ? row.active_branches : null;
      const restricted = row.restricted === true;
      return {
        value: text(row.code),
        label: `${text(row.code)} · ${text(row.name) || "Sin nombre"}`,
        hint: [
          branches === null ? null : `${formatCount(branches)} ${branches === 1 ? "sucursal activa" : "sucursales activas"}`,
          row.is_active === false ? "inactiva" : null,
          restricted ? (canValidate ? "lista base: solo BI" : "solo la actualiza BI") : null,
        ]
          .filter(Boolean)
          .join(" · "),
      };
    },
  };
}

/** Every customer: a list update is about the list, not a portfolio. */
const CUSTOMER_PICKER: BasePickerConfig = {
  label: "Cliente",
  placeholder: "Nombre o NIT",
  endpoint: `${QUOTATIONS_BASE}/customers`,
  query: { scope: "all", kind: "lista" },
  emptyText: "Sin coincidencias. Prueba con el NIT completo.",
  toOption: (row) => ({
    value: text(row.nit),
    label: text(row.name) || text(row.nit),
    hint: [`NIT ${text(row.nit)}`, text(row.channel)].filter(Boolean).join(" · ") + (row.is_active === false ? " · inactivo" : ""),
  }),
};

type Mode = "lista" | "cliente";

/**
 * New list update: the list is picked by its code or its name, or through a
 * customer (the list SIESA has assigned to it). Building it reads the DWH (the
 * list, its branches and the last sales), so while it runs the dialog cannot
 * be dismissed.
 */
export default function NewListUpdateDialog({
  basePath,
  open,
  onOpenChange,
}: {
  basePath: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const create = useCreateListUpdate();
  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next && create.isPending) return;
        onOpenChange(next);
      }}
      isForm
      title="Nueva actualización de lista"
    >
      {open && <NewListUpdateForm basePath={basePath} create={create} onCancel={() => onOpenChange(false)} />}
    </Dialog>
  );
}

function NewListUpdateForm({
  basePath,
  create,
  onCancel,
}: {
  basePath: string;
  create: ReturnType<typeof useCreateListUpdate>;
  onCancel: () => void;
}) {
  const router = useRouter();
  const canValidate = useQuotationPermissions("lista").data?.can_validate === true;
  const [mode, setMode] = useState<Mode>("lista");
  const [choice, setChoice] = useState<AutocompleteOption | null>(null);
  const [error, setError] = useState<string | null>(null);

  const chooseMode = (next: Mode) => {
    setMode(next);
    setChoice(null);
    setError(null);
  };

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    if (!choice) {
      setError(mode === "lista" ? "Elige la lista que vas a actualizar." : "Elige el cliente cuya lista vas a actualizar.");
      return;
    }
    create.mutate(mode === "lista" ? { price_list_id: choice.value } : { customer_nit: choice.value }, {
      onSuccess: (quotation) => router.push(`${basePath}/${quotation.id}`),
      onError: (failure) => setError(errorMessage(failure)),
    });
  };

  return (
    <form onSubmit={submit} className="space-y-4" noValidate>
      <fieldset disabled={create.isPending} className="min-w-0 space-y-4">
        <div role="group" aria-label="Cómo elegir la lista" className="flex flex-wrap items-center gap-2">
          <ToggleChip active={mode === "lista"} onClick={() => chooseMode("lista")}>
            Por lista (código o nombre)
          </ToggleChip>
          <ToggleChip active={mode === "cliente"} onClick={() => chooseMode("cliente")}>
            Por cliente
          </ToggleChip>
        </div>
        <BasePicker
          key={mode}
          config={mode === "lista" ? listPicker(canValidate) : CUSTOMER_PICKER}
          selected={choice}
          onSelect={(option) => {
            setChoice(option);
            setError(null);
          }}
          onClear={() => setChoice(null)}
        />
        <p className="text-[13px] text-text-secondary">
          {mode === "lista"
            ? "Trae cada referencia con precio vigente en la lista. La última venta se busca entre los clientes de la lista."
            : "Toma la lista que el cliente tiene asignada en SIESA. La última venta es la de ese cliente; los apoyos, los de todos los clientes de la lista."}
        </p>
      </fieldset>

      <DialogError message={error} />
      <DialogFooter>
        <Button variant="outline" onClick={onCancel} disabled={create.isPending} className="max-md:h-11">
          Cancelar
        </Button>
        <Button type="submit" disabled={create.isPending} className="max-md:h-11">
          {create.isPending ? <Loader2 className="animate-spin" aria-hidden="true" /> : <ListRestart aria-hidden="true" />}
          <span aria-live="polite">{create.isPending ? "Armando la actualización…" : "Armar actualización"}</span>
        </Button>
      </DialogFooter>
    </form>
  );
}
