"use client";

import { useState } from "react";

import { Dropdown } from "@/shared/components/ui/dropdown";

import { ITEM_STATUS, UNSETTLED_STATUSES } from "../lib/format";
import type { ItemStatus, Period, SupplierRow } from "../types/support-settlements.types";
import SettlementLines from "./settlement-lines";
import { supplierOptions } from "./supplier-options";

/**
 * The supports that were calculated but not claimed, one status at a time: in review, with tiers
 * (settled by hand), minimum not met, not calculable, already discounted on the invoice.
 */
export default function UnsettledView({ period, suppliers }: { period: Period; suppliers: SupplierRow[] }) {
  const [status, setStatus] = useState<ItemStatus>(UNSETTLED_STATUSES[0]);
  const [supplier, setSupplier] = useState("");

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <Dropdown
          className="w-full sm:w-64"
          value={status}
          onValueChange={(next) => setStatus(next as ItemStatus)}
          options={UNSETTLED_STATUSES.map((value) => ({ value, label: ITEM_STATUS[value].label }))}
          aria-label="Estado del apoyo"
        />
        <Dropdown
          className="w-full sm:w-72"
          value={supplier}
          onValueChange={setSupplier}
          options={[{ value: "", label: "Todos los proveedores" }, ...supplierOptions(suppliers)]}
          aria-label="Proveedor"
          searchable
          searchPlaceholder="Buscar proveedor"
          emptyMessage="Ningún proveedor coincide."
        />
      </div>
      <SettlementLines
        // Keyed so the page starts over with each filter.
        key={`${status}-${supplier}`}
        period={period}
        status={status}
        supplierCode={supplier || null}
        showProduct
        label={`Líneas con apoyos en estado ${ITEM_STATUS[status].label}`}
      />
    </div>
  );
}
