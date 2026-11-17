"use client";

import { useId, useState } from "react";

import { Autocomplete, type AutocompleteOption } from "@/shared/components/ui/autocomplete";
import { DatePicker } from "@/shared/components/ui/date-picker";
import { Dropdown } from "@/shared/components/ui/dropdown";
import { Field } from "@/shared/components/ui/field";
import { Input } from "@/shared/components/ui/input";
import { Textarea } from "@/shared/components/ui/textarea";

import { useDebouncedValue } from "@/shared/hooks/use-debounced-value";

import { useBusinessGroups, useCalcMethodLabel } from "../hooks/use-supports";
import { choiceLabel, toOptions } from "../lib/format";
import { isPercentField, type Draft } from "../lib/form-values";
import type { CalcMethodRule, FormFieldSpec, SupportCatalogs } from "../types/support.types";
import BasePicker, { CUSTOMER_PICKER, PRODUCT_PICKER, type BasePickerConfig } from "@/shared/components/pickers/base-picker";
import MultiSelect from "./multi-select";

const PICKERS: Record<string, BasePickerConfig> = {
  customer_nit: CUSTOMER_PICKER,
  product_sku: PRODUCT_PICKER,
};

/** Long free text gets a text area; the API caps those at 2000 characters. */
const LONG_TEXT = 1000;

/**
 * The fields of a support as `form-schema` describes them, in its groups and
 * order. The creation form and the profile editor both render through here,
 * so a field the API adds shows up in both without a UI release.
 */
export default function SchemaFields({
  specs,
  draft,
  onChange,
  errors,
  rule,
  required,
  catalogs,
}: {
  specs: FormFieldSpec[];
  draft: Draft;
  onChange: (name: string, value: string | string[]) => void;
  errors: Record<string, string>;
  /** The chosen calc method; it decides how the supplier value is typed. */
  rule: CalcMethodRule | undefined;
  required: Set<string>;
  catalogs: SupportCatalogs | undefined;
}) {
  const groups: { name: string; specs: FormFieldSpec[] }[] = [];
  for (const spec of specs) {
    const group = groups.find((candidate) => candidate.name === spec.group);
    if (group) group.specs.push(spec);
    else groups.push({ name: spec.group, specs: [spec] });
  }

  return (
    <div className="space-y-6">
      {groups.map((group) => (
        <fieldset key={group.name} className="space-y-4">
          <legend className="mb-4 text-base font-semibold">{group.name}</legend>
          <div className="grid gap-x-4 gap-y-5 sm:grid-cols-2">
            {group.specs.map((spec) => (
              <SchemaField
                key={spec.name}
                spec={spec}
                value={draft[spec.name]}
                onChange={(value) => onChange(spec.name, value)}
                error={errors[spec.name]}
                rule={rule}
                isRequired={required.has(spec.name)}
                catalogs={catalogs}
              />
            ))}
          </div>
        </fieldset>
      ))}
    </div>
  );
}

function hintFor(spec: FormFieldSpec, rule: CalcMethodRule | undefined): string | undefined {
  if (spec.name === "calc_method" && rule?.help) return rule.help;
  // The API's help for this field speaks about the bulk file, not about typing it here.
  if (spec.name === "supplier_value") {
    return rule?.value_kind === "percent" ? "En porcentaje: 4,8 es 4,8 %." : "En pesos, sin separador de miles: 12500 o 12500,50.";
  }
  if (spec.type === "fraction") return spec.help || "En porcentaje: 5 es 5 %.";
  return spec.help || undefined;
}

function labelFor(spec: FormFieldSpec, rule: CalcMethodRule | undefined): string {
  if (spec.name !== "supplier_value") return spec.label;
  return `${spec.label} (${rule?.value_kind === "percent" ? "%" : "$"})`;
}

