"use client";

import { useState } from "react";
import { Dialog } from "@/shared/components/ui/dialog";
import { Badge } from "@/shared/components/ui/badge";
import { errorMessage } from "@/shared/lib/api-client";
import { toNumber } from "@/shared/lib/format";

import { useCalcMethodLabel, useKindLabel, useSupport, useSupportConflicts } from "../hooks/use-supports";
import {
  choiceLabel,
  formatCop,
  formatDay,
  formatNumber,
  formatPct,
  formatSupplierValue,
  formatWhen,
  humanize,
  marginListLabel,
  originLabel,
  SUPPORTED_MARGIN_LABEL,
} from "../lib/format";
import type {
  SupplierSupport,
  SupportAttachment,
  SupportConflict,
  SupportDwhCost,
  SupportTier,
} from "../types/support.types";
import SupportAttachments from "./support-attachments";
import JdhSupport from "./jdh-support";
import DiscardDialog from "./discard-dialog";
import { FlagBadges, StateBadge } from "./support-badges";

/**
 * Detail of one support: its terms, derived figures, issues, tiers, conflicts
 * and supporting documents. Managers can attach documents from here; while
 * an upload is being filled, an outside click no longer closes the dialog.
 */
export default function SupportDetail({
  id,
  onClose,
  canWrite = false,
  jdhContext,
  composing = false,
  onComposingChange = () => undefined,
  onLinkElsewhere = () => undefined,
}: {
  id: string | null;
  onClose: () => void;
  /** Without it (the order validator's read-only view) the documents can only be listed and opened. */
  canWrite?: boolean;
  jdhContext?: "commercial" | "manage";
  composing?: boolean;
  onComposingChange?: (composing: boolean) => void;
  onLinkElsewhere?: (attachment: SupportAttachment) => void;
}) {
  const detail = useSupport(id);
  const [jdhEditing, setJdhEditing] = useState(false);
  const [discard, setDiscard] = useState(false);
  const support = detail.data;
  const conflicts = useSupportConflicts(id, support?.has_conflicts === true);
  const calcMethodLabel = useCalcMethodLabel();

  return (
    <><Dialog
      open={id !== null}
      onOpenChange={(open) => {
        if (!open) { if (jdhEditing) setDiscard(true); else onClose(); }
      }}
      title={support?.supplier_name ?? "Detalle del apoyo"}
      description={support ? calcMethodLabel(support.calc_method) : undefined}
      isForm={composing || jdhEditing}
      wide
    >
      {detail.isPending ? (
        <div className="h-64 animate-pulse rounded-lg bg-canvas-subtle" aria-busy="true" aria-label="Cargando detalle" />
      ) : detail.isError ? (
        <p role="alert" className="text-sm text-danger">
          {errorMessage(detail.error)}
        </p>
      ) : (
        support && (
          <Body support={support} conflicts={conflicts}>
            {jdhContext && <JdhSupport support={support} context={jdhContext} onEditingChange={setJdhEditing} />}
            <SupportAttachments
              supportId={support.id}
              canWrite={canWrite && support.state !== "anulado"}
              composing={composing}
              onComposingChange={onComposingChange}
              onLinkElsewhere={onLinkElsewhere}
            />
          </Body>
        )
      )}
    </Dialog><DiscardDialog open={discard} onCancel={() => setDiscard(false)} onDiscard={() => { setDiscard(false); setJdhEditing(false); onClose(); }} /></>
  );
}

