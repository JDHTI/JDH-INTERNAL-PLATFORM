"use client";

import { INCREASE_STATUS } from "@/features/commercial-masters/components/increase-format";
import { formatCop, formatDay, formatPct } from "@/features/supports/lib/format";
import { Badge } from "@/shared/components/ui/badge";
import { toNumber, type Decimal } from "@/shared/lib/format";
import { cn } from "@/shared/lib/utils";

import { formatSignedCop, formatSignedPct } from "../lib/format";
import { regionalLabel, regionalList } from "../lib/regionals";
import { NATIONAL, REST, type RequestLine } from "../types/increase-requests.types";
import { Figures, secondary } from "./line-cells";
import { th, td } from "./sort-header";

const cop = (value: Decimal | null) => (toNumber(value) === null ? null : formatCop(value));

/*
 * The cells of a request line, compacted like the quoter's: a main line and
 * quieter ones under it, so a row says product, costs, change, date and
 * discounts without sideways scrolling.
 */

function ProductCell({ line, showRow }: { line: RequestLine; showRow: boolean }) {
  const meta = [
    showRow && line.row_number !== null ? `Fila ${line.row_number}` : null,
    line.supplier_sku && `SKU proveedor ${line.supplier_sku}`,
    line.ean && `EAN ${line.ean}`,
  ]
    .filter(Boolean)
    .join(" · ");
  return (
    <div className="min-w-0 space-y-0.5">
      <span className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5">
        <span className="font-mono text-[13px] font-semibold">{line.sku}</span>
        <RegionalTag line={line} />
      </span>
      {line.description && (
        <span className="block truncate text-[13px]" title={line.description}>
          {line.description}
        </span>
      )}
      {meta && (
        <span className={secondary} title={meta}>
          {meta}
        </span>
      )}
    </div>
  );
}

/** Old and new cost, each without and with the healthy-food tax; the new one leads. */
function CostsCell({ line }: { line: RequestLine }) {
  return (
    <Figures
      rows={[
        { label: "Anterior", value: cop(line.old_cost) },
        { label: "con imp.", value: cop(line.old_cost_with_tax), title: "Costo anterior con impuesto saludable" },
        { label: "Nuevo", value: cop(line.new_cost), strong: true },
        { label: "con imp.", value: cop(line.new_cost_with_tax), title: "Costo nuevo con impuesto saludable" },
      ]}
    />
  );
}

function ChangeCell({ line }: { line: RequestLine }) {
  const look = line.change ? INCREASE_STATUS[line.change] : null;
  return (
    <div className="space-y-1">
      {look && <Badge tone={look.tone}>{line.change_label ?? look.label}</Badge>}
      <Figures
        rows={[
          { label: "Pesos", value: toNumber(line.variation_amount) === null ? null : formatSignedCop(line.variation_amount), strong: true },
          { label: "%", value: toNumber(line.variation_pct) === null ? null : formatSignedPct(line.variation_pct) },
        ]}
      />
    </div>
  );
}

/**
 * Where the line's cost holds. A quiet tag beside the reference: the same
 * reference can come in several lines, one per regional. RESTO names what it
 * covers, since that depends on the other lines.
 */
export function RegionalTag({ line }: { line: Pick<RequestLine, "regional" | "regionals"> }) {
  const covers = line.regional === REST && line.regionals.length > 0 ? `Cubre ${regionalList(line.regionals)}` : undefined;
  return (
    <span
      className="max-w-full truncate rounded-sm border border-border px-1.5 text-xs leading-5 text-text-secondary"
      title={covers ?? (line.regional === NATIONAL ? "El mismo costo en todo el país" : undefined)}
    >
      {regionalLabel(line.regional)}
      {covers && <span className="sr-only">. {covers}</span>}
    </span>
  );
}

