"use client";

import { useId, useState } from "react";
import Link from "next/link";
import { Eye, FileSpreadsheet, Loader2, Pencil, Printer } from "lucide-react";
import { toast } from "sonner";

import { Button, buttonVariants } from "@/shared/components/ui/button";
import { Dialog, DialogError, DialogFooter } from "@/shared/components/ui/dialog";
import { errorMessage } from "@/shared/lib/api-client";
import { cn } from "@/shared/lib/utils";

import { useUpdateOffer } from "../hooks/use-quotations";
import { formatCount, formatLongDay, formatMoney, quantityInputText } from "../lib/format";
import { offerAmounts, offerConditions, offerLines, offerTotals } from "../lib/offer";
import { downloadOfferExcel } from "../services/quotations.service";
import type { Quotation } from "../types/quotations.types";
import { TotalsTable } from "./offer-document";
import { ConditionsStep, OfferSettingsStep, type OfferDraft, draftFrom, draftToSettings, draftValidityText } from "./offer-steps";

/** Lines shown in the section; the full list is the preview's job. */
const PREVIEW_LINES = 6;

/**
 * The customer's offer once the quotation is confirmed: what it says at a
 * glance (the first lines, the totals, the conditions) and its three exits,
 * the preview and the PDF in their own tab and the workbook from the API.
 * Always open: it is the result of confirming, not a setting to tuck away.
 */
