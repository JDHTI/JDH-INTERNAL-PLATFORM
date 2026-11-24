"use client";

import { useState } from "react";

import { formatCop } from "@/features/supports/lib/format";

import { formatChange } from "./increase-format";

export interface CostPoint {
  /** "YYYY-MM-DD", the day the increase took effect. */
  date: string;
  /** The cost the increase left. */
  cost: number;
  /** The increase's change, as a fraction; null when the row does not say. */
  change: number | null;
}

const WIDTH = 640;
const HEIGHT = 240;
const PAD = { top: 16, right: 20, bottom: 52, left: 96 };
const DAY = 86_400_000;
const dayFormat = new Intl.DateTimeFormat("es-CO", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "UTC" });
const monthFormat = new Intl.DateTimeFormat("es-CO", { month: "short", year: "numeric", timeZone: "UTC" });
const time = (value: string) => Date.parse(`${value}T00:00:00Z`);

/** A round step for about `count` ticks between low and high: 1, 2, 2.5 or 5 times a power of ten. */
function niceStep(low: number, high: number, count: number): number {
  const raw = (high - low) / count || 1;
  const power = 10 ** Math.floor(Math.log10(raw));
  const unit = [1, 2, 2.5, 5, 10].find((candidate) => candidate * power >= raw) ?? 10;
  return unit * power;
}

/**
 * The monotone cubic through the points (Fritsch–Carlson): the curve shows the
 * trend without overshooting, so it never draws a cost above or below the ones
 * the increases left.
 */
function monotonePath(points: [number, number][]): string {
  const n = points.length;
  if (n === 0) return "";
  if (n === 1) return `M ${points[0][0]} ${points[0][1]}`;
  const slopes: number[] = [];
  for (let i = 0; i < n - 1; i += 1) {
    slopes.push((points[i + 1][1] - points[i][1]) / (points[i + 1][0] - points[i][0]));
  }
  const tangents = points.map((_, i) => {
    if (i === 0) return slopes[0];
    if (i === n - 1) return slopes[n - 2];
    const before = slopes[i - 1];
    const after = slopes[i];
    return before * after <= 0 ? 0 : (before + after) / 2;
  });
  // Keep each segment monotone: a tangent too steep for its segment is scaled back.
  for (let i = 0; i < n - 1; i += 1) {
    if (slopes[i] === 0) {
      tangents[i] = 0;
      tangents[i + 1] = 0;
      continue;
    }
    const a = tangents[i] / slopes[i];
    const b = tangents[i + 1] / slopes[i];
    const length = Math.hypot(a, b);
    if (length > 3) {
      tangents[i] = (3 / length) * a * slopes[i];
      tangents[i + 1] = (3 / length) * b * slopes[i];
    }
  }
  let path = `M ${points[0][0]} ${points[0][1]}`;
  for (let i = 0; i < n - 1; i += 1) {
    const [x0, y0] = points[i];
    const [x1, y1] = points[i + 1];
    const third = (x1 - x0) / 3;
    path += ` C ${x0 + third} ${y0 + third * tangents[i]} ${x1 - third} ${y1 - third * tangents[i + 1]} ${x1} ${y1}`;
  }
  return path;
}

/**
 * How one reference's cost moved: a thin smoothed line for the trend and a
 * small point on each increase. One series, so no legend; the dialog's title
 * names it. Hover or keyboard focus on a point shows its date, cost and
 * change. The table under the chart is its table view.
 */
