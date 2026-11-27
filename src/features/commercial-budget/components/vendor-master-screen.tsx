"use client";

import { useId, useRef, useState } from "react";
import { AlertTriangle, CloudOff, Download, FileSpreadsheet, FileUp, FlaskConical, History, Loader2, Lock, RefreshCw, Upload } from "lucide-react";
import { toast } from "sonner";

import StatePanel from "@/shared/components/state-panel";
import { Badge, type BadgeTone } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { Dialog, DialogFooter } from "@/shared/components/ui/dialog";
import { ViewTab } from "@/shared/components/ui/view-tab";
import { errorMessage } from "@/shared/lib/api-client";

import {
  usePreviewVendorMaster,
  useUploadVendorMaster,
  useVendorMasterStatus,
  useVendorMasterUploads,
} from "../hooks/use-commercial-budget";
import VendorPreviewReport, { blocksUpload } from "./vendor-preview-report";
import VendorTeams from "./vendor-teams";
import { formatCount, formatMoment } from "../lib/format";
import { downloadVendorMasterTemplate } from "../services/commercial-budget.service";
import type { VendorMasterResult, VendorMasterStatus, VendorMasterUpload } from "../types/commercial-budget.types";

const MAX_BYTES = 10 * 1024 * 1024;
const REQUIRED_SHEETS = ["COMERCIALES JDH", "Coordinadores", "Directores"];
const DIRECT_WRITE =
  "Escribe directamente en el DWH; los vendedores que no vengan en el archivo no cambian. Si una fila trae la regional (o el C.O.) vacía o mal escrita, esa persona queda en la regional VARIOS.";

/**
 * «Maestro de vendedores»: the «Maestro Vendedores JDH» workbook goes to dwh-platform through
 * the API, which writes it in the warehouse. GET /vendor-master/status first: open, it says
 * whether the person may read or upload and whether the upload is configured.
 */
export default function VendorMasterScreen() {
  const status = useVendorMasterStatus();

  if (status.isPending) {
    return <div className="h-72 animate-pulse rounded-lg bg-canvas-subtle" aria-busy="true" aria-label="Cargando tus permisos" />;
  }
  if (status.isError) {
    return (
      <StatePanel
        icon={CloudOff}
        tone="danger"
        title="No se pudo consultar el maestro de vendedores"
        action={
          <Button variant="outline" onClick={() => status.refetch()}>
            <RefreshCw aria-hidden="true" /> Reintentar
          </Button>
        }
      >
        {errorMessage(status.error)}
      </StatePanel>
    );
  }
  if (!status.data.can_read) {
    return (
      <StatePanel icon={Lock} title="Tu rol no tiene acceso al maestro de vendedores">
        Pide al líder de BI o a TI que le den a tu rol el permiso «Maestro de vendedores».
      </StatePanel>
    );
  }
  return <VendorMasterTabs status={status.data} />;
}

type Tab = "carga" | "equipos";
const TABS: { key: Tab; label: string }[] = [
  { key: "carga", label: "Carga" },
  { key: "equipos", label: "Equipos" },
];

function VendorMasterTabs({ status }: { status: VendorMasterStatus }) {
  const [tab, setTab] = useState<Tab>("carga");
  const panelId = useId();
  return (
    <div className="space-y-4">
      <div role="tablist" aria-label="Vistas del maestro de vendedores" className="flex gap-1 border-b border-border [&>button]:-mb-px max-md:[&>button]:min-h-11">
        {TABS.map((item) => (
          <ViewTab key={item.key} selected={tab === item.key} onSelect={() => setTab(item.key)} controls={panelId}>
            {item.label}
          </ViewTab>
        ))}
      </div>
      <div id={panelId} role="tabpanel" aria-label={TABS.find((item) => item.key === tab)?.label}>
        {tab === "carga" ? (
          <div className="space-y-6">
            <UploadCard status={status} />
            <UploadHistory />
          </div>
        ) : (
          <VendorTeams canManage={status.can_manage} />
        )}
      </div>
    </div>
  );
}

