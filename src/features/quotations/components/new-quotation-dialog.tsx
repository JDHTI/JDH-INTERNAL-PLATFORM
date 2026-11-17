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
import { ToggleChip } from "@/shared/components/ui/toggle-chip";

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
    placeholder: scope === "mine" ? "Elige o escribe nombre, NIT o grupo" : "Nombre, NIT o grupo empresarial",
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
      // The search also finds by business group, so the group says why a row came up.
      const group = text(row.business_group);
      const inactive = row.is_active === false ? " · inactivo" : "";
      return {
        value: text(row.nit),
        label: text(row.name) || text(row.nit),
        hint: [`NIT ${text(row.nit)}`, group && `Grupo ${group}`, channel, seller].filter(Boolean).join(" · ") + inactive,
      };
    },
  };
}

const WINDOW_HINT: Record<WindowMonths, string> = {
  6: "Precios más recientes; deja fuera lo que no se vende hace medio año.",
  12: "Incluye referencias de temporada o de rotación lenta.",
};

/** Whose customers to search, or a customer SIESA does not have yet. */
type Mode = CustomerScope | "temporary";

/**
 * New quotation, as a compact modal over the list: one row picks all
 * customers, the seller's own, or (at the far right) a temporary one that
 * SIESA does not have yet. A SIESA customer is built from the sales window,
 * or starts empty for the advisor to add references. The validity is set
 * while confirming. Building from SIESA reads the DWH, so while it runs the
 * dialog cannot be dismissed: closing it would leave a request running that
 * later navigates away on its own.
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
  // Only whoever sees every customer chooses between all and their own; the rest get their portfolio.
  const canChoose = salesScope === "all";
  const [modeChoice, setModeChoice] = useState<Mode | null>(null);
  const [customer, setCustomer] = useState<AutocompleteOption | null>(null);
  const [windowMonths, setWindowMonths] = useState<WindowMonths>(6);
  const [empty, setEmpty] = useState(false);
  const [temp, setTemp] = useState({ name: "", legalName: "", tradeName: "", nit: "" });
  const [center, setCenter] = useState("");
  const [errors, setErrors] = useState<Partial<Record<"name" | "legalName" | "center", string>>>({});
  const [error, setError] = useState<string | null>(null);

  // Without a linked seller "mis clientes" is always empty, so it starts on everyone.
  const defaultMode: Mode = !portfolio ? "temporary" : canChoose && !sellerLinked ? "all" : "mine";
  const mode: Mode = !portfolio ? "temporary" : (modeChoice ?? defaultMode);
  const kind = mode === "temporary" ? "temporary" : "existing";
  const scope: CustomerScope = mode === "all" && canChoose ? "all" : "mine";

  const chooseMode = (next: Mode) => {
    setModeChoice(next);
    setCustomer(null);
    setError(null);
  };
  const noPortfolio = "Aún no tienes cartera asignada: pide a TI que te vincule con tu código de vendedor.";

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
      create.mutate({ kind: "existing", customerNit: customer.value, windowMonths, empty }, done);
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
    <form onSubmit={submit} className="space-y-4" noValidate>
      {/* min-w-0: a fieldset defaults to min-content width, which defeats the chip's truncation. */}
      <fieldset disabled={create.isPending} className="min-w-0 space-y-4">
        {/* The temporary customer sits at the far right: it is the exception, not the usual path. */}
        <div role="group" aria-label="Cliente a cotizar" className="flex flex-wrap items-center gap-2">
          {canChoose && (
            <ToggleChip active={mode === "all"} onClick={() => chooseMode("all")}>
              Todos los clientes
            </ToggleChip>
          )}
          <ToggleChip
            active={mode === "mine"}
            onClick={() => chooseMode("mine")}
            disabled={!portfolio || (canChoose && !sellerLinked)}
            title={
              !portfolio
                ? noPortfolio
                : canChoose && !sellerLinked
                  ? "No estás vinculado como vendedor: busca en «Todos los clientes»."
                  : salesScope === "team"
                    ? "Los clientes de los vendedores de tu equipo."
                    : permissions.data?.seller
                      ? `La cartera de ${permissions.data.seller.name} (${permissions.data.seller.code}).`
                      : undefined
            }
          >
            {salesScope === "team" ? "Clientes de mi equipo" : "Mis clientes"}
          </ToggleChip>
          <span className="ml-auto">
            <ToggleChip active={mode === "temporary"} onClick={() => chooseMode("temporary")}>
              Cliente temporal (nuevo)
            </ToggleChip>
          </span>
        </div>

        {kind === "existing" ? (
          <>
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

            <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
              <div role="radiogroup" aria-label="Ventana de ventas" className="flex items-center gap-2">
                <span className="text-[13px] font-medium" aria-hidden="true">Ventas de los</span>
                {WINDOW_OPTIONS.map((months) => (
                  <label
                    key={months}
                    title={WINDOW_HINT[months]}
                    className={cn(
                      "inline-flex min-h-8 cursor-pointer items-center gap-2 rounded-md border px-3 text-sm max-md:min-h-11",
                      "has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-ring",
                      "has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-50",
                      windowMonths === months ? "border-primary bg-primary-subtle font-medium" : "border-border-control hover:bg-canvas-subtle"
                    )}
                  >
                    <input
                      type="radio"
                      name="window"
                      value={months}
                      checked={windowMonths === months}
                      onChange={() => setWindowMonths(months)}
                      disabled={empty}
                      className="size-4 accent-[var(--primary)]"
                    />
                    {months} meses
                  </label>
                ))}
              </div>
              <label
                className="inline-flex min-h-8 cursor-pointer items-center gap-2 text-sm max-md:min-h-11"
                title="Sin el histórico de ventas: agregas las referencias a cotizar."
              >
                <input
                  type="checkbox"
                  checked={empty}
                  onChange={(event) => setEmpty(event.target.checked)}
                  className="size-4 accent-[var(--primary)]"
                />
                Empezar vacía
              </label>
            </div>
          </>
        ) : (
          <>
            <div className="grid gap-3 sm:grid-cols-2">
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
            <Field label="Centro de operación" htmlFor={`${id}-center`} error={errors.center}>
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

      <DialogError message={error} />
      <DialogFooter>
        <Button variant="outline" onClick={onCancel} disabled={create.isPending} className="max-md:h-11">
          Cancelar
        </Button>
        <Button type="submit" disabled={create.isPending} className="max-md:h-11">
          {create.isPending ? <Loader2 className="animate-spin" aria-hidden="true" /> : <Calculator aria-hidden="true" />}
          <span aria-live="polite">
            {create.isPending ? "Armando cotización…" : kind === "existing" && !empty ? "Armar cotización" : "Crear cotización"}
          </span>
        </Button>
      </DialogFooter>
    </form>
  );
}
