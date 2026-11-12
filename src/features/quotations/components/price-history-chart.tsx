"use client";

import { useState } from "react";

import { toNumber } from "@/shared/lib/format";

import { formatMoney } from "../lib/format";
import type { MonthlySale, PriceVersion } from "../types/quotations.types";

const WIDTH = 640;
const HEIGHT = 220;
const PAD = { top: 12, right: 16, bottom: 28, left: 76 };
const DAY = 86_400_000;
const dayFormat = new Intl.DateTimeFormat("es-CO", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
const monthFormat = new Intl.DateTimeFormat("es-CO", { month: "short", year: "numeric", timeZone: "UTC" });
const tickFormat = new Intl.DateTimeFormat("es-CO", { month: "short", timeZone: "UTC" });
const time = (value: string) => Date.parse(`${value.slice(0, 10)}T00:00:00Z`);

interface Mark {
  key: string;
  series: "lista" | "venta";
  at: number;
  value: number;
  label: string;
}

/**
 * How an item's price moved: the list price as a step line (it holds until the
 * next version) and the monthly sale price to the list's customers as a dashed
 * line with square markers. Two series in pesos on one axis, told apart by
 * line, marker and legend, never by color alone. Every point is a focusable
 * target with a tooltip; the table below the chart is its table view.
 */
export default function PriceHistoryChart({
  history,
  sales,
  label,
}: {
  history: PriceVersion[];
  sales: MonthlySale[];
  label: string;
}) {
  const [active, setActive] = useState<string | null>(null);
  // The version in force runs to the moment the detail opened.
  const [today] = useState(() => Date.now());
  const steps = history
    .map((version) => ({ from: time(version.valid_from), to: version.valid_to ? time(version.valid_to) : today, value: toNumber(version.price) }))
    .filter((step): step is { from: number; to: number; value: number } => step.value !== null);
  const months = sales
    .map((sale) => ({ at: time(sale.month) + 14 * DAY, month: time(sale.month), value: toNumber(sale.price) }))
    .filter((sale): sale is { at: number; month: number; value: number } => sale.value !== null);
  if (steps.length === 0 && months.length === 0) return null;

  const xsAll = [...steps.flatMap((step) => [step.from, step.to]), ...months.map((sale) => sale.at)];
  const minX = Math.min(...xsAll);
  const maxX = Math.max(...xsAll, minX + DAY);
  const values = [...steps.map((step) => step.value), ...months.map((sale) => sale.value)];
  const low = Math.min(...values);
  const high = Math.max(...values);
  const span = high - low || high * 0.1 || 1;
  const minY = Math.max(0, low - span * 0.2);
  const maxY = high + span * 0.2;
  const x = (value: number) => PAD.left + ((value - minX) / (maxX - minX)) * (WIDTH - PAD.left - PAD.right);
  const y = (value: number) => PAD.top + (1 - (value - minY) / (maxY - minY)) * (HEIGHT - PAD.top - PAD.bottom);

  const listPath = steps
    .map((step, index) => `${index === 0 ? "M" : "L"} ${x(step.from)} ${y(step.value)} H ${x(step.to)}`)
    .join(" ");
  const salePath = months.map((sale, index) => `${index === 0 ? "M" : "L"} ${x(sale.at)} ${y(sale.value)}`).join(" ");
  const marks: Mark[] = [
    ...steps.map((step, index) => ({
      key: `lista-${index}`,
      series: "lista" as const,
      at: step.from,
      value: step.value,
      label: `Precio de lista desde el ${dayFormat.format(step.from)}: ${formatMoney(String(step.value))}`,
    })),
    ...months.map((sale, index) => ({
      key: `venta-${index}`,
      series: "venta" as const,
      at: sale.at,
      value: sale.value,
      label: `Precio de venta de ${monthFormat.format(sale.month)}: ${formatMoney(String(Math.round(sale.value)))}`,
    })),
  ];
  const ticks = [minY + (maxY - minY) * 0.1, (minY + maxY) / 2, maxY - (maxY - minY) * 0.1];
  const monthTicks: number[] = [];
  const start = new Date(minX);
  for (let cursor = Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + 1, 1); cursor <= maxX; ) {
    monthTicks.push(cursor);
    const next = new Date(cursor);
    cursor = Date.UTC(next.getUTCFullYear(), next.getUTCMonth() + 2, 1);
  }
  const shown = marks.find((mark) => mark.key === active) ?? null;

  return (
    <figure className="space-y-2">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[13px] text-text-secondary" aria-hidden="true">
        {steps.length > 0 && (
          <span className="inline-flex items-center gap-1.5">
            <svg width="22" height="10" className="shrink-0">
              <path d="M 1 5 H 21" stroke="var(--text-primary)" strokeWidth={2} />
              <circle cx="11" cy="5" r="3.5" fill="var(--text-primary)" />
            </svg>
            Precio de lista
          </span>
        )}
        {months.length > 0 && (
          <span className="inline-flex items-center gap-1.5">
            <svg width="22" height="10" className="shrink-0">
              <path d="M 1 5 H 21" stroke="var(--info)" strokeWidth={2} strokeDasharray="4 3" />
              <rect x="7.5" y="1.5" width="7" height="7" fill="var(--info)" />
            </svg>
            Precio de venta por mes
          </span>
        )}
      </div>
      <div className="relative">
        <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="h-auto w-full text-text-secondary" role="img" aria-label={label}>
          {ticks.map((tick) => (
            <g key={tick}>
              <line x1={PAD.left} x2={WIDTH - PAD.right} y1={y(tick)} y2={y(tick)} stroke="var(--border)" strokeWidth={1} />
              <text x={PAD.left - 8} y={y(tick)} textAnchor="end" dominantBaseline="middle" fontSize={11} fill="currentColor">
                {formatMoney(String(Math.round(tick)))}
              </text>
            </g>
          ))}
          {monthTicks.map((tick) => (
            <text key={tick} x={x(tick)} y={HEIGHT - 8} textAnchor="middle" fontSize={11} fill="currentColor">
              {tickFormat.format(tick)}
            </text>
          ))}
          {shown && <line x1={x(shown.at)} x2={x(shown.at)} y1={PAD.top} y2={HEIGHT - PAD.bottom} stroke="var(--border-control)" strokeWidth={1} />}
          {listPath && <path d={listPath} fill="none" stroke="var(--text-primary)" strokeWidth={2} strokeLinejoin="round" />}
          {salePath && <path d={salePath} fill="none" stroke="var(--info)" strokeWidth={2} strokeDasharray="5 4" strokeLinejoin="round" />}
          {marks.map((mark) => (
            <g key={mark.key}>
              {mark.series === "lista" ? (
                <circle cx={x(mark.at)} cy={y(mark.value)} r={4} fill="var(--text-primary)" stroke="var(--surface-raised)" strokeWidth={2} />
              ) : (
                <rect x={x(mark.at) - 4} y={y(mark.value) - 4} width={8} height={8} fill="var(--info)" stroke="var(--surface-raised)" strokeWidth={2} />
              )}
              <circle
                cx={x(mark.at)}
                cy={y(mark.value)}
                r={12}
                fill="transparent"
                tabIndex={0}
                role="button"
                aria-label={mark.label}
                className="cursor-pointer outline-none focus-visible:stroke-[var(--ring)] focus-visible:[stroke-width:2]"
                onMouseEnter={() => setActive(mark.key)}
                onMouseLeave={() => setActive(null)}
                onFocus={() => setActive(mark.key)}
                onBlur={() => setActive(null)}
              />
            </g>
          ))}
        </svg>
        {shown && (
          <div
            role="status"
            className="pointer-events-none absolute z-10 max-w-60 -translate-x-1/2 -translate-y-full rounded-md border border-border bg-surface-raised px-2 py-1 text-xs shadow-modal"
            style={{ left: `${(x(shown.at) / WIDTH) * 100}%`, top: `${(y(shown.value) / HEIGHT) * 100}%`, marginTop: -10 }}
          >
            {shown.label}
          </div>
        )}
      </div>
    </figure>
  );
}
