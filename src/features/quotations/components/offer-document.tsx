import { Logo } from "@/intranet/components/common/logo";
import { cn } from "@/shared/lib/utils";

import { formatCount, formatLongDay, formatMoney, quantityInputText } from "../lib/format";
import { type OfferTotals, offerAmounts, offerConditions, offerLines, offerTotals } from "../lib/offer";
import type { Quotation } from "../types/quotations.types";

const vatFormat = new Intl.NumberFormat("es-CO", { maximumFractionDigits: 2 });

/**
 * The offer as the customer receives it: the same sheet is the preview and,
 * printed, the PDF (the template is still to be defined, so it lives in one
 * component that is easy to reshape). It is paper, so it is always light
 * (`.paper` maps the light tokens in either theme). It never carries cost,
 * margins, support or rule data.
 */
export default function OfferDocument({ quotation, className }: { quotation: Quotation; className?: string }) {
  const lines = offerLines(quotation);
  const withQuantities = quotation.quote_quantities;
  const totals = offerTotals(quotation);
  const seller = quotation.include_seller ? quotation.seller_contact : null;
  const issued = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Bogota" }).format(new Date());
  const th = "border-b border-border-control px-2 py-1.5 text-left text-xs font-semibold";
  const td = "border-b border-border px-2 py-1.5 align-top";

  return (
    <article
      className={cn(
        "paper mx-auto w-full max-w-[820px] space-y-6 rounded-lg border border-border bg-surface p-6 text-sm text-text-primary md:p-10",
        "print:max-w-none print:rounded-none print:border-0 print:p-0",
        className
      )}
      aria-label={`Cotización para ${quotation.customer_name}`}
    >
      <header className="flex flex-wrap items-start justify-between gap-4">
        <Logo variant="full" tone="black" height={44} />
        <div className="text-right">
          <h1 className="text-2xl font-semibold tracking-tight">Cotización</h1>
          <p className="text-text-secondary">Emitida el {formatLongDay(issued)}</p>
          <p className="font-medium">Válida hasta el {formatLongDay(quotation.valid_until)}</p>
        </div>
      </header>

      <div className={cn("grid gap-4", seller && "sm:grid-cols-2 print:grid-cols-2")}>
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

      {lines.length === 0 ? (
        <p className="rounded-md bg-canvas-subtle px-4 py-6 text-center text-text-secondary">
          Aún no hay ítems en la oferta: escribe precios nuevos en la cotización, o elige «Todas con precio» en la oferta.
        </p>
      ) : (
        <table className="w-full border-collapse tabular-nums">
          <caption className="sr-only">Ítems cotizados</caption>
          <thead>
            <tr>
              <th scope="col" className={th}>Referencia</th>
              <th scope="col" className={th}>Descripción</th>
              <th scope="col" className={th}>Und.</th>
              <th scope="col" className={cn(th, "text-right")}>Precio sin IVA</th>
              <th scope="col" className={cn(th, "text-right")}>IVA</th>
              <th scope="col" className={cn(th, "text-right")}>Precio con IVA</th>
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
              return (
                <tr key={line.sku} className="break-inside-avoid">
                  <td className={cn(td, "whitespace-nowrap font-mono text-[13px]")}>{line.origin === "local" ? "Por crear" : line.sku}</td>
                  <td className={td}>
                    {line.description ?? line.sku}
                    {toNumberOrNull(line.value_tax_amount) && (
                      <span className="block text-xs text-text-secondary">Incluye imp. licores {formatMoney(line.value_tax_amount)}</span>
                    )}
                  </td>
                  <td className={cn(td, "whitespace-nowrap")}>{line.unit ?? "—"}</td>
                  <td className={cn(td, "text-right")}>{amounts ? formatMoney(amounts.price) : "—"}</td>
                  <td className={cn(td, "whitespace-nowrap text-right")}>{amounts ? `${vatFormat.format(amounts.vatPct)} %` : "—"}</td>
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
      )}

      {totals && <TotalsTable totals={totals} />}

      <section className="break-inside-avoid space-y-2">
        <h2 className="text-base font-semibold">Condiciones de la oferta</h2>
        <ul className="list-disc space-y-1 pl-6">
          {offerConditions(quotation).map((condition, index) => (
            <li key={`${index}-${condition}`}>{condition}</li>
          ))}
        </ul>
      </section>

      <footer className="border-t border-border pt-3 text-xs text-text-secondary">
        Valores en pesos colombianos (COP).
      </footer>
    </article>
  );
}

const toNumberOrNull = (value: string | null) => (value !== null && Number(value) > 0 ? Number(value) : null);

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

/** The invoice-like consolidation: VAT per rate on its base, then the total. */
export function TotalsTable({ totals, className }: { totals: OfferTotals; className?: string }) {
  const row = "flex items-baseline justify-between gap-6 py-1";
  return (
    <section aria-label="Totales de la oferta" className={cn("ml-auto w-full max-w-sm break-inside-avoid tabular-nums", className)}>
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