function UploadCard({ status }: { status: VendorMasterStatus }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [result, setResult] = useState<VendorMasterResult | null>(null);
  const [downloading, setDownloading] = useState<"filled" | "empty" | null>(null);
  const upload = useUploadVendorMaster();
  const simulate = usePreviewVendorMaster();
  // The preview of the file chosen now; choosing another one asks for a new simulation.
  const preview = simulate.data && simulate.variables === file ? simulate.data : null;
  const teamRejections = preview ? preview.rejected.filter(blocksUpload).length : 0;
  const canUpload = status.can_manage && status.configured && preview !== null && teamRejections === 0;

  const choose = (chosen: File | undefined) => {
    if (!chosen) return;
    setResult(null);
    upload.reset();
    simulate.reset();
    if (!/\.xlsx$/i.test(chosen.name)) {
      setFile(null);
      setFileError(`El archivo debe ser un .xlsx. Elegiste «${chosen.name}».`);
      return;
    }
    if (chosen.size > MAX_BYTES) {
      setFile(null);
      setFileError("El archivo supera 10 MB.");
      return;
    }
    setFileError(null);
    setFile(chosen);
  };

  const send = () => {
    if (!file) return;
    setConfirming(false);
    upload.mutate(file, {
      onSuccess: (answer) => {
        setResult(answer);
        toast.success(`Maestro cargado: ${formatCount(answer.vendedores_procesados)} vendedores.`);
      },
    });
  };

  const downloadTemplate = async (kind: "filled" | "empty") => {
    setDownloading(kind);
    try {
      await downloadVendorMasterTemplate(kind === "empty");
    } catch (failure) {
      toast.error(errorMessage(failure));
    } finally {
      setDownloading(null);
    }
  };

  return (
    <section aria-labelledby="vendor-master-upload" className="space-y-4 rounded-lg border border-border bg-surface p-4">
      <div className="space-y-1">
        <h2 id="vendor-master-upload" className="text-base font-semibold">
          Cargar el maestro
        </h2>
        <p className="text-sm text-text-secondary">
          Descarga la plantilla con el maestro actual, cámbiala y súbela completa (.xlsx, hasta 10 MB, con las hojas {REQUIRED_SHEETS.join(", ")}).
          El equipo se escoge de la lista del maestro de equipos y la clase sale sola. Primero se simula: nada se escribe hasta cargar.
        </p>
      </div>

      {!status.configured && (
        <p role="note" className="flex items-start gap-2 rounded-md bg-warning-surface px-3 py-2 text-sm">
          <AlertTriangle className="mt-0.5 size-4 shrink-0 text-warning" aria-hidden="true" />
          La carga no está configurada: el API no tiene la dirección de dwh-platform. La plantilla sí se puede descargar.
        </p>
      )}
      {status.can_manage && status.configured && (
        <p className="flex items-start gap-2 rounded-md bg-canvas-subtle px-3 py-2 text-sm">
          <AlertTriangle className="mt-0.5 size-4 shrink-0 text-text-secondary" aria-hidden="true" />
          {DIRECT_WRITE}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <Button variant="outline" onClick={() => downloadTemplate("filled")} disabled={downloading !== null}>
          {downloading === "filled" ? <Loader2 className="animate-spin" aria-hidden="true" /> : <Download aria-hidden="true" />}
          Descargar plantilla con el maestro actual
        </Button>
        <Button variant="ghost" onClick={() => downloadTemplate("empty")} disabled={downloading !== null}>
          {downloading === "empty" && <Loader2 className="animate-spin" aria-hidden="true" />} Plantilla vacía
        </Button>
      </div>

      {/* Two steps: «Simular» reads the file with nothing written; «Cargar al DWH» waits for a
          simulation of this same file with no row outside the team master. */}
      <div className="flex flex-wrap items-center gap-2">
        <input
          ref={inputRef}
          type="file"
          accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          className="sr-only"
          tabIndex={-1}
          aria-label="Archivo del maestro de vendedores"
          onChange={(event) => {
            choose(event.target.files?.[0]);
            event.target.value = "";
          }}
        />
        <Button variant="outline" onClick={() => inputRef.current?.click()} disabled={upload.isPending || simulate.isPending}>
          <FileUp aria-hidden="true" /> {file ? "Cambiar archivo" : "Elegir archivo"}
        </Button>
        {file && (
          <span className="inline-flex min-w-0 items-center gap-1.5 text-sm text-text-secondary">
            <FileSpreadsheet className="size-4 shrink-0" aria-hidden="true" />
            <span className="truncate">{file.name}</span>
          </span>
        )}
        <div className="flex flex-wrap gap-2 sm:ml-auto">
          <Button
            variant={preview ? "outline" : "primary"}
            onClick={() => file && simulate.mutate(file)}
            disabled={!file || simulate.isPending || upload.isPending}
          >
            {simulate.isPending ? <Loader2 className="animate-spin" aria-hidden="true" /> : <FlaskConical aria-hidden="true" />}
            {simulate.isPending ? "Simulando" : "Simular"}
          </Button>
          {status.can_manage && (
            <Button
              onClick={() => setConfirming(true)}
              disabled={!canUpload || upload.isPending}
              title={
                !status.configured
                  ? "La carga no está configurada."
                  : !preview
                    ? "Simula el archivo primero."
                    : teamRejections > 0
                      ? "Hay filas con un equipo fuera del maestro: corrígelas y vuelve a simular."
                      : undefined
              }
            >
              {upload.isPending ? <Loader2 className="animate-spin" aria-hidden="true" /> : <Upload aria-hidden="true" />}
              {upload.isPending ? "Cargando" : "Cargar al DWH"}
            </Button>
          )}
        </div>
      </div>

      {fileError && (
        <p role="alert" className="rounded-md bg-danger-surface px-3 py-2 text-sm text-danger">
          {fileError}
        </p>
      )}
      {simulate.isError && (
        <p role="alert" className="rounded-md bg-danger-surface px-3 py-2 text-sm text-danger">
          {errorMessage(simulate.error)}
        </p>
      )}
      {upload.isError && (
        <p role="alert" className="rounded-md bg-danger-surface px-3 py-2 text-sm text-danger">
          {errorMessage(upload.error)}
        </p>
      )}
      {upload.isPending && (
        <p role="status" className="rounded-md bg-info-surface px-3 py-2 text-sm text-info">
          dwh-platform está leyendo el archivo y resolviendo cada documento contra el ERP. No cierres esta página.
        </p>
      )}

      {preview && !result && <VendorPreviewReport preview={preview} />}
      {result && <LoadResult result={result} />}

      <Dialog open={confirming} onOpenChange={setConfirming} title="Cargar el maestro al DWH" description={<>Vas a cargar «{file?.name}». {DIRECT_WRITE}</>}>
        <DialogFooter>
          <Button variant="outline" onClick={() => setConfirming(false)}>
            Cancelar
          </Button>
          <Button onClick={send}>
            <Upload aria-hidden="true" /> Sí, cargar al DWH
          </Button>
        </DialogFooter>
      </Dialog>
    </section>
  );
}

function LoadResult({ result }: { result: VendorMasterResult }) {
  const counts: [string, number | undefined][] = [
    ["Vendedores", result.vendedores_procesados],
    ["Equipos", result.equipos_procesados],
    ["Supervisores", result.supervisores_procesados],
    ["Unidades de negocio", result.unidades_negocio_procesadas],
    ["Regionales asignadas", result.regionales_asignadas],
  ];
  const transform = result.transformacion;
  return (
    <div className="space-y-4" aria-live="polite">
      <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-3 lg:grid-cols-5">
        {counts
          .filter(([, value]) => value !== undefined)
          .map(([label, value]) => (
            <div key={label} className="rounded-lg border border-border p-3">
              <dt className="text-xs text-text-secondary">{label}</dt>
              <dd className="text-xl font-semibold tabular-nums">{formatCount(value)}</dd>
            </div>
          ))}
      </dl>

      {transform && (
        <p className="flex items-start gap-2 rounded-md bg-canvas-subtle px-3 py-2 text-sm">
          <AlertTriangle className="mt-0.5 size-4 shrink-0 text-text-secondary" aria-hidden="true" />
          {transform.estado === "programada"
            ? "El DWH está publicando la carga; tarda unos minutos. El presupuesto comercial la toma en la siguiente sincronización de ventas."
            : `El DWH no publicó la carga${transform.motivo ? `: ${transform.motivo}` : ""}. Los cambios no se ven hasta que se publique.`}
        </p>
      )}

      {result.filas_rechazadas.length > 0 && (
        <div className="space-y-1.5 text-sm">
          <h3 className="font-semibold">Filas rechazadas ({result.filas_rechazadas.length}): no se cargaron</h3>
          <div className="max-h-72 overflow-auto rounded-lg border border-border">
            <table className="w-full text-left text-sm">
              <thead className="sticky top-0 bg-canvas-subtle text-[11px] font-semibold uppercase tracking-[0.06em] text-text-secondary">
                <tr>
                  <th scope="col" className="px-3 py-1.5">Hoja</th>
                  <th scope="col" className="px-3 py-1.5">Fila</th>
                  <th scope="col" className="px-3 py-1.5">Identificador</th>
                  <th scope="col" className="px-3 py-1.5">Motivos</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {result.filas_rechazadas.map((row, index) => (
                  <tr key={`${row.hoja}-${row.fila}-${index}`} className="align-top">
                    <td className="whitespace-nowrap px-3 py-1.5">{row.hoja}</td>
                    <td className="px-3 py-1.5 tabular-nums">{row.fila}</td>
                    <td className="px-3 py-1.5">{row.identificador}</td>
                    <td className="px-3 py-1.5 text-text-secondary">{row.motivos.join("; ")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {result.advertencias.length > 0 && (
        <div className="space-y-1.5 text-sm">
          <h3 className="font-semibold">Advertencias ({result.advertencias.length}): la fila sí se cargó</h3>
          <ul className="max-h-48 list-disc space-y-1 overflow-y-auto pl-5 text-text-secondary">
            {result.advertencias.map((warning, index) => (
              <li key={index}>{warning}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

const STATUS_LOOK: Record<VendorMasterUpload["status"], { label: string; tone: BadgeTone }> = {
  cargado: { label: "Cargado", tone: "success" },
  rechazado: { label: "Rechazado", tone: "warning" },
  error: { label: "Error", tone: "danger" },
};

const size = (bytes: number) => (bytes >= 1024 * 1024 ? `${(bytes / (1024 * 1024)).toFixed(1).replace(".", ",")} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`);

/** The last uploads with what dwh-platform answered. The file itself is not kept: it has personal data. */
function UploadHistory() {
  const uploads = useVendorMasterUploads(true);
  return (
    <section aria-labelledby="vendor-master-history" className="space-y-3">
      <h2 id="vendor-master-history" className="text-base font-semibold">
        Cargas anteriores
      </h2>
      {uploads.isPending ? (
        <div className="h-32 animate-pulse rounded-lg bg-canvas-subtle" aria-busy="true" aria-label="Cargando el historial" />
      ) : uploads.isError ? (
        <StatePanel
          icon={CloudOff}
          tone="danger"
          title="No se pudo cargar el historial"
          action={
            <Button variant="outline" onClick={() => uploads.refetch()}>
              <RefreshCw aria-hidden="true" /> Reintentar
            </Button>
          }
        >
          {errorMessage(uploads.error)}
        </StatePanel>
      ) : uploads.data.length === 0 ? (
        <StatePanel icon={History} title="Aún no hay cargas">
          Cada carga queda aquí con quién la hizo, cuándo y qué respondió el DWH. El archivo no se guarda.
        </StatePanel>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border bg-surface">
          <table className="w-full min-w-[44rem] text-left text-[13px]">
            <caption className="sr-only">Cargas del maestro de vendedores</caption>
            <thead className="bg-canvas-subtle text-[11px] font-semibold uppercase tracking-[0.06em] text-text-secondary">
              <tr>
                <th scope="col" className="px-3 py-1.5">Fecha</th>
                <th scope="col" className="px-3 py-1.5">Archivo</th>
                <th scope="col" className="px-3 py-1.5">Estado</th>
                <th scope="col" className="px-3 py-1.5 text-right">Rechazadas</th>
                <th scope="col" className="px-3 py-1.5 text-right">Advertencias</th>
                <th scope="col" className="px-3 py-1.5">Quién</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {uploads.data.map((item) => {
                const look = STATUS_LOOK[item.status] ?? { label: item.status, tone: "neutral" as BadgeTone };
                return (
                  <tr key={item.id}>
                    <td className="whitespace-nowrap px-3 py-1.5">{formatMoment(item.at)}</td>
                    <td className="max-w-72 px-3 py-1.5">
                      <span className="block truncate" title={item.filename}>{item.filename}</span>
                      <span className="text-xs text-text-secondary">{size(item.size)}</span>
                    </td>
                    <td className="px-3 py-1.5">
                      <Badge tone={look.tone} className="px-1.5 py-0 text-xs">
                        {look.label}
                        {item.http_status && item.status !== "cargado" ? ` · ${item.http_status}` : ""}
                      </Badge>
                    </td>
                    <td className="px-3 py-1.5 text-right tabular-nums">{formatCount(item.rejected_rows)}</td>
                    <td className="px-3 py-1.5 text-right tabular-nums">{formatCount(item.warnings)}</td>
                    <td className="px-3 py-1.5">{item.actor}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