export default function OfferSection({ quotation, basePath, canEdit }: { quotation: Quotation; basePath: string; canEdit: boolean }) {
  const id = useId();
  const [editing, setEditing] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const lines = offerLines(quotation);
  const totals = offerTotals(quotation);
  const previewHref = `${basePath}/${quotation.id}/oferta`;
  const seller = quotation.include_seller ? quotation.seller_contact : null;

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

  const linkClass = cn(buttonVariants({ variant: "outline", size: "sm" }), "max-md:h-11");

  return (
    <section aria-labelledby={`${id}-title`} className="space-y-4 rounded-lg border border-border bg-surface p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 space-y-0.5">
          <h2 id={`${id}-title`} className="text-base font-semibold">Oferta para el cliente</h2>
          <p className="text-[13px] text-text-secondary">
            Válida hasta el {formatLongDay(quotation.valid_until)} · {formatCount(lines.length)} {lines.length === 1 ? "ítem" : "ítems"}
            {seller ? ` · asesor: ${seller.name ?? seller.code}` : " · sin datos del vendedor"}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href={previewHref} target="_blank" rel="noopener noreferrer" className={linkClass}>
            <Eye aria-hidden="true" /> Vista previa<span className="sr-only"> (se abre en una pestaña nueva)</span>
          </Link>
          <Button variant="outline" size="sm" onClick={() => void download()} disabled={downloading || lines.length === 0} className="max-md:h-11">
            {downloading ? <Loader2 className="animate-spin" aria-hidden="true" /> : <FileSpreadsheet aria-hidden="true" />} Excel
          </Button>
          <Link
            href={`${previewHref}?imprimir=1`}
            target="_blank"
            rel="noopener noreferrer"
            aria-disabled={lines.length === 0 || undefined}
            className={cn(linkClass, lines.length === 0 && "pointer-events-none opacity-50")}
          >
            <Printer aria-hidden="true" /> PDF<span className="sr-only"> (se abre en una pestaña nueva)</span>
          </Link>
          {canEdit && (
            <Button variant="ghost" size="sm" onClick={() => setEditing(true)} className="max-md:h-11">
              <Pencil aria-hidden="true" /> Editar oferta
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-x-6 gap-y-4 @3xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <div className="min-w-0 space-y-3">
          {lines.length === 0 ? (
            <p className="rounded-md bg-canvas-subtle px-3 py-4 text-sm text-text-secondary">
              La oferta no tiene ítems: ninguna línea tiene precio nuevo. «Editar oferta» permite incluir todas las que tienen precio.
            </p>
          ) : (
            <table className="w-full table-fixed text-left text-sm tabular-nums">
              <caption className="sr-only">Primeros ítems de la oferta</caption>
              <thead className="text-[11px] font-semibold uppercase tracking-[0.06em] text-text-secondary">
                <tr className="border-b border-border">
                  <th scope="col" className="py-1.5 pr-2">Ítem</th>
                  <th scope="col" className="w-28 py-1.5 pl-2 text-right">Con IVA</th>
                  {quotation.quote_quantities && (
                    <>
                      <th scope="col" className="w-16 py-1.5 pl-2 text-right">Cant.</th>
                      <th scope="col" className="w-28 py-1.5 pl-2 text-right">Total</th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {lines.slice(0, PREVIEW_LINES).map((line) => {
                  const amounts = offerAmounts(line);
                  return (
                    <tr key={line.sku}>
                      <td className="truncate py-1.5 pr-2" title={line.description ?? line.sku}>{line.description ?? line.sku}</td>
                      <td className="py-1.5 pl-2 text-right">{amounts ? formatMoney(amounts.priceWithVat) : "—"}</td>
                      {quotation.quote_quantities && (
                        <>
                          <td className="py-1.5 pl-2 text-right">{line.quantity ? quantityInputText(line.quantity) : "—"}</td>
                          <td className="py-1.5 pl-2 text-right">{amounts?.total != null ? formatMoney(amounts.total) : "—"}</td>
                        </>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
          {lines.length > PREVIEW_LINES && (
            <p className="text-[13px] text-text-secondary">
              Y {formatCount(lines.length - PREVIEW_LINES)} {lines.length - PREVIEW_LINES === 1 ? "ítem más" : "ítems más"} en la vista previa.
            </p>
          )}
          {totals && <TotalsTable totals={totals} className="ml-0 max-w-none" />}
        </div>

        <div className="min-w-0 space-y-2">
          <h3 className="text-sm font-semibold">Condiciones de la oferta</h3>
          <ul className="list-disc space-y-1 pl-5 text-sm">
            {offerConditions(quotation).map((condition, index) => (
              <li key={`${index}-${condition}`}>{condition}</li>
            ))}
          </ul>
        </div>
      </div>

      <OfferEditDialog quotation={quotation} open={editing} onOpenChange={setEditing} />
    </section>
  );
}

/**
 * The first two steps of confirming, to adjust the offer afterwards. It never
 * touches prices, so the quotation keeps its status (`PATCH /offer`).
 */
function OfferEditDialog({ quotation, open, onOpenChange }: { quotation: Quotation; open: boolean; onOpenChange: (open: boolean) => void }) {
  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      isForm
      wide
      title="Editar la oferta"
      description="Cambia lo que recibe el cliente. Los precios y el estado de la cotización no cambian."
    >
      {open && <OfferEditForm quotation={quotation} onClose={() => onOpenChange(false)} />}
    </Dialog>
  );
}

function OfferEditForm({ quotation, onClose }: { quotation: Quotation; onClose: () => void }) {
  const update = useUpdateOffer(quotation.id);
  const [draft, setDraft] = useState<OfferDraft>(() => draftFrom(quotation));
  const [validityError, setValidityError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    const result = draftToSettings(draft, quotation);
    if ("error" in result) {
      setValidityError(result.error);
      return;
    }
    setValidityError(null);
    if (Object.keys(result.settings).length === 0) {
      onClose();
      return;
    }
    setError(null);
    update.mutate(
      { version: quotation.version, settings: result.settings },
      {
        onSuccess: () => {
          toast.success("Oferta actualizada.");
          onClose();
        },
        onError: (failure) => setError(errorMessage(failure)),
      }
    );
  };

  return (
    <form noValidate onSubmit={submit} className="space-y-6">
      <OfferSettingsStep quotation={quotation} draft={draft} onChange={setDraft} validityError={validityError} />
      <div className="border-t border-border pt-5">
        <ConditionsStep draft={draft} onChange={setDraft} validityText={draftValidityText(draft, quotation)} />
      </div>
      <DialogError message={error} />
      <DialogFooter>
        <Button variant="outline" onClick={onClose} className="max-md:h-11">Cancelar</Button>
        <Button type="submit" disabled={update.isPending} className="max-md:h-11">
          {update.isPending && <Loader2 className="animate-spin" aria-hidden="true" />} Guardar la oferta
        </Button>
      </DialogFooter>
    </form>
  );
}
