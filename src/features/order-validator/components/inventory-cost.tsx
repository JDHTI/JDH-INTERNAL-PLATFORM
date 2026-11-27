import { Info } from "lucide-react";

import { toNumber } from "@/shared/lib/format";
import { formatCop } from "@/features/supports/lib/format";

import { formatOrderDate } from "../lib/format";
import type { OrderLine } from "../types/order-validator.types";

/** The tooltip of a line's average cost: whose warehouse, which day, and the file's own cost. */
export function inventoryCostTitle(line: OrderLine): string | undefined {
  if (toNumber(line.inventory_cost ?? null) === null) return undefined;
  const where = `Costo promedio de la bodega ${line.warehouse ?? "de la línea"}${line.inventory_date ? ` al ${formatOrderDate(line.inventory_date)}` : ""}.`;
  const file = toNumber(line.file_cost ?? null) !== null ? ` Costo del archivo: ${formatCop(line.file_cost ?? null)}.` : "";
  const differs = line.cost_differs ? " Se aleja más de 1 % del costo promedio: solo informa, no retiene el pedido." : "";
  return `${where}${file}${differs}`;
}

/**
 * The SKU's average cost in the line's warehouse, from SIESA's inventory the day the file was
 * validated (API #147); «—» without it. When the file's cost strays more than 1 % from it, an
 * informative mark: it never holds the order.
 */
export function InventoryCost({ line }: { line: OrderLine }) {
  const cost = toNumber(line.inventory_cost ?? null);
  if (cost === null) return <span className="text-text-secondary">—</span>;
  return (
    <span className="inline-flex items-center justify-end gap-1" title={inventoryCostTitle(line)}>
      {formatCop(line.inventory_cost ?? null)}
      {line.cost_differs && (
        <>
          <Info className="size-3.5 shrink-0 text-info" aria-hidden="true" />
          <span className="sr-only">: el costo del archivo, {formatCop(line.file_cost ?? null)}, se aleja más de 1 % del costo promedio</span>
        </>
      )}
    </span>
  );
}
