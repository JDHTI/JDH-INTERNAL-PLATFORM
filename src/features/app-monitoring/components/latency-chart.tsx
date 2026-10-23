import { formatNumber, formatWhen } from "@/features/dwh-monitoring/lib/format";

import { formatLatency } from "../lib/format";
import type { Chequeo } from "../types/app-monitoring.types";

const WIDTH = 1000;
const HEIGHT = 120;
/** The strip under the line where failed checks are marked. */
const BAND = 10;

function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}

/**
 * Latency of one target over the checks it receives, oldest on the left. The
 * question it answers is "when did it get slow or go down": the dashed line is
 * the slowness threshold and the marks under the line are checks that came
 * out down. Marks and line are told apart by shape and position, not colour.
 */
export default function LatencyChart({
  title,
  checks,
  threshold,
}: {
  title: string;
  /** Newest first, as the API pages them. */
  checks: Chequeo[];
  threshold: number;
}) {
  const points = [...checks].sort((a, b) => Date.parse(a.chequeado_en) - Date.parse(b.chequeado_en));
  if (points.length === 0) {
    return (
      <figure className="space-y-1">
        <figcaption className="text-sm font-semibold">{title}</figcaption>
        <p className="text-[13px] text-text-secondary">Sin chequeos en estas fechas.</p>
      </figure>
    );
  }

  const start = Date.parse(points[0].chequeado_en);
  const end = Date.parse(points[points.length - 1].chequeado_en);
  const span = Math.max(end - start, 1);
  const latencies = points.flatMap((point) => (point.latencia_ms === null ? [] : [point.latencia_ms]));
  const top = Math.max(threshold * 1.25, ...latencies.map((value) => value * 1.1));
  const x = (instant: string) => ((Date.parse(instant) - start) / span) * WIDTH;
  const y = (latency: number) => (HEIGHT - BAND) * (1 - Math.min(latency, top) / top);

  // A check without a latency (a timeout, a refused connection) breaks the line.
  let path = "";
  let drawing = false;
  for (const point of points) {
    if (point.latencia_ms === null) {
      drawing = false;
      continue;
    }
    path += `${drawing ? "L" : "M"}${x(point.chequeado_en).toFixed(1)},${y(point.latencia_ms).toFixed(1)}`;
    drawing = true;
  }
  const down = points.filter((point) => point.estado === "down");
  const typical = median(latencies);
  const worst = latencies.length ? Math.max(...latencies) : null;
  const thresholdTop = (y(threshold) / HEIGHT) * 100;
  const summary =
    `Mediana ${formatLatency(typical)} · máxima ${formatLatency(worst)}` +
    (down.length ? ` · ${formatNumber(down.length)} ${down.length === 1 ? "chequeo caído" : "chequeos caídos"}` : "");

  return (
    <figure className="space-y-2">
      <figcaption className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
        <span className="text-sm font-semibold">{title}</span>
        <span className="text-[13px] tabular-nums text-text-secondary">{summary}</span>
      </figcaption>
      <div className="relative">
        <svg
          viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
          preserveAspectRatio="none"
          className="block h-32 w-full overflow-visible"
          role="img"
          aria-label={`${title}, de ${formatWhen(points[0].chequeado_en)} a ${formatWhen(points[points.length - 1].chequeado_en)}. ${summary}. Umbral de lentitud ${formatLatency(threshold)}.`}
        >
          <line x1={0} x2={WIDTH} y1={HEIGHT - BAND} y2={HEIGHT - BAND} className="stroke-border" strokeWidth={1} vectorEffect="non-scaling-stroke" />
          <line
            x1={0}
            x2={WIDTH}
            y1={y(threshold)}
            y2={y(threshold)}
            className="stroke-text-secondary"
            strokeWidth={1}
            strokeDasharray="4 4"
            vectorEffect="non-scaling-stroke"
          />
          <path d={path} fill="none" className="stroke-primary" strokeWidth={1.5} strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
          {down.map((point) => (
            <rect
              key={point.chequeado_en}
              x={Math.min(x(point.chequeado_en), WIDTH - 3)}
              y={HEIGHT - BAND + 2}
              width={3}
              height={BAND - 2}
              className="fill-danger"
            />
          ))}
        </svg>
        <span
          className="pointer-events-none absolute right-0 -translate-y-full pb-0.5 text-[11px] tabular-nums text-text-secondary"
          style={{ top: `${thresholdTop}%` }}
          aria-hidden="true"
        >
          umbral {formatLatency(threshold)}
        </span>
      </div>
      <div className="flex justify-between gap-3 text-[11px] tabular-nums text-text-secondary" aria-hidden="true">
        <span>{formatWhen(points[0].chequeado_en)}</span>
        {down.length > 0 && <span className="text-center">Marcas bajo la línea: chequeos caídos</span>}
        <span className="text-right">{formatWhen(points[points.length - 1].chequeado_en)}</span>
      </div>
    </figure>
  );
}
