"use client";

import { useId, useState } from "react";
import Link from "next/link";
import { Eye, FileSpreadsheet, Loader2, Pencil, Printer } from "lucide-react";
import { toast } from "sonner";

import { Button, buttonVariants } from "@/shared/components/ui/button";
import { Dialog, DialogError, DialogFooter } from "@/shared/components/ui/dialog";
import { Switch } from "@/shared/components/ui/switch";
import { errorMessage } from "@/shared/lib/api-client";
import { cn } from "@/shared/lib/utils";

import { InfoPopover } from "@/shared/components/ui/info-popover";

import { useUpdateOffer } from "../hooks/use-quotations";
import { formatCount, formatLongDay } from "../lib/format";
import { offerConditions, offerLines } from "../lib/offer";
import { downloadOfferExcel } from "../services/quotations.service";
import type { Quotation } from "../types/quotations.types";
import { ConditionsStep, OfferSettingsStep, type OfferDraft, draftFrom, draftToSettings, draftValidityText } from "./offer-steps";

/**
 * The customer's offer: one line with its validity, items and seller, the
 * conditions behind «Ver condiciones», and its exits (the preview and the PDF
 * in their own tab, the workbook from the API). The items themselves are in
 * those exits, not repeated here.
 */
export default function OfferSection({ quotation, basePath, canEdit }: { quotation: Quotation; basePath: string; canEdit: boolean }) {
  const id = useId();
  const [editing, setEditing] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const lines = offerLines(quotation);
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
          <p className="flex flex-wrap items-center gap-x-2 text-[13px] text-text-secondary">
            <span>
              Válida hasta el {formatLongDay(quotation.valid_until)} · {formatCount(lines.length)} {lines.length === 1 ? "ítem" : "ítems"}
              {seller ? ` · asesor: ${seller.name ?? seller.code}` : " · sin datos del vendedor"}
            </span>
            {/* The items are in the preview, the PDF and the Excel; only the conditions are a hover away. */}
            <InfoPopover label="Ver condiciones" title="Condiciones de la oferta">
              <ul className="list-disc space-y-1 pl-5">
                {offerConditions(quotation).map((condition, index) => (
                  <li key={`${index}-${condition}`}>{condition}</li>
                ))}
              </ul>
            </InfoPopover>
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

      <VariationSwitch quotation={quotation} canEdit={canEdit} />

      <OfferEditDialog quotation={quotation} open={editing} onOpenChange={setEditing} />
    </section>
  );
}

/**
 * Whether the PDF and the Excel carry the «Var.» column (the new price against
 * the last one), saved at once (`PATCH /offer`). Beside the downloads because
 * that is where the offer leaves for the customer; validated or loaded, the
 * offer no longer changes, so it only says how it goes.
 */
function VariationSwitch({ quotation, canEdit }: { quotation: Quotation; canEdit: boolean }) {
  const id = useId();
  const update = useUpdateOffer(quotation.id);
  return (
    <div className="flex items-start gap-3 rounded-md bg-canvas-subtle px-3 py-2">
      <Switch
        checked={quotation.include_variation}
        disabled={!canEdit || update.isPending}
        onCheckedChange={(next) =>
          update.mutate(
            { version: quotation.version, settings: { include_variation: next } },
            {
              onSuccess: () => toast.success(next ? "La variación sale en el PDF y el Excel." : "La variación ya no sale en el PDF ni el Excel."),
              onError: (failure) => toast.error(errorMessage(failure), { duration: Infinity }),
            }
          )
        }
        aria-labelledby={`${id}-label`}
        aria-describedby={`${id}-hint`}
        className="mt-0.5"
      />
      <div className="min-w-0 space-y-0.5">
        <span id={`${id}-label`} className="flex items-center gap-1.5 text-sm font-medium">
          Incluir la variación
          {update.isPending && <Loader2 className="size-3.5 animate-spin text-text-secondary" aria-hidden="true" />}
        </span>
        <span id={`${id}-hint`} className="block text-[13px] text-text-secondary">
          {canEdit
            ? "Una columna en el PDF y el Excel con cuánto sube o baja cada precio frente al último que pagó."
            : "La oferta ya no cambia en este estado."}
        </span>
      </div>
    </div>
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
