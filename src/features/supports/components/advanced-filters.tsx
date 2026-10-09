"use client";

import { useId, useState } from "react";
import { Plus, Trash2 } from "lucide-react";

import { Button } from "@/shared/components/ui/button";
import { DatePicker } from "@/shared/components/ui/date-picker";
import { Dropdown } from "@/shared/components/ui/dropdown";
import { Input } from "@/shared/components/ui/input";

import { humanize } from "../lib/format";
import type { FilterCondition, FilterField, FilterOp } from "../types/support.types";

const OP_LABELS: Record<FilterOp, string> = {
  eq: "es igual a",
  neq: "es distinto de",
  in: "es uno de",
  nin: "no es ninguno de",
  contains: "contiene",
  starts_with: "empieza por",
  is_null: "está vacío",
  not_null: "tiene valor",
  gt: "mayor que",
  gte: "mayor o igual que",
  lt: "menor que",
  lte: "menor o igual que",
  between: "entre",
  overlaps: "incluye alguno de",
  contains_all: "incluye todos de",
  is_empty: "no tiene elementos",
  not_empty: "tiene elementos",
};

const NO_VALUE: FilterOp[] = ["is_null", "not_null", "is_empty", "not_empty"];
const LIST_OPS: FilterOp[] = ["in", "nin", "overlaps", "contains_all"];

interface Row {
  key: number;
  field: string;
  op: FilterOp | "";
  a: string;
  b: string;
}

const opLabel = (op: FilterOp) => OP_LABELS[op] ?? humanize(op);

const splitList = (text: string) =>
  text
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);

/** An incomplete row yields null: it is skipped rather than sent half-filled. */
function toCondition(row: Row, field: FilterField | undefined): FilterCondition | null {
  if (!field || row.op === "") return null;
  if (NO_VALUE.includes(row.op)) return { field: field.field, op: row.op };

  const parse = (text: string): string | number | boolean | null => {
    if (text.trim() === "") return null;
    if (field.type === "number") {
      const parsed = Number(text.replace(",", "."));
      return Number.isFinite(parsed) ? parsed : null;
    }
    if (field.type === "bool") return text === "true";
    return text.trim();
  };

  if (row.op === "between") {
    const from = parse(row.a);
    const to = parse(row.b);
    return from === null || to === null ? null : { field: field.field, op: row.op, value: [from, to] };
  }
  if (LIST_OPS.includes(row.op)) {
    const items = splitList(row.a).map(parse).filter((item) => item !== null);
    return items.length === 0 ? null : { field: field.field, op: row.op, value: items };
  }
  const value = parse(row.a);
  return value === null ? null : { field: field.field, op: row.op, value };
}

/**
 * Filter builder driven by the API's field catalog: the fields, their types
 * and the operators each accepts all come from `/search/fields`, so a field
 * the API adds shows up here without a UI change. Conditions are sent only on
 * "Aplicar": the search endpoint is rate limited and a half-built condition is
 * not a query.
 */
