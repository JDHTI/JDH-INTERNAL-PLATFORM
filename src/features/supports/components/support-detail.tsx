"use client";

import { Dialog } from "@/shared/components/ui/dialog";
import { Badge } from "@/shared/components/ui/badge";
import { errorMessage } from "@/shared/lib/api-client";

import { useSupport, useSupportConflicts } from "../hooks/use-supports";
import {
  calcMethodLabel,
  formatCop,
  formatDay,
  formatNumber,
  formatPct,
  formatSupplierValue,
  humanize,
} from "../lib/format";
import type { SupplierSupport } from "../types/support.types";
import { FlagBadges, StatusBadge, ValidityBadge } from "./support-badges";

/** Read-only detail of one support: its terms, derived figures, issues, tiers and conflicts. */
export default function SupportDetail({ id, onClose }: { id: string | null; onClose: () => void }) {
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
      wide
    >
      {detail.isPending ? (
        <div className="h-64 animate-pulse rounded-lg bg-canvas-subtle" aria-busy="true" aria-label="Cargando detalle" />
      ) : detail.isError ? (
        <p role="alert" className="text-sm text-danger">
          {errorMessage(detail.error)}
        </p>
      ) : (
        support && <Body support={support} conflicts={conflicts} />
      )}
    </Dialog>
  );
}

function Body({
  support,
  conflicts,
}: {
  support: SupplierSupport;
  conflicts: ReturnType<typeof useSupportConflicts>;
}) {
  const derived = support.derived;
  const jdhPctLabel = formatPct(support.jdh_pct);

  return (
    <div className="space-y-5 text-sm">
      <div className="flex flex-wrap gap-1.5">
        <ValidityBadge value={support.validity} />
        <StatusBadge value={support.status} />
        <FlagBadges support={support} />
      </div>

      <Section title="Apoyo">
        <Row label="Tipo">{humanize(support.kind)}</Row>
        <Row label="Financia">{humanize(support.funding)}</Row>
        <Row label="Programa">{support.program ?? "—"}</Row>
        <Row label="Referencia externa" mono>{support.external_ref ?? "—"}</Row>
        <Row label="Forma de cálculo">{calcMethodLabel(support.calc_method)}</Row>
        <Row label="Valor del proveedor" tabular>
          {formatSupplierValue(support.calc_method, support.supplier_value)}
          {support.value_unit ? ` (${support.value_unit})` : ""}
        </Row>
        <Row label="Parte de JDH" tabular>{jdhPctLabel}</Row>
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
        <Row label="Producto">
          {support.product_description ?? "Todos"}
          {support.product_sku && <span className="font-mono text-xs text-text-secondary"> · {support.product_sku}</span>}
        </Row>
        <Row label="Marca">{support.product_brand ?? support.brand ?? "—"}</Row>
        <Row label="SKU del proveedor" mono>{support.supplier_sku ?? "—"}</Row>
        <Row label="Regionales">{list(support.regionals)}</Row>
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
            <TiersTable tiers={support.tiers} />
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
              <TiersTable tiers={conflicts.data} />
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

/** Tiers and conflicts have no fixed shape in the contract, so columns come from the data. */
function TiersTable({ tiers }: { tiers: Record<string, unknown>[] }) {
  const columns = Array.from(new Set(tiers.flatMap((tier) => Object.keys(tier))));
  return (
    <table className="w-full text-left text-sm">
      <thead className="bg-canvas-subtle text-[11px] font-semibold uppercase tracking-[0.06em] text-text-secondary">
        <tr>
          {columns.map((column) => (
            <th key={column} scope="col" className="px-3 py-2">{humanize(column)}</th>
          ))}
        </tr>
      </thead>
      <tbody className="divide-y divide-border">
        {tiers.map((tier, index) => (
          <tr key={index}>
            {columns.map((column) => (
              <td key={column} className="px-3 py-2 tabular-nums">{cell(tier[column])}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function cell(value: unknown): string {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "number") return formatNumber(value);
  if (typeof value === "boolean") return value ? "Sí" : "No";
  return typeof value === "string" ? value : JSON.stringify(value);
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
