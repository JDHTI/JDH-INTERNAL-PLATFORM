"use client";

import { useId, useState } from "react";
import { useRouter } from "next/navigation";
import { Calculator, Loader2 } from "lucide-react";

import BasePicker, { type BasePickerConfig } from "@/shared/components/pickers/base-picker";
import type { AutocompleteOption } from "@/shared/components/ui/autocomplete";
import { Button } from "@/shared/components/ui/button";
import { Dialog, DialogError, DialogFooter } from "@/shared/components/ui/dialog";
import { Field } from "@/shared/components/ui/field";
import { Input } from "@/shared/components/ui/input";
import { errorMessage } from "@/shared/lib/api-client";
import { cn } from "@/shared/lib/utils";

import { useCreateQuotation, useQuotationPermissions } from "../hooks/use-quotations";
import { WINDOW_OPTIONS } from "../lib/format";
import { QUOTATIONS_BASE } from "../services/quotations.service";
import type { CustomerScope, WindowMonths } from "../types/quotations.types";
import BillingCenterSelect from "./billing-center-select";
import { ToggleChip } from "./toggle-chip";

const text = (value: unknown) => (typeof value === "string" ? value : "");
const MAX_TEXT = 120;

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
        ? "Ninguno de los clientes de tu cartera coincide. Prueba con el NIT o regístralo como cliente temporal."
        : "Sin coincidencias. Prueba con el NIT, o regístralo como cliente temporal si aún no existe en SIESA.",
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

type Kind = "existing" | "temporary";

