"use client";

import { useLayoutEffect, useRef, useState } from "react";

import { Logo } from "@/intranet/components/common/logo";
import { cn } from "@/shared/lib/utils";

import { formatCount, formatLongDay, formatMoney, quantityInputText } from "../lib/format";
import { type OfferTotals, offerAmounts, offerConditions, offerLines, offerTotals } from "../lib/offer";
import type { Quotation, QuotationLine } from "../types/quotations.types";

const vatFormat = new Intl.NumberFormat("es-CO", { maximumFractionDigits: 2 });

/*
 * US Letter at 96 px per inch, with 0.6in margins: what the preview shows is
 * what the printer gets (`@page { size: letter; margin: 0 }` in globals.css).
 * The page number takes FOOTER px at the bottom of every sheet; blocks are
 * separated by GAP (space-y-6).
 */
const SHEET_HEIGHT = 11 * 96;
const MARGIN = 0.6 * 96;
const FOOTER = 28;
const GAP = 24;
const CAPACITY = SHEET_HEIGHT - 2 * MARGIN - FOOTER;

type Block =
  | { kind: "header" }
  | { kind: "parties" }
  | { kind: "rows"; from: number; to: number }
  | { kind: "empty" }
  | { kind: "totals" }
  | { kind: "conditions" };

/**
 * Packs the blocks into sheets with their measured heights. The items table
 * splits between rows and repeats its header on each sheet; totals and
 * conditions never split. A block taller than a whole sheet (it would take
 * dozens of conditions) still gets its own sheet rather than looping.
 */
function paginate(heights: { header: number; parties: number; head: number; rows: number[]; empty: number; totals: number; conditions: number }) {
  const pages: Block[][] = [[]];
  let used = 0;
  const current = () => pages[pages.length - 1];
  const newPage = () => {
    pages.push([]);
    used = 0;
  };
  const place = (block: Block, height: number) => {
    const need = (current().length > 0 ? GAP : 0) + height;
    if (used + need > CAPACITY && current().length > 0) newPage();
    used += (current().length > 0 ? GAP : 0) + height;
    current().push(block);
  };

  place({ kind: "header" }, heights.header);
  place({ kind: "parties" }, heights.parties);

  if (heights.rows.length === 0) place({ kind: "empty" }, heights.empty);
  let index = 0;
  while (index < heights.rows.length) {
    const start = (current().length > 0 ? GAP : 0) + heights.head + heights.rows[index];
    if (used + start > CAPACITY && current().length > 0) {
      newPage();
      continue;
    }
    const from = index;
    used += start;
    index += 1;
    while (index < heights.rows.length && used + heights.rows[index] <= CAPACITY) {
      used += heights.rows[index];
      index += 1;
    }
    current().push({ kind: "rows", from, to: index });
    if (index < heights.rows.length) newPage();
  }

  if (heights.totals > 0) place({ kind: "totals" }, heights.totals);
  place({ kind: "conditions" }, heights.conditions);
  return pages;
}

/**
 * The offer as the customer receives it, on Letter sheets: the preview and,
 * printed, the PDF (the template is still to be defined, so every block lives
 * here and is easy to reshape). It is paper, so it is always light (`.paper`
 * maps the light tokens in either theme). It never carries cost, margins,
 * support or rule data.
 *
 * The blocks are first rendered once, hidden, at the sheet's content width
 * to measure them; then packed into sheets. It measures again when the data
 * or the web fonts change, so a page never runs past its bottom edge.
 */
