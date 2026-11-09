"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, FileSpreadsheet, Loader2, Printer } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/shared/components/ui/button";
import { errorMessage } from "@/shared/lib/api-client";
import { useBreadcrumbLabel } from "@/shared/store/use-breadcrumb-store";

import { useQuotation } from "../hooks/use-quotations";
import { offerFileName, offerLines } from "../lib/offer";
import { downloadOfferExcel } from "../services/quotations.service";
import type { Quotation } from "../types/quotations.types";
import OfferDocument from "./offer-document";
import { QuotationLoadError } from "./quotations-gate";

/**
 * The customer's offer as it will be sent, with its two exits: the workbook
 * from the API and the PDF from the browser's own print dialog ("Guardar como
 * PDF"). Opened with `?imprimir=1` it goes straight to that dialog.
 */
export default function OfferPreview({ quotationId, basePath, autoPrint }: { quotationId: string; basePath: string; autoPrint: boolean }) {
  const quotation = useQuotation(quotationId);
  useBreadcrumbLabel(`${basePath}/${quotationId}`, quotation.data?.customer_name);
  useBreadcrumbLabel(`${basePath}/${quotationId}/oferta`, "Oferta para el cliente");

  if (quotation.isPending) {
    return <div className="mx-auto h-[70vh] max-w-[820px] animate-pulse rounded-lg bg-canvas-subtle" aria-busy="true" aria-label="Cargando la oferta" />;
  }
  if (quotation.isError && !quotation.data) {
    return <QuotationLoadError error={quotation.error} onRetry={() => void quotation.refetch()} subject="esta oferta" />;
  }
  return <Preview quotation={quotation.data} basePath={basePath} autoPrint={autoPrint} />;
}

function Preview({ quotation, basePath, autoPrint }: { quotation: Quotation; basePath: string; autoPrint: boolean }) {
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
    // One frame so the logo and the table are painted before the dialog freezes the page.
    const frame = requestAnimationFrame(() => print());
    return () => cancelAnimationFrame(frame);
  });

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
      <div className="mx-auto flex w-full max-w-[820px] flex-wrap items-center justify-between gap-2 print:hidden">
        <Link
          href={`${basePath}/${quotation.id}`}
          className="inline-flex min-h-8 items-center gap-1 rounded-sm text-sm text-text-secondary hover:text-text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring max-md:min-h-11"
        >
          <ArrowLeft className="size-4" aria-hidden="true" /> Volver a la cotización
        </Link>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => void download()} disabled={downloading || empty} className="max-md:h-11">
            {downloading ? <Loader2 className="animate-spin" aria-hidden="true" /> : <FileSpreadsheet aria-hidden="true" />} Excel
          </Button>
          <Button onClick={print} disabled={empty} className="max-md:h-11">
            <Printer aria-hidden="true" /> Guardar PDF
          </Button>
        </div>
      </div>
      <p className="mx-auto max-w-[820px] text-[13px] text-text-secondary print:hidden">
        «Guardar PDF» abre la impresión del navegador: elige «Guardar como PDF» como destino.
      </p>
      <OfferDocument quotation={quotation} />
    </div>
  );
}