function Body({
  support,
  conflicts,
  children,
}: {
  support: SupplierSupport;
  conflicts: ReturnType<typeof useSupportConflicts>;
  /** The supporting documents, right under the badges: they back everything below. */
  children: React.ReactNode;
}) {
  const derived = support.derived;
  const jdhPctLabel = formatPct(support.jdh_pct);
  const calcMethodLabel = useCalcMethodLabel();
  const kindLabel = useKindLabel();

  return (
    <div className="space-y-5 text-sm">
      <div className="flex flex-wrap gap-1.5">
        <StateBadge value={support.state} />
        <FlagBadges support={support} />
      </div>

      {children}

      <Section title="Apoyo">
        <Row label="Tipo de apoyo">{calcMethodLabel(support.calc_method)}</Row>
        <Row label="Clase de apoyo">{kindLabel(support.kind)}</Row>
        <Row label="Financia">{support.funding ? choiceLabel("funding", support.funding) : "—"}</Row>
        <Row label="Programa">{support.program ?? "—"}</Row>
        <Row label="Referencia externa" mono>{support.external_ref ?? "—"}</Row>
        <Row label="Valor del proveedor" tabular>
          {formatSupplierValue(support.calc_method, support.supplier_value)}
          {support.value_unit ? ` (${support.value_unit})` : ""}
        </Row>
        <Row label={SUPPORTED_MARGIN_LABEL} tabular>{formatPct(support.supported_margin_pct)}</Row>
        {/* Kept as history: since rules v2 they no longer move the figures. */}
        {support.calc_method === "costo_neto" && toNumber(support.jdh_net_cost) !== null && (
          <Row label="Costo pactado JDH (histórico)" tabular>{formatCop(support.jdh_net_cost)}</Row>
        )}
        {toNumber(support.jdh_pct) ? <Row label="% apoyo JDH (histórico)" tabular>{jdhPctLabel}</Row> : null}
        <Row label="Unidades por caja" tabular>{formatNumber(support.pack_factor)}</Row>
        <Row label="Vigencia" tabular>
          {formatDay(support.valid_from)} a {support.valid_to ? formatDay(support.valid_to) : "indefinido"}
        </Row>
        <Row label="Condición de cierre">{support.end_condition ? humanize(support.end_condition) : "—"}</Row>
        <Row label="Autorizado por">{support.authorized_by ?? "—"}</Row>
        <Row label="Versión" tabular>{support.version}</Row>
        {support.last_origin && (
          <Row label="Última modificación">
            {originLabel(support.last_origin)}
            {support.last_load_id && (
              <>
                {" · carga "}
                <span className="break-all font-mono text-[13px]">{support.last_load_id}</span>
              </>
            )}
          </Row>
        )}
      </Section>

      <Section title="A quién aplica">
        <Row label="Proveedor">
          {support.supplier_name ?? "—"}
          {support.supplier_code && <span className="font-mono text-xs text-text-secondary"> · {support.supplier_code}</span>}
        </Row>
        <Row label="Cliente">
          {support.customer_name ?? "Todos"}
          {support.customer_nit && <span className="font-mono text-xs text-text-secondary"> · {support.customer_nit}</span>}
        </Row>
        <Row label="Grupo empresarial">{support.customer_group ?? support.business_group ?? "—"}</Row>
        {support.margin_list !== undefined && <Row label="Lista de márgenes">{marginListLabel(support.margin_list) ?? "—"}</Row>}
        <Row label="Referencia (SKU)" mono>{support.product_sku ?? "Todas"}</Row>
        <Row label="Marca">{support.product_brand ?? support.brand ?? "—"}</Row>
        <Row label="Regional">{list(support.regionals)}</Row>
        <Row label="SKU del proveedor" mono>{support.supplier_sku ?? "—"}</Row>
        <Row label="Unidades de negocio">{list(support.business_units)}</Row>
        <Row label="Canales">{list(support.channels)}</Row>
      </Section>

      <Section title="Márgenes y referencias">
        <Row label="Margen objetivo" tabular>{formatPct(support.target_margin_pct)}</Row>
        <Row label="Margen mínimo" tabular>{formatPct(support.min_margin_pct)}</Row>
        <Row label="Margen de lista" tabular>{formatPct(support.list_margin_pct)}</Row>
        <Row label="Costo de referencia" tabular>{formatCop(support.reference_cost)}</Row>
        <Row label="Precio de lista de referencia" tabular>{formatCop(support.reference_list_price)}</Row>
      </Section>

      {support.dwh_cost !== undefined && <CostSource cost={support.dwh_cost} />}

      {derived && (
        <Section title="Cifras calculadas, por unidad de inventario">
          <Row label="$ Apoyo" tabular>{formatCop(derived.supplier_amount)}</Row>
          <Row label="Costo neto" tabular>{formatCop(derived.net_cost)}</Row>
          <Row label="% sobre costo" tabular>{formatPct(derived.pct_on_cost)}</Row>
          <Row label="% sobre lista" tabular>{formatPct(derived.pct_on_list)}</Row>
          <Row label="Precio Apoyado Sugerido" tabular>{formatCop(derived.suggested_price)}</Row>
          {derived.product_margin_pct !== undefined && (
            <>
              <Row label="Margen del producto" tabular>{formatPct(derived.product_margin_pct)}</Row>
              <Row label="Margen recompuesto a precio lista" tabular>{formatPct(derived.recomposed_list_margin)}</Row>
              <Row label={SUPPORTED_MARGIN_LABEL} tabular>{formatPct(derived.supported_margin_pct)}</Row>
              <Row label="Precio Apoyado Mínimo" tabular>{formatCop(derived.supported_price)}</Row>
              <Row label="Descuento al cliente" tabular>{formatPct(derived.customer_discount_pct)}</Row>
            </>
          )}
          <Row label="Margen del pedido" tabular>{formatPct(derived.margin_order)}</Row>
          <Row label="Margen recompuesto" tabular>{formatPct(derived.margin_recomposed)}</Row>
          <Row label="Margen mínimo" tabular>{formatPct(derived.min_margin_pct)}</Row>
        </Section>
      )}

      {derived && (
        <section className="space-y-2">
          <h3 className="font-semibold">Por unidad y por caja</h3>
          <p className="text-text-secondary">
            {support.value_unit
              ? `El valor del apoyo está en ${support.value_unit === "caja" ? "caja" : "unidad"} (${BASIS_LABELS[support.unit_basis_source ?? "desconocido"]}). `
              : "El apoyo no tiene base de unidad: sin ella no hay conversión. "}
            La caja es la unidad por el empaque del maestro de productos.
          </p>
          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full text-left text-sm">
              <thead className={headClass}>
                <tr>
                  <th scope="col" className="px-3 py-2">Concepto</th>
                  <th scope="col" className="px-3 py-2 text-right">Unidad</th>
                  <th scope="col" className="px-3 py-2 text-right">Caja</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {PER_UNIT_ROWS.map(([key, label]) => (
                  <tr key={key}>
                    <td className="px-3 py-2">{label}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{formatCop(derived[key]?.unit)}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{formatCop(derived[key]?.box)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {support.issues.length > 0 && (
        <section className="space-y-2">
          <h3 className="font-semibold">Novedades</h3>
          <ul className="divide-y divide-border rounded-lg border border-border">
            {support.issues.map((issue, index) => (
              <li key={`${issue.code}-${index}`} className="space-y-0.5 px-3 py-2">
                <span className="flex flex-wrap items-center gap-2">
                  <Badge tone="warning">{humanize(issue.code)}</Badge>
                  {issue.field && <span className="font-mono text-xs text-text-secondary">{issue.field}</span>}
                </span>
                {issue.detail && <span className="block text-text-secondary">{issue.detail}</span>}
              </li>
            ))}
          </ul>
        </section>
      )}

      {support.tiers.length > 0 && (
        <section className="space-y-2">
          <h3 className="font-semibold">Escalas</h3>
          <div className="overflow-x-auto rounded-lg border border-border">
            <TiersTable tiers={support.tiers} calcMethod={support.calc_method} />
          </div>
        </section>
      )}

      {support.has_conflicts && (
        <section className="space-y-2">
          <h3 className="font-semibold">Conflictos</h3>
          {conflicts.isPending ? (
            <div className="h-16 animate-pulse rounded-lg bg-canvas-subtle" aria-busy="true" aria-label="Cargando conflictos" />
          ) : conflicts.isError ? (
            <p role="alert" className="text-danger">{errorMessage(conflicts.error)}</p>
          ) : conflicts.data.length === 0 ? (
            <p className="text-text-secondary">El API no reporta conflictos activos para este apoyo.</p>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-border">
              <ConflictsTable conflicts={conflicts.data} />
            </div>
          )}
        </section>
      )}

      {support.notes && (
        <section className="space-y-1">
          <h3 className="font-semibold">Notas</h3>
          <p className="whitespace-pre-wrap text-text-secondary">{support.notes}</p>
        </section>
      )}
    </div>
  );
}

const list = (items: string[]) => (items.length > 0 ? items.join(", ") : "Todas");

const BASIS_LABELS: Record<NonNullable<SupplierSupport["unit_basis_source"]>, string> = {
  hoja: "lo declara la hoja",
  inferido_dwh: "inferida del costo del DWH",
  manual: "fijada a mano",
  desconocido: "origen desconocido",
};

const PER_UNIT_ROWS: [PerUnitKey, string][] = [
  ["cost", "Costo"],
  ["list_price", "Precio de lista"],
  ["supplier_amount_per", "$ Apoyo"],
  ["net_cost_per", "Costo neto"],
  ["suggested_price_per", "Precio Apoyado Sugerido"],
  ["supported_price_per", "Precio Apoyado Mínimo"],
];

type PerUnitKey =
  | "cost"
  | "list_price"
  | "supplier_amount_per"
  | "net_cost_per"
  | "supported_price_per"
  | "suggested_price_per";

const THRESHOLD_LABELS: Record<SupportTier["threshold_type"], string> = {
  unidades: "Unidades",
  cajas: "Cajas",
  monto_ventas: "Monto de ventas",
};

const headClass = "bg-canvas-subtle text-[11px] font-semibold uppercase tracking-[0.06em] text-text-secondary";

function TiersTable({ tiers, calcMethod }: { tiers: SupportTier[]; calcMethod: string | null }) {
  return (
    <table className="w-full text-left text-sm">
      <thead className={headClass}>
        <tr>
          <th scope="col" className="px-3 py-2">Umbral</th>
          <th scope="col" className="px-3 py-2 text-right">Desde</th>
          <th scope="col" className="px-3 py-2 text-right">Hasta</th>
          <th scope="col" className="px-3 py-2 text-right">Valor</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-border">
        {tiers.map((tier, index) => {
          const amount = (value: SupportTier["from_value"]) =>
            tier.threshold_type === "monto_ventas" ? formatCop(value) : formatNumber(value);
          return (
            <tr key={index} className="tabular-nums">
              <td className="px-3 py-2">{THRESHOLD_LABELS[tier.threshold_type] ?? humanize(tier.threshold_type)}</td>
              <td className="px-3 py-2 text-right">{amount(tier.from_value)}</td>
              <td className="px-3 py-2 text-right">{tier.to_value === null ? "Sin tope" : amount(tier.to_value)}</td>
              <td className="px-3 py-2 text-right">{formatSupplierValue(calcMethod, tier.value)}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

const COST_SOURCES: Record<string, string> = {
  cotizacion: "Cotización del proveedor",
  inventario: "Inventario",
};

/**
 * Where the SKU's cost comes from: the quoter's rule (the higher of quotation
 * and inventory, in the customer's warehouses), refreshed daily. The basis the
 * figures used (`cost_basis`) is left out on purpose: the business read the
 * DWH / Referencia mark as noise.
 */
function CostSource({ cost }: { cost: SupportDwhCost | null }) {
  return (
    <section className="space-y-1">
      <h3 className="font-semibold">Costo</h3>
      {cost === null ? (
        <p className="text-text-secondary">El cálculo diario aún no tiene costo para este producto.</p>
      ) : (
        <>
          <p className="text-text-secondary">
            El mayor entre la cotización vigente y el costo de inventario, por unidad de inventario.
          </p>
          <dl className="divide-y divide-border">
            <Row label="Costo por unidad" tabular>{formatCop(cost.unit_cost)}</Row>
            <Row label="Fuente">{cost.source ? (COST_SOURCES[cost.source] ?? humanize(cost.source)) : "—"}</Row>
            <Row label="Cotización" tabular>{formatCop(cost.quote_cost)}</Row>
            <Row label="Inventario" tabular>{formatCop(cost.inventory_cost)}</Row>
            <Row label="Bodegas">{cost.plan_label}</Row>
            <Row label="Fecha del dato" tabular>{formatDay(cost.snapshot_date)}</Row>
            <Row label="Calculado" tabular>{formatWhen(cost.computed_at)}</Row>
          </dl>
        </>
      )}
    </section>
  );
}

function ConflictsTable({ conflicts }: { conflicts: SupportConflict[] }) {
  const calcMethodLabel = useCalcMethodLabel();
  return (
    <table className="w-full text-left text-sm">
      <thead className={headClass}>
        <tr>
          <th scope="col" className="px-3 py-2">Programa</th>
          <th scope="col" className="px-3 py-2">Vigencia</th>
          <th scope="col" className="px-3 py-2">Tipo de apoyo</th>
          <th scope="col" className="px-3 py-2 text-right">Valor</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-border">
        {conflicts.map((conflict) => (
          <tr key={conflict.id}>
            <td className="px-3 py-2">{conflict.program ?? "—"}</td>
            <td className="whitespace-nowrap px-3 py-2 tabular-nums">
              {formatDay(conflict.valid_from)} a {conflict.valid_to ? formatDay(conflict.valid_to) : "indefinido"}
            </td>
            <td className="px-3 py-2">{calcMethodLabel(conflict.calc_method)}</td>
            <td className="px-3 py-2 text-right tabular-nums">
              {formatSupplierValue(conflict.calc_method, conflict.supplier_value)}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-1">
      <h3 className="font-semibold">{title}</h3>
      <dl className="divide-y divide-border">{children}</dl>
    </section>
  );
}

function Row({
  label,
  mono = false,
  tabular = false,
  children,
}: {
  label: string;
  mono?: boolean;
  tabular?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="grid gap-1 py-2 sm:grid-cols-[12rem_minmax(0,1fr)] sm:gap-3">
      <dt className="text-text-secondary">{label}</dt>
      <dd className={mono ? "break-words font-mono text-[13px]" : tabular ? "break-words tabular-nums" : "break-words"}>
        {children}
      </dd>
    </div>
  );
}
