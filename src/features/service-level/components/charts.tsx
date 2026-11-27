"use client";

import { useState } from "react";

import { toNumber } from "@/shared/lib/format";

import { bandLook, bandOf, formatCop, formatPct, formatShortDay, formatDay } from "../lib/format";
import type { Bands, Dashboard, Group, Pareto } from "../types/service-level.types";

const count = new Intl.NumberFormat("es-CO");

/** The low end of a service-level axis: a round 5 % under the lowest level and the amber band, never under 0. */
function levelFloor(levels: number[], bands: Bands): number {
  const lowest = Math.min(Number(bands.amber_from), ...levels);
  return Math.max(0, Math.floor((lowest - 0.02) * 20) / 20);
}

/**
 * NS Valor of each C.O. as a dot on a shared scale from the floor to 100 %:
 * the levels sit within a few points, which a bar from zero would flatten.
 * The two band lines mark where amber and green start; each dot wears its
 * band's color and the level is written beside it.
 */
export function CoLevels({ byCo, bands }: { byCo: Dashboard["by_co"]; bands: Bands }) {
  const rows = byCo
    .map((item) => ({ name: item.name ?? item.co ?? "Sin C.O.", level: toNumber(item.kpis.ns_value), kpis: item.kpis }))
    .filter((row): row is typeof row & { level: number } => row.level !== null)
    .sort((a, b) => b.level - a.level);
  if (rows.length === 0) return <p className="text-sm text-text-secondary">Sin pedidos en el periodo.</p>;
  const floor = levelFloor(
    rows.map((row) => row.level),
    bands
  );
  const at = (level: number) => `${((level - floor) / (1 - floor)) * 100}%`;
  const marks = [Number(bands.amber_from), Number(bands.green_above)];

  return (
    <div className="space-y-1">
      <div className="grid grid-cols-[minmax(6rem,10rem)_1fr_3.5rem] gap-2 text-[11px] text-text-secondary">
        <span />
        <span className="relative h-4">
          <span className="absolute left-0">{formatPct(floor)}</span>
          {marks.map((mark) => (
            <span key={mark} className="absolute -translate-x-1/2" style={{ left: at(mark) }}>
              {formatPct(mark)}
            </span>
          ))}
          <span className="absolute right-0">100 %</span>
        </span>
        <span />
      </div>
      <ul className="space-y-0.5" aria-label="NS Valor por centro de operación">
        {rows.map((row) => {
          const band = bandOf(row.level, bands);
          const look = band ? bandLook(band, bands) : null;
          return (
            <li
              key={row.name}
              className="grid grid-cols-[minmax(6rem,10rem)_1fr_3.5rem] items-center gap-2 rounded-sm py-1 text-sm hover:bg-canvas-subtle"
              title={`${row.name}: NS Valor ${formatPct(row.level)} · ${formatCop(row.kpis.value_pending)} pendientes de ${formatCop(row.kpis.value)}${look ? ` · ${look.label}` : ""}`}
            >
              <span className="truncate">{row.name}</span>
              <span className="relative h-4" aria-hidden="true">
                <span className="absolute inset-x-0 top-1/2 h-px bg-border" />
                {marks.map((mark) => (
                  <span key={mark} className="absolute inset-y-0 w-px border-l border-dashed border-text-secondary" style={{ left: at(mark) }} />
                ))}
                <span
                  className="absolute top-1/2 size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full ring-2 ring-surface"
                  style={{ left: at(row.level), background: look?.color ?? "var(--text-primary)" }}
                />
              </span>
              <span className="text-right font-medium tabular-nums">
                {formatPct(row.level)}
                <span className="sr-only">{look ? `, ${look.label}` : ""}</span>
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

const WIDTH = 640;
const HEIGHT = 220;
const PAD = { top: 12, right: 16, bottom: 40, left: 52 };

/**
 * NS Total day by day: one thin line on a scale from the floor to 100 %, the
 * band lines dashed behind it. Hovering a day shows its four levels.
 */
export function DailyLevels({ daily, bands }: { daily: Dashboard["daily"]; bands: Bands }) {
  const [active, setActive] = useState<number | null>(null);
  const days = daily
    .map((item) => ({ day: item.day, level: toNumber(item.kpis.ns_total), kpis: item.kpis }))
    .filter((item): item is typeof item & { level: number } => item.level !== null);
  if (days.length === 0) return <p className="text-sm text-text-secondary">Sin pedidos en el periodo.</p>;

  const floor = levelFloor(
    days.map((item) => item.level),
    bands
  );
  const plotRight = WIDTH - PAD.right;
  const plotBottom = HEIGHT - PAD.bottom;
  const step = days.length > 1 ? (plotRight - PAD.left) / (days.length - 1) : 0;
  const x = (index: number) => (days.length > 1 ? PAD.left + index * step : (PAD.left + plotRight) / 2);
  const y = (level: number) => PAD.top + (1 - (level - floor) / (1 - floor)) * (plotBottom - PAD.top);
  // Round steps from the floor (itself a multiple of 5 %): 2,5 % for a narrow axis, 5 % or 10 % for a wider one.
  const tickStep = 1 - floor <= 0.1 ? 0.025 : 1 - floor <= 0.25 ? 0.05 : 0.1;
  const ticks: number[] = [];
  for (let tick = floor; tick <= 1.0001; tick += tickStep) ticks.push(Math.round(tick * 1000) / 1000);
  const labelEvery = Math.max(1, Math.ceil(days.length / 7));
  const path = days.map((item, index) => `${index === 0 ? "M" : "L"} ${x(index)} ${y(item.level)}`).join(" ");
  const shown = active === null ? null : days[active];

  return (
    <figure className="relative">
      <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="h-auto w-full text-text-secondary" role="img" aria-label="NS Total día a día">
        {ticks.map((tick) => (
          <g key={tick}>
            <line x1={PAD.left} x2={plotRight} y1={y(tick)} y2={y(tick)} stroke="var(--border)" strokeWidth={1} />
            <text x={PAD.left - 8} y={y(tick)} textAnchor="end" dominantBaseline="middle" fontSize={11} fill="currentColor" className="tabular-nums">
              {formatPct(tick)}
            </text>
          </g>
        ))}
        {[Number(bands.amber_from), Number(bands.green_above)].map((mark) => (
          <line key={mark} x1={PAD.left} x2={plotRight} y1={y(mark)} y2={y(mark)} stroke="currentColor" strokeWidth={1} strokeDasharray="4 4" />
        ))}
        {days.map((item, index) =>
          index % labelEvery === 0 || index === days.length - 1 ? (
            <text key={item.day} x={x(index)} y={plotBottom + 16} textAnchor="middle" fontSize={11} fill="currentColor" className="tabular-nums">
              {formatShortDay(item.day)}
            </text>
          ) : null
        )}
        <text x={(PAD.left + plotRight) / 2} y={HEIGHT - 4} textAnchor="middle" fontSize={11} fontWeight={600} fill="currentColor">
          Fecha del pedido
        </text>
        {active !== null && <line x1={x(active)} x2={x(active)} y1={PAD.top} y2={plotBottom} stroke="currentColor" strokeWidth={1} />}
        <path d={path} fill="none" stroke="var(--text-primary)" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
        {days.map((item, index) => {
          const band = bandOf(item.level, bands);
          return (
            <g key={item.day}>
              <circle cx={x(index)} cy={y(item.level)} r={active === index ? 4.5 : 3} fill={band ? bandLook(band, bands).color : "var(--text-primary)"} stroke="var(--surface)" strokeWidth={2} />
              <rect
                x={x(index) - Math.max(step, 16) / 2}
                y={PAD.top}
                width={Math.max(step, 16)}
                height={plotBottom - PAD.top}
                fill="transparent"
                tabIndex={0}
                role="button"
                aria-label={`${formatDay(item.day)}: NS Total ${formatPct(item.level)}`}
                className="outline-none focus-visible:stroke-[var(--ring)] focus-visible:[stroke-width:2]"
                onMouseEnter={() => setActive(index)}
                onMouseLeave={() => setActive(null)}
                onFocus={() => setActive(index)}
                onBlur={() => setActive(null)}
              />
            </g>
          );
        })}
      </svg>
      {shown && active !== null && (
        <div
          role="status"
          className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full rounded-md border border-border bg-surface-raised px-2 py-1 text-xs shadow-modal"
          style={{ left: `${(x(active) / WIDTH) * 100}%`, top: `${(y(shown.level) / HEIGHT) * 100}%`, marginTop: -10 }}
        >
          <span className="block text-text-secondary tabular-nums">{formatDay(shown.day)}</span>
          <span className="block font-semibold tabular-nums">NS Total {formatPct(shown.level)}</span>
          <span className="block tabular-nums">Valor {formatPct(shown.kpis.ns_value)} · Líneas {formatPct(shown.kpis.ns_lines)}</span>
          <span className="block tabular-nums">
            Pedidos {formatPct(shown.kpis.ns_orders)} ({count.format(shown.kpis.orders_pending)} de {count.format(shown.kpis.orders)})
          </span>
        </div>
      )}
    </figure>
  );
}

/**
 * The pending value by responsible, largest first, as bars from zero with
 * the value and its share written on each: a ranking reads better than a
 * doughnut once there are more than four or five responsibles.
 */
export function ResponsibleBars({ groups }: { groups: Group[] }) {
  const rows = groups
    // The pending lines without a reason come with no key and the API's «SIN MOTIVO».
    .map((group) => ({ name: group.key === null ? "Sin motivo" : group.name || group.key, value: toNumber(group.value_pending) ?? 0, lines: group.lines_pending }))
    .filter((row) => row.value > 0)
    .sort((a, b) => b.value - a.value);
  const total = rows.reduce((sum, row) => sum + row.value, 0);
  if (rows.length === 0) return <p className="text-sm text-text-secondary">Nada pendiente en el periodo.</p>;
  const max = rows[0].value;
  return (
    <ul className="space-y-1.5" aria-label="Valor pendiente por responsable">
      {rows.map((row) => (
        <li key={row.name} className="space-y-0.5 text-sm" title={`${row.name}: ${formatCop(row.value)} en ${count.format(row.lines)} líneas`}>
          <span className="flex items-baseline justify-between gap-2">
            <span className="truncate">{row.name}</span>
            <span className="shrink-0 tabular-nums">
              {formatCop(row.value)} <span className="text-text-secondary">· {formatPct(row.value / total)}</span>
            </span>
          </span>
          <span className="block h-2 rounded-r-sm bg-canvas-subtle" aria-hidden="true">
            <span className="block h-full rounded-r-sm bg-text-secondary" style={{ width: `${(row.value / max) * 100}%` }} />
          </span>
        </li>
      ))}
    </ul>
  );
}

const PARETO = { width: 480, height: 260, top: 12, right: 16, bottom: 40, left: 48 };

/**
 * The Pareto curve of the last classification: what share of the items asks
 * for what share of the value. The A, B and C cuts are dashed lines, too close
 * together for labels of their own: the caption under the chart names them.
 * Hovering reads the curve.
 */
export function ParetoChart({ pareto, cuts, noun }: { pareto: Pareto; cuts: number[]; noun: string }) {
  const [active, setActive] = useState<number | null>(null);
  const points = pareto.points.map((point) => ({ items: toNumber(point.items) ?? 0, value: toNumber(point.value) ?? 0 }));
  if (points.length < 2) return <p className="text-sm text-text-secondary">Sin clasificación todavía.</p>;
  const { width, height, top, right, bottom, left } = PARETO;
  const plotRight = width - right;
  const plotBottom = height - bottom;
  const x = (share: number) => left + share * (plotRight - left);
  const y = (share: number) => top + (1 - share) * (plotBottom - top);
  const path = points.map((point, index) => `${index === 0 ? "M" : "L"} ${x(point.items)} ${y(point.value)}`).join(" ");
  const ticks = [0, 0.25, 0.5, 0.75, 1];
  const shown = active === null ? null : points[active];

  const pick = (event: React.PointerEvent<SVGRectElement>) => {
    const box = event.currentTarget.getBoundingClientRect();
    const share = Math.min(1, Math.max(0, (event.clientX - box.left) / box.width));
    let nearest = 0;
    for (let index = 1; index < points.length; index += 1) {
      if (Math.abs(points[index].items - share) < Math.abs(points[nearest].items - share)) nearest = index;
    }
    setActive(nearest);
  };

  return (
    <figure className="relative">
      <svg viewBox={`0 0 ${width} ${height}`} className="h-auto w-full text-text-secondary" role="img" aria-label={`Curva de Pareto: porcentaje de ${noun} contra porcentaje del valor solicitado`}>
        {ticks.map((tick) => (
          <g key={tick}>
            <line x1={left} x2={plotRight} y1={y(tick)} y2={y(tick)} stroke="var(--border)" strokeWidth={1} />
            <text x={left - 8} y={y(tick)} textAnchor="end" dominantBaseline="middle" fontSize={11} fill="currentColor" className="tabular-nums">
              {formatPct(tick).replace(",0", "")}
            </text>
            <text x={x(tick)} y={plotBottom + 16} textAnchor={tick === 0 ? "start" : tick === 1 ? "end" : "middle"} fontSize={11} fill="currentColor" className="tabular-nums">
              {formatPct(tick).replace(",0", "")}
            </text>
          </g>
        ))}
        {cuts.map((cut) => (
          <line key={cut} x1={left} x2={plotRight} y1={y(cut)} y2={y(cut)} stroke="currentColor" strokeWidth={1} strokeDasharray="4 4" />
        ))}
        <text x={(left + plotRight) / 2} y={height - 4} textAnchor="middle" fontSize={11} fontWeight={600} fill="currentColor">
          % de {noun}
        </text>
        <text transform={`translate(12 ${(top + plotBottom) / 2}) rotate(-90)`} textAnchor="middle" fontSize={11} fontWeight={600} fill="currentColor">
          % del valor
        </text>
        <path d={path} fill="none" stroke="var(--text-primary)" strokeWidth={2} strokeLinejoin="round" />
        {shown && (
          <>
            <line x1={x(shown.items)} x2={x(shown.items)} y1={top} y2={plotBottom} stroke="currentColor" strokeWidth={1} />
            <circle cx={x(shown.items)} cy={y(shown.value)} r={4.5} fill="var(--text-primary)" stroke="var(--surface)" strokeWidth={2} />
          </>
        )}
        <rect x={left} y={top} width={plotRight - left} height={plotBottom - top} fill="transparent" onPointerMove={pick} onPointerLeave={() => setActive(null)} />
      </svg>
      {shown && (
        <div
          role="status"
          className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full rounded-md border border-border bg-surface-raised px-2 py-1 text-xs shadow-modal"
          style={{ left: `${(x(shown.items) / width) * 100}%`, top: `${(y(shown.value) / height) * 100}%`, marginTop: -10 }}
        >
          El {formatPct(shown.items)} de los {noun} pide el {formatPct(shown.value)} del valor
        </div>
      )}
    </figure>
  );
}
