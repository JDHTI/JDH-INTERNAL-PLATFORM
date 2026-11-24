"use client";

import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { Dialog } from "@/shared/components/ui/dialog";
import { errorMessage } from "@/shared/lib/api-client";
import { toNumber } from "@/shared/lib/format";
import { formatCop } from "@/features/supports/lib/format";

import { useReferenceIncreases } from "../hooks/use-commercial-masters";
import type { PriceIncrease, ReferenceAnalysis } from "../types/price-increases.types";
import CostTrendChart, { type CostPoint } from "./cost-trend-chart";
import { INCREASE_STATUS, formatChange, formatIncreaseDay, rowChange } from "./increase-format";

/** The cost a row leaves, on the analysis' basis: without the healthy-food tax when known. */
const usable = (value: number | null) => (value !== null && value > 1 ? value : null);
const costAfter = (row: PriceIncrease) => usable(toNumber(row.new_cost)) ?? usable(toNumber(row.new_cost_with_tax));
const costBefore = (row: PriceIncrease) => usable(toNumber(row.old_cost)) ?? usable(toNumber(row.old_cost_with_tax));
const money = (value: number | null) => (value === null ? "—" : formatCop(String(value)));

/**
 * One reference's whole history: how its cost moved (a trend line) and every
 * change under it, the chart's table view. The figures of the period come from
 * the analysis row that opened it.
 */
export default function ReferenceIncreasesDialog({ item, onClose }: { item: ReferenceAnalysis | null; onClose: () => void }) {
  return (
    <Dialog
      open={item !== null}
      onOpenChange={(open) => !open && onClose()}
      wide
      title={item ? `${item.sku} · ${item.description ?? "Sin descripción"}` : ""}
      description={item?.supplier_name ?? undefined}
    >
      {item && <History item={item} onClose={onClose} />}
    </Dialog>
  );
}

function History({ item, onClose }: { item: ReferenceAnalysis; onClose: () => void }) {
  const query = useReferenceIncreases(item.sku);
  const rows = [...(query.data?.items ?? [])]
    .filter((row) => row.increased_on)
    .sort((a, b) => (a.increased_on! < b.increased_on! ? -1 : a.increased_on! > b.increased_on! ? 1 : 0));
  // One point per increase, at the cost it left; two on the same day keep the later one.
  const points: CostPoint[] = [];
  for (const row of rows) {
    const cost = costAfter(row);
    if (cost === null) continue;
    const point = { date: row.increased_on!, cost, change: rowChange(row) };
    if (points.at(-1)?.date === point.date) points[points.length - 1] = point;
    else points.push(point);
  }

  return (
    <div className="space-y-4">
      <dl className="flex flex-wrap gap-x-6 gap-y-1 text-sm">
        <Fact label="Cambio en el periodo">{formatChange(item.accumulated_pct)}</Fact>
        <Fact label="Alzas en el periodo">{item.increases}</Fact>
        <Fact label="Cada cuánto">{item.frequency_days === null ? "—" : `${item.frequency_days} días`}</Fact>
      </dl>

      {query.isPending ? (
        <div className="h-48 animate-pulse rounded-lg bg-canvas-subtle" aria-busy="true" aria-label="Cargando el histórico de la referencia" />
      ) : query.isError ? (
        <p role="alert" className="text-sm text-danger">
          {errorMessage(query.error)}{" "}
          <Button variant="ghost" size="sm" onClick={() => query.refetch()}>
            Reintentar
          </Button>
        </p>
      ) : (
        <>
          {points.length > 1 && <CostTrendChart points={points} label={`Costo de ${item.sku} en cada incremento`} />}
          <div className="max-h-64 overflow-auto rounded-lg border border-border">
            <table className="w-full text-left text-[13px]">
              <caption className="sr-only">Alzas de {item.sku}</caption>
              <thead className="sticky top-0 bg-canvas-subtle text-[11px] font-semibold uppercase tracking-[0.06em] text-text-secondary">
                <tr>
                  <th scope="col" className="px-3 py-1.5">Incremento</th>
                  <th scope="col" className="px-3 py-1.5 text-right">Costo anterior</th>
                  <th scope="col" className="px-3 py-1.5 text-right">Costo nuevo</th>
                  <th scope="col" className="px-3 py-1.5 text-right">Variación</th>
                  <th scope="col" className="px-3 py-1.5">Estado</th>
                  <th scope="col" className="px-3 py-1.5">En SIESA</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {[...rows].reverse().map((row) => {
                  const look = row.status ? INCREASE_STATUS[row.status] : null;
                  return (
                    <tr key={row.id}>
                      <td className="whitespace-nowrap px-3 py-1 tabular-nums">{formatIncreaseDay(row.increased_on)}</td>
                      <td className="whitespace-nowrap px-3 py-1 text-right tabular-nums">{money(costBefore(row))}</td>
                      <td className="whitespace-nowrap px-3 py-1 text-right font-semibold tabular-nums">{money(costAfter(row))}</td>
                      <td className="whitespace-nowrap px-3 py-1 text-right tabular-nums">{formatChange(rowChange(row))}</td>
                      <td className="px-3 py-1">{look ? <Badge tone={look.tone}>{look.label}</Badge> : "—"}</td>
                      <td className="whitespace-nowrap px-3 py-1 tabular-nums">
                        {row.system_updated_on ? formatIncreaseDay(row.system_updated_on) : <Badge tone="info">Pendiente</Badge>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
      <div className="flex justify-end">
        <Button variant="outline" onClick={onClose}>
          Cerrar
        </Button>
      </div>
    </div>
  );
}

function Fact({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs text-text-secondary">{label}</dt>
      <dd className="font-semibold tabular-nums">{children}</dd>
    </div>
  );
}
