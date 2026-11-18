"use client";

import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";

import { Menu, MenuItem, MenuLabel, MenuRadioGroup, MenuRadioItem, MenuSeparator } from "@/shared/components/ui/menu";
import { toNumber } from "@/shared/lib/format";
import { cn } from "@/shared/lib/utils";

import {
  authorizedMargin,
  choiceLabel,
  formatCop,
  formatDay,
  formatPct,
  supportValueText,
  marginListLabel,
  PERCENT_METHODS,
  PRICE_LABELS,
  RECOMPOSED_HELP,
  SUPPORTED_MARGIN_LABEL,
} from "../lib/format";
import type { PerUnit, SupplierSupport } from "../types/support.types";
import { AttachmentBadge, FlagBadges, StateBadge } from "./support-badges";

export interface CellContext {
  open: () => void;
  methodLabel: (code: string | null | undefined) => string;
  /** BI sees the cost; Comercial gets it empty from the API, so its rows are left out. */
  seesCost: boolean;
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
  /** The full name, as the header's tooltip and accessible name, when `label` is short. */
  title?: string;
  /** Consecutive columns of a group share a header above theirs, and hide together. */
  group?: { key: string; label: string };
  /** Only BI sees it: Comercial gets the cost empty. */
  costOnly?: boolean;
  /** Less side padding, for a narrow column of figures that sits next to others like it. */
  tight?: boolean;
  /** A one-line figure, centered on the row's height instead of at its top. */
  middle?: boolean;
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
  const meta = [support.product_brand ?? support.brand, support.supplier_name].filter(Boolean).join(" · ");
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
      <ScopeChips support={support} />
    </div>
  );
}

/**
 * The margin list the prices use and the business group, when the API knows
 * them. The group shows only when the name line is not already the group.
 */
export function ScopeChips({ support }: { support: SupplierSupport }) {
  const list = marginListLabel(support.margin_list);
  const group = support.business_group && support.business_group !== (support.customer_name ?? support.customer_group) ? support.business_group : null;
  if (!list && !group) return null;
  return (
    <span className="flex flex-wrap gap-1 pt-0.5">
      {list && (
        <span className={chip} title="Lista de márgenes con la que se calculan los precios">
          {list}
        </span>
      )}
      {group && (
        <span className={chip} title={`Grupo empresarial: ${group}`}>
          {group}
        </span>
      )}
    </span>
  );
}

/** Quiet on purpose: context next to the customer, not a state. */
const chip = "max-w-full truncate rounded-sm border border-border px-1.5 text-xs leading-5 text-text-secondary";

/** Type of support with its value, and the class under it. */
function SupportCell({ support, methodLabel }: { support: SupplierSupport; methodLabel: CellContext["methodLabel"] }) {
  const text = supportValueText(support);
  const value = text === "—" ? null : text;
  // The unit only reads a value in pesos; on a percentage it says nothing.
  const inPesos = !PERCENT_METHODS.includes(support.calc_method ?? "");
  const meta = [support.kind ? choiceLabel("kind", support.kind) : null, inPesos && support.value_unit ? `por ${support.value_unit}` : null]
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
        <div key={row.label} className="flex items-baseline justify-between gap-2" title={row.title}>
          <dt className="whitespace-nowrap text-xs text-text-secondary">{row.label}</dt>
          <dd className={cn("whitespace-nowrap", row.strong && "font-semibold")}>{row.value ?? dash}</dd>
        </div>
      ))}
    </dl>
  );
}

const pct = (value: Parameters<typeof toNumber>[0]) => (toNumber(value) === null ? null : formatPct(value));
const cop = (value: Parameters<typeof toNumber>[0]) => (toNumber(value) === null ? null : formatCop(value));

/** From the product's margin, to what the supplier's money leaves at list price, to JDH's authorized floor. */
function MarginsCell({ support }: { support: SupplierSupport }) {
  const derived = support.derived;
  return (
    <Figures
      rows={[
        { label: "Producto", value: pct(derived?.product_margin_pct), title: "Margen general del producto (maestro de márgenes)" },
        { label: "Recompuesto", value: pct(derived?.margin_recomposed), title: RECOMPOSED_HELP },
        {
          label: "Mínimo JDH",
          value: pct(authorizedMargin(support)),
          strong: true,
          title: SUPPORTED_MARGIN_LABEL,
        },
      ]}
    />
  );
}

type PriceKey = "cost" | "list_price" | "suggested_price_per" | "supported_price_per";
const PRICE_KEYS: PriceKey[] = ["cost", "list_price", "suggested_price_per", "supported_price_per"];
const hasSide = (pair: PerUnit | null | undefined, side: keyof PerUnit) => toNumber(pair?.[side]) !== null;

/**
 * Which side every price of a row is shown in: the support's own unit (the
 * box when it is per box) when the API has it there, else the other one. All
 * the prices of a row go in the same unit, so they compare at a glance.
 */
export function priceSide(support: SupplierSupport): { side: keyof PerUnit; noted: boolean } {
  const derived = support.derived;
  const preferred: keyof PerUnit = support.value_unit === "caja" ? "box" : "unit";
  const side = PRICE_KEYS.some((key) => hasSide(derived?.[key], preferred)) ? preferred : preferred === "box" ? "unit" : "box";
  const any = PRICE_KEYS.some((key) => hasSide(derived?.[key], side));
  // The support cell already names its unit; say it only when the prices are in another one.
  return { side, noted: any && (side !== preferred || !support.value_unit) };
}

