"use client";

import { useId, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ChevronDown, CircleCheck, CircleX, Download, TriangleAlert, Upload } from "lucide-react";

import StatePanel from "@/shared/components/state-panel";
import type { AutocompleteOption } from "@/shared/components/ui/autocomplete";
import { Button, buttonVariants } from "@/shared/components/ui/button";
import { Dropdown } from "@/shared/components/ui/dropdown";
import { Field } from "@/shared/components/ui/field";
import { Input } from "@/shared/components/ui/input";
import { errorMessage } from "@/shared/lib/api-client";
import { cn } from "@/shared/lib/utils";
import { useBreadcrumbLabel } from "@/shared/store/use-breadcrumb-store";

import {
  useAddColumnsToProfile,
  useBulkLoad,
  useFormSchema,
  useProfile,
  useSupportCatalogs,
} from "../hooks/use-supports";
import { calcMethodLabel, choiceLabel, formatDay, formatSupplierValue } from "../lib/format";
import { PROFILE_DEFAULT_FIELDS, readDraft, withoutKey, type Draft } from "../lib/form-values";
import { downloadBulkTemplate } from "../services/supports.service";
import type { BulkLoadInput, BulkReport, ColumnMap, FormFieldSpec } from "../types/support.types";
import BasePicker, { SUPPLIER_PICKER } from "@/shared/components/pickers/base-picker";
import SchemaFields from "./schema-fields";

const NOT_USED = "";
const count = (n: number, one: string, many: string) => `${n.toLocaleString("es-CO")} ${n === 1 ? one : many}`;

/** Header -> field chosen on screen, turned into the API's field -> headers. */
function invert(extra: Record<string, string>): ColumnMap {
  const map: ColumnMap = {};
  for (const [header, field] of Object.entries(extra)) {
    if (field) map[field] = [...(map[field] ?? []), header];
  }
  return map;
}

/**
 * Bulk load of supports from the supplier's own file. Always simulated first:
 * the report lists every error at once, and since the load is all or nothing,
 * saving is offered only when nothing is blocked and the simulation matches
 * exactly what would be sent. Headers nobody read can be mapped here, tried
 * again, and kept in the supplier's profile.
 */
