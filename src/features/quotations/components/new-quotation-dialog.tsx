"use client";

import { useId, useState } from "react";
import { useRouter } from "next/navigation";
import { Calculator, Loader2, Lock } from "lucide-react";

import BasePicker, { type BasePickerConfig } from "@/shared/components/pickers/base-picker";
import StatePanel from "@/shared/components/state-panel";
import type { AutocompleteOption } from "@/shared/components/ui/autocomplete";
import { Button } from "@/shared/components/ui/button";
import { Dialog, DialogError, DialogFooter } from "@/shared/components/ui/dialog";
import { Field } from "@/shared/components/ui/field";
import { Input } from "@/shared/components/ui/input";
import { errorMessage } from "@/shared/lib/api-client";
import { cn } from "@/shared/lib/utils";

import { useCreateQuotation, useQuotationPermissions } from "../hooks/use-quotations";
import { DEFAULT_VALIDITY_DAYS, WINDOW_OPTIONS, formatLongDay, parseValidityDays, validityEnd } from "../lib/format";
import { QUOTATIONS_BASE } from "../services/quotations.service";
import type { CustomerScope, WindowMonths } from "../types/quotations.types";
import { ToggleChip } from "./toggle-chip";

const text = (value: unknown) => (typeof value === "string" ? value : "");

/**
 * The customers the API offers for quoting. "mine" is short (the seller's own
 * portfolio), so it lists on focus; "all" is the whole base and waits for two
 * characters like the other pickers.
 */
function customerPicker(scope: CustomerScope): BasePickerConfig {
  return {
    label: "Cliente",
    placeholder: scope === "mine" ? "Elige o escribe nombre o NIT" : "Nombre o NIT",
    endpoint: `${QUOTATIONS_BASE}/customers`,
    query: { scope },
    minChars: scope === "mine" ? 0 : 2,
    emptyText:
      scope === "mine"
        ? "Ninguno de los clientes de tu cartera coincide. Prueba con el NIT."
        : "Sin coincidencias. Prueba con el NIT o menos palabras del nombre.",
    toOption: (row) => {
      const channel = text(row.channel);
      const seller = text(row.salesperson_name);
      const inactive = row.is_active === false ? " · inactivo" : "";
      return {
        value: text(row.nit),
        label: text(row.name) || text(row.nit),
        hint: [`NIT ${text(row.nit)}`, channel, seller].filter(Boolean).join(" · ") + inactive,
      };
    },
  };
}

const WINDOW_HINT: Record<WindowMonths, string> = {
  6: "Precios más recientes; deja fuera lo que no se vende hace medio año.",
  12: "Incluye referencias de temporada o de rotación lenta.",
};

/**
 * New quotation, as a modal over the list: customer and sales window, then
 * the editor. Building it reads the DWH (2 to 15 seconds, more when it is
 * cold), so while it runs the dialog cannot be dismissed: closing it would
 * leave a request running that later navigates away on its own.
 */
export default function NewQuotationDialog({
  basePath,
  open,
  onOpenChange,
}: {
  basePath: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const create = useCreateQuotation();
  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next && create.isPending) return;
        onOpenChange(next);
      }}
      isForm
      title="Nueva cotización"
      description="Toma el último precio que el cliente pagó por cada referencia en la ventana, con el costo de hoy, el margen objetivo de su canal y los apoyos vigentes."
    >
      {open && <NewQuotationForm basePath={basePath} create={create} onCancel={() => onOpenChange(false)} />}
    </Dialog>
  );
}