/**
 * One price of the row, never truncated; a dash when the API
 * has none (the minimum only exists with a JDH margin). The list price carries
 * the unit when it is not the support's own.
 */
export function PriceValue({
  support,
  field,
  align = "right",
}: {
  support: SupplierSupport;
  field: PriceKey;
  /** Left in the desktop table and in the mobile stack, under its label. */
  align?: "left" | "right";
}) {
  const { side, noted } = priceSide(support);
  const value = cop(support.derived?.[field]?.[side]);
  // The minimum is the price the support allows, so it leads when there is one.
  const strong = field === "supported_price_per" || (field === "suggested_price_per" && !hasSide(support.derived?.supported_price_per, side));
  // Spans only: the mobile row puts it inside a button.
  return (
    <span className={cn("block text-[13px] tabular-nums", align === "right" && "text-right")}>
      <span className={cn("whitespace-nowrap", strong && value && "font-semibold")}>{value ?? dash}</span>
      {field === "list_price" && noted && (
        <span className="block text-xs text-text-secondary">por {side === "box" ? "caja" : "unidad"}</span>
      )}
    </span>
  );
}

const PRICE_GROUP = { key: "price", label: "Precio" };

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
    width: "12%",
    cell: (s) => <CustomerCell support={s} />,
  },
  {
    key: "support",
    label: "Apoyo",
    sorts: [
      ["supplier_value", "Valor"],
      ["kind", "Clase"],
    ],
    width: "12%",
    cell: (s, { methodLabel }) => <SupportCell support={s} methodLabel={methodLabel} />,
  },
  {
    key: "margins",
    label: "Márgenes",
    hideable: true,
    width: "13%",
    cell: (s) => <MarginsCell support={s} />,
  },
  // «Precio»: one group header over a sub-column per price, hidden together from «Columnas».
  {
    key: "price-cost",
    label: "Costo",
    title: "Costo por unidad de inventario (solo BI)",
    group: PRICE_GROUP,
    costOnly: true,
    tight: true,
    middle: true,
    width: "8.5%",
    cell: (s) => <PriceValue support={s} field="cost" align="left" />,
  },
  {
    key: "price-list",
    label: PRICE_LABELS.list.short,
    title: PRICE_LABELS.list.full,
    group: PRICE_GROUP,
    tight: true,
    middle: true,
    width: "9%",
    cell: (s) => <PriceValue support={s} field="list_price" align="left" />,
  },
  {
    key: "price-suggested",
    label: PRICE_LABELS.suggested.short,
    title: `${PRICE_LABELS.suggested.full}: precio de lista − $ Apoyo`,
    group: PRICE_GROUP,
    tight: true,
    middle: true,
    width: "9%",
    cell: (s) => <PriceValue support={s} field="suggested_price_per" align="left" />,
  },
  {
    key: "price-minimum",
    label: PRICE_LABELS.minimum.short,
    title: `${PRICE_LABELS.minimum.full}: (costo − apoyo) / (1 − margen mínimo autorizado JDH)`,
    group: PRICE_GROUP,
    tight: true,
    middle: true,
    width: "9%",
    cell: (s) => <PriceValue support={s} field="supported_price_per" align="left" />,
  },
  {
    key: "validity",
    label: "Vigencia y estado",
    sorts: [
      ["valid_from", "Fecha de inicio"],
      ["valid_to", "Fecha de fin"],
    ],
    width: "11%",
    cell: (s) => <ValidityCell support={s} />,
  },
];

/** What the «Columnas» menu hides: a column, or a whole group of them under one name. */
export function hideKeyOf(column: Column): string {
  return column.group?.key ?? column.key;
}

/** One entry per column or group, for the «Columnas» menu. */
export const HIDEABLE = COLUMNS.filter((column) => column.hideable || column.group).filter(
  (column, index, all) => all.findIndex((other) => hideKeyOf(other) === hideKeyOf(column)) === index
).map((column) => ({ key: hideKeyOf(column), label: column.group?.label ?? column.label }));

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
  rowSpan,
}: {
  column: Column;
  sortable: Set<string>;
  /** The API's sort list: "field" ascending, "-field" descending. */
  sort: string[];
  /** null puts back the list's default order. */
  onSort: (field: string | null, direction?: SortDirection) => void;
  /** 2 when the header has a second row (a column group) and this column has none. */
  rowSpan?: number;
}) {
  const keys = (column.sorts ?? []).filter(([field]) => sortable.has(field));
  const head = sort[0] ?? "";
  const activeField = head.replace(/^-/, "");
  const active = keys.find(([field]) => field === activeField) ?? null;
  const direction: SortDirection = head.startsWith("-") ? "desc" : "asc";
  const className = cn(th, column.align === "right" && "text-right", column.tight && "px-1.5");

  if (keys.length === 0) {
    return (
      <th scope="col" rowSpan={rowSpan} className={className} title={column.title}>
        {column.title ? (
          <>
            <span aria-hidden="true">{column.label}</span>
            <span className="sr-only">{column.title}</span>
          </>
        ) : (
          column.label
        )}
      </th>
    );
  }

  const Icon = !active ? ArrowUpDown : direction === "desc" ? ArrowDown : ArrowUp;
  const words = active
    ? `${keys.length > 1 ? `${active[1]}: ` : ""}${orderWords(active[0])[direction]}`
    : null;

  return (
    <th scope="col" rowSpan={rowSpan} aria-sort={active ? (direction === "asc" ? "ascending" : "descending") : undefined} className={className}>
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