export default function BulkLoad({ area }: { area: string }) {
  const id = useId();
  useBreadcrumbLabel(`/${area}/apoyos/carga`, "Carga masiva");
  const schema = useFormSchema().data;
  const catalogs = useSupportCatalogs().data;
  const bulk = useBulkLoad();
  const keepMapping = useAddColumnsToProfile();

  const [supplier, setSupplier] = useState<AutocompleteOption | null>(null);
  const profile = useProfile(supplier?.value ?? null);
  const [file, setFile] = useState<File | null>(null);
  const [fileInputKey, setFileInputKey] = useState(0);
  const fileRef = useRef<HTMLInputElement>(null);
  const [sheet, setSheet] = useState("");
  const [showDefaults, setShowDefaults] = useState(false);
  const [defaults, setDefaults] = useState<Draft>({});
  const [defaultErrors, setDefaultErrors] = useState<Record<string, string>>({});
  const [extra, setExtra] = useState<Record<string, string>>({});
  const [report, setReport] = useState<BulkReport | null>(null);
  const [reportKey, setReportKey] = useState<string | null>(null);
  const [applied, setApplied] = useState<BulkReport | null>(null);
  const [requestError, setRequestError] = useState<string | null>(null);
  const [template, setTemplate] = useState<{ pending: boolean; error: string | null }>({ pending: false, error: null });
  const [mappingSaved, setMappingSaved] = useState(false);

  const defaultSpecs = useMemo(
    () => (schema?.fields ?? []).filter((spec) => PROFILE_DEFAULT_FIELDS.includes(spec.name)),
    [schema]
  );
  const defaultRule = schema?.methods[typeof defaults.calc_method === "string" ? defaults.calc_method : ""];
  const labelOf = (field: string | null) =>
    field ? (schema?.fields.find((spec) => spec.name === field)?.label ?? field) : "Fila completa";

  // What a request would send right now; the report is only valid for this exact input.
  const read = readDraft(defaultSpecs, defaults, defaultRule, { fractionsAsText: true });
  const columnMap = invert(extra);
  const inputKey = file
    ? JSON.stringify([file.name, file.size, file.lastModified, supplier?.value ?? null, sheet.trim(), read.values, columnMap])
    : null;
  const fresh = report !== null && inputKey === reportKey;
  const canApply = fresh && !report.blocked && report.valid > 0;

  const input = (apply: boolean): BulkLoadInput => ({
    file: file!,
    apply,
    supplierCode: supplier?.value ?? null,
    sheet: sheet.trim() || null,
    defaults: read.values as Record<string, string | string[]>,
    columnMap,
  });

  const run = (apply: boolean) => {
    if (!file) return;
    setRequestError(null);
    setDefaultErrors(read.errors);
    if (Object.keys(read.errors).length > 0) {
      setShowDefaults(true);
      setRequestError("Revisa los valores para esta carga: hay números que no se pueden leer.");
      return;
    }
    const key = inputKey;
    bulk.mutate(input(apply), {
      onSuccess: (result) => {
        if (result.applied) {
          setApplied(result);
          return;
        }
        // An apply that came back blocked (the data changed since the simulation) shows its errors like one.
        setReport(result);
        setReportKey(key);
        setMappingSaved(false);
      },
      onError: (failure) => setRequestError(errorMessage(failure)),
    });
  };

  const restart = () => {
    setFile(null);
    setFileInputKey((value) => value + 1);
    setReport(null);
    setReportKey(null);
    setApplied(null);
    setExtra({});
    setRequestError(null);
  };

  const download = async () => {
    setTemplate({ pending: true, error: null });
    try {
      await downloadBulkTemplate(supplier?.value ?? null);
      setTemplate({ pending: false, error: null });
    } catch (failure) {
      setTemplate({ pending: false, error: errorMessage(failure) });
    }
  };

  if (applied) {
    return (
      <StatePanel
        icon={applied.with_conflicts > 0 ? TriangleAlert : CircleCheck}
        title={`Se guardaron ${count(applied.created.length, "apoyo", "apoyos")}`}
        action={
          <div className="flex flex-wrap gap-2">
            <Link href={`/${area}/apoyos`} className={buttonVariants({ variant: "primary", className: "max-sm:h-11" })}>
              Ir al maestro de apoyos
            </Link>
            <Button variant="outline" onClick={restart} className="max-sm:h-11">
              Cargar otro archivo
            </Button>
          </div>
        }
      >
        <p>Hoja {applied.sheet} del archivo {file?.name}.</p>
        {applied.with_conflicts > 0 && (
          <p className="mt-1">
            {count(applied.with_conflicts, "apoyo se solapa", "apoyos se solapan")} con otros de la misma regla y
            periodo. Se guardaron igual: revísalos en el maestro con el filtro Con conflictos.
          </p>
        )}
      </StatePanel>
    );
  }

  return (
    <div className="max-w-5xl space-y-6">
      <section className="space-y-5 rounded-lg border border-border p-4" aria-labelledby={`${id}-file`}>
        <h2 id={`${id}-file`} className="text-base font-semibold">Archivo</h2>

        <div className="grid gap-x-4 gap-y-5 md:grid-cols-2">
          <div className="space-y-1.5">
            <BasePicker
              config={{ ...SUPPLIER_PICKER, label: "Proveedor (opcional)" }}
              selected={supplier}
              onSelect={setSupplier}
              onClear={() => setSupplier(null)}
            />
            <p className="text-[13px] text-text-secondary" aria-live="polite">
              {!supplier
                ? "Se usa en las filas sin columna Cod. Proveedor, y su perfil dice cómo leer el archivo."
                : profile.isFetching
                  ? "Buscando el perfil del proveedor."
                  : profile.data
                    ? "Tiene perfil: el archivo se lee con sus valores por defecto y sus columnas."
                    : "No tiene perfil: el archivo se lee con los encabezados de la plantilla."}
            </p>
          </div>
          <div className="space-y-1.5">
            <span className="block text-[13px] font-medium">Plantilla</span>
            <Button variant="outline" onClick={download} disabled={template.pending} className="max-sm:h-11">
              <Download aria-hidden="true" />
              {template.pending ? "Descargando" : supplier ? `Plantilla de ${supplier.label}` : "Descargar plantilla"}
            </Button>
            {template.error ? (
              <p role="alert" className="text-[13px] text-danger">{template.error}</p>
            ) : (
              <p className="text-[13px] text-text-secondary">
                {supplier ? "Con los encabezados de su perfil, sin las columnas de valor fijo." : "Columnas, instrucciones y valores válidos."}
              </p>
            )}
          </div>

          {/* The native picker's button speaks the browser's language; this one speaks Spanish. */}
          <div className="space-y-1.5">
            <span id={`${id}-file-label`} className="block text-[13px] font-medium">Archivo del proveedor</span>
            <div className="flex min-w-0 items-center gap-3">
              <Button variant="outline" onClick={() => fileRef.current?.click()} aria-describedby={`${id}-file-label ${id}-file-name`} className="max-sm:h-11">
                <Upload aria-hidden="true" /> {file ? "Cambiar archivo" : "Elegir archivo"}
              </Button>
              <span id={`${id}-file-name`} className={cn("min-w-0 truncate text-sm", !file && "text-text-secondary")}>
                {file ? file.name : "Ningún archivo elegido"}
              </span>
            </div>
            <input
              key={fileInputKey}
              ref={fileRef}
              type="file"
              accept=".xlsx,.xlsm,.csv"
              aria-labelledby={`${id}-file-label`}
              className="sr-only"
              tabIndex={-1}
              onChange={(event) => setFile(event.target.files?.[0] ?? null)}
            />
            <p className="text-[13px] text-text-secondary">Excel (.xlsx, .xlsm) o CSV, hasta 10 MB y 2000 filas.</p>
          </div>
          <Field label="Hoja" htmlFor={`${id}-sheet`} optional hint="Vacío: la del perfil o la primera con encabezados.">
            <Input id={`${id}-sheet`} maxLength={100} value={sheet} onChange={(event) => setSheet(event.target.value)} />
          </Field>
        </div>

        <div className="space-y-4">
          <button
            type="button"
            onClick={() => setShowDefaults((value) => !value)}
            aria-expanded={showDefaults}
            aria-controls={`${id}-defaults`}
            className="flex min-h-9 items-center gap-1.5 rounded-sm text-sm font-medium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring max-sm:min-h-11"
          >
            <ChevronDown className={cn("size-4 transition-transform", showDefaults && "rotate-180")} aria-hidden="true" />
            Valores para esta carga
            {Object.keys(read.values).length > 0 && (
              <span className="font-normal text-text-secondary">({Object.keys(read.values).length})</span>
            )}
          </button>
          <div id={`${id}-defaults`} hidden={!showDefaults} className="space-y-4">
            <p className="text-[13px] text-text-secondary">
              Se aplican a las filas que no traen esa columna y prevalecen sobre el perfil solo en esta carga.
              Para dejarlos fijos, guárdalos en el perfil del proveedor.
            </p>
            {schema && (
              <SchemaFields
                specs={defaultSpecs}
                draft={defaults}
                onChange={(name, value) => {
                  setDefaults((current) => ({ ...current, [name]: value }));
                  setDefaultErrors((current) => withoutKey(current, name));
                }}
                errors={defaultErrors}
                rule={defaultRule}
                required={new Set()}
                catalogs={catalogs}
              />
            )}
          </div>
        </div>

        {requestError && (
          <p role="alert" className="rounded-md bg-danger-surface px-3 py-2 text-sm text-danger">
            {requestError}
          </p>
        )}

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <Button
            variant={fresh ? "outline" : "primary"}
            onClick={() => run(false)}
            disabled={!file || bulk.isPending}
            className="max-sm:h-11"
          >
            {bulk.isPending && !bulk.variables?.apply ? "Simulando" : report ? "Volver a simular" : "Simular carga"}
          </Button>
          <p className="text-[13px] text-text-secondary">La simulación no guarda nada.</p>
        </div>
      </section>

      {report && (
        <Report
          report={report}
          fresh={fresh}
          labelOf={labelOf}
          fields={schema?.fields ?? []}
          extra={extra}
          onMap={(header, field) => {
            setExtra((current) => ({ ...current, [header]: field }));
            setMappingSaved(false);
          }}
          supplier={supplier}
          onKeepMapping={() =>
            supplier &&
            keepMapping.mutate(
              { supplierCode: supplier.value, columnMap },
              { onSuccess: () => setMappingSaved(true), onError: (failure) => setRequestError(errorMessage(failure)) }
            )
          }
          keepingMapping={keepMapping.isPending}
          mappingSaved={mappingSaved}
          apply={
            canApply ? (
              <Button onClick={() => run(true)} disabled={bulk.isPending} className="max-sm:h-11">
                {bulk.isPending && bulk.variables?.apply ? "Guardando" : `Guardar ${count(report.valid, "apoyo", "apoyos")}`}
              </Button>
            ) : null
          }
        />
      )}
    </div>
  );
}

