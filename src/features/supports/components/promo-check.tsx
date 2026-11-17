"use client";

import { useId } from "react";

/**
 * «Aplica en bodegas promocionales (grupo 23)». Off by default: an order from
 * one of those warehouses then goes at that warehouse's cost, without the support.
 */
export default function PromoCheck({ checked, onChange }: { checked: boolean; onChange: (checked: boolean) => void }) {
  const id = useId();
  return (
    <div className="flex items-start gap-3">
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        aria-describedby={`${id}-hint`}
        className="mt-0.5 size-4 accent-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
      />
      <div className="space-y-0.5">
        <label htmlFor={id} className="block cursor-pointer text-sm font-medium">
          Aplica en bodegas promocionales (grupo 23)
        </label>
        <p id={`${id}-hint`} className="text-[13px] text-text-secondary">
          Sin marcar, un pedido desde una bodega promocional va al costo de esa bodega, sin este apoyo.
        </p>
      </div>
    </div>
  );
}
