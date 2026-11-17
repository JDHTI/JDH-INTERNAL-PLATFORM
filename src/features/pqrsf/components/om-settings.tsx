"use client";

import { useId, useRef, useState } from "react";
import { CloudOff, Download, Loader2, Upload } from "lucide-react";
import { toast } from "sonner";

import StatePanel from "@/shared/components/state-panel";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { Field } from "@/shared/components/ui/field";
import { Input } from "@/shared/components/ui/input";
import { errorMessage } from "@/shared/lib/api-client";
import { formatBytes } from "@/shared/lib/format";

import {
  useOmSettings,
  useOmTemplates,
  useSetOmNextNumber,
  useUploadOmTemplate,
} from "../hooks/use-pqrsf";
import { formatDateTime } from "../lib/format";
import { downloadOmTemplate } from "../services/pqrsf.service";
import { SettingsTable } from "./settings-parts";

/**
 * The Word of the improvement opportunity (P.06.F.04) and where its consecutive
 * goes on. A new version becomes the one in use; the previous ones stay in the
 * history. The API checks the template's marks before accepting it and says
 * which ones are missing or unknown.
 */
export default function OmSettingsPanel() {
  return (
    <div className="space-y-8">
      <TemplateSection />
      <NumberSection />
    </div>
  );
}

// ── Template ──

function TemplateSection() {
  const id = useId();
  const templates = useOmTemplates();
  const upload = useUploadOmTemplate();
  const fileInput = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [label, setLabel] = useState("");

  const submit = () => {
    if (!file) return;
    upload.mutate(
      { file, versionLabel: label.trim() },
      {
        onSuccess: (saved) => {
          toast.success(`Plantilla «${saved.version_label}» en uso.`);
          setFile(null);
          setLabel("");
        },
      }
    );
  };

  return (
    <section aria-labelledby={`${id}-heading`} className="space-y-3">
      <h2 id={`${id}-heading`} className="text-base font-semibold">
        Plantilla de la OM
      </h2>

      {templates.isPending ? (
        <div className="h-32 animate-pulse rounded-lg bg-canvas-subtle" aria-busy="true">
          <span className="sr-only">Cargando las versiones de la plantilla</span>
        </div>
      ) : templates.isError ? (
        <StatePanel
          icon={CloudOff}
          tone="danger"
          title="No se cargó la plantilla"
          action={
            <Button variant="outline" onClick={() => templates.refetch()}>
              Reintentar
            </Button>
          }
        >
          {errorMessage(templates.error)}
        </StatePanel>
      ) : templates.data.length === 0 ? (
        <p className="max-w-prose text-sm text-text-secondary">
          Todavía no hay una plantilla: sin ella no se puede generar ninguna OM. Sube el Word del formato.
        </p>
      ) : (
        <SettingsTable
          caption="Cada versión que se sube queda guardada; la vigente es la que usan las OM nuevas."
          headers={[{ label: "Versión" }, { label: "Archivo" }, { label: "Subida" }, { label: "Estado" }]}
        >
          {templates.data.map((template) => (
            <tr key={template.id}>
              <td className="px-3 py-2 font-medium">{template.version_label}</td>
              <td className="px-3 py-2">
                <span className="block break-all">{template.filename}</span>
                <span className="tabular block text-[13px] text-text-secondary">{formatBytes(template.size_bytes)}</span>
              </td>
              <td className="tabular px-3 py-2 whitespace-nowrap">
                {template.created_at ? formatDateTime(template.created_at) : ""}
              </td>
              <td className="px-3 py-2">
                {template.is_active ? <Badge tone="success">Vigente</Badge> : <Badge>Anterior</Badge>}
              </td>
              <td className="px-3 py-2 text-right">
                <Button
                  variant="ghost"
                  size="icon"
                  className="max-md:size-11"
                  aria-label={`Descargar la versión ${template.version_label}`}
                  onClick={() =>
                    downloadOmTemplate(template).catch((error) =>
                      toast.error(errorMessage(error), { duration: Infinity })
                    )
                  }
                >
                  <Download aria-hidden="true" />
                </Button>
              </td>
            </tr>
          ))}
        </SettingsTable>
      )}

      <form
        className="max-w-xl space-y-3 rounded-lg border border-border p-4"
        onSubmit={(event) => {
          event.preventDefault();
          submit();
        }}
      >
        <h3 className="text-sm font-semibold">Subir una versión nueva</h3>
        <input
          ref={fileInput}
          id={`${id}-file`}
          type="file"
          accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          className="sr-only"
          onChange={(event) => setFile(event.target.files?.[0] ?? null)}
        />
        <div className="flex flex-wrap items-center gap-2">
          <Button type="button" variant="outline" className="max-md:h-11" onClick={() => fileInput.current?.click()}>
            <Upload aria-hidden="true" />
            {file ? "Cambiar el Word" : "Elegir el Word"}
          </Button>
          <span className="min-w-0 text-sm break-all text-text-secondary">
            {file ? `${file.name} · ${formatBytes(file.size)}` : "Un archivo .docx con las marcas del formato."}
          </span>
        </div>
        <Field label="Nombre de la versión" htmlFor={`${id}-label`} optional hint="Por ejemplo «Versión 5, 2026».">
          <Input id={`${id}-label`} value={label} maxLength={60} onChange={(event) => setLabel(event.target.value)} />
        </Field>
        {upload.isError && (
          <p role="alert" className="rounded-md bg-danger-surface px-3 py-2 text-sm whitespace-pre-line text-danger">
            {errorMessage(upload.error)}
          </p>
        )}
        <Button type="submit" className="max-md:h-11" disabled={!file || upload.isPending}>
          {upload.isPending && <Loader2 className="animate-spin" aria-hidden="true" />}
          Subir y usar esta versión
        </Button>
      </form>
    </section>
  );
}

