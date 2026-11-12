"use client";

import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { Dialog, DialogFooter } from "@/shared/components/ui/dialog";
import { toNumber } from "@/shared/lib/format";
import { calcMethodLabel, choiceLabel } from "@/features/supports/lib/format";

import { MARGIN_BASIS_LABELS, formatCount, formatDay, formatMargin, formatMoney } from "../lib/format";
import type { QuotationLine, SupportOption } from "../types/quotations.types";
import { BELOW_TARGET_HELP, INACTIVE_HELP, LOCAL_HELP } from "./lines-table";

/**
 * Everything about one reference that does not fit on its row: the sale the
 * last price comes from, the cost and target behind the minimum, the problems
 * the API found, and the support applied or left out. The full agreement opens
 * in the supports master's own detail.
 */
export default function LineDetailDialog({
  line,
  onClose,
  onOpenAgreement,
  forList = false,
  showCost = false,
}: {
  line: QuotationLine | null;
  onClose: () => void;
  onOpenAgreement: (supportId: string) => void;
  /** A list update: the list's price, the last sale apart and every support of the list. */
  forList?: boolean;
  /** Whoever validates sees the cost of the last sale. */
  showCost?: boolean;
}) {
  const local = line?.origin === "local";
  return (
    <Dialog
      open={line !== null}
      onOpenChange={(open) => !open && onClose()}
      isForm={false}
      wide={false}
      title={line ? (local ? "Producto solo para cotización" : `Referencia ${line.sku}`) : "Referencia"}
      description={line?.description ?? undefined}
    >
      {line &&
        (local ? (
          <LocalDetail line={line} onClose={onClose} />
        ) : (
          <Detail line={line} onClose={onClose} onOpenAgreement={onOpenAgreement} forList={forList} showCost={showCost} />
        ))}
    </Dialog>
  );
}

/** A product created to quote: what was typed for it, and why it has no cost or rule. */
function LocalDetail({ line, onClose }: { line: QuotationLine; onClose: () => void }) {
  return (
    <div className="space-y-5 text-sm">
      <p>
        <Badge tone="warning">{line.origin_label || "Solo cotización"}</Badge> <span className="text-text-secondary">{LOCAL_HELP}</span>
      </p>
      <Section title="Datos del producto">
        <Row label="Proveedor">{line.supplier_name ?? "—"}</Row>
        <Row label="Precio sin IVA">{formatMoney(line.new_price)}</Row>
        <Row label="IVA">{toNumber(line.vat_pct) === null ? "—" : `${toNumber(line.vat_pct)} %`}</Row>
        <Row label="Referencia interna">
          <span className="font-mono">{line.sku}</span>
        </Row>
      </Section>
      <DialogFooter>
        <Button variant="outline" onClick={onClose} className="max-md:h-11">Cerrar</Button>
      </DialogFooter>
    </div>
  );
}

