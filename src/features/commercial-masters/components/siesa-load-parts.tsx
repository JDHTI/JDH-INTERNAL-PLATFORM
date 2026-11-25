"use client";

import { FileSpreadsheet, FileText, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { formatCop } from "@/features/supports/lib/format";
import { Badge, type BadgeTone } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { errorMessage } from "@/shared/lib/api-client";

import { useDownloadSiesaLoadFile } from "../hooks/use-commercial-masters";
import type { SiesaLoad, SiesaLoadRow, SiesaLoadStatus } from "../types/price-increases.types";
import { formatIncreaseDay } from "./increase-format";

export const LOAD_STATUS: Record<SiesaLoadStatus, { label: string; tone: BadgeTone }> = {
  generado: { label: "Generado", tone: "info" },
  cargado: { label: "Cargado en SIESA", tone: "success" },
  anulado: { label: "Anulado", tone: "neutral" },
};

const STEPS = [
  "Elegir las alzas pendientes en el acumulado.",
  "Revisar qué va a SIESA y qué queda por fuera.",
  "Generar el lote y descargar el TXT.",
  "Cargar el TXT en SIESA (Impodatos).",
  "Confirmar el cargue: las alzas toman esa fecha y dejan de estar pendientes.",
];

/** The five steps of a load, the same everywhere it is offered. */
export function LoadSteps() {
  return (
    <ol className="grid gap-x-4 gap-y-1 text-[13px] text-text-secondary sm:grid-cols-2 xl:grid-cols-5">
      {STEPS.map((step, index) => (
        <li key={step} className="flex gap-1.5">
          <span className="font-semibold tabular-nums text-text-primary">{index + 1}</span>
          <span>{step}</span>
        </li>
      ))}
    </ol>
  );
}

/** The quotations a load writes: who quotes it, the unit, the price and when it starts. */
export function LoadRowsTable({ rows, caption }: { rows: SiesaLoadRow[]; caption: string }) {
  return (
    <div className="max-h-80 overflow-auto rounded-lg border border-border">
      <table className="w-full table-fixed text-left text-[13px]">
        <caption className="sr-only">{caption}</caption>
        <colgroup>
          <col />
          <col style={{ width: "24%" }} />
          <col style={{ width: "16%" }} />
          <col style={{ width: "16%" }} />
        </colgroup>
        <thead className="sticky top-0 bg-canvas-subtle text-[11px] font-semibold uppercase tracking-[0.06em] text-text-secondary">
          <tr>
            <th scope="col" className="px-2.5 py-1.5">Referencia</th>
            <th scope="col" className="px-2.5 py-1.5">Proveedor en SIESA</th>
            <th scope="col" className="px-2.5 py-1.5 text-right">Precio</th>
            <th scope="col" className="px-2.5 py-1.5">Activación</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {rows.map((row) => (
            <tr key={row.increase_id} className="align-top">
              <td className="px-2.5 py-1.5">
                <span className="block truncate" title={row.description ?? undefined}>
                  <span className="font-mono">{row.sku}</span>
                  {row.description && <span className="text-text-secondary"> · {row.description}</span>}
                </span>
                {row.other_nits.length > 0 && (
                  <span className="block text-xs text-warning">También cotiza NIT {row.other_nits.join(", ")}</span>
                )}
              </td>
              <td className="px-2.5 py-1.5">
                <span className="block tabular-nums">NIT {row.nit}</span>
                <span className="block text-xs text-text-secondary">
                  Sucursal {row.branch} · {row.unit} · {row.delivery_days} {row.delivery_days === 1 ? "día" : "días"}
                </span>
              </td>
              <td className="px-2.5 py-1.5 text-right font-semibold tabular-nums">{formatCop(row.price)}</td>
              <td className="px-2.5 py-1.5 tabular-nums">
                {formatIncreaseDay(row.activation_date)}
                {row.increased_on && row.increased_on !== row.activation_date && (
                  <span className="block text-xs text-text-secondary" title="La fecha del alza ya pasó: SIESA la activa el día del lote">
                    Alza del {formatIncreaseDay(row.increased_on)}
                  </span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** The two files of a load, rebuilt from what it stored: a second download is the same. */
export function LoadFiles({ load }: { load: Pick<SiesaLoad, "id" | "number"> }) {
  const download = useDownloadSiesaLoadFile();
  const get = (kind: "txt" | "xlsx") =>
    download.mutate({ id: load.id, number: load.number, kind }, { onError: (failure) => toast.error(errorMessage(failure), { duration: Infinity }) });
  const pending = (kind: "txt" | "xlsx") => download.isPending && download.variables?.kind === kind;
  return (
    <span className="flex flex-wrap gap-2">
      <Button onClick={() => get("txt")} disabled={download.isPending} className="max-md:h-11">
        {pending("txt") ? <Loader2 className="animate-spin" aria-hidden="true" /> : <FileText aria-hidden="true" />} TXT para SIESA
      </Button>
      <Button variant="outline" onClick={() => get("xlsx")} disabled={download.isPending} className="max-md:h-11">
        {pending("xlsx") ? <Loader2 className="animate-spin" aria-hidden="true" /> : <FileSpreadsheet aria-hidden="true" />} Libro Excel
      </Button>
    </span>
  );
}

export function LoadStatusBadge({ status, label }: { status: SiesaLoadStatus; label?: string }) {
  const look = LOAD_STATUS[status];
  return <Badge tone={look.tone}>{label ?? look.label}</Badge>;
}