function Report({
  report,
  fresh,
  labelOf,
  fields,
  extra,
  onMap,
  supplier,
  onKeepMapping,
  keepingMapping,
  mappingSaved,
  apply,
}: {
  report: BulkReport;
  fresh: boolean;
  labelOf: (field: string | null) => string;
  fields: FormFieldSpec[];
  extra: Record<string, string>;
  onMap: (header: string, field: string) => void;
  supplier: AutocompleteOption | null;
  onKeepMapping: () => void;
  keepingMapping: boolean;
  mappingSaved: boolean;
  apply: React.ReactNode;
}) {
  const id = useId();
  const mapped = Object.entries(report.mapped_columns);
  const chosen = Object.values(extra).filter(Boolean).length;
  const fieldOptions = [{ value: NOT_USED, label: "No usar" }, ...fields.map((spec) => ({ value: spec.name, label: spec.label }))];

  return (
    <section className={cn("space-y-6", !fresh && "opacity-60")} aria-labelledby={`${id}-title`}>
      <div className="space-y-1">
        <h2 id={`${id}-title`} className="text-base font-semibold">Resultado de la simulación</h2>
        <p className="text-sm text-text-secondary">
          Hoja {report.sheet}, encabezados en la fila {report.header_row}.{" "}
          {count(report.rows_read, "fila leída", "filas leídas")}: {count(report.valid, "válida", "válidas")} y{" "}
          {count(report.invalid, "con errores", "con errores")}.
          {report.profile_used && " Se leyó con el perfil del proveedor."}
        </p>
      </div>

      {!fresh ? (
        <p role="status" className="rounded-md bg-canvas-subtle px-3 py-2 text-sm">
          Cambiaste el archivo, el proveedor, la hoja o el mapeo. Vuelve a simular antes de guardar.
        </p>
      ) : report.blocked ? (
        <p role="alert" className="flex items-start gap-2 rounded-md bg-danger-surface px-3 py-2 text-sm text-danger">
          <CircleX className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          No se guardará ninguna fila mientras haya errores: la carga es todo o nada. Corrige el archivo y vuelve a
          simular.
        </p>
      ) : report.valid === 0 ? (
        <p role="status" className="rounded-md bg-canvas-subtle px-3 py-2 text-sm">
          El archivo no tiene filas para cargar debajo de los encabezados.
        </p>
      ) : (
        <div className="flex flex-col gap-3 rounded-md bg-success-surface px-3 py-2 sm:flex-row sm:items-center sm:justify-between">
          <p role="status" className="flex items-start gap-2 text-sm text-success">
            <CircleCheck className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
            {report.valid === 1 ? "Sin errores: se puede guardar la fila." : `Sin errores: se pueden guardar las ${count(report.valid, "fila", "filas")}.`}
          </p>
          {apply}
        </div>
      )}

      {report.errors.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold">Errores</h3>
          <div className="overflow-x-auto rounded-lg border border-border bg-surface">
            <table className="w-full text-left text-sm">
              <thead className="bg-canvas-subtle text-[11px] font-semibold uppercase tracking-[0.06em] text-text-secondary">
                <tr>
                  <th scope="col" className="w-16 px-3 py-2 text-right">Fila</th>
                  <th scope="col" className="px-3 py-2">Campo</th>
                  <th scope="col" className="px-3 py-2">Qué corregir</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {report.errors.map((error, index) => (
                  <tr key={index}>
                    <td className="px-3 py-2 text-right tabular-nums">{error.row_number}</td>
                    <td className="px-3 py-2 whitespace-nowrap">{labelOf(error.field)}</td>
                    <td className="min-w-48 px-3 py-2">{error.message}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {report.errors_truncated && (
            <p className="text-[13px] text-text-secondary">
              Se muestran los primeros {report.errors.length} errores. Corrígelos y vuelve a simular para ver el resto.
            </p>
          )}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-2">
          <h3 className="text-sm font-semibold">Columnas leídas</h3>
          {mapped.length === 0 ? (
            <p className="text-sm text-text-secondary">Ninguna columna coincidió con un campo del apoyo.</p>
          ) : (
            <dl className="divide-y divide-border rounded-lg border border-border bg-surface text-sm">
              {mapped.map(([field, headers]) => (
                <div key={field} className="flex flex-wrap justify-between gap-x-4 gap-y-0.5 px-3 py-2">
                  <dt className="font-medium">{labelOf(field)}</dt>
                  <dd className="text-text-secondary">{headers.join(", ")}</dd>
                </div>
              ))}
            </dl>
          )}
        </div>

        {report.ignored_columns.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-sm font-semibold">Columnas sin usar</h3>
            <p className="text-[13px] text-text-secondary">
              Si alguna trae un dato del apoyo, elige el campo que llena y vuelve a simular.
            </p>
            <ul className="space-y-2">
              {report.ignored_columns.map((header) => (
                <li key={header} className="grid gap-1.5 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] sm:items-center sm:gap-3">
                  <span className="truncate text-sm" title={header}>{header}</span>
                  <Dropdown
                    aria-label={`Campo para la columna ${header}`}
                    value={extra[header] ?? NOT_USED}
                    onValueChange={(field) => onMap(header, field)}
                    options={fieldOptions}
                  />
                </li>
              ))}
            </ul>
            {chosen > 0 && (
              <div className="space-y-1.5 pt-1">
                <Button variant="outline" size="sm" onClick={onKeepMapping} disabled={!supplier || keepingMapping} className="max-sm:h-11">
                  {keepingMapping ? "Guardando en el perfil" : "Guardar este mapeo en el perfil"}
                </Button>
                <p className="text-[13px] text-text-secondary" aria-live="polite">
                  {mappingSaved
                    ? `Guardado en el perfil de ${supplier?.label}. Los próximos archivos de este proveedor se leen así.`
                    : supplier
                      ? "Así los próximos archivos de este proveedor se leen sin mapear de nuevo."
                      : "Elige el proveedor arriba para guardar el mapeo en su perfil."}
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {report.preview.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold">
            Vista previa{report.valid > report.preview.length ? ` (primeras ${report.preview.length} de ${report.valid.toLocaleString("es-CO")} filas válidas)` : ""}
          </h3>
          <ul className="divide-y divide-border rounded-lg border border-border bg-surface md:hidden">
            {report.preview.map((row) => (
              <li key={row.row_number} className="space-y-0.5 px-3 py-2 text-sm">
                <span className="flex justify-between gap-3">
                  <span className="truncate">
                    <span className="text-text-secondary">Fila {row.row_number}</span>
                    {row.product_sku && <span className="font-mono"> · {row.product_sku}</span>}
                  </span>
                  <span className="shrink-0 font-medium tabular-nums">{formatSupplierValue(row.calc_method, row.supplier_value)}</span>
                </span>
                <span className="block truncate text-xs text-text-secondary">
                  {choiceLabel("kind", row.kind)} · {row.customer_nit ? `NIT ${row.customer_nit}` : "Todos los clientes"}
                </span>
              </li>
            ))}
          </ul>
          <div className="hidden overflow-x-auto rounded-lg border border-border bg-surface md:block">
            <table className="w-full min-w-max text-left text-sm">
              <thead className="bg-canvas-subtle text-[11px] font-semibold uppercase tracking-[0.06em] text-text-secondary">
                <tr>
                  <th scope="col" className="px-3 py-2 text-right">Fila</th>
                  <th scope="col" className="px-3 py-2">Proveedor</th>
                  <th scope="col" className="px-3 py-2">Tipo</th>
                  <th scope="col" className="px-3 py-2">Cliente</th>
                  <th scope="col" className="px-3 py-2">SKU</th>
                  <th scope="col" className="px-3 py-2 text-right">Valor del apoyo</th>
                  <th scope="col" className="px-3 py-2 text-right">Vigencia</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {report.preview.map((row) => (
                  <tr key={row.row_number}>
                    <td className="px-3 py-2 text-right tabular-nums">{row.row_number}</td>
                    <td className="px-3 py-2 font-mono text-[13px]">{row.supplier_code ?? "Sin código"}</td>
                    <td className="px-3 py-2">
                      <span className="block">{choiceLabel("kind", row.kind)}</span>
                      {row.program && <span className="block max-w-56 truncate text-xs text-text-secondary">{row.program}</span>}
                    </td>
                    <td className="px-3 py-2 font-mono text-[13px]">{row.customer_nit ?? <span className="font-sans">Todos</span>}</td>
                    <td className="px-3 py-2 font-mono text-[13px]">{row.product_sku ?? <span className="font-sans">Todo el portafolio</span>}</td>
                    <td className="px-3 py-2 text-right">
                      <span className="block tabular-nums">{formatSupplierValue(row.calc_method, row.supplier_value)}</span>
                      <span className="block text-xs text-text-secondary">{calcMethodLabel(row.calc_method)}</span>
                    </td>
                    <td className="px-3 py-2 text-right text-xs tabular-nums whitespace-nowrap">
                      {row.valid_from ? formatDay(row.valid_from) : "Sin inicio"} a {row.valid_to ? formatDay(row.valid_to) : "indefinido"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </section>
  );
}