export default function OfferPages({ quotation }: { quotation: Quotation }) {
  const lines = offerLines(quotation);
  const totals = offerTotals(quotation);
  const measure = useRef<HTMLDivElement>(null);
  const [pages, setPages] = useState<Block[][] | null>(null);

  useLayoutEffect(() => {
    const root = measure.current;
    if (!root) return;
    const height = (name: string) => root.querySelector<HTMLElement>(`[data-block="${name}"]`)?.offsetHeight ?? 0;
    const run = () =>
      setPages(
        paginate({
          header: height("header"),
          parties: height("parties"),
          head: height("head"),
          rows: [...root.querySelectorAll<HTMLElement>("[data-row]")].map((row) => row.offsetHeight),
          empty: height("empty"),
          totals: height("totals"),
          conditions: height("conditions"),
        })
      );
    run();
    let alive = true;
    // Centrale Sans arrives after the first paint; its metrics change the heights.
    void document.fonts?.ready.then(() => alive && run());
    return () => {
      alive = false;
    };
  }, [quotation]);

  return (
    <>
      {/* Measuring copy: same width and type as a sheet's content, never seen or read. Inside a
          zero-height clip so its 7.3in never widen the page on a phone. */}
      <div className="relative h-0 overflow-hidden print:hidden" aria-hidden="true">
        <div ref={measure} className="paper pointer-events-none invisible absolute left-0 top-0 w-[7.3in] text-sm">
          <div data-block="header"><SheetHeader quotation={quotation} /></div>
          <div data-block="parties"><Parties quotation={quotation} /></div>
          <ItemsTable quotation={quotation} lines={lines} measuring />
          <div data-block="empty"><EmptyItems /></div>
          {totals && <div data-block="totals"><TotalsTable totals={totals} /></div>}
          <div data-block="conditions"><Conditions quotation={quotation} /></div>
        </div>
      </div>

      {pages === null ? (
        <div className="mx-auto h-[11in] w-[8.5in] max-w-full animate-pulse rounded-lg bg-canvas-subtle print:hidden" aria-busy="true" aria-label="Armando las páginas" />
      ) : (
        // A Letter sheet is wider than a phone: the sheets scroll inside this box, the page never does.
        <div
          className="space-y-6 overflow-x-auto pb-2 print:space-y-0 print:overflow-visible print:pb-0"
          aria-label={`Cotización para ${quotation.customer_name}, ${pages.length} ${pages.length === 1 ? "página" : "páginas"}`}
        >
          {pages.map((blocks, index) => (
            <section
              key={index}
              aria-label={`Página ${index + 1} de ${pages.length}`}
              className={cn(
                "paper mx-auto flex h-[11in] w-[8.5in] flex-col overflow-hidden border border-border bg-surface p-[0.6in] text-sm text-text-primary shadow-[var(--shadow-modal)]",
                "print:break-after-page print:border-0 print:shadow-none last:print:break-after-auto"
              )}
            >
              <div className="space-y-6">
                {blocks.map((block) => (
                  <BlockView key={`${block.kind}-${"from" in block ? block.from : ""}`} block={block} quotation={quotation} lines={lines} totals={totals} />
                ))}
              </div>
              <p className="mt-auto flex h-7 items-end justify-between text-xs text-text-secondary">
                <span>Valores en pesos colombianos (COP).</span>
                <span className="tabular-nums">Página {index + 1} de {pages.length}</span>
              </p>
            </section>
          ))}
        </div>
      )}
    </>
  );
}

function BlockView({ block, quotation, lines, totals }: { block: Block; quotation: Quotation; lines: QuotationLine[]; totals: OfferTotals | null }) {
  switch (block.kind) {
    case "header":
      return <SheetHeader quotation={quotation} />;
    case "parties":
      return <Parties quotation={quotation} />;
    case "rows":
      return <ItemsTable quotation={quotation} lines={lines.slice(block.from, block.to)} />;
    case "empty":
      return <EmptyItems />;
    case "totals":
      return totals ? <TotalsTable totals={totals} /> : null;
    case "conditions":
      return <Conditions quotation={quotation} />;
  }
}

function SheetHeader({ quotation }: { quotation: Quotation }) {
  const issued = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Bogota" }).format(new Date());
  return (
    <header className="flex items-start justify-between gap-4">
      <Logo variant="full" tone="black" height={48} />
      <div className="text-right">
        <h1 className="text-2xl font-semibold tracking-tight">Cotización</h1>
        <p className="text-text-secondary">Emitida el {formatLongDay(issued)}</p>
        <p className="font-medium">Válida hasta el {formatLongDay(quotation.valid_until)}</p>
      </div>
    </header>
  );
}

function Parties({ quotation }: { quotation: Quotation }) {
  const seller = quotation.include_seller ? quotation.seller_contact : null;
  return (
    <div className={cn("grid gap-4", seller && "grid-cols-2")}>
      <Party
        title="Cliente"
        rows={[
          ["Nombre", quotation.customer_name],
          ["NIT", quotation.customer_nit],
          ["Canal", quotation.channel],
        ]}
      />
      {seller && (
        <Party
          title="Asesor comercial"
          rows={[
            ["Nombre", seller.name],
            ["Correo", seller.email],
            ["Celular", seller.phone],
          ]}
        />
      )}
    </div>
  );
}

function Party({ title, rows }: { title: string; rows: [string, string | null][] }) {
  return (
    <section className="rounded-md border border-border p-3">
      <h2 className="mb-1.5 text-xs font-semibold text-text-secondary">{title}</h2>
      <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-0.5">
        {rows
          .filter(([, value]) => value)
          .map(([label, value]) => (
            <div key={label} className="contents">
              <dt className="text-text-secondary">{label}</dt>
              <dd className="min-w-0 break-words">{value}</dd>
            </div>
          ))}
      </dl>
    </section>
  );
}

function EmptyItems() {
  return (
    <p className="rounded-md bg-canvas-subtle px-4 py-6 text-center text-text-secondary">
      Aún no hay ítems en la oferta: escribe precios nuevos en la cotización, o elige «Todas con precio» en la oferta.
    </p>
  );
}

