import { ChevronLeft, ChevronRight } from "lucide-react";

import { Button } from "@/shared/components/ui/button";

const numberFormat = new Intl.NumberFormat("es-CO");

/**
 * Previous/next for server-paged lists, with the range on screen. `page` is
 * 1-based, as the API counts it.
 */
export default function Pager({
  page,
  size,
  total,
  count,
  onPageChange,
}: {
  page: number;
  size: number;
  total: number;
  /** Rows on the current page. */
  count: number;
  onPageChange: (page: number) => void;
}) {
  const first = (page - 1) * size + 1;
  const last = (page - 1) * size + count;
  return (
    <div className="flex items-center justify-end gap-3 text-xs text-text-secondary">
      <span className="tabular-nums" aria-live="polite">
        {count === 0 ? "0" : `${numberFormat.format(first)}–${numberFormat.format(last)}`} de{" "}
        {numberFormat.format(total)}
      </span>
      <span className="flex gap-1">
        <Button
          variant="outline"
          size="icon-sm"
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          aria-label="Página anterior"
        >
          <ChevronLeft aria-hidden="true" />
        </Button>
        <Button
          variant="outline"
          size="icon-sm"
          onClick={() => onPageChange(page + 1)}
          disabled={last >= total}
          aria-label="Página siguiente"
        >
          <ChevronRight aria-hidden="true" />
        </Button>
      </span>
    </div>
  );
}
