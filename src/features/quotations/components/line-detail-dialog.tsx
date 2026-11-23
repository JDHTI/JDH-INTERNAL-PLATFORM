"use client";

import { useId, useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { Dialog, DialogFooter } from "@/shared/components/ui/dialog";
import { errorMessage } from "@/shared/lib/api-client";
import { toNumber } from "@/shared/lib/format";
import { cn } from "@/shared/lib/utils";
import { calcMethodLabel, choiceLabel } from "@/features/supports/lib/format";
import { internalStatusLabel } from "@/features/supports/lib/internal-requests";

import { useLineInsight } from "../hooks/use-list-review";
import { MARGIN_BASIS_LABELS, formatCount, formatDateTime, formatDay, formatMargin, formatMoney } from "../lib/format";
import { APPLIED_LOOK, type AppliedKind, appliedKinds } from "../lib/support-kinds";
import type { LineInsight, QuotationLine, SupportOption } from "../types/quotations.types";
import { BELOW_TARGET_HELP, INACTIVE_HELP, LOCAL_HELP, NO_SALE_TEXT, type ReviewControl, ReviewSelect } from "./lines-table";
import PriceHistoryChart from "./price-history-chart";

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
  item,
}: {
  line: QuotationLine | null;
  onClose: () => void;
  onOpenAgreement: (supportId: string) => void;
  /** A list update: the list's price, the last sale apart and every support of the list. */
  forList?: boolean;
  /** Whoever validates sees the costs; the detail no longer shows the last sale's cost. */
  showCost?: boolean;
  /** A list update: its review, observation and price history come with it. */
  item?: ItemContext;
}) {
  const local = line?.origin === "local";
  return (
    <Dialog
      open={line !== null}
      onOpenChange={(open) => !open && onClose()}
      isForm={false}
      wide={item !== undefined}
      title={line ? (local ? "Producto solo para cotización" : `Referencia ${line.sku}`) : "Referencia"}
      description={line?.description ?? undefined}
    >
      {line &&
        (local ? (
          <LocalDetail line={line} onClose={onClose} />
        ) : (
          <Detail line={line} onClose={onClose} onOpenAgreement={onOpenAgreement} forList={forList}>
            {/* The stock by warehouse is not repeated here: it opens from the stock in the row. */}
            {item && <ListItemPanels item={item} line={line} />}
          </Detail>
        ))}
    </Dialog>
  );
}

/**
 * What a list update adds to an item: its review and observation, the stock in
 * the list's warehouses, and how its price moved (the list's versions and the
 * monthly sale price). The DWH parts load when the detail opens.
 */
/** Where a list update's item lives, and how its observation is saved (the editor or the board). */
export interface ItemContext {
  quotationId: string;
  canEdit: boolean;
  saveNote: (note: string) => Promise<unknown>;
  /** The item's review, changed on its chip here as in the row. */
  review?: ReviewControl;
}

function ListItemPanels({ item, line }: { item: ItemContext; line: QuotationLine }) {
  const insight = useLineInsight(item.quotationId, line.sku);
  const data = insight.data;
  return (
    <>
      <NoteSection item={item} line={line} />

      {insight.isError && <p role="alert" className="text-danger">{errorMessage(insight.error)}</p>}

      <section aria-labelledby="item-history" className="space-y-2">
        <h3 id="item-history" className="text-base font-semibold">Cómo ha variado el precio</h3>
        {insight.isPending ? (
          <div className="h-48 animate-pulse rounded-md bg-canvas-subtle" aria-label="Cargando el historial" />
        ) : data ? (
          <HistoryPanel insight={data} line={line} />
        ) : null}
      </section>
    </>
  );
}

const SCOPE_TEXT: Record<LineInsight["sales_scope"], string> = {
  cliente: "al cliente de la actualización",
  lista: "a los clientes de la lista",
  compania: "a toda la compañía (la lista tiene más de 1.000 sucursales)",
};

