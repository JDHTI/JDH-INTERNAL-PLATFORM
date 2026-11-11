"use client";

import { useState } from "react";

import { formatCop } from "@/features/supports/lib/format";

export interface CostPoint {
  /** "YYYY-MM-DD". */
  date: string;
  cost: number;
}

const WIDTH = 640;
const HEIGHT = 200;
const PAD = { top: 12, right: 16, bottom: 28, left: 72 };
const dayFormat = new Intl.DateTimeFormat("es-CO", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
const yearFormat = new Intl.DateTimeFormat("es-CO", { year: "numeric", timeZone: "UTC" });
const time = (value: string) => Date.parse(`${value}T00:00:00Z`);

/**
 * How one reference's cost moved: a step line (the cost holds until the next
 * change), one series, so no legend; the dialog's title names it. Each change
 * is a marker with a larger hit target: hover or keyboard focus shows its date
 * and cost. The table under the chart is its table view.
 */
export default function CostStepChart({ points, label }: { points: CostPoint[]; label: string }) {
  const [active, setActive] = useState<number | null>(null);
  if (points.length === 0) return null;
  const xs = points.map((point) => time(point.date));
  const costs = points.map((point) => point.cost);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs, minX + 86_400_000);
  const low = Math.min(...costs);
  const high = Math.max(...costs);
  const span = high - low || high * 0.1 || 1;
  const minY = Math.max(0, low - span * 0.15);
  const maxY = high + span * 0.15;
  const x = (value: number) => PAD.left + ((value - minX) / (maxX - minX)) * (WIDTH - PAD.left - PAD.right);
  const y = (value: number) => PAD.top + (1 - (value - minY) / (maxY - minY)) * (HEIGHT - PAD.top - PAD.bottom);
  const path = points
    .map((point, index) => {
      const px = x(xs[index]);
      const py = y(point.cost);
      if (index === 0) return `M ${px} ${py}`;
      return `H ${px} V ${py}`;
    })
    .join(" ");
  const ticks = [minY + (maxY - minY) * 0.1, (minY + maxY) / 2, maxY - (maxY - minY) * 0.1];
  const years: number[] = [];
  for (let year = new Date(minX).getUTCFullYear() + 1; year <= new Date(maxX).getUTCFullYear(); year += 1) years.push(year);
  const shown = active === null ? null : points[active];

  return (
    <figure className="relative">
      <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="h-auto w-full text-text-secondary" role="img" aria-label={label}>
        {ticks.map((tick) => (
          <g key={tick}>
            <line x1={PAD.left} x2={WIDTH - PAD.right} y1={y(tick)} y2={y(tick)} stroke="var(--border)" strokeWidth={1} />
            <text x={PAD.left - 8} y={y(tick)} textAnchor="end" dominantBaseline="middle" fontSize={11} fill="currentColor">
              {formatCop(String(Math.round(tick)))}
            </text>
          </g>
        ))}
        {years.map((year) => {
          const at = x(Date.UTC(year, 0, 1));
          return (
            <text key={year} x={at} y={HEIGHT - 8} textAnchor="middle" fontSize={11} fill="currentColor">
              {yearFormat.format(Date.UTC(year, 0, 1))}
            </text>
          );
        })}
        <path d={path} fill="none" stroke="var(--text-primary)" strokeWidth={2} strokeLinejoin="round" />
        {points.map((point, index) => (
          <g key={`${point.date}-${index}`}>
            <circle cx={x(xs[index])} cy={y(point.cost)} r={4} fill="var(--text-primary)" stroke="var(--surface-raised)" strokeWidth={2} />
            <circle
              cx={x(xs[index])}
              cy={y(point.cost)}
              r={12}
              fill="transparent"
              tabIndex={0}
              role="button"
              aria-label={`${dayFormat.format(time(point.date))}: ${formatCop(String(point.cost))}`}
              className="cursor-pointer outline-none focus-visible:stroke-[var(--ring)] focus-visible:[stroke-width:2]"
              onMouseEnter={() => setActive(index)}
              onMouseLeave={() => setActive(null)}
              onFocus={() => setActive(index)}
              onBlur={() => setActive(null)}
            />
          </g>
        ))}
      </svg>
      {shown && active !== null && (
        <div
          role="status"
          className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full rounded-md border border-border bg-surface-raised px-2 py-1 text-xs shadow-modal"
          style={{ left: `${(x(xs[active]) / WIDTH) * 100}%`, top: `${(y(shown.cost) / HEIGHT) * 100}%`, marginTop: -8 }}
        >
          <span className="block text-text-secondary">{dayFormat.format(time(shown.date))}</span>
          <span className="block font-semibold tabular-nums">{formatCop(String(shown.cost))}</span>
        </div>
      )}
    </figure>
  );
}
