"use client";

import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";

import { Menu, MenuItem, MenuLabel, MenuRadioGroup, MenuRadioItem, MenuSeparator } from "@/shared/components/ui/menu";
import { toNumber } from "@/shared/lib/format";
import { cn } from "@/shared/lib/utils";

import { choiceLabel, formatCop, formatDay, formatPct, formatSupplierValue } from "../lib/format";
import type { PerUnit, SupplierSupport } from "../types/support.types";
import { AttachmentBadge, FlagBadges, StateBadge } from "./support-badges";

export interface CellContext {
  open: () => void;
  methodLabel: (code: string | null | undefined) => string;
}

export interface Column {
  key: string;
  label: string;
  /**
   * Fields the header can sort by, with their names in its menu. Only the ones
   * the API's catalog lists as sortable are offered.
   */
  sorts?: [field: string, name: string][];
  align?: "right";
  /** The person can hide it from the "Columnas" menu. */
  hideable?: boolean;
  /** Share of the fixed-layout table; the product takes what the others leave. */
  width?: string;
  cell: (support: SupplierSupport, context: CellContext) => React.ReactNode;
}

/** The quoter's table grammar: tight header, cells aligned to the top. */
export const th = "h-12 px-2.5 py-1.5 align-middle leading-tight";
export const td = "px-2.5 py-2 align-top";

const dash = <span className="text-text-secondary" aria-label="sin dato">—</span>;
const secondary = "block truncate text-xs text-text-secondary";

/**
 * What the support is for: SKU first (what people search by), the description
 * under it, and the brand and supplier as the quiet line. It opens the detail.
 */