function SchemaField({
  spec,
  value,
  onChange,
  error,
  rule,
  isRequired,
  catalogs,
}: {
  spec: FormFieldSpec;
  value: string | string[] | undefined;
  onChange: (value: string | string[]) => void;
  error: string | undefined;
  rule: CalcMethodRule | undefined;
  isRequired: boolean;
  catalogs: SupportCatalogs | undefined;
}) {
  const id = useId();
  const methodLabel = useCalcMethodLabel();
  const hint = hintFor(spec, rule);
  const text = typeof value === "string" ? value : "";
  const describedBy = error ? `${id}-error` : hint ? `${id}-hint` : undefined;
  const common = { id, "aria-invalid": error ? true : undefined, "aria-describedby": describedBy };
  const field = (control: React.ReactNode, wide = false, shownHint = hint) => (
    <div className={wide ? "sm:col-span-2" : undefined}>
      <Field label={labelFor(spec, rule)} htmlFor={id} optional={!isRequired} hint={shownHint} error={error}>
        {control}
      </Field>
    </div>
  );

  const picker = PICKERS[spec.name];
  if (picker) {
    return <PickerField config={{ ...picker, label: spec.label }} value={text} onChange={onChange} hint={hint} error={error} />;
  }
  if (spec.name === "customer_group") {
    return field(<GroupField {...common} value={text} onChange={onChange} />);
  }

  switch (spec.type) {
    case "choice":
      return field(
        <Dropdown
          {...common}
          value={text}
          onValueChange={onChange}
          placeholder="Elige una opción"
          options={[
            ...(isRequired ? [] : [{ value: "", label: "Sin definir" }]),
            ...spec.choices.map((code) => ({
              value: code,
              label:
                spec.name === "calc_method"
                  ? methodLabel(code)
                  : choiceLabel(spec.name, code, spec.name === "kind" ? catalogs?.kind_labels : undefined),
            })),
          ]}
        />
      );
    case "list": {
      const vocabulary = catalogs?.[spec.name as keyof SupportCatalogs];
      const options = toOptions(Array.isArray(vocabulary) ? vocabulary : undefined, { raw: true }).map((option) => option.value);
      if (options.length === 0) {
        return field(<Input {...common} value={text} onChange={(event) => onChange(event.target.value)} />);
      }
      return field(
        <MultiSelect
          id={id}
          options={options}
          value={Array.isArray(value) ? value : []}
          onChange={onChange}
          emptyLabel="Todas, sin restricción"
          aria-describedby={error ? `${id}-error` : undefined}
        />,
        false,
        // The API's help explains how to type several values in a file; here they are ticked.
        undefined
      );
    }
    case "date":
      return field(<DatePicker {...common} value={text} onChange={onChange} clearable placeholder="Sin fecha" />);
    case "number":
    case "fraction":
      return field(
        <Input
          {...common}
          inputMode="decimal"
          value={text}
          onChange={(event) => onChange(event.target.value)}
          className={isPercentField(spec, rule) ? undefined : "tabular-nums"}
        />
      );
    default:
      if ((spec.max_length ?? 0) >= LONG_TEXT) {
        return field(
          <Textarea {...common} rows={3} maxLength={spec.max_length ?? undefined} value={text} onChange={(event) => onChange(event.target.value)} />,
          true
        );
      }
      return field(
        <Input
          {...common}
          maxLength={spec.max_length ?? undefined}
          value={text}
          onChange={(event) => onChange(event.target.value)}
          className={spec.type === "sku" || spec.type === "nit" ? "font-mono" : undefined}
        />
      );
  }
}

/**
 * A business group of the customer master, by name (the API has no code for
 * it). The list says how many active customers each one reaches; the text
 * typed is kept as is, so a group the search does not bring can still be sent.
 */
function GroupField({
  value,
  onChange,
  ...input
}: {
  value: string;
  onChange: (value: string) => void;
  id: string;
  "aria-invalid"?: boolean;
  "aria-describedby"?: string;
}) {
  const query = useDebouncedValue(value.trim());
  const groups = useBusinessGroups(query);
  const options = (groups.data ?? []).map((group) => ({
    value: group.name,
    label: group.name,
    hint: group.customers === 1 ? "1 cliente activo" : `${group.customers.toLocaleString("es-CO")} clientes activos`,
  }));
  return (
    <Autocomplete
      {...input}
      value={value}
      onValueChange={onChange}
      onSelect={(option) => onChange(option.value)}
      options={query.length >= 2 ? options : []}
      isLoading={groups.isFetching}
      emptyText={query.length >= 2 && groups.isSuccess ? "Ningún grupo con ese nombre" : undefined}
      placeholder="Escribe al menos 2 letras"
      maxLength={200}
    />
  );
}

/**
 * A field filled from a master (customer NIT, JDH reference). The form keeps
 * only the code; the name picked stays here to show it in the chip.
 */
function PickerField({
  config,
  value,
  onChange,
  hint,
  error,
}: {
  config: BasePickerConfig;
  value: string;
  onChange: (value: string) => void;
  hint: string | undefined;
  error: string | undefined;
}) {
  const [picked, setPicked] = useState<AutocompleteOption | null>(null);
  const selected = value === "" ? null : picked?.value === value ? picked : { value, label: value };
  return (
    <div className="space-y-1.5">
      <BasePicker
        config={{ ...config, label: `${config.label} (opcional)` }}
        selected={selected}
        onSelect={(option) => {
          setPicked(option);
          onChange(option.value);
        }}
        onClear={() => onChange("")}
      />
      {error ? (
        <p className="text-[13px] text-danger">{error}</p>
      ) : (
        hint && <p className="text-[13px] text-text-secondary">{hint}</p>
      )}
    </div>
  );
}
