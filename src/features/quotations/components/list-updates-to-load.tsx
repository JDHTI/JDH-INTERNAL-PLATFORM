"use client";

import { useState } from "react";
import Link from "next/link";
import { FileCheck2, FileSpreadsheet, FileText, Inbox, Loader2 } from "lucide-react";
import { toast } from "sonner";

import StatePanel from "@/shared/components/state-panel";
import TableSkeleton from "@/shared/components/table-skeleton";
import { Button } from "@/shared/components/ui/button";
import { errorMessage } from "@/shared/lib/api-client";

import { useMarkUploaded, useQuotationPermissions, useQuotations } from "../hooks/use-quotations";
import { formatCount, formatDateTime } from "../lib/format";
import { downloadQuotationExcel, downloadQuotationFlatFile } from "../services/quotations.service";
import type { QuotationSummary } from "../types/quotations.types";
import { QuotationLoadError } from "./quotations-gate";

/**
 * The list updates validated whole and not in SIESA yet (`pendiente_carga`): each one with its
 * two SIESA files and «Marcar cargada». Whoever validates loads them; the rest see what waits.
 */
export default function ListUpdatesToLoad({ basePath }: { basePath: string }) {
  const canValidate = useQuotationPermissions("lista").data?.can_validate === true;
  const list = useQuotations({ kind: "lista", mine: false, status: "pendiente_carga", q: "", page: 1, size: 100 });

  if (list.isPending) return <TableSkeleton rows={4} label="Cargando las actualizaciones por cargar" />;
  if (list.isError && !list.data) {
    return <QuotationLoadError error={list.error} onRetry={() => void list.refetch()} subject="las actualizaciones por cargar" />;
  }
  const items = list.data.items;

  return (
    <section aria-labelledby="to-load-title" className="space-y-2">
      <h2 id="to-load-title" className="text-base font-semibold">
        Actualizaciones validadas{items.length > 0 && <span className="font-normal text-text-secondary"> · {formatCount(list.data.total)}</span>}
      </h2>
      {items.length === 0 ? (
        <StatePanel icon={Inbox} title="No hay actualizaciones por cargar">
          Cuando quien valida acepte una actualización, aparece aquí con su Excel y su plano para cargarla en SIESA.
        </StatePanel>
      ) : (
        <ul className="divide-y divide-border rounded-lg border border-border bg-surface">
          {items.map((item) => (
            <ToLoadRow key={item.id} item={item} basePath={basePath} canValidate={canValidate} onDone={() => void list.refetch()} />
          ))}
        </ul>
      )}
    </section>
  );
}

function ToLoadRow({
  item,
  basePath,
  canValidate,
  onDone,
}: {
  item: QuotationSummary;
  basePath: string;
  canValidate: boolean;
  onDone: () => void;
}) {
  const uploaded = useMarkUploaded(item.id);
  const [downloading, setDownloading] = useState<"xlsx" | "txt" | null>(null);
  const [confirming, setConfirming] = useState(false);
  const list = item.export_price_list_id ?? item.price_list_id ?? "—";

  const download = async (kind: "xlsx" | "txt") => {
    setDownloading(kind);
    try {
      await (kind === "xlsx" ? downloadQuotationExcel(item.id) : downloadQuotationFlatFile(item.id));
    } catch (failure) {
      toast.error(errorMessage(failure), { duration: Infinity });
    } finally {
      setDownloading(null);
    }
  };

  const markLoaded = () =>
    uploaded.mutate(item.version, {
      onSuccess: () => {
        toast.success(`Lista ${list} marcada como cargada en SIESA.`);
        onDone();
      },
      onError: (failure) => toast.error(errorMessage(failure), { duration: Infinity }),
    });

  return (
    <li className="flex flex-col gap-3 px-3 py-3 md:flex-row md:items-center md:justify-between">
      <div className="min-w-0 space-y-0.5">
        <Link
          href={`${basePath}/${item.id}`}
          className="block truncate font-medium underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        >
          {item.price_list_name ?? `Lista ${list}`}
        </Link>
        <p className="text-[13px] text-text-secondary">
          <span className="font-mono">Lista {list}</span> · {formatCount(item.changed_count)}{" "}
          {item.changed_count === 1 ? "precio nuevo" : "precios nuevos"}
          {item.validated_at ? ` · validada el ${formatDateTime(item.validated_at)}` : ""}
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" size="sm" onClick={() => void download("xlsx")} disabled={downloading !== null} className="max-md:h-11">
          {downloading === "xlsx" ? <Loader2 className="animate-spin" aria-hidden="true" /> : <FileSpreadsheet aria-hidden="true" />} Excel SIESA
        </Button>
        <Button variant="outline" size="sm" onClick={() => void download("txt")} disabled={downloading !== null} className="max-md:h-11">
          {downloading === "txt" ? <Loader2 className="animate-spin" aria-hidden="true" /> : <FileText aria-hidden="true" />} Plano SIESA
        </Button>
        {/* Loaded cannot be undone, so it asks once more, in place. */}
        {canValidate &&
          (confirming ? (
            <span role="group" aria-label={`Confirmar que la lista ${list} ya está cargada`} className="flex flex-wrap items-center gap-2">
              <span className="text-[13px]">¿Ya la cargaste en SIESA?</span>
              <Button size="sm" onClick={markLoaded} disabled={uploaded.isPending} className="max-md:h-11">
                {uploaded.isPending ? <Loader2 className="animate-spin" aria-hidden="true" /> : <FileCheck2 aria-hidden="true" />} Sí, marcar cargada
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setConfirming(false)} disabled={uploaded.isPending} className="max-md:h-11">
                Cancelar
              </Button>
            </span>
          ) : (
            <Button size="sm" onClick={() => setConfirming(true)} className="max-md:h-11">
              <FileCheck2 aria-hidden="true" /> Marcar cargada
            </Button>
          ))}
      </div>
    </li>
  );
}
