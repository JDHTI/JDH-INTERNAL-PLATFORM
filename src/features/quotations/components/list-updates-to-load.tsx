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
import { type QuotationSummary, isListKind } from "../types/quotations.types";
import { QuotationLoadError } from "./quotations-gate";

/**
 * Everything validated and not in SIESA yet (`pendiente_carga`), each with its two SIESA files
 * and «Marcar cargada»: the list updates, and the customer quotations that asked for a list. A
 * validated quotation also stays under «Cotizaciones por validar» › «Por cargar»; here it waits
 * with the rest of what has to be loaded (decided 2026-11-20). Whoever validates loads them; the
 * rest see what waits.
 */
export default function ListUpdatesToLoad({ basePath }: { basePath: string }) {
  const canValidate = useQuotationPermissions("lista").data?.can_validate === true;
  const updates = useQuotations({ kind: "lista", mine: false, status: "pendiente_carga", q: "", page: 1, size: 100 });
  const quotations = useQuotations({ kind: "cotizacion", mine: false, status: "pendiente_carga", q: "", page: 1, size: 100 });

  return (
    <div className="space-y-8">
      <ToLoadSection
        id="to-load-updates"
        title="Actualizaciones validadas"
        query={updates}
        basePath={basePath}
        canValidate={canValidate}
        subject="las actualizaciones por cargar"
        empty={{
          title: "No hay actualizaciones por cargar",
          text: "Cuando quien valida acepte una actualización, aparece aquí con su Excel y su plano para cargarla en SIESA.",
        }}
      />
      <ToLoadSection
        id="to-load-quotations"
        title="Cotizaciones validadas"
        query={quotations}
        basePath={`${basePath}/cotizaciones`}
        canValidate={canValidate}
        subject="las cotizaciones por cargar"
        empty={{
          title: "No hay cotizaciones por cargar",
          text: "Cuando se valide una cotización que pide actualizar o crear una lista, aparece aquí con sus archivos para cargarla en SIESA.",
        }}
      />
    </div>
  );
}

function ToLoadSection({
  id,
  title,
  query,
  basePath,
  canValidate,
  subject,
  empty,
}: {
  id: string;
  title: string;
  query: ReturnType<typeof useQuotations>;
  /** Where each one opens: the list update's editor, or the quotation's inside this module. */
  basePath: string;
  canValidate: boolean;
  subject: string;
  empty: { title: string; text: string };
}) {
  if (query.isPending) return <TableSkeleton rows={3} label={`Cargando ${subject}`} />;
  if (query.isError && !query.data) {
    return <QuotationLoadError error={query.error} onRetry={() => void query.refetch()} subject={subject} />;
  }
  const items = query.data.items;
  return (
    <section aria-labelledby={id} className="space-y-2">
      <h2 id={id} className="text-base font-semibold">
        {title}
        {items.length > 0 && <span className="font-normal text-text-secondary"> · {formatCount(query.data.total)}</span>}
      </h2>
      {items.length === 0 ? (
        <StatePanel icon={Inbox} title={empty.title}>
          {empty.text}
        </StatePanel>
      ) : (
        <ul className="divide-y divide-border rounded-lg border border-border bg-surface">
          {items.map((item) => (
            <ToLoadRow key={item.id} item={item} basePath={basePath} canValidate={canValidate} onDone={() => void query.refetch()} />
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
  const isQuotation = !isListKind(item.kind);
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
          {isQuotation ? item.customer_name : (item.price_list_name ?? `Lista ${list}`)}
        </Link>
        <p className="text-[13px] text-text-secondary">
          <span className="font-mono">Lista {list}</span>
          {isQuotation && item.list_action_label ? ` · ${item.list_action_label}` : ""} · {formatCount(item.changed_count)}{" "}
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