/**
 * Fixed column widths, so the same row measures the same on the hidden copy
 * and on any sheet, whichever rows share the sheet with it.
 */
function ItemsTable({ quotation, lines, measuring = false }: { quotation: Quotation; lines: QuotationLine[]; measuring?: boolean }) {
  const withQuantities = quotation.quote_quantities;
  const th = "border-b border-border-control px-1.5 py-1.5 text-left text-xs font-semibold";
  const td = "border-b border-border px-1.5 py-1.5 align-top";
  return (
    <table className="w-full table-fixed border-collapse tabular-nums">
      <caption className="sr-only">Ítems cotizados</caption>
      <colgroup>
        <col className="w-[4.5rem]" />
        <col />
        <col className="w-12" />
        <col className="w-[5.5rem]" />
        <col className="w-12" />
        <col className="w-[5.5rem]" />
        {withQuantities && (
          <>
            <col className="w-12" />
            <col className="w-[5.5rem]" />
          </>
        )}
      </colgroup>
      <thead data-block={measuring ? "head" : undefined}>
        <tr>
          <th scope="col" className={th}>Referencia</th>
          <th scope="col" className={th}>Descripción</th>
          <th scope="col" className={th}>Und.</th>
          <th scope="col" className={cn(th, "text-right")}>Sin IVA</th>
          <th scope="col" className={cn(th, "text-right")}>IVA</th>
          <th scope="col" className={cn(th, "text-right")}>Con IVA</th>
          {withQuantities && (
            <>
              <th scope="col" className={cn(th, "text-right")}>Cant.</th>
              <th scope="col" className={cn(th, "text-right")}>Total</th>
            </>
          )}
        </tr>
      </thead>
      <tbody>
        {lines.map((line) => {
          const amounts = offerAmounts(line);
          const liquor = Number(line.value_tax_amount ?? 0);
          return (
            <tr key={line.sku} data-row={measuring ? "" : undefined}>
              <td className={cn(td, "font-mono text-xs")}>{line.origin === "local" ? "Por crear" : line.sku}</td>
              <td className={cn(td, "break-words")}>
                {line.description ?? line.sku}
                {liquor > 0 && <span className="block text-xs text-text-secondary">Incluye imp. licores {formatMoney(liquor)}</span>}
              </td>
              <td className={td}>{line.unit ?? "—"}</td>
              <td className={cn(td, "text-right")}>{amounts ? formatMoney(amounts.price) : "—"}</td>
              <td className={cn(td, "text-right")}>{amounts ? `${vatFormat.format(amounts.vatPct)} %` : "—"}</td>
              <td className={cn(td, "text-right font-medium")}>{amounts ? formatMoney(amounts.priceWithVat) : "—"}</td>
              {withQuantities && (
                <>
                  <td className={cn(td, "text-right")}>{line.quantity ? quantityInputText(line.quantity) : "—"}</td>
                  <td className={cn(td, "text-right font-medium")}>{amounts?.total != null ? formatMoney(amounts.total) : "—"}</td>
                </>
              )}
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

function Conditions({ quotation }: { quotation: Quotation }) {
  return (
    <section className="space-y-2">
      <h2 className="text-base font-semibold">Condiciones de la oferta</h2>
      <ul className="list-disc space-y-1 pl-6">
        {offerConditions(quotation).map((condition, index) => (
          <li key={`${index}-${condition}`}>{condition}</li>
        ))}
      </ul>
    </section>
  );
}

/** The invoice-like consolidation: VAT per rate on its base, then the total. */
export function TotalsTable({ totals, className }: { totals: OfferTotals; className?: string }) {
  const row = "flex items-baseline justify-between gap-6 py-1";
  return (
    <section aria-label="Totales de la oferta" className={cn("ml-auto w-full max-w-sm tabular-nums", className)}>
      <div className={cn(row, "text-text-secondary")}>
        <span>Ítems con cantidad</span>
        <span>{formatCount(totals.itemCount)}</span>
      </div>
      <div className={row}>
        <span>Subtotal</span>
        <span>{formatMoney(totals.subtotal)}</span>
      </div>
      {totals.vatGroups.map((group) => (
        <div key={group.vatPct} className={row}>
          <span>
            IVA {vatFormat.format(group.vatPct)} % <span className="text-text-secondary">sobre {formatMoney(group.base)}</span>
          </span>
          <span>{formatMoney(group.vat)}</span>
        </div>
      ))}
      {totals.liquorTax > 0 && (
        <div className={row}>
          <span>Impuesto de licores</span>
          <span>{formatMoney(totals.liquorTax)}</span>
        </div>
      )}
      <div className={cn(row, "mt-1 border-t border-border-control pt-2 text-base font-semibold")}>
        <span>Total</span>
        <span>{formatMoney(totals.total)}</span>
      </div>
    </section>
  );
}