function Detail({
  line,
  onClose,
  onOpenAgreement,
  forList,
  showCost,
}: {
  line: QuotationLine;
  onClose: () => void;
  onOpenAgreement: (supportId: string) => void;
  forList: boolean;
  showCost: boolean;
}) {
  const support = line.support;
  const added = line.origin === "agregado";
  const options = line.support_options ?? [];
  const basis = line.margin_basis ? line.margin_basis_label || MARGIN_BASIS_LABELS[line.margin_basis] : null;
  const liquor = toNumber(line.value_tax_amount);

  return (
    <div className="space-y-5 text-sm">
      {!line.is_active && (
        <p>
          <Badge tone="danger">Inactiva</Badge> <span className="text-text-secondary">{INACTIVE_HELP}</span>
        </p>
      )}
      {added && line.is_active && (
        <p>
          <Badge tone="info">{line.origin_label || "Agregado"}</Badge>{" "}
          <span className="text-text-secondary">
            {forList
              ? "No tiene precio vigente en la lista: el precio nuevo la agrega."
              : "El cliente no la compró en la ventana: se cotiza sin último precio."}
          </span>
        </p>
      )}
      {line.below_target && (
        <p>
          <Badge tone="warning">Bajo el objetivo</Badge> <span className="text-text-secondary">{BELOW_TARGET_HELP}</span>
        </p>
      )}

      {line.problem_labels.length > 0 && (
        <ul className="space-y-1 rounded-md bg-warning-surface px-3 py-2" aria-label="Problemas de la referencia">
          {line.problem_labels.map((label) => (
            <li key={label}>{label}</li>
          ))}
        </ul>
      )}

      <Section title="Precio">
        {forList && (
          <>
            <Row label="Precio actual sin IVA">{toNumber(line.last_price) === null ? "Sin precio en la lista" : formatMoney(line.last_price)}</Row>
            <Row label="Última venta">
              {toNumber(line.last_sale_price ?? null) === null ? (
                "Sin ventas en los últimos 12 meses"
              ) : (
                <>
                  {formatMoney(line.last_sale_price ?? null)} · {formatDay(line.last_sale_date)}
                  {line.last_document ? ` · ${line.last_document}` : ""}
                  {line.last_sale_unit ? ` · en ${line.last_sale_unit}` : ""}
                </>
              )}
            </Row>
            {showCost && toNumber(line.last_sale_cost ?? null) !== null && (
              <Row label="Costo de esa venta">{formatMoney(line.last_sale_cost ?? null)}</Row>
            )}
          </>
        )}
        {!added && !forList && (
          <>
            <Row label="Último precio sin IVA">{formatMoney(line.last_price)}</Row>
            <Row label="Última venta">
              {formatDay(line.last_sale_date)}
              {line.last_document ? ` · ${line.last_document}` : ""}
              {line.last_sale_unit ? ` · en ${line.last_sale_unit}` : ""}
            </Row>
            {toNumber(line.last_gross_price) !== null && <Row label="Precio bruto">{formatMoney(line.last_gross_price)}</Row>}
            {toNumber(line.last_discount_pct) !== null && <Row label="Descuento">{formatMargin(line.last_discount_pct)}</Row>}
            {line.sales_in_window !== null && <Row label="Ventas en la ventana">{formatCount(line.sales_in_window)}</Row>}
          </>
        )}
        {!forList && <Row label="Precio de lista">{formatMoney(line.list_price)}</Row>}
        {liquor !== null && liquor > 0 && (
          <Row label="Imp. consumo">
            {formatMoney(liquor)}
            {line.value_tax_name ? ` · ${line.value_tax_name}` : ""}
          </Row>
        )}
        {toNumber(line.price_with_taxes) !== null && liquor !== null && liquor > 0 && (
          <Row label="Precio con imp. consumo">{formatMoney(line.price_with_taxes)}</Row>
        )}
      </Section>

      <Section title="Margen">
        <Row label="Objetivo">{formatMargin(line.target_margin_pct)}{basis ? ` · ${basis}` : ""}</Row>
        <Row label="Mínimo permitido">{formatMargin(line.min_margin_pct)}</Row>
        <Row label="Precio óptimo">
          {formatMoney(line.optimal_price)} <span className="text-text-secondary">· da exactamente el objetivo</span>
        </Row>
        <Row label="Precio mínimo">
          {formatMoney(line.min_price)} <span className="text-text-secondary">· por debajo no se puede confirmar</span>
        </Row>
        {!added && <Row label="Actual sin apoyo">{formatMargin(line.current_margin_pct)}</Row>}
        {line.new_price !== null && <Row label="Nuevo sin apoyo">{formatMargin(line.new_margin_pct)}</Row>}
      </Section>

      <Section title="Apoyo aplicado">
        {support ? (
          <>
            <Row label="Tipo">{support.kind ? choiceLabel("kind", support.kind) : "—"}</Row>
            <Row label="Programa">{support.program ?? "—"}</Row>
            <Row label="Cálculo">{calcMethodLabel(support.calc_method)}</Row>
            <Row label="Por unidad">{formatMoney(support.amount)}</Row>
            <Row label="Sobre el costo">{formatMargin(support.share_of_cost)}</Row>
            {support.required_margin_pct !== null && <Row label="Margen que exige">{formatMargin(support.required_margin_pct)}</Row>}
            <Row label="Vigencia">
              {formatDay(support.valid_from)} a {support.valid_to ? formatDay(support.valid_to) : "sin fin"}
            </Row>
            {support.conditions && <Row label="Condiciones">{support.conditions}</Row>}
            {support.detail && <Row label="Detalle">{support.detail}</Row>}
            {support.needs_review && <Row label="Estado">En revisión con el proveedor</Row>}
          </>
        ) : (
          <p className="col-span-2 text-text-secondary">Ningún apoyo se aplicó a esta referencia.</p>
        )}
      </Section>

      {forList && <SupportOptions options={options} onOpenAgreement={onOpenAgreement} />}

      {!forList && line.support_candidates.length > 0 && (
        <section aria-labelledby="support-candidates" className="space-y-2">
          <h3 id="support-candidates" className="text-base font-semibold">Cubren la referencia, sin aplicar</h3>
          <ul className="divide-y divide-border rounded-md border border-border">
            {line.support_candidates.map((candidate) => (
              <li key={candidate.support_id} className="space-y-0.5 px-3 py-2">
                <p className="font-medium">
                  {candidate.program ?? "Sin programa"}
                  <span className="font-normal text-text-secondary"> · {calcMethodLabel(candidate.calc_method)}</span>
                </p>
                <p className="text-text-secondary">{candidate.reason}</p>
                <Button variant="ghost" size="sm" className="-ml-2.5 max-md:h-11" onClick={() => onOpenAgreement(candidate.support_id)}>
                  Ver el apoyo
                </Button>
              </li>
            ))}
          </ul>
        </section>
      )}

      <DialogFooter>
        <Button variant="outline" onClick={onClose} className="max-md:h-11">Cerrar</Button>
        {support && (
          <Button onClick={() => onOpenAgreement(support.support_id)} className="max-md:h-11">
            Ver el apoyo completo
          </Button>
        )}
      </DialogFooter>
    </div>
  );
}

