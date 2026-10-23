"use client";

import { useId, useState } from "react";
import { ChevronRight, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/shared/components/ui/button";
import { Dialog, DialogError, DialogFooter } from "@/shared/components/ui/dialog";
import { Field, Textarea } from "@/shared/components/ui/field";
import { Input } from "@/shared/components/ui/input";
import { ApiError, errorMessage } from "@/shared/lib/api-client";

import { useCheckApplication, useCreateApplication, useUpdateApplication } from "../hooks/use-app-monitoring";
import { pathProblem, urlBaseProblem } from "../lib/format";
import type { Aplicativo, AplicativoInput } from "../types/app-monitoring.types";
import { announceCheck } from "./parts";

interface Values {
  nombre: string;
  url_base: string;
  ruta_health: string;
  ruta_ui: string;
  verificar_ui: boolean;
  verificar_tls: boolean;
  habilitado: boolean;
  timeout_s: string;
  umbral_lento_ms: string;
  orden: string;
  slug: string;
  descripcion: string;
}

type Key = keyof Values;

const DEFAULTS: Values = {
  nombre: "",
  url_base: "",
  ruta_health: "/api/health",
  ruta_ui: "/",
  verificar_ui: true,
  verificar_tls: true,
  habilitado: true,
  timeout_s: "10",
  umbral_lento_ms: "2000",
  orden: "",
  slug: "",
  descripcion: "",
};

function fromApp(app: Aplicativo): Values {
  return {
    nombre: app.nombre,
    url_base: app.url_base,
    ruta_health: app.ruta_health,
    ruta_ui: app.ruta_ui,
    verificar_ui: app.verificar_ui,
    verificar_tls: app.verificar_tls,
    habilitado: app.habilitado,
    timeout_s: String(app.timeout_s),
    umbral_lento_ms: String(app.umbral_lento_ms),
    orden: String(app.orden),
    slug: app.slug,
    descripcion: app.descripcion ?? "",
  };
}

function inRange(value: string, min: number, max: number, integer: boolean): boolean {
  const number = Number(value);
  return value.trim() !== "" && Number.isFinite(number) && number >= min && number <= max && (!integer || Number.isInteger(number));
}

/** What is wrong with one field, said as how to fix it (DESIGN.md §7.2). */
function problem(key: Key, values: Values): string | null {
  switch (key) {
    case "nombre":
      return values.nombre.trim() ? null : "Escribe el nombre con el que la gente reconoce la plataforma.";
    case "url_base":
      return urlBaseProblem(values.url_base);
    case "ruta_health":
      return pathProblem(values.ruta_health);
    case "ruta_ui":
      return values.verificar_ui ? pathProblem(values.ruta_ui) : null;
    case "timeout_s":
      return inRange(values.timeout_s, 1, 60, false) ? null : "Entre 1 y 60 segundos.";
    case "umbral_lento_ms":
      return inRange(values.umbral_lento_ms, 100, 60000, true) ? null : "Entre 100 y 60.000 milisegundos, sin decimales.";
    case "orden":
      return values.orden.trim() === "" || Number.isInteger(Number(values.orden)) ? null : "Un número entero, o vacío.";
    case "slug":
      return values.slug.trim() === "" || /^[a-z0-9]+(-[a-z0-9]+)*$/.test(values.slug.trim())
        ? null
        : "Minúsculas, números y guiones, por ejemplo app-proveedores.";
    default:
      return null;
  }
}

const VALIDATED: Key[] = ["nombre", "url_base", "ruta_health", "ruta_ui", "timeout_s", "umbral_lento_ms", "orden", "slug"];

/** The fields inside «Ajustes avanzados». */
const ADVANCED: Key[] = ["timeout_s", "umbral_lento_ms", "orden", "slug"];

/** The body the API expects: numbers as numbers, an empty description as null, blanks left out. */
function toInput(values: Values, keys: Key[]): Partial<AplicativoInput> {
  const input: Record<string, unknown> = {};
  for (const key of keys) {
    const value = values[key];
    if (key === "timeout_s" || key === "umbral_lento_ms" || key === "orden") {
      if (String(value).trim() !== "") input[key] = Number(value);
    } else if (key === "descripcion") {
      input[key] = String(value).trim() || null;
    } else if (key === "slug") {
      if (String(value).trim() !== "") input[key] = String(value).trim();
    } else {
      input[key] = typeof value === "string" ? value.trim() : value;
    }
  }
  return input as Partial<AplicativoInput>;
}

/**
 * Add or edit an application. The URL is the server only, and the form says
 * so on blur instead of waiting for the API's 422. A new application is
 * checked right away, so a wrong address or an unknown certificate shows up
 * before anyone waits for the next cycle.
 */
export default function ApplicationDialog({ app, onClose }: { app: Aplicativo | null; onClose: () => void }) {
  const id = useId();
  const isCreate = app === null;
  const initial = app ? fromApp(app) : DEFAULTS;
  const [values, setValues] = useState<Values>(initial);
  const [errors, setErrors] = useState<Partial<Record<Key, string>>>({});
  const [serverError, setServerError] = useState<string | null>(null);
  // Opened by hand, or by a submit whose problem is in there, so no error hides in a closed section.
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const create = useCreateApplication();
  const update = useUpdateApplication();
  const check = useCheckApplication();
  const isPending = create.isPending || update.isPending;
  const changed = (Object.keys(values) as Key[]).filter((key) => values[key] !== initial[key]);

  const set = <K extends Key>(key: K, value: Values[K]) => {
    setValues((current) => ({ ...current, [key]: value }));
    // A corrected field stops shouting as soon as it is right, not on the next blur.
    if (errors[key]) setErrors((current) => ({ ...current, [key]: problem(key, { ...values, [key]: value }) ?? undefined }));
  };
  const validate = (key: Key) => setErrors((current) => ({ ...current, [key]: problem(key, values) ?? undefined }));

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    const found = Object.fromEntries(VALIDATED.map((key) => [key, problem(key, values) ?? undefined]));
    setErrors(found);
    if (ADVANCED.some((key) => found[key])) setAdvancedOpen(true);
    if (Object.values(found).some(Boolean)) return;
    if (!isCreate && changed.length === 0) return onClose();
    setServerError(null);
    try {
      if (isCreate) {
        const created = await create.mutateAsync(toInput(values, Object.keys(values) as Key[]) as AplicativoInput);
        toast.success(`«${created.nombre}» agregado. Haciendo el primer chequeo…`);
        onClose();
        check.mutate(created.id, {
          onSuccess: announceCheck,
          onError: (error) => toast.error(errorMessage(error), { duration: Infinity }),
        });
      } else {
        await update.mutateAsync({ id: app.id, input: toInput(values, changed) });
        toast.success(`«${values.nombre.trim()}» guardado.`);
        onClose();
      }
    } catch (error) {
      if (error instanceof ApiError && error.status === 409) {
        setErrors((current) => ({ ...current, slug: error.detail }));
        setAdvancedOpen(true);
      } else setServerError(errorMessage(error));
    }
  };

  const text = (key: Key, label: string, options: { hint?: string; optional?: boolean; placeholder?: string; mono?: boolean; disabled?: boolean; inputMode?: "numeric" | "decimal" | "url" } = {}) => (
    <Field label={label} htmlFor={`${id}-${key}`} optional={options.optional} hint={options.hint} error={errors[key]}>
      <Input
        id={`${id}-${key}`}
        value={String(values[key])}
        onChange={(event) => set(key, event.target.value as never)}
        onBlur={() => validate(key)}
        placeholder={options.placeholder}
        disabled={options.disabled}
        inputMode={options.inputMode}
        spellCheck={options.mono ? false : undefined}
        aria-invalid={Boolean(errors[key])}
        aria-describedby={errors[key] ? `${id}-${key}-error` : options.hint ? `${id}-${key}-hint` : undefined}
        className={options.mono ? "font-mono text-[13px] max-md:h-11" : "max-md:h-11"}
      />
    </Field>
  );

  const toggle = (key: "verificar_ui" | "verificar_tls" | "habilitado", label: string, hint: string) => (
    <label className="flex items-start gap-2 text-sm">
      <input
        type="checkbox"
        className="mt-0.5 size-4 shrink-0 accent-[var(--primary)] max-md:size-5"
        checked={values[key]}
        onChange={(event) => set(key, event.target.checked)}
      />
      <span>
        <span className="block font-medium">{label}</span>
        <span className="block text-[13px] text-text-secondary">{hint}</span>
      </span>
    </label>
  );

  return (
    <Dialog
      open
      onOpenChange={(open) => !open && onClose()}
      isForm
      title={isCreate ? "Agregar aplicativo" : `Editar ${app.nombre}`}
      description={isCreate ? "La API lo chequea cada minuto en su health y en su UI." : undefined}
    >
      <form noValidate onSubmit={submit} className="space-y-4">
        {text("nombre", "Nombre", { placeholder: "Intranet" })}
        {text("url_base", "Dirección del servidor", {
          hint: "Solo el servidor, sin ruta. Por ejemplo https://intranet.jdh.local.",
          placeholder: "https://",
          mono: true,
          inputMode: "url",
        })}
        <div className="grid gap-4 sm:grid-cols-2">
          {text("ruta_health", "Ruta del health", { mono: true })}
          {text("ruta_ui", "Ruta de la UI", { mono: true, disabled: !values.verificar_ui })}
        </div>

        <fieldset className="space-y-3">
          <legend className="sr-only">Qué se chequea</legend>
          {toggle("verificar_ui", "Chequear también la UI", "Cualquier código menor a 400 cuenta como arriba, incluida una redirección al login.")}
          {toggle(
            "verificar_tls",
            "Verificar el certificado",
            "Apágalo si el certificado lo firma la CA interna y el contenedor de la API no la conoce: el chequeo fallaría con CERTIFICATE_VERIFY_FAILED."
          )}
          {toggle("habilitado", "Habilitado", "Deshabilitado no se chequea solo ni cuenta en el tablero. «Probar ahora» sigue funcionando.")}
        </fieldset>

        <details
          className="group rounded-md border border-border"
          open={advancedOpen}
          onToggle={(event) => setAdvancedOpen(event.currentTarget.open)}
        >
          <summary className="flex min-h-9 cursor-pointer items-center gap-1.5 rounded-md px-3 text-sm font-medium select-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring max-md:min-h-11 [&::-webkit-details-marker]:hidden">
            <ChevronRight className="size-4 text-text-secondary transition-transform duration-150 group-open:rotate-90" aria-hidden="true" />
            Ajustes avanzados
          </summary>
          <div className="space-y-4 border-t border-border p-3">
            <div className="grid gap-4 sm:grid-cols-3">
              {text("timeout_s", "Tiempo de espera (s)", { inputMode: "decimal", hint: "De 1 a 60." })}
              {text("umbral_lento_ms", "Umbral de lentitud (ms)", { inputMode: "numeric", hint: "Más lento cuenta como degradado." })}
              {text("orden", "Orden", { inputMode: "numeric", optional: true, hint: "Posición en las listas." })}
            </div>
            {text("slug", "Identificador", {
              optional: isCreate,
              mono: true,
              hint: isCreate ? "Si lo dejas vacío se genera del nombre." : "Minúsculas, números y guiones.",
            })}
            <Field label="Descripción" htmlFor={`${id}-descripcion`} optional>
              <Textarea
                id={`${id}-descripcion`}
                value={values.descripcion}
                maxLength={2000}
                onChange={(event) => set("descripcion", event.target.value)}
              />
            </Field>
          </div>
        </details>

        <DialogError message={serverError} />
        <DialogFooter>
          <Button variant="outline" onClick={onClose} className="max-md:h-11">
            Cancelar
          </Button>
          <Button type="submit" disabled={isPending} className="max-md:h-11">
            {isPending && <Loader2 className="animate-spin" aria-hidden="true" />}
            {isCreate ? "Agregar aplicativo" : "Guardar cambios"}
          </Button>
        </DialogFooter>
      </form>
    </Dialog>
  );
}