function HistoryPanel({ insight, line }: { insight: LineInsight; line: QuotationLine }) {
  const hasData = insight.history.length > 0 || insight.sales.length > 0;
  return (
    <div className="space-y-2">
      <p className="text-[13px] text-text-secondary">
        Precio de lista por unidad de inventario
        {insight.history_since ? ` desde el ${formatDay(insight.history_since)} (SIESA no guarda versiones anteriores)` : ""}, y
        precio de venta de cada mes {SCOPE_TEXT[insight.sales_scope]} en los últimos 12 meses.
      </p>
      {!insight.sales_read && (
        <p className="text-[13px] text-warning">El datawarehouse no respondió a tiempo con las ventas: la gráfica muestra solo el precio de lista.</p>
      )}
      {hasData ? (
        <>
          <PriceHistoryChart
            history={insight.history}
            sales={insight.sales}
            label={`Precio de lista y precio de venta por mes de ${line.description ?? line.sku}`}
          />
          <details className="text-[13px]">
            <summary className="cursor-pointer rounded-sm text-text-secondary hover:text-text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">
              Ver los datos como tabla
            </summary>
            <HistoryTables insight={insight} />
          </details>
        </>
      ) : (
        <p className="text-text-secondary">No hay versiones del precio en la lista ni ventas en los últimos 12 meses.</p>
      )}
    </div>
  );
}