/** When the increase starts, the regular discount, the PVP, and the MAESTRA's observation. */
function TermsCell({ line }: { line: RequestLine }) {
  const terms = [
    toNumber(line.regular_discount_pct) !== null ? `Descuento ${formatPct(line.regular_discount_pct)}` : null,
    toNumber(line.public_price) !== null ? `PVP sin IVA ${formatCop(line.public_price)}` : null,
  ].filter(Boolean);
  return (
    <div className="min-w-0 space-y-0.5">
      <span className="block font-semibold tabular-nums">{formatDay(line.increased_on)}</span>
      {line.regional === REST && line.regionals.length > 0 && (
        <span className="line-clamp-2 text-xs text-text-secondary" title={`Resto de regionales: ${regionalList(line.regionals)}`}>
          Resto: {regionalList(line.regionals)}
        </span>
      )}
      {terms.length > 0 ? (
        terms.map((term) => (
          <span key={term} className={secondary}>
            {term}
          </span>
        ))
      ) : (
        <span className={secondary}>Sin descuento ni PVP</span>
      )}
      {line.observation && <span className="block truncate text-xs">{line.observation.replace(/_/g, " ")}</span>}
    </div>
  );
}

/**
 * The lines of a request the way the area reads the MAESTRA. `actions` adds
 * the review column; a line left out stays listed, muted, and says so.
 * Phones get one card per line.
 */
export default function IncreaseLinesTable({
  lines,
  caption,
  showRow = false,
  actions,
}: {
  lines: RequestLine[];
  caption: string;
  /** The sheet row, for a workbook. */
  showRow?: boolean;
  actions?: (line: RequestLine) => React.ReactNode;
}) {
  return (
    <>
      <ul className="space-y-2 md:hidden" aria-label={caption}>
        {lines.map((line) => (
          <li key={line.id} className={cn("space-y-3 rounded-lg border border-border bg-surface p-3 text-sm", !line.accepted && "text-text-secondary")}>
            <ProductCell line={line} showRow={showRow} />
            <div className="grid grid-cols-2 gap-3">
              <CostsCell line={line} />
              <ChangeCell line={line} />
            </div>
            <TermsCell line={line} />
            {!line.accepted && <p className="text-xs font-medium">Por fuera de la solicitud</p>}
            {actions && <div className="flex flex-wrap gap-2">{actions(line)}</div>}
          </li>
        ))}
      </ul>

      <div className="relative hidden overflow-x-auto rounded-lg border border-border bg-surface md:block">
        <table className="w-full min-w-[46rem] table-fixed text-left text-sm">
          <caption className="sr-only">{caption}</caption>
          <colgroup>
            <col />
            <col style={{ width: "22%" }} />
            <col style={{ width: "15%" }} />
            <col style={{ width: "20%" }} />
            {actions && <col style={{ width: "9.5rem" }} />}
          </colgroup>
          <thead className="bg-canvas-subtle text-[11px] font-semibold uppercase tracking-[0.06em] text-text-secondary">
            <tr>
              <th scope="col" className={th}>Producto</th>
              <th scope="col" className={th}>Costo sin y con impuesto</th>
              <th scope="col" className={th}>Variación</th>
              <th scope="col" className={th}>Fecha, descuento y PVP</th>
              {actions && <th scope="col" className={th}>Revisión</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {lines.map((line) => (
              <tr key={line.id} className={cn("hover:bg-primary-subtle", !line.accepted && "text-text-secondary")}>
                <td className={td}>
                  <ProductCell line={line} showRow={showRow} />
                  {!line.accepted && <span className="mt-1 block text-xs font-medium">Por fuera de la solicitud</span>}
                </td>
                <td className={td}>
                  <CostsCell line={line} />
                </td>
                <td className={td}>
                  <ChangeCell line={line} />
                </td>
                <td className={td}>
                  <TermsCell line={line} />
                </td>
                {actions && <td className={cn(td, "px-1.5")}>{actions(line)}</td>}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