function ProductCell({ support, open }: { support: SupplierSupport; open: () => void }) {
  const supplier = support.supplier_name
    ? `${support.supplier_name}${support.supplier_code ? ` (${support.supplier_code})` : ""}`
    : support.supplier_code;
  const meta = [support.product_brand ?? support.brand, supplier].filter(Boolean).join(" · ");
  const description = support.product_sku ? support.product_description : "Todo el portafolio";
  return (
    <div className="min-w-0 space-y-0.5">
      <button
        type="button"
        onClick={open}
        title={description ?? undefined}
        className={cn(
          "block max-w-full rounded-sm text-left underline-offset-2 hover:underline",
          "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        )}
      >
        <span className="block font-semibold tabular-nums">{support.product_sku ?? "Sin SKU"}</span>
        {description && <span className="block truncate text-[13px]">{description}</span>}
        <span className="sr-only">. Ver el detalle del apoyo</span>
      </button>
      <span className={secondary} title={meta || undefined}>{meta || "Sin proveedor"}</span>
    </div>
  );
}

function CustomerCell({ support }: { support: SupplierSupport }) {
  const scope = [support.regionals.join(", "), support.business_units.join(", ")].filter(Boolean).join(" · ");
  return (
    <div className="min-w-0 space-y-0.5">
      <span className="block truncate" title={support.customer_name ?? undefined}>
        {support.customer_name ?? support.customer_group ?? "Todos"}
      </span>
      {support.customer_nit && <span className={cn(secondary, "font-mono tabular-nums")}>{support.customer_nit}</span>}
      {scope && <span className={secondary} title={scope}>{scope}</span>}
    </div>
  );
}

/** Type of support with its value, and the class under it. */
function SupportCell({ support, methodLabel }: { support: SupplierSupport; methodLabel: CellContext["methodLabel"] }) {
  const value = toNumber(support.supplier_value) === null ? null : formatSupplierValue(support.calc_method, support.supplier_value);
  const meta = [support.kind ? choiceLabel("kind", support.kind) : null, support.value_unit ? `por ${support.value_unit}` : null]
    .filter(Boolean)
    .join(" · ");
  return (
    <div className="min-w-0 space-y-0.5">
      {value && <span className="block font-semibold tabular-nums">{value}</span>}
      <span className="block text-[13px]">{methodLabel(support.calc_method)}</span>
      {meta && <span className={secondary} title={meta}>{meta}</span>}
    </div>
  );
}

/** Label and figure on one line; the figure the row is about goes in bold. */
function Figures({ rows }: { rows: { label: string; value: string | null; strong?: boolean; title?: string }[] }) {
  return (
    <dl className="space-y-0.5 text-[13px] tabular-nums">
      {rows.map((row) => (
        <div key={row.label} className="flex items-baseline justify-between gap-4" title={row.title}>
          <dt className="whitespace-nowrap text-xs text-text-secondary">{row.label}</dt>
          <dd className={cn("whitespace-nowrap", row.strong && "font-semibold")}>{row.value ?? dash}</dd>
        </div>
      ))}
    </dl>
  );
}

const pct = (value: Parameters<typeof toNumber>[0]) => (toNumber(value) === null ? null : formatPct(value));
const cop = (value: Parameters<typeof toNumber>[0]) => (toNumber(value) === null ? null : formatCop(value));

/** From the product's margin, to what the supplier's money leaves at list price, to how far it may drop. */
function MarginsCell({ support }: { support: SupplierSupport }) {
  const derived = support.derived;
  return (
    <Figures
      rows={[
        { label: "Producto", value: pct(derived?.product_margin_pct), title: "Margen general del producto (maestro de márgenes)" },
        { label: "Recompuesto", value: pct(derived?.recomposed_list_margin), title: "Margen que deja el apoyo del proveedor al precio lista" },
        { label: "Apoyado", value: pct(derived?.supported_margin_pct ?? support.supported_margin_pct), strong: true },
      ]}
    />
  );
}

/**
 * Cost, list price and supported price in the support's own unit (the box when
 * it is per box), and the customer's discount against the list price. Without
 * a supported margin the price shown is the suggested one, and it says so.
 */
function PriceCell({ support }: { support: SupplierSupport }) {
  const derived = support.derived;
  const preferred: keyof PerUnit = support.value_unit === "caja" ? "box" : "unit";
  const other: keyof PerUnit = preferred === "box" ? "unit" : "box";
  const has = (pair: PerUnit | null | undefined, side: keyof PerUnit) => toNumber(pair?.[side]) !== null;
  const side = [derived?.cost, derived?.list_price, derived?.supported_price_per].some((pair) => has(pair, preferred))
    ? preferred
    : other;
  const supported = derived?.supported_price_per;
  const price = has(supported, side) ? supported : derived?.suggested_price_per;
  return (
    <div className="space-y-0.5">
      <Figures
        rows={[
          { label: "Costo", value: cop(derived?.cost?.[side]) },
          { label: "Lista", value: cop(derived?.list_price?.[side]) },
          { label: price === supported ? "Apoyado" : "Sugerido", value: cop(price?.[side]), strong: true },
          { label: "Dcto. cliente", value: pct(derived?.customer_discount_pct), title: "Descuento al cliente frente al precio lista" },
        ]}
      />
      {/* The support cell already names its unit; say it here only when the prices are in another one. */}
      {side !== preferred || !support.value_unit ? (
        <span className="block text-right text-xs text-text-secondary">por {side === "box" ? "caja" : "unidad"}</span>
      ) : null}
    </div>
  );
}

function ValidityCell({ support }: { support: SupplierSupport }) {
  return (
    <div className="space-y-1">
      <StateBadge value={support.state} />
      <span className="block whitespace-nowrap text-xs tabular-nums text-text-secondary">
        {formatDay(support.valid_from)} a {support.valid_to ? formatDay(support.valid_to) : "indefinido"}
      </span>
      <span className="flex flex-wrap gap-1">
        <AttachmentBadge support={support} />
        <FlagBadges support={support} />
      </span>
    </div>
  );
}

/**
 * A view-only table, compacted the way the quoter's is: each cell holds a main
 * line and quieter ones under it, so one row says product, customer, support,
 * margins, price and validity without sideways scrolling.
 */
export const COLUMNS: Column[] = [
  {
    key: "product",
    label: "Producto",
    sorts: [
      ["product_sku", "SKU"],
      ["brand", "Marca"],
      ["supplier.name", "Proveedor"],
    ],
    cell: (s, { open }) => <ProductCell support={s} open={open} />,
  },
  {
    key: "customer",
    label: "Cliente",
    sorts: [["customer_name", "Cliente"]],
    hideable: true,
    width: "15%",
    cell: (s) => <CustomerCell support={s} />,
  },
  {
    key: "support",
    label: "Apoyo",
    sorts: [
      ["supplier_value", "Valor"],
      ["kind", "Clase"],
    ],
    width: "15%",
    cell: (s, { methodLabel }) => <SupportCell support={s} methodLabel={methodLabel} />,
  },
  {
    key: "margins",
    label: "Márgenes",
    hideable: true,
    width: "14%",
    cell: (s) => <MarginsCell support={s} />,
  },
  {
    key: "price",
    label: "Precio",
    hideable: true,
    width: "17%",
    cell: (s) => <PriceCell support={s} />,
  },
  {
    key: "validity",
    label: "Vigencia y estado",
    sorts: [
      ["valid_from", "Fecha de inicio"],
      ["valid_to", "Fecha de fin"],
    ],
    width: "13%",
    cell: (s) => <ValidityCell support={s} />,
  },
];

export type SortDirection = "asc" | "desc";

const DATE_FIELDS = ["valid_from", "valid_to"];
const NUMBER_FIELDS = ["supplier_value"];

/** How each direction reads for the kind of field: dates by age, numbers by size, text alphabetically. */
function orderWords(field: string): Record<SortDirection, string> {
  if (DATE_FIELDS.includes(field)) return { asc: "Más antigua primero", desc: "Más reciente primero" };
  if (NUMBER_FIELDS.includes(field)) return { asc: "Menor a mayor", desc: "Mayor a menor" };
  return { asc: "De la A a la Z", desc: "De la Z a la A" };
}

/**
 * A column header that sorts by any of its fields, from a menu, like the
 * quoter's. A column with no sortable field is plain text.
 */
export function SortHeader({
  column,
  sortable,
  sort,
  onSort,
}: {
  column: Column;
  sortable: Set<string>;
  /** The API's sort list: "field" ascending, "-field" descending. */
  sort: string[];
  /** null puts back the list's default order. */
  onSort: (field: string | null, direction?: SortDirection) => void;
}) {
  const keys = (column.sorts ?? []).filter(([field]) => sortable.has(field));
  const head = sort[0] ?? "";
  const activeField = head.replace(/^-/, "");
  const active = keys.find(([field]) => field === activeField) ?? null;
  const direction: SortDirection = head.startsWith("-") ? "desc" : "asc";
  const className = cn(th, column.align === "right" && "text-right");

  if (keys.length === 0) {
    return (
      <th scope="col" className={className}>
        {column.label}
      </th>
    );
  }

  const Icon = !active ? ArrowUpDown : direction === "desc" ? ArrowDown : ArrowUp;
  const words = active
    ? `${keys.length > 1 ? `${active[1]}: ` : ""}${orderWords(active[0])[direction]}`
    : null;

  return (
    <th scope="col" aria-sort={active ? (direction === "asc" ? "ascending" : "descending") : undefined} className={className}>
      <Menu
        trigger={
          <>
            <span>{column.label}</span>
            <Icon className={cn("size-3 shrink-0", active ? "text-text-primary" : "text-text-secondary")} aria-hidden="true" />
          </>
        }
        triggerLabel={`Ordenar por ${column.label}${words ? `. Ahora: ${words}` : ""}`}
        triggerTitle={words ? `${column.label}, ordenado: ${words}` : `Ordenar por ${column.label}`}
        triggerClassName={cn(
          "inline-flex min-h-8 max-w-full items-center gap-1 rounded-sm font-semibold uppercase tracking-[0.06em] hover:text-text-primary",
          "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
          active && "text-text-primary"
        )}
      >
        <MenuRadioGroup
          value={active ? `${active[0]}:${direction}` : ""}
          label={`Orden por ${column.label}`}
          onValueChange={(next) => {
            const separator = next.lastIndexOf(":");
            onSort(next.slice(0, separator), next.slice(separator + 1) as SortDirection);
          }}
        >
          {keys.map(([field, name], index) => (
            <div key={field}>
              {keys.length > 1 && (
                <>
                  {index > 0 && <MenuSeparator />}
                  <MenuLabel>{name}</MenuLabel>
                </>
              )}
              <MenuRadioItem value={`${field}:asc`}>{orderWords(field).asc}</MenuRadioItem>
              <MenuRadioItem value={`${field}:desc`}>{orderWords(field).desc}</MenuRadioItem>
            </div>
          ))}
        </MenuRadioGroup>
        {active && (
          <>
            <MenuSeparator />
            <MenuItem onClick={() => onSort(null)}>Quitar el orden</MenuItem>
          </>
        )}
      </Menu>
    </th>
  );
}
