"use client";

import { useId, useState } from "react";
import Link from "next/link";
import { ChevronDown, Eye, FileSpreadsheet, ListChecks, Loader2, Printer } from "lucide-react";
import { toast } from "sonner";

import { Button, buttonVariants } from "@/shared/components/ui/button";
import { Dialog, DialogError, DialogFooter } from "@/shared/components/ui/dialog";
import { InfoPopover } from "@/shared/components/ui/info-popover";
import { Switch } from "@/shared/components/ui/switch";
import { parseBoolean, useStoredPreference } from "@/shared/hooks/use-stored-preference";
import { errorMessage } from "@/shared/lib/api-client";
import { cn } from "@/shared/lib/utils";

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
  const [open, setOpen] = useStoredPreference("jdh-quoter-offer-open", true, parseBoolean);
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
    // Folds like «Asignación masiva de precio»: the header keeps the validity and the conditions.
    <section aria-labelledby={`${id}-title`} className="rounded-lg border border-border bg-surface">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 pr-3">
        <h2 id={`${id}-title`} className="min-w-0 flex-1 text-base font-semibold">
          <button
            type="button"
            onClick={() => setOpen(!open)}
            aria-expanded={open}
            aria-controls={`${id}-body`}
            className="flex min-h-12 w-full items-center gap-2 rounded-lg px-3 text-left hover:text-text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            <ChevronDown className={cn("size-4 shrink-0 text-text-secondary", !open && "-rotate-90")} aria-hidden="true" />
            <span>Oferta para el cliente</span>
          </button>
        </h2>
        <span className="text-[13px] text-text-secondary max-sm:pb-2 max-sm:pl-9">
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
      </div>

      {open && (
      <div id={`${id}-body`} className="flex flex-wrap items-center justify-between gap-3 border-t border-border p-3">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          {canEdit && (
            <Button variant="outline" size="sm" onClick={() => setEditing(true)} className="max-md:h-11">
              <ListChecks aria-hidden="true" /> Definir condiciones
            </Button>
          )}
          <VariationSwitch quotation={quotation} canEdit={canEdit} />
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
        </div>
      </div>
      )}

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
    <div className="flex min-h-9 items-center gap-2 max-md:min-h-11">
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
      />
      <span id={`${id}-label`} className="text-sm font-medium">
        Incluir la variación
      </span>
      {update.isPending && <Loader2 className="size-3.5 animate-spin text-text-secondary" aria-hidden="true" />}
      {/* One line in the folded panel: what the switch does is a hover away. */}
      <InfoPopover label="Qué es la variación" title="Variación en la oferta" iconOnly>
        <p>
          {canEdit
            ? "Una columna en el PDF y el Excel con cuánto sube o baja cada precio frente al último que pagó."
            : "La oferta ya no cambia en este estado."}
        </p>
      </InfoPopover>
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
      title="Definir las condiciones"
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
          toast.success("Condiciones de la oferta guardadas.");
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
          {update.isPending && <Loader2 className="animate-spin" aria-hidden="true" />} Guardar condiciones
        </Button>
      </DialogFooter>
    </form>
  );
}
