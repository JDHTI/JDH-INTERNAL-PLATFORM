import { toNumber, type Decimal } from "@/shared/lib/format";
import { cn } from "@/shared/lib/utils";

import { bandLook, bandOf, formatCompactCop, formatNumber, formatPct } from "../lib/format";
import type { Bands, Kpis } from "../types/service-level.types";

const count = new Intl.NumberFormat("es-CO");

/**
 * The board's five service levels. Each card says its level, what is pending
 * out of what was asked, and its band: a bar as long as the level, in the
 * band's color, with the band in words beside it.
 */
export default function KpiCards({ kpis, bands, compact = false }: { kpis: Kpis | undefined; bands: Bands | undefined; compact?: boolean }) {
  const cards: { label: string; level: Decimal | null; detail: string }[] = kpis
    ? [
        { label: "Pedidos", level: kpis.ns_orders, detail: `${count.format(kpis.orders_pending)} de ${count.format(kpis.orders)} con pendiente` },
        { label: "Líneas", level: kpis.ns_lines, detail: `${count.format(kpis.lines_pending)} de ${count.format(kpis.lines)} con pendiente` },
        { label: "Cantidad", level: kpis.ns_qty, detail: `${formatNumber(kpis.qty_pending)} de ${formatNumber(kpis.qty)} sin despachar` },
        { label: "Valor", level: kpis.ns_value, detail: `${formatCompactCop(kpis.value_pending)} de ${formatCompactCop(kpis.value)} sin despachar` },
        { label: "NS Total", level: kpis.ns_total, detail: "(Valor + Cantidad + Líneas) × 30 % + Pedidos × 10 %" },
      ]
    : [];

  if (!kpis) {
    return <div className={cn("animate-pulse rounded-lg bg-canvas-subtle", compact ? "h-20" : "h-28")} aria-busy="true" aria-label="Cargando los indicadores" />;
  }
  return (
    <dl className={cn("grid gap-2 sm:grid-cols-2 lg:grid-cols-5")}>
      {cards.map((card) => (
        <KpiCard key={card.label} {...card} bands={bands} compact={compact} />
      ))}
    </dl>
  );
}

function KpiCard({ label, level, detail, bands, compact }: { label: string; level: Decimal | null; detail: string; bands: Bands | undefined; compact: boolean }) {
  const band = bandOf(level, bands);
  const look = band && bands ? bandLook(band, bands) : null;
  const width = Math.max(0, Math.min(1, toNumber(level) ?? 0)) * 100;
  return (
    <div className="min-w-0 rounded-lg border border-border bg-surface p-3">
      <dt className="text-xs font-medium text-text-secondary">{label === "NS Total" ? label : `NS ${label}`}</dt>
      <dd className="mt-1 space-y-1.5">
        <span className={cn("block font-semibold tabular-nums", compact ? "text-lg" : "text-2xl")}>{formatPct(level)}</span>
        <span className="block h-1.5 overflow-hidden rounded-full bg-canvas-subtle" aria-hidden="true">
          {look && <span className="block h-full rounded-full" style={{ width: `${width}%`, background: look.color }} />}
        </span>
        {look && <span className="block text-xs font-medium">{look.label}</span>}
        <span className="block text-xs text-text-secondary">{detail}</span>
      </dd>
    </div>
  );
}