export default function AdvancedFilters({
  fields,
  onApply,
}: {
  fields: FilterField[];
  onApply: (match: "all" | "any", conditions: FilterCondition[]) => void;
}) {
  const id = useId();
  const [match, setMatch] = useState<"all" | "any">("all");
  const [rows, setRows] = useState<Row[]>([]);
  const [nextKey, setNextKey] = useState(1);

  const byName = new Map(fields.map((field) => [field.field, field]));
  const fieldOptions = fields.map((field) => ({ value: field.field, label: field.label }));

  const update = (key: number, patch: Partial<Row>) =>
    setRows((current) => current.map((row) => (row.key === key ? { ...row, ...patch } : row)));

  const addRow = () => {
    const first = fields[0];
    if (!first) return;
    setRows((current) => [
      ...current,
      { key: nextKey, field: first.field, op: first.operators[0] ?? "", a: "", b: "" },
    ]);
    setNextKey((value) => value + 1);
  };

  const apply = () => {
    const conditions = rows
      .map((row) => toCondition(row, byName.get(row.field)))
      .filter((condition): condition is FilterCondition => condition !== null);
    onApply(match, conditions);
  };

  const clear = () => {
    setRows([]);
    onApply("all", []);
  };

  return (
    <div className="space-y-3 rounded-lg border border-border bg-surface p-4">
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span id={`${id}-match`} className="text-text-secondary">
          Cumplir
        </span>
        <Dropdown
          className="w-44"
          size="sm"
          aria-labelledby={`${id}-match`}
          value={match}
          onValueChange={(value) => setMatch(value as "all" | "any")}
          options={[
            { value: "all", label: "todas las condiciones" },
            { value: "any", label: "alguna condición" },
          ]}
        />
      </div>

      {rows.length === 0 ? (
        <p className="text-sm text-text-secondary">
          Aún no hay condiciones. Agrega una para filtrar por cualquier campo del maestro.
        </p>
      ) : (
        <ul className="space-y-2">
          {rows.map((row) => {
            const field = byName.get(row.field);
            const opOptions = (field?.operators ?? []).map((op) => ({ value: op, label: opLabel(op) }));
            return (
              <li
                key={row.key}
                className="grid gap-2 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1.4fr)_auto] md:items-center"
              >
                <Dropdown
                  aria-label="Campo"
                  value={row.field}
                  options={fieldOptions}
                  onValueChange={(value) => {
                    const next = byName.get(value);
                    update(row.key, { field: value, op: next?.operators[0] ?? "", a: "", b: "" });
                  }}
                />
                <Dropdown
                  aria-label="Operador"
                  value={row.op}
                  options={opOptions}
                  onValueChange={(value) => update(row.key, { op: value as FilterOp, a: "", b: "" })}
                />
                <ValueInput row={row} field={field} onChange={(patch) => update(row.key, patch)} />
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setRows((current) => current.filter((item) => item.key !== row.key))}
                  aria-label={`Quitar condición sobre ${field?.label ?? "campo"}`}
                  className="max-md:justify-self-end"
                >
                  <Trash2 aria-hidden="true" />
                </Button>
              </li>
            );
          })}
        </ul>
      )}

      <p className="text-xs text-text-secondary">
        Los porcentajes se escriben como fracción (0,05 es 5 %). En las listas, separa los valores con comas.
      </p>

      <div className="flex flex-wrap gap-2">
        <Button variant="outline" onClick={addRow} disabled={fields.length === 0}>
          <Plus aria-hidden="true" /> Agregar condición
        </Button>
        <Button onClick={apply}>Aplicar filtros</Button>
        <Button variant="ghost" onClick={clear} disabled={rows.length === 0}>
          Quitar condiciones
        </Button>
      </div>
    </div>
  );
}

function ValueInput({
  row,
  field,
  onChange,
}: {
  row: Row;
  field: FilterField | undefined;
  onChange: (patch: Partial<Row>) => void;
}) {
  if (!field || row.op === "" || NO_VALUE.includes(row.op)) {
    return <span className="text-sm text-text-secondary max-md:hidden">Sin valor</span>;
  }

  if (field.type === "bool") {
    return (
      <Dropdown
        aria-label="Valor"
        value={row.a}
        placeholder="Elige"
        onValueChange={(value) => onChange({ a: value })}
        options={[
          { value: "true", label: "Sí" },
          { value: "false", label: "No" },
        ]}
      />
    );
  }

  if (field.type === "date") {
    if (row.op === "between") {
      return (
        <div className="grid grid-cols-2 gap-2">
          <DatePicker value={row.a} onChange={(a) => onChange({ a })} placeholder="Desde" max={row.b || undefined} />
          <DatePicker value={row.b} onChange={(b) => onChange({ b })} placeholder="Hasta" min={row.a || undefined} />
        </div>
      );
    }
    if (!LIST_OPS.includes(row.op)) {
      return <DatePicker value={row.a} onChange={(a) => onChange({ a })} placeholder="Elige una fecha" />;
    }
  }

  if (field.type === "enum" && field.values && field.values.length > 0 && (row.op === "eq" || row.op === "neq")) {
    return (
      <Dropdown
        aria-label="Valor"
        value={row.a}
        placeholder="Elige"
        onValueChange={(value) => onChange({ a: value })}
        options={field.values.map((value) => ({ value, label: humanize(value) }))}
      />
    );
  }

  if (row.op === "between") {
    return (
      <div className="grid grid-cols-2 gap-2">
        <Input
          inputMode="decimal"
          aria-label="Desde"
          placeholder="Desde"
          value={row.a}
          onChange={(event) => onChange({ a: event.target.value })}
        />
        <Input
          inputMode="decimal"
          aria-label="Hasta"
          placeholder="Hasta"
          value={row.b}
          onChange={(event) => onChange({ b: event.target.value })}
        />
      </div>
    );
  }

  const isList = LIST_OPS.includes(row.op);
  return (
    <Input
      inputMode={field.type === "number" && !isList ? "decimal" : undefined}
      aria-label="Valor"
      placeholder={isList ? "valor1, valor2" : "Valor"}
      value={row.a}
      onChange={(event) => onChange({ a: event.target.value })}
    />
  );
}
