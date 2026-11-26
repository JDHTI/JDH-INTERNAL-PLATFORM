"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";

import FilterPanel from "@/shared/components/filter-panel";
import OptionFilter from "@/shared/components/option-filter";
import BasePicker, { CUSTOMER_PICKER, type BasePickerConfig } from "@/shared/components/pickers/base-picker";
import { Button } from "@/shared/components/ui/button";
import { DateRangePicker } from "@/shared/components/ui/date-range-picker";
import { Input } from "@/shared/components/ui/input";
import type { AutocompleteOption } from "@/shared/components/ui/autocomplete";
import { toIso } from "@/shared/lib/iso-date";

import { useServiceLevelOptions, useServiceLevelReasons } from "../hooks/use-service-level";
import { CLASS_OPTIONS } from "../lib/format";
import type { Choice, ServiceLevelFilters } from "../types/service-level.types";

export const EMPTY_FILTERS: ServiceLevelFilters = {
  since: "",
  until: "",
  co: "",
  warehouse: "",
  supplier: "",
  seller: "",
  customer: "",
  q: "",
  reason: "",
  responsible: "",
  product_class: "",
  customer_class: "",
};

const CUSTOMER_FILTER: BasePickerConfig = { ...CUSTOMER_PICKER, placeholder: "Cliente: nombre o NIT" };

const choices = (items: Choice[] | undefined) =>
  (items ?? []).map((item) => ({ value: item.code, label: item.name && item.name !== item.code ? `${item.code} · ${item.name}` : item.code }));

/** Whether anything besides the period narrows the lines. */
export function hasFilters(filters: ServiceLevelFilters): boolean {
  return (Object.keys(EMPTY_FILTERS) as (keyof ServiceLevelFilters)[]).some((key) => key !== "since" && key !== "until" && filters[key] !== "");
}

/**
 * The filters both views share. The period is the order date, the current
 * month until someone picks another; the C.O., warehouse, supplier and seller
 * dropdowns list the period's own, and changing the period starts them over.
 */
export default function ServiceLevelFilterPanel({
  filters,
  onChange,
  period,
  chips,
  end,
}: {
  filters: ServiceLevelFilters;
  onChange: (next: ServiceLevelFilters) => void;
  /** The period the API answered, shown while no other is picked. */
  period: { since: string; until: string } | null;
  chips?: React.ReactNode;
  end?: React.ReactNode;
}) {
  const options = useServiceLevelOptions(filters.since, filters.until);
  const reasons = useServiceLevelReasons();
  // The picker keeps the customer's name; the filter only carries the NIT.
  const [customer, setCustomer] = useState<AutocompleteOption | null>(null);
  const shownCustomer = filters.customer === "" ? null : customer?.value === filters.customer ? customer : { value: filters.customer, label: filters.customer };

  const set = (patch: Partial<ServiceLevelFilters>) => onChange({ ...filters, ...patch });
  const loading = options.isPending;

  const reasonOptions = useMemo(
    () => [{ value: "none", label: "Sin motivo" }, ...(reasons.data ?? []).map((reason) => ({ value: reason.id, label: reason.name }))],
    [reasons.data]
  );
  const responsibleOptions = useMemo(
    () => (options.data?.responsibles ?? []).map((name) => ({ value: name, label: name })),
    [options.data]
  );

  return (
    <FilterPanel
      label="Filtros de nivel de servicio"
      columns="md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-6"
      fields={
        <>
          <DateRangePicker
            value={filters.since ? { from: filters.since, to: filters.until } : period ? { from: period.since, to: period.until } : {}}
            max={toIso(new Date())}
            label="Fecha del pedido"
            placeholder="Mes actual"
            onChange={(next) =>
              set({
                // Clearing the period goes back to the current month.
                since: next.from && next.to ? next.from : "",
                until: next.from && next.to ? next.to : "",
                co: "",
                warehouse: "",
                supplier: "",
                seller: "",
              })
            }
          />
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-text-secondary" aria-hidden="true" />
            <Input
              type="search"
              value={filters.q}
              onChange={(event) => set({ q: event.target.value })}
              placeholder="Referencia, descripción o pedido"
              aria-label="Buscar por referencia, descripción o documento del pedido"
              className="pl-9"
            />
          </div>
          <OptionFilter label="Centro de operación" allLabel="Todos los C.O." value={filters.co} options={choices(options.data?.cos)} loading={loading} onChange={(co) => set({ co })} />
          <OptionFilter
            label="Bodega"
            allLabel="Todas las bodegas"
            value={filters.warehouse}
            options={choices(options.data?.warehouses)}
            loading={loading}
            onChange={(warehouse) => set({ warehouse })}
          />
          <OptionFilter
            label="Proveedor"
            allLabel="Todos los proveedores"
            value={filters.supplier}
            options={choices(options.data?.suppliers)}
            loading={loading}
            onChange={(supplier) => set({ supplier })}
          />
          <OptionFilter
            label="Vendedor"
            allLabel="Todos los vendedores"
            value={filters.seller}
            options={(options.data?.sellers ?? []).map((seller) => ({ value: seller.code, label: seller.name || seller.code }))}
            loading={loading}
            onChange={(seller) => set({ seller })}
          />
          <BasePicker
            config={CUSTOMER_FILTER}
            hideLabel
            selected={shownCustomer}
            onSelect={(option) => {
              setCustomer(option);
              set({ customer: option?.value ?? "" });
            }}
            onClear={() => {
              setCustomer(null);
              set({ customer: "" });
            }}
          />
          <OptionFilter
            label="Motivo"
            allLabel="Todos los motivos"
            value={filters.reason}
            options={reasonOptions}
            loading={reasons.isPending}
            onChange={(reason) => set({ reason })}
          />
          <OptionFilter
            label="Responsable"
            allLabel="Todos los responsables"
            value={filters.responsible}
            options={responsibleOptions}
            loading={loading}
            onChange={(responsible) => set({ responsible })}
          />
          <OptionFilter
            label="Clase del producto"
            allLabel="Producto: toda clase"
            value={filters.product_class}
            options={CLASS_OPTIONS}
            loading={false}
            onChange={(next) => set({ product_class: next as ServiceLevelFilters["product_class"] })}
          />
          <OptionFilter
            label="Clase del cliente"
            allLabel="Cliente: toda clase"
            value={filters.customer_class}
            options={CLASS_OPTIONS}
            loading={false}
            onChange={(next) => set({ customer_class: next as ServiceLevelFilters["customer_class"] })}
          />
        </>
      }
      chips={chips}
      end={
        <>
          {end}
          {hasFilters(filters) && (
            <Button variant="ghost" size="sm" onClick={() => onChange({ ...EMPTY_FILTERS, since: filters.since, until: filters.until })}>
              Limpiar filtros
            </Button>
          )}
        </>
      }
    />
  );
}
