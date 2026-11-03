"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Calculator, Loader2 } from "lucide-react";

import BasePicker, { type BasePickerConfig } from "@/shared/components/pickers/base-picker";
import { Alert } from "@/shared/components/ui/alert";
import type { AutocompleteOption } from "@/shared/components/ui/autocomplete";
import { Button } from "@/shared/components/ui/button";
import { errorMessage } from "@/shared/lib/api-client";
import { cn } from "@/shared/lib/utils";
import { useBreadcrumbLabel } from "@/shared/store/use-breadcrumb-store";

import { useCreateQuotation, useQuotationPermissions } from "../hooks/use-quotations";
import { WINDOW_OPTIONS } from "../lib/format";
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
        ? "Ninguno de tus clientes coincide. Busca en todos los clientes."
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

export default function NewQuotationForm({ basePath }: { basePath: string }) {
  const router = useRouter();
  const permissions = useQuotationPermissions();
  const create = useCreateQuotation();
  const sellerLinked = permissions.data?.seller_linked === true;
  const [scopeChoice, setScopeChoice] = useState<CustomerScope | null>(null);
  const [customer, setCustomer] = useState<AutocompleteOption | null>(null);
  const [windowMonths, setWindowMonths] = useState<WindowMonths>(6);
  const [error, setError] = useState<string | null>(null);
  useBreadcrumbLabel(`${basePath}/nueva`, "Nueva cotización");

  // Without a linked seller "mis clientes" is always empty, so it starts on everyone.
  const scope: CustomerScope = scopeChoice ?? (sellerLinked ? "mine" : "all");

  const chooseScope = (next: CustomerScope) => {
    setScopeChoice(next);
    setCustomer(null);
  };

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!customer) {
      setError("Elige el cliente que vas a cotizar.");
      return;
    }
    setError(null);
    create.mutate(
      { customerNit: customer.value, windowMonths },
      {
        onSuccess: (quotation) => router.push(`${basePath}/${quotation.id}`),
        onError: (failure) => setError(errorMessage(failure)),
      }
    );
  };

  return (
    <div className="max-w-[640px] space-y-6">
      <div className="space-y-3">
        <Link
          href={basePath}
          className="inline-flex min-h-8 items-center gap-1 rounded-sm text-sm text-text-secondary hover:text-text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring max-md:min-h-11"
        >
          <ArrowLeft className="size-4" aria-hidden="true" /> Cotizaciones
        </Link>
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">Nueva cotización</h1>
          <p className="text-sm text-text-secondary">
            Toma el último precio que el cliente pagó por cada referencia en la ventana, con el costo de hoy, el margen
            objetivo de su canal y los apoyos vigentes.
          </p>
        </div>
      </div>

      <form onSubmit={submit} className="space-y-5" noValidate>
        <div className="space-y-2">
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
              Tu correo no está registrado como vendedor en SIESA, así que «Mis clientes» no tiene a quién listar. Puedes
              cotizar cualquier cliente desde «Todos los clientes».
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

        <fieldset className="space-y-2">
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

        {error && <Alert severity="danger">{error}</Alert>}

        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Link
            href={basePath}
            className="inline-flex h-10 items-center justify-center rounded-md border border-border-control px-4 text-sm font-medium hover:bg-canvas-subtle focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring max-md:h-11"
          >
            Cancelar
          </Link>
          <Button type="submit" size="lg" disabled={create.isPending} className="max-md:h-11">
            {create.isPending ? <Loader2 className="animate-spin" aria-hidden="true" /> : <Calculator aria-hidden="true" />}
            {create.isPending ? "Leyendo ventas y costos…" : "Armar cotización"}
          </Button>
        </div>
      </form>
    </div>
  );
}