/**
 * New quotation, as a modal over the list: a SIESA customer and the sales
 * window, or a temporary customer (one SIESA does not have yet) quoted from
 * scratch from a chosen operation center. The validity is set while
 * confirming. Building from SIESA reads the DWH (2 to 15 seconds, more when it
 * is cold), so while it runs the dialog cannot be dismissed: closing it would
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
      description="Para un cliente de SIESA toma el último precio de cada referencia, con el costo de hoy, el margen objetivo de su canal y los apoyos vigentes. Para uno que aún no existe, empieza vacía."
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
  const id = useId();
  const permissions = useQuotationPermissions();
  const sellerLinked = permissions.data?.seller_linked === true;
  const salesScope = permissions.data?.sales_scope ?? "none";
  // Without a portfolio there is no SIESA customer to list, but a temporary one can still be quoted.
  const portfolio = salesScope !== "none";
  const [kindChoice, setKindChoice] = useState<Kind>("existing");
  const kind: Kind = portfolio ? kindChoice : "temporary";
  const [scopeChoice, setScopeChoice] = useState<CustomerScope | null>(null);
  const [customer, setCustomer] = useState<AutocompleteOption | null>(null);
  const [windowMonths, setWindowMonths] = useState<WindowMonths>(6);
  const [temp, setTemp] = useState({ name: "", legalName: "", tradeName: "", nit: "" });
  const [center, setCenter] = useState("");
  const [errors, setErrors] = useState<Partial<Record<"name" | "legalName" | "center", string>>>({});
  const [error, setError] = useState<string | null>(null);

  // Only whoever sees every customer chooses; for the rest the API answers with their portfolio.
  const canChoose = salesScope === "all";
  // Without a linked seller "mis clientes" is always empty, so it starts on everyone.
  const scope: CustomerScope = canChoose ? (scopeChoice ?? (sellerLinked ? "mine" : "all")) : "mine";

  const chooseScope = (next: CustomerScope) => {
    setScopeChoice(next);
    setCustomer(null);
  };

  const done = {
    onSuccess: (quotation: { id: string }) => router.push(`${basePath}/${quotation.id}`),
    onError: (failure: Error) => setError(errorMessage(failure)),
  };

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    if (kind === "existing") {
      if (!customer) {
        setError("Elige el cliente que vas a cotizar.");
        return;
      }
      create.mutate({ kind: "existing", customerNit: customer.value, windowMonths }, done);
      return;
    }
    const found: typeof errors = {};
    if (temp.name.trim() === "") found.name = "Escribe el nombre del cliente.";
    if (temp.legalName.trim() === "") found.legalName = "Escribe la razón social.";
    if (center === "") found.center = "Elige el C.O. desde el que se cotiza.";
    setErrors(found);
    if (Object.keys(found).length > 0) return;
    create.mutate(
      {
        kind: "temporary",
        temporary_customer: {
          name: temp.name.trim(),
          legal_name: temp.legalName.trim(),
          trade_name: temp.tradeName.trim() || null,
          nit: temp.nit.trim() || null,
        },
        billing_center_code: center,
      },
      done
    );
  };

  const setField = (key: keyof typeof temp, value: string) => {
    setTemp((current) => ({ ...current, [key]: value }));
    if (key === "name" || key === "legalName") setErrors((current) => ({ ...current, [key]: undefined }));
  };

  return (
    <form onSubmit={submit} className="space-y-5" noValidate>
      {/* min-w-0: a fieldset defaults to min-content width, which defeats the chip's truncation. */}
      <fieldset disabled={create.isPending} className="min-w-0 space-y-5">
        <div role="group" aria-label="Tipo de cliente" className="flex flex-wrap gap-2">
          <ToggleChip active={kind === "existing"} onClick={() => setKindChoice("existing")} disabled={!portfolio}>
            Cliente de SIESA
          </ToggleChip>
          <ToggleChip active={kind === "temporary"} onClick={() => setKindChoice("temporary")}>
            Cliente temporal
          </ToggleChip>
        </div>
        {!portfolio && permissions.data && (
          <p className="text-[13px] text-text-secondary">
            Aún no tienes cartera asignada, así que solo puedes cotizar un cliente temporal. Para los de SIESA, pide a TI que te
            vincule con tu código de vendedor en Solicitudes de soporte.
          </p>
        )}

        {kind === "existing" ? (
          <>
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
                      No estás vinculado como vendedor, así que «Mis clientes» no tiene a quién listar. Puedes cotizar cualquier cliente
                      desde «Todos los clientes».
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
          </>
        ) : (
          <>
            <p className="text-[13px] text-text-secondary">
              Para un cliente que aún no existe en SIESA. Queda registrado en la cotización, empieza sin productos y al confirmar
              se le crea una lista nueva.
            </p>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Nombre" htmlFor={`${id}-name`} error={errors.name}>
                <Input
                  id={`${id}-name`}
                  value={temp.name}
                  maxLength={MAX_TEXT}
                  onChange={(event) => setField("name", event.target.value)}
                  aria-invalid={errors.name ? true : undefined}
                  aria-describedby={errors.name ? `${id}-name-error` : undefined}
                  className="max-md:h-11"
                />
              </Field>
              <Field label="Razón social" htmlFor={`${id}-legal`} error={errors.legalName}>
                <Input
                  id={`${id}-legal`}
                  value={temp.legalName}
                  maxLength={MAX_TEXT}
                  onChange={(event) => setField("legalName", event.target.value)}
                  aria-invalid={errors.legalName ? true : undefined}
                  aria-describedby={errors.legalName ? `${id}-legal-error` : undefined}
                  className="max-md:h-11"
                />
              </Field>
              <Field label="Nombre comercial" htmlFor={`${id}-trade`} optional>
                <Input id={`${id}-trade`} value={temp.tradeName} maxLength={MAX_TEXT} onChange={(event) => setField("tradeName", event.target.value)} className="max-md:h-11" />
              </Field>
              <Field label="NIT" htmlFor={`${id}-nit`} optional>
                <Input
                  id={`${id}-nit`}
                  value={temp.nit}
                  maxLength={20}
                  inputMode="numeric"
                  onChange={(event) => setField("nit", event.target.value)}
                  className="font-mono max-md:h-11"
                />
              </Field>
            </div>
            <Field label="C.O. desde el que se cotiza" htmlFor={`${id}-center`} error={errors.center} hint="Define el costo, las bodegas y la regional de los precios.">
              <BillingCenterSelect
                id={`${id}-center`}
                value={center}
                onChange={(code) => {
                  setCenter(code);
                  setErrors((current) => ({ ...current, center: undefined }));
                }}
                invalid={Boolean(errors.center)}
              />
            </Field>
          </>
        )}
      </fieldset>

      {create.isPending && kind === "existing" && (
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
          {create.isPending ? "Armando cotización…" : kind === "existing" ? "Armar cotización" : "Crear cotización"}
        </Button>
      </DialogFooter>
    </form>
  );
}
