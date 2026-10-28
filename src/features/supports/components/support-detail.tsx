"use client";

import { Dialog } from "@/shared/components/ui/dialog";
import { Badge } from "@/shared/components/ui/badge";
import { errorMessage } from "@/shared/lib/api-client";
import { toNumber } from "@/shared/lib/format";

import { useSupport, useSupportConflicts } from "../hooks/use-supports";
import {
  calcMethodLabel,
  choiceLabel,
  formatCop,
  formatDay,
  formatNumber,
  formatPct,
  formatSupplierValue,
  humanize,
} from "../lib/format";
import type { SupplierSupport, SupportAttachment, SupportConflict, SupportTier } from "../types/support.types";
import SupportAttachments from "./support-attachments";
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
  composing = false,
  onComposingChange = () => undefined,
  onLinkElsewhere = () => undefined,
}: {
  id: string | null;
  onClose: () => void;
  /** Without it (the order validator's read-only view) the documents can only be listed and opened. */
  canWrite?: boolean;
  composing?: boolean;
  onComposingChange?: (composing: boolean) => void;
  onLinkElsewhere?: (attachment: SupportAttachment) => void;
}) {
  const detail = useSupport(id);
  const support = detail.data;
  const conflicts = useSupportConflicts(id, support?.has_conflicts === true);

  return (
    <Dialog
      open={id !== null}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      title={support?.supplier_name ?? "Detalle del apoyo"}
      description={support ? calcMethodLabel(support.calc_method) : undefined}
      isForm={composing}
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
    </Dialog>
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

  return (
    <div className="space-y-5 text-sm">
      <div className="flex flex-wrap gap-1.5">
        <StateBadge value={support.state} />
        <FlagBadges support={support} />
      </div>

      {children}

      <Section title="Apoyo">
        <Row label="Tipo">{support.kind ? choiceLabel("kind", support.kind) : "—"}</Row>
        <Row label="Financia">{support.funding ? choiceLabel("funding", support.funding) : "—"}</Row>
        <Row label="Programa">{support.program ?? "—"}</Row>
        <Row label="Referencia externa" mono>{support.external_ref ?? "—"}</Row>
        <Row label="Forma de cálculo">{calcMethodLabel(support.calc_method)}</Row>
        <Row label="Valor del proveedor" tabular>
          {formatSupplierValue(support.calc_method, support.supplier_value)}
          {support.value_unit ? ` (${support.value_unit})` : ""}
        </Row>
        <Row label="% apoyo JDH" tabular>{toNumber(support.jdh_pct) ? jdhPctLabel : "—"}</Row>
        <Row label="Unidades por caja" tabular>{formatNumber(support.pack_factor)}</Row>
        <Row label="Vigencia" tabular>
          {formatDay(support.valid_from)} a {support.valid_to ? formatDay(support.valid_to) : "indefinido"}
        </Row>
        <Row label="Condición de cierre">{support.end_condition ? humanize(support.end_condition) : "—"}</Row>
        <Row label="Autorizado por">{support.authorized_by ?? "—"}</Row>
        <Row label="Versión" tabular>{support.version}</Row>
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
        <Row label="Grupo de clientes">{support.customer_group ?? "—"}</Row>
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

      {derived && (
        <Section title="Cifras calculadas">
          <Row label="Aporte del proveedor" tabular>{formatCop(derived.supplier_amount)}</Row>
          <Row label="Costo neto" tabular>{formatCop(derived.net_cost)}</Row>
          <Row label="% sobre costo" tabular>{formatPct(derived.pct_on_cost)}</Row>
          <Row label="% sobre lista" tabular>{formatPct(derived.pct_on_list)}</Row>
          <Row label="Precio sugerido" tabular>{formatCop(derived.suggested_price)}</Row>
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
              ? `El costo del apoyo está en ${support.value_unit === "caja" ? "caja" : "unidad"} (${BASIS_LABELS[support.unit_basis_source ?? "desconocido"]}). `
              : "El apoyo no tiene base de unidad: sin ella no hay conversión. "}
            Los importes los convierte el API.
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
  ["supplier_amount_per", "Apoyo del proveedor"],
  ["net_cost_per", "Costo neto"],
  ["suggested_price_per", "Precio sugerido"],
];

type PerUnitKey = "cost" | "list_price" | "supplier_amount_per" | "net_cost_per" | "suggested_price_per";

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

function ConflictsTable({ conflicts }: { conflicts: SupportConflict[] }) {
  return (
    <table className="w-full text-left text-sm">
      <thead className={headClass}>
        <tr>
          <th scope="col" className="px-3 py-2">Programa</th>
          <th scope="col" className="px-3 py-2">Vigencia</th>
          <th scope="col" className="px-3 py-2">Forma de cálculo</th>
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