// ── Consecutive ──

function NumberSection() {
  const id = useId();
  const settings = useOmSettings();
  const save = useSetOmNextNumber();
  const [draft, setDraft] = useState<string | null>(null);

  const current = settings.data?.next_number;
  const value = draft ?? (current !== undefined ? String(current) : "");
  const parsed = Number(value);
  const valid = Number.isInteger(parsed) && parsed >= 1;

  return (
    <section aria-labelledby={`${id}-heading`} className="space-y-3">
      <h2 id={`${id}-heading`} className="text-base font-semibold">
        Consecutivo de la OM
      </h2>
      {settings.isPending ? (
        <div className="h-16 animate-pulse rounded-lg bg-canvas-subtle" aria-busy="true">
          <span className="sr-only">Cargando el consecutivo</span>
        </div>
      ) : settings.isError ? (
        <StatePanel
          icon={CloudOff}
          tone="danger"
          title="No se cargó el consecutivo"
          action={
            <Button variant="outline" onClick={() => settings.refetch()}>
              Reintentar
            </Button>
          }
        >
          {errorMessage(settings.error)}
        </StatePanel>
      ) : (
        <form
          className="max-w-xl space-y-3"
          onSubmit={(event) => {
            event.preventDefault();
            if (!valid) return;
            save.mutate(parsed, {
              onSuccess: (saved) => {
                setDraft(null);
                toast.success(`La próxima OM será la ${saved.next_number}.`);
              },
            });
          }}
        >
          <Field
            label="Siguiente número"
            htmlFor={`${id}-next`}
            hint="El último número que Calidad usó, más uno. Tiene que ser mayor que el de cualquier OM ya generada."
          >
            <Input
              id={`${id}-next`}
              type="number"
              min={1}
              max={9_999_999}
              inputMode="numeric"
              className="tabular w-40"
              value={value}
              aria-describedby={`${id}-next-hint`}
              onChange={(event) => setDraft(event.target.value)}
            />
          </Field>
          {save.isError && (
            <p role="alert" className="rounded-md bg-danger-surface px-3 py-2 text-sm text-danger">
              {errorMessage(save.error)}
            </p>
          )}
          <Button type="submit" className="max-md:h-11" disabled={!valid || save.isPending || parsed === current}>
            {save.isPending && <Loader2 className="animate-spin" aria-hidden="true" />}
            Guardar
          </Button>
        </form>
      )}
    </section>
  );
}