function HistoryTables({ insight }: { insight: LineInsight }) {
  const cell = "px-2 py-1";
  return (
    <div className="mt-2 grid gap-3 sm:grid-cols-2">
      {insight.history.length > 0 && (
        <table className="w-full text-left tabular-nums">
          <caption className="pb-1 text-left font-medium">Precio de lista</caption>
          <thead className="text-xs text-text-secondary">
            <tr>
              <th scope="col" className={cell}>Desde</th>
              <th scope="col" className={cell}>Hasta</th>
              <th scope="col" className={cn(cell, "text-right")}>Precio</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {insight.history.map((version) => (
              <tr key={version.valid_from}>
                <td className={cell}>{formatDay(version.valid_from)}</td>
                <td className={cell}>{version.valid_to ? formatDay(version.valid_to) : "Vigente"}</td>
                <td className={cn(cell, "text-right")}>{formatMoney(version.price)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {insight.sales.length > 0 && (
        <table className="w-full text-left tabular-nums">
          <caption className="pb-1 text-left font-medium">Precio de venta por mes</caption>
          <thead className="text-xs text-text-secondary">
            <tr>
              <th scope="col" className={cell}>Mes</th>
              <th scope="col" className={cn(cell, "text-right")}>Precio</th>
              <th scope="col" className={cn(cell, "text-right")}>Unidades</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {insight.sales.map((sale) => (
              <tr key={sale.month}>
                <td className={cell}>{monthFormat.format(Date.parse(`${sale.month.slice(0, 10)}T00:00:00Z`))}</td>
                <td className={cn(cell, "text-right")}>{formatMoney(String(Math.round(toNumber(sale.price) ?? 0)))}</td>
                <td className={cn(cell, "text-right")}>{unitsFormat.format(toNumber(sale.quantity) ?? 0)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

const unitsFormat = new Intl.NumberFormat("es-CO", { maximumFractionDigits: 0 });
const monthFormat = new Intl.DateTimeFormat("es-CO", { month: "long", year: "numeric", timeZone: "UTC" });

/** The item's review and the person's observation; it saves with the button, not on every key. */
function NoteSection({ item, line }: { item: ItemContext; line: QuotationLine }) {
  const canEdit = item.canEdit;
  const [draft, setDraft] = useState(line.note ?? "");
  const [saving, setSaving] = useState(false);
  const id = useId();
  const changed = draft.trim() !== (line.note ?? "");
  const submit = async () => {
    setSaving(true);
    try {
      await item.saveNote(draft);
      toast.success(draft.trim() ? "Observación guardada." : "Observación borrada.");
    } catch (failure) {
      toast.error(errorMessage(failure), { duration: Infinity });
    } finally {
      setSaving(false);
    }
  };
  const save = { isPending: saving };
  return (
    <section aria-labelledby={`${id}-title`} className="space-y-2">
      {/* The review by item belongs to the main lists; a list update keeps only the observation. */}
      {item.review ? (
        <div className="flex flex-wrap items-center gap-2">
          <h3 id={`${id}-title`} className="text-base font-semibold">Revisión</h3>
          <ReviewSelect line={line} control={item.review} />
          {line.reviewed_by && line.review_status !== "sin_marcar" && (
            <span className="text-[13px] text-text-secondary">
              {line.reviewed_by}
              {line.reviewed_at ? ` · ${formatDateTime(line.reviewed_at)}` : ""}
            </span>
          )}
        </div>
      ) : (
        <h3 id={`${id}-title`} className="sr-only">Observación del ítem</h3>
      )}
      <label htmlFor={`${id}-note`} className="block text-sm font-medium">Observación</label>
      {canEdit ? (
        <>
          <textarea
            id={`${id}-note`}
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            maxLength={500}
            rows={3}
            placeholder="Por qué cambia el precio, qué falta revisar…"
            className="w-full rounded-md border border-border-control bg-surface px-3 py-2 text-sm focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ring"
          />
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs tabular-nums text-text-secondary">{draft.length} de 500</span>
            <Button variant="outline" size="sm" onClick={() => void submit()} disabled={!changed || save.isPending} className="max-md:h-11">
              {save.isPending && <Loader2 className="animate-spin" aria-hidden="true" />} Guardar observación
            </Button>
          </div>
        </>
      ) : (
        <p id={`${id}-note`} className={line.note ? "" : "text-text-secondary"}>{line.note ?? "Sin observación."}</p>
      )}
    </section>
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
  children,
}: {
  line: QuotationLine;
  onClose: () => void;
  onOpenAgreement: (supportId: string) => void;
  forList: boolean;
  /** A list update's own panels, after the problems. */
  children?: React.ReactNode;
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

      {children}

      <Section title="Precio">
        {forList && (
          <>
            <Row label="Precio actual sin IVA">{toNumber(line.last_price) === null ? "Sin precio en la lista" : formatMoney(line.last_price)}</Row>
            <Row label="Última venta">
              {toNumber(line.last_sale_price ?? null) === null ? NO_SALE_TEXT : formatMoney(line.last_sale_price ?? null)}
            </Row>
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
            {line.sales_in_window !== null && <Row label="Ventas en la ventana">{formatCount(line.sales_in_window)}</Row>}
          </>
        )}
        {!forList && <Row label="Precio de lista">{formatMoney(line.list_price)}</Row>}
        {/* The supplier's last price increase on the SKU: in the quoter and on the main lists board alike. */}
        {line.increase_on && <Row label="Fecha alza">{formatDay(line.increase_on)}</Row>}
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

      <section className="@container space-y-2">
        <h3 className="text-base font-semibold">Apoyo aplicado</h3>
        {support ? (
          // One card per thing the support brings, in its color: the supplier's money or the temporary
          // discount, and the margin JDH authorized. The same colors as the chips in the table. Side by
          // side only when the panel itself is wide enough (the dialog, not the window, decides).
          <div className="grid gap-2 @2xl:grid-cols-2">
            {appliedKinds(support).map((kind) => (
              <AppliedCard key={kind} kind={kind} footer={kind !== "margen" && support.detail ? support.detail : null}>
                {kind === "margen" ? (
                  <>
                    <Row label="Margen mínimo">
                      {formatMargin(support.kind === "excepcion_margen" ? support.required_margin_pct : (support.authorized_margin_pct ?? null))}
                    </Row>
                    <Row label="Vigencia">
                      <Validity from={support.valid_from} to={support.valid_to} />
                    </Row>
                  </>
                ) : (
                  <>
                    <Row label="Clase">{support.kind ? choiceLabel("kind", support.kind) : "—"}</Row>
                    <Row label="Cálculo">{calcMethodLabel(support.calc_method)}</Row>
                    <Row label={support.guaranteed_margin_pct != null ? "Por unidad, a este precio" : "Por unidad"}>
                      <span className="whitespace-nowrap">{formatMoney(support.amount)}</span>
                    </Row>
                    {/* With a guaranteed margin the support depends on the price: say what it is at the list price too. */}
                    {support.list_amount != null && support.list_amount !== support.amount && (
                      <Row label="Al precio de lista">
                        <span className="whitespace-nowrap">{formatMoney(support.list_amount)}</span>
                      </Row>
                    )}
                    <Row label="Sobre el costo">{formatMargin(support.share_of_cost)}</Row>
                    {support.required_margin_pct !== null && <Row label="Margen que exige">{formatMargin(support.required_margin_pct)}</Row>}
                    {support.guaranteed_margin_pct != null && (
                      <Row label="Margen garantizado">{formatMargin(support.guaranteed_margin_pct)}</Row>
                    )}
                    <Row label="Vigencia">
                      <Validity from={support.valid_from} to={support.valid_to} />
                    </Row>
                    {support.conditions && <Row label="Condiciones">{support.conditions}</Row>}
                    {support.needs_review && <Row label="Estado">En revisión con el proveedor</Row>}
                  </>
                )}
              </AppliedCard>
            ))}
          </div>
        ) : (
          <p className="text-text-secondary">Ningún apoyo se aplicó a esta referencia.</p>
        )}
      </section>

      {!forList && line.support_request && (
        <Section title="Apoyo interno solicitado">
          <Row label="Estado">
            {line.support_request.status === "aprobada" && line.support_request.approved_margin_pct === null
              ? "No aprobada: BI la dejó fuera de la solicitud"
              : internalStatusLabel(line.support_request)}
          </Row>
          {line.support_request.approved_margin_pct !== null && (
            <Row label="Margen aprobado">{formatMargin(line.support_request.approved_margin_pct)}</Row>
          )}
        </Section>
      )}

      {forList && <SupportOptions options={options} onOpenAgreement={onOpenAgreement} />}

      {!forList && line.support_candidates.length > 0 && (
        <section aria-labelledby="support-candidates" className="space-y-2">
          <h3 id="support-candidates" className="text-base font-semibold">Cubren la referencia, sin aplicar</h3>
          <ul className="divide-y divide-border rounded-md border border-border">
            {line.support_candidates.map((candidate) => (
              <li key={candidate.support_id} className="space-y-0.5 px-3 py-2">
                <p className="font-medium">{calcMethodLabel(candidate.calc_method)}</p>
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
                <span className="font-medium">{choiceLabel("kind", option.kind)}</span>
                {option.applied && <Badge tone="success" className="px-1.5 py-0 text-xs">Aplicado</Badge>}
                <span className="text-[13px] text-text-secondary">
                  {option.customer_nit ? (
                    <>Solo el cliente <span className="font-mono">NIT {option.customer_nit}</span></>
                  ) : option.customer_group ? (
                    `Todo el grupo ${option.customer_group}`
                  ) : (
                    "Toda la lista"
                  )}
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

const CARD_SURFACE: Record<AppliedKind, string> = {
  proveedor: "bg-info-surface",
  temporal: "bg-warning-surface",
  margen: "bg-success-surface",
};

/**
 * One kind of what applied, on its tone's surface, named by the same chip as in the table. The
 * labels take at most 45% of the card and wrap beyond it, so a long label never squeezes the value
 * to one word per line; the free text (`footer`, the support's detail) goes under, full width.
 */
function AppliedCard({ kind, footer, children }: { kind: AppliedKind; footer: string | null; children: React.ReactNode }) {
  const look = APPLIED_LOOK[kind];
  return (
    <div className={cn("min-w-0 space-y-2 rounded-lg border border-border p-3", CARD_SURFACE[kind])} title={look.help}>
      <Badge tone={look.tone}>{look.label}</Badge>
      <dl className="grid grid-cols-[fit-content(45%)_minmax(0,1fr)] gap-x-4 gap-y-1.5">{children}</dl>
      {footer && (
        <div className="space-y-0.5 border-t border-border pt-2">
          <p className="text-text-secondary">Detalle</p>
          <p className="break-words">{footer}</p>
        </div>
      )}
    </div>
  );
}

/** «1/11/2026 – 31/12/2026», each date whole: it may break at the dash, never inside a date. */
function Validity({ from, to }: { from: string | null; to: string | null }) {
  return (
    <>
      <span className="whitespace-nowrap">{formatDay(from)}</span> –{" "}
      <span className="whitespace-nowrap">{to ? formatDay(to) : "sin fin"}</span>
    </>
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
