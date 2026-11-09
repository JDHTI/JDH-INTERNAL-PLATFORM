"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { FileSpreadsheet, Loader2, Printer, X } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/shared/components/ui/button";
import { errorMessage } from "@/shared/lib/api-client";
import { useBreadcrumbLabel } from "@/shared/store/use-breadcrumb-store";

import { useQuotation } from "../hooks/use-quotations";
import { offerFileName, offerLines } from "../lib/offer";
import { downloadOfferExcel } from "../services/quotations.service";
import type { Quotation } from "../types/quotations.types";
import OfferPages from "./offer-document";
import { QuotationLoadError } from "./quotations-gate";

/**
 * The customer's offer as it will be sent, on Letter sheets, in its own tab
 * (the editor stays where it was). Two exits: the workbook from the API and
 * the PDF from the browser's print dialog ("Guardar como PDF"). Opened with
 * `?imprimir=1` it goes straight to that dialog.
 */
export default function OfferPreview({ quotationId, basePath, autoPrint }: { quotationId: string; basePath: string; autoPrint: boolean }) {
  const quotation = useQuotation(quotationId);
  useBreadcrumbLabel(`${basePath}/${quotationId}`, quotation.data?.customer_name);
  useBreadcrumbLabel(`${basePath}/${quotationId}/oferta`, "Oferta para el cliente");

  if (quotation.isPending) {
    return <div className="mx-auto h-[70vh] max-w-[8.5in] animate-pulse rounded-lg bg-canvas-subtle" aria-busy="true" aria-label="Cargando la oferta" />;
  }
  if (quotation.isError && !quotation.data) {
    return <QuotationLoadError error={quotation.error} onRetry={() => void quotation.refetch()} subject="esta oferta" />;
  }
  return <Preview quotation={quotation.data} basePath={basePath} autoPrint={autoPrint} />;
}

function Preview({ quotation, basePath, autoPrint }: { quotation: Quotation; basePath: string; autoPrint: boolean }) {
  const router = useRouter();
  const [downloading, setDownloading] = useState(false);
  const printed = useRef(false);
  const empty = offerLines(quotation).length === 0;

  const print = () => {
    // The browser names the PDF after the page title.
    const title = document.title;
    document.title = offerFileName(quotation);
    window.print();
    document.title = title;
  };

  useEffect(() => {
    if (!autoPrint || printed.current || empty) return;
    printed.current = true;
    // A moment for the sheets to be measured and the logo painted before the dialog freezes the page.
    const timer = setTimeout(print, 600);
    return () => clearTimeout(timer);
  });

  /** A tab opened from the editor with one page of history can close itself; otherwise go to the quotation. */
  const close = () => {
    window.close();
    setTimeout(() => router.push(`${basePath}/${quotation.id}`), 150);
  };

  const download = async () => {
    setDownloading(true);
    try {
      await downloadOfferExcel(quotation.id);
    } catch (failure) {
      toast.error(errorMessage(failure), { duration: Infinity });
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="mx-auto flex w-full max-w-[8.5in] flex-wrap items-center justify-between gap-2 print:hidden">
        <div className="min-w-0">
          <h1 className="truncate text-lg font-semibold">Oferta para {quotation.customer_name}</h1>
          <p className="text-[13px] text-text-secondary">Tamaño carta. «Guardar PDF» abre la impresión: elige «Guardar como PDF».</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="ghost" onClick={close} className="max-md:h-11">
            <X aria-hidden="true" /> Cerrar
          </Button>
          <Button variant="outline" onClick={() => void download()} disabled={downloading || empty} className="max-md:h-11">
            {downloading ? <Loader2 className="animate-spin" aria-hidden="true" /> : <FileSpreadsheet aria-hidden="true" />} Excel
          </Button>
          <Button onClick={print} disabled={empty} className="max-md:h-11">
            <Printer aria-hidden="true" /> Guardar PDF
          </Button>
        </div>
      </div>
      <OfferPages quotation={quotation} />
    </div>
  );
}
