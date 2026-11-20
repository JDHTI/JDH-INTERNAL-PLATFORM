"use client";

import { cn } from "@/shared/lib/utils";

import type { SupportStateFilter, SupportSummary } from "../types/support.types";

const numberFormat = new Intl.NumberFormat("es-CO");

type KpiKey = "vigente" | "por_vencer" | "programado" | "vencido";

const KPIS: { key: KpiKey; label: string; help: string; tone?: string }[] = [
  { key: "vigente", label: "Vigentes", help: "En vigencia hoy, incluidos los que están por vencer.", tone: "text-success" },
  {
    key: "por_vencer",
    label: "Por vencer",
    help: "Vigentes que terminan dentro de un mes: hoy más un mes calendario, ese día incluido.",
    tone: "text-warning",
  },
  { key: "programado", label: "Programados", help: "Empiezan más adelante.", tone: "text-info" },
  { key: "vencido", label: "Vencidos", help: "Su vigencia ya terminó." },
];

/**
 * How the master stands by state, with the filters above it, and the way to list each group:
 * a card filters by its state, pressed again it shows them all. «Por vencer» is part of
 * «Vigentes», so the four do not add up to the total.
 */
export default function SupportKpis({
  summary,
  active,
  onSelect,
}: {
  summary: SupportSummary | undefined;
  active: SupportStateFilter | "";
  onSelect: (state: SupportStateFilter | "") => void;
}) {
  return (
    <div role="group" aria-label="Apoyos por estado" className="grid grid-cols-2 gap-3 md:grid-cols-4">
      {KPIS.map((kpi) => {
        const pressed = active === kpi.key;
        const count = summary?.[kpi.key];
        return (
          <button
            key={kpi.key}
            type="button"
            aria-pressed={pressed}
            onClick={() => onSelect(pressed ? "" : kpi.key)}
            title={kpi.help}
            className={cn(
              "min-w-0 space-y-1 rounded-lg border bg-surface px-3 py-2.5 text-left transition-colors duration-150",
              "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring max-md:min-h-11",
              pressed ? "border-primary bg-primary-subtle" : "border-border hover:bg-canvas-subtle"
            )}
          >
            <span className="block truncate text-[13px] text-text-secondary">{kpi.label}</span>
            <span className={cn("block text-2xl font-semibold tabular-nums", count && kpi.tone)}>
              {count === undefined ? "—" : numberFormat.format(count)}
            </span>
            <span className="sr-only">. {kpi.help}</span>
          </button>
        );
      })}
    </div>
  );
}