/**
 * Every support of the list's customers on the reference, with the minimum and
 * optimal price each one leaves, so it is clear what each allows. The applied
 * one (the lowest minimum) goes first; the ones that cannot apply say why.
 */
function SupportOptions({
  options,
  onOpenAgreement,
}: {
  options: SupportOption[];
  onOpenAgreement: (supportId: string) => void;
}) {
  return (
    <section aria-labelledby="support-options" className="space-y-2">
      <h3 id="support-options" className="text-base font-semibold">Apoyos de la lista</h3>
      {options.length === 0 ? (
        <p className="text-text-secondary">Ningún apoyo de los clientes de la lista cubre esta referencia.</p>
      ) : (
        <ul className="divide-y divide-border rounded-md border border-border" aria-label="Apoyos de los clientes de la lista, con el precio que deja cada uno">
          {options.map((option) => (
            <li key={option.support_id} className="space-y-1.5 px-3 py-2">
              <p className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <span className="font-medium">{option.program ?? "Sin programa"}</span>
                {option.applied && <Badge tone="success" className="px-1.5 py-0 text-xs">Aplicado</Badge>}
                <span className="text-[13px] text-text-secondary">
                  {option.customer_nit ? <>Solo el cliente <span className="font-mono">NIT {option.customer_nit}</span></> : "Toda la lista"}
                </span>
              </p>
              <p className="text-[13px] text-text-secondary">{option.detail || calcMethodLabel(option.calc_method)}</p>
              {option.reason && <p className="text-[13px]">No se aplica: {option.reason}</p>}
              <dl className="flex flex-wrap gap-x-5 gap-y-1 text-[13px] tabular-nums">
                <div className="flex gap-1.5">
                  <dt className="text-text-secondary">Mínimo</dt>
                  <dd className="font-semibold">{toNumber(option.min_price) === null ? "—" : formatMoney(option.min_price)}</dd>
                </div>
                <div className="flex gap-1.5">
                  <dt className="text-text-secondary">Óptimo</dt>
                  <dd className="font-semibold">{toNumber(option.optimal_price) === null ? "—" : formatMoney(option.optimal_price)}</dd>
                </div>
                <div className="flex gap-1.5">
                  <dt className="text-text-secondary">Por unidad</dt>
                  <dd>{toNumber(option.amount) === null ? "—" : formatMoney(option.amount)}</dd>
                </div>
              </dl>
              <Button variant="ghost" size="sm" className="-ml-2.5 max-md:h-11" onClick={() => onOpenAgreement(option.support_id)}>
                Ver el apoyo
              </Button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-2">
      <h3 className="text-base font-semibold">{title}</h3>
      <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5">{children}</dl>
    </section>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <>
      <dt className="text-text-secondary">{label}</dt>
      <dd className="min-w-0 tabular-nums">{children}</dd>
    </>
  );
}