function NewQuotationForm({
  basePath,
  create,
  onCancel,
}: {
  basePath: string;
  create: ReturnType<typeof useCreateQuotation>;
  onCancel: () => void;
}) {
  const router = useRouter();
  const permissions = useQuotationPermissions();
  const sellerLinked = permissions.data?.seller_linked === true;
  const salesScope = permissions.data?.sales_scope ?? "none";
  const [scopeChoice, setScopeChoice] = useState<CustomerScope | null>(null);
  const [customer, setCustomer] = useState<AutocompleteOption | null>(null);
  const [windowMonths, setWindowMonths] = useState<WindowMonths>(6);
  const [validity, setValidity] = useState(String(DEFAULT_VALIDITY_DAYS));
  const [validityError, setValidityError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const validityId = useId();
  const parsedValidity = parseValidityDays(validity);

  // Only whoever sees every customer chooses; for the rest the API answers with their portfolio.
  const canChoose = salesScope === "all";
  // Without a linked seller "mis clientes" is always empty, so it starts on everyone.
  const scope: CustomerScope = canChoose ? (scopeChoice ?? (sellerLinked ? "mine" : "all")) : "mine";

  const chooseScope = (next: CustomerScope) => {
    setScopeChoice(next);
    setCustomer(null);
  };

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if ("error" in parsedValidity) {
      setValidityError(parsedValidity.error);
      return;
    }
    if (!customer) {
      setError("Elige el cliente que vas a cotizar.");
      return;
    }
    setError(null);
    create.mutate(
      { customerNit: customer.value, windowMonths, validityDays: parsedValidity.value },
      {
        onSuccess: (quotation) => router.push(`${basePath}/${quotation.id}`),
        onError: (failure) => setError(errorMessage(failure)),
      }
    );
  };

  if (permissions.data && salesScope === "none") {
    return (
      <div className="space-y-5">
        <StatePanel icon={Lock} title="Aún no tienes una cartera asignada">
          Para cotizar, TI debe vincularte con tu código de vendedor o de supervisor de SIESA. Pídelo en Solicitudes de
          soporte con tu correo corporativo.
        </StatePanel>
        <DialogFooter>
          <Button variant="outline" onClick={onCancel} className="max-md:h-11">
            Cerrar
          </Button>
        </DialogFooter>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-5" noValidate>
      {/* min-w-0: a fieldset defaults to min-content width, which defeats the chip's truncation. */}
      <fieldset disabled={create.isPending} className="min-w-0 space-y-5">
        <div className="space-y-2">
          {canChoose ? (
            <>
              <div role="group" aria-label="Clientes a buscar" className="flex flex-wrap gap-2">
                <ToggleChip active={scope === "mine"} onClick={() => chooseScope("mine")}>
                  Mis clientes
                </ToggleChip>
                <ToggleChip active={scope === "all"} onClick={() => chooseScope("all")}>
                  Todos los clientes
                </ToggleChip>
              </div>
              {permissions.data && !sellerLinked && (
                <p className="text-[13px] text-text-secondary">
                  No estás vinculado como vendedor, así que «Mis clientes» no tiene a quién listar. Puedes cotizar cualquier
                  cliente desde «Todos los clientes».
                </p>
              )}
            </>
          ) : (
            <p className="text-[13px] text-text-secondary">
              {salesScope === "team"
                ? "Puedes cotizar los clientes de los vendedores de tu equipo."
                : "Puedes cotizar los clientes de tu cartera."}
            </p>
          )}
          {permissions.data?.seller && (
            <p className="text-[13px] text-text-secondary">
              Mis clientes: la cartera de {permissions.data.seller.name} ({permissions.data.seller.code}).
            </p>
          )}
        </div>

        <BasePicker
          key={scope}
          config={customerPicker(scope)}
          selected={customer}
          onSelect={(option) => {
            setCustomer(option);
            setError(null);
          }}
          onClear={() => setCustomer(null)}
        />

        <fieldset className="min-w-0 space-y-2">
          <legend className="text-[13px] font-medium">Ventana de ventas</legend>
          <div className="grid gap-2 sm:grid-cols-2">
            {WINDOW_OPTIONS.map((months) => (
              <label
                key={months}
                className={cn(
                  "flex cursor-pointer gap-3 rounded-md border p-3 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-ring",
                  windowMonths === months ? "border-primary bg-primary-subtle" : "border-border-control hover:bg-canvas-subtle"
                )}
              >
                <input
                  type="radio"
                  name="window"
                  value={months}
                  checked={windowMonths === months}
                  onChange={() => setWindowMonths(months)}
                  className="mt-0.5 size-4 accent-[var(--primary)]"
                />
                <span className="space-y-0.5">
                  <span className="block text-sm font-medium">Últimos {months} meses</span>
                  <span className="block text-[13px] text-text-secondary">{WINDOW_HINT[months]}</span>
                </span>
              </label>
            ))}
          </div>
        </fieldset>

        <Field
          label="Vigencia para el cliente, en días"
          htmlFor={validityId}
          error={validityError}
          hint={
            "value" in parsedValidity
              ? `Los precios valen hasta el ${formatLongDay(validityEnd(parsedValidity.value))}. Se puede cambiar después.`
              : undefined
          }
        >
          <Input
            id={validityId}
            inputMode="numeric"
            autoComplete="off"
            value={validity}
            onChange={(event) => {
              setValidity(event.target.value);
              setValidityError(null);
            }}
            onBlur={() => setValidityError("error" in parsedValidity ? parsedValidity.error : null)}
            aria-invalid={validityError ? true : undefined}
            aria-describedby={validityError ? `${validityId}-error` : `${validityId}-hint`}
            className="w-28 text-right tabular-nums max-md:h-11"
          />
        </Field>
      </fieldset>

      {create.isPending && (
        <p className="text-[13px] text-text-secondary" aria-live="polite">
          Leyendo las ventas, el costo y los apoyos del cliente en el datawarehouse. Suele tardar entre 2 y 15 segundos.
        </p>
      )}
      <DialogError message={error} />
      <DialogFooter>
        <Button variant="outline" onClick={onCancel} disabled={create.isPending} className="max-md:h-11">
          Cancelar
        </Button>
        <Button type="submit" disabled={create.isPending} className="max-md:h-11">
          {create.isPending ? <Loader2 className="animate-spin" aria-hidden="true" /> : <Calculator aria-hidden="true" />}
          {create.isPending ? "Armando cotización…" : "Armar cotización"}
        </Button>
      </DialogFooter>
    </form>
  );
}