export default function CostTrendChart({ points, label }: { points: CostPoint[]; label: string }) {
  const [active, setActive] = useState<number | null>(null);
  if (points.length === 0) return null;

  const xs = points.map((point) => time(point.date));
  const costs = points.map((point) => point.cost);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs, minX + DAY);
  const low = Math.min(...costs);
  const high = Math.max(...costs);
  const pad = (high - low || high * 0.1 || 1) * 0.15;
  const step = niceStep(Math.max(0, low - pad), high + pad, 4);
  const minY = Math.floor(Math.max(0, low - pad) / step) * step;
  const maxY = Math.ceil((high + pad) / step) * step;
  const ticks: number[] = [];
  for (let tick = minY; tick <= maxY + step / 2; tick += step) ticks.push(tick);

  const plotRight = WIDTH - PAD.right;
  const plotBottom = HEIGHT - PAD.bottom;
  const x = (value: number) => PAD.left + ((value - minX) / (maxX - minX)) * (plotRight - PAD.left);
  const y = (value: number) => PAD.top + (1 - (value - minY) / (maxY - minY)) * (plotBottom - PAD.top);

  // Dates on the x axis: days for a short history, abbreviated months for a long one.
  const long = maxX - minX > 120 * DAY;
  const dateTicks = Array.from({ length: 5 }, (_, index) => minX + ((maxX - minX) * index) / 4);
  const dateLabel = (value: number) => (long ? monthFormat.format(value).replace(".", "").replace(" de ", " ") : dayFormat.format(value));

  const path = monotonePath(points.map((point, index) => [x(xs[index]), y(point.cost)]));
  const shown = active === null ? null : points[active];

  return (
    <figure className="relative">
      <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="h-auto w-full text-text-secondary" role="img" aria-label={label}>
        {ticks.map((tick) => (
          <g key={tick}>
            <line x1={PAD.left} x2={plotRight} y1={y(tick)} y2={y(tick)} stroke="var(--border)" strokeWidth={1} />
            <text x={PAD.left - 8} y={y(tick)} textAnchor="end" dominantBaseline="middle" fontSize={11} fill="currentColor" className="tabular-nums">
              {formatCop(String(Math.round(tick)))}
            </text>
          </g>
        ))}
        {dateTicks.map((tick, index) => (
          <text
            key={tick}
            x={x(tick)}
            y={plotBottom + 18}
            textAnchor={index === 0 ? "start" : index === dateTicks.length - 1 ? "end" : "middle"}
            fontSize={11}
            fill="currentColor"
            className="tabular-nums"
          >
            {dateLabel(tick)}
          </text>
        ))}
        <text x={(PAD.left + plotRight) / 2} y={HEIGHT - 6} textAnchor="middle" fontSize={11} fontWeight={600} fill="currentColor">
          Fecha del incremento
        </text>
        <text
          transform={`translate(14 ${(PAD.top + plotBottom) / 2}) rotate(-90)`}
          textAnchor="middle"
          fontSize={11}
          fontWeight={600}
          fill="currentColor"
        >
          Costo (COP)
        </text>

        <path d={path} fill="none" stroke="var(--text-primary)" strokeWidth={1.5} strokeLinejoin="round" strokeLinecap="round" />
        {points.map((point, index) => (
          <g key={`${point.date}-${index}`}>
            <circle cx={x(xs[index])} cy={y(point.cost)} r={active === index ? 4 : 2.5} fill="var(--text-primary)" />
            <circle
              cx={x(xs[index])}
              cy={y(point.cost)}
              r={12}
              fill="transparent"
              tabIndex={0}
              role="button"
              aria-label={`${dayFormat.format(xs[index])}: ${formatCop(String(point.cost))}, variación ${formatChange(point.change === null ? null : String(point.change))}`}
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
          style={{ left: `${(x(xs[active]) / WIDTH) * 100}%`, top: `${(y(shown.cost) / HEIGHT) * 100}%`, marginTop: -10 }}
        >
          <span className="block text-text-secondary tabular-nums">{dayFormat.format(xs[active])}</span>
          <span className="block font-semibold tabular-nums">{formatCop(String(shown.cost))}</span>
          <span className="block tabular-nums">Variación {formatChange(shown.change === null ? null : String(shown.change))}</span>
        </div>
      )}
    </figure>
  );
}
