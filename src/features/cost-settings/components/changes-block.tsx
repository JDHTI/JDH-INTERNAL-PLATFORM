"use client";

import { History } from "lucide-react";

import StatePanel from "@/shared/components/state-panel";

import { formatMoment, formatParameter } from "../lib/format";
import type { CostChange, CostParameter } from "../types/cost-settings.types";

/** A rule as it stood: "General 001 · C.O. 001 → 002 · inactiva". */
function describeRule(state: unknown): string {
  if (state === null || state === undefined) return "—";
  if (typeof state !== "object") return String(state);
  const rule = state as Record<string, unknown>;
  const parts: string[] = [];
  if (typeof rule.general_branch === "string") parts.push(`General ${rule.general_branch}`);
  if (rule.center_branches && typeof rule.center_branches === "object") {
    for (const [center, branch] of Object.entries(rule.center_branches as Record<string, unknown>)) parts.push(`C.O. ${center} → ${String(branch)}`);
  }
  if (typeof rule.is_active === "boolean") parts.push(rule.is_active ? "activa" : "inactiva");
  return parts.length > 0 ? parts.join(" · ") : JSON.stringify(state);
}

/** A parameter's value, in its unit; a wrapped `{value}` reads the same. */
function describeValue(state: unknown, parameter: CostParameter | undefined): string {
  if (state === null || state === undefined) return "—";
  const raw = typeof state === "object" && "value" in (state as object) ? (state as { value: unknown }).value : state;
  if ((typeof raw === "string" || typeof raw === "number") && parameter) return formatParameter(raw, parameter.unit);
  return typeof raw === "object" ? JSON.stringify(raw) : String(raw);
}

/** The latest changes to the parameters and the branch rules, newest first, with who and why. */
export default function ChangesBlock({ changes, parameters }: { changes: CostChange[]; parameters: CostParameter[] }) {
  const byKey = new Map(parameters.map((parameter) => [parameter.key, parameter]));
  return (
    <section aria-labelledby="cost-history" className="space-y-3">
      <h2 id="cost-history" className="text-base font-semibold">
        Historial
      </h2>
      {changes.length === 0 ? (
        <StatePanel icon={History} title="Sin cambios todavía">
          Cada ajuste de un parámetro o de una regla de sucursal quedará aquí, con quién lo hizo.
        </StatePanel>
      ) : (
        <ol className="divide-y divide-border rounded-lg border border-border bg-surface">
          {changes.map((change) => {
            const parameter = change.entity === "parametro" ? byKey.get(change.ref) : undefined;
            const what = change.entity === "parametro" ? (parameter?.label ?? change.ref) : `Regla del proveedor NIT ${change.ref}`;
            const describe = (state: unknown) => (change.entity === "parametro" ? describeValue(state, parameter) : describeRule(state));
            return (
              <li key={change.id} className="grid gap-1 px-3 py-2.5 text-sm md:grid-cols-[11rem_minmax(0,1fr)] md:gap-4">
                <div className="text-[13px] text-text-secondary">
                  <span className="block tabular-nums">{formatMoment(change.at)}</span>
                  <span className="block">{change.actor ?? "—"}</span>
                </div>
                <div className="min-w-0 space-y-0.5">
                  <p className="font-medium">{what}</p>
                  <p className="text-[13px]">
                    <span className="text-text-secondary">{describe(change.before)}</span>
                    <span aria-hidden="true"> → </span>
                    <span className="sr-only"> pasó a </span>
                    <span>{describe(change.after)}</span>
                  </p>
                  {change.note && <p className="text-[13px] text-text-secondary">«{change.note}»</p>}
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}
