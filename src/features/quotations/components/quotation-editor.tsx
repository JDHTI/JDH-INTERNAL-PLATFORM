"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  ArrowLeft,
  Check,
  FileCheck2,
  FileSpreadsheet,
  FileText,
  FileX2,
  Loader2,
  MoreHorizontal,
  PackagePlus,
  RefreshCw,
  Search,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

import Pager from "@/shared/components/pager";
import StatePanel from "@/shared/components/state-panel";
import { Button, buttonVariants } from "@/shared/components/ui/button";
import ConfirmDeleteDialog from "@/shared/components/ui/confirm-delete-dialog";
import { Input } from "@/shared/components/ui/input";
import { Menu, MenuItem } from "@/shared/components/ui/menu";
import { useDebouncedValue } from "@/shared/hooks/use-debounced-value";
import { ApiError, errorMessage } from "@/shared/lib/api-client";
import { cn } from "@/shared/lib/utils";
import { useBreadcrumbLabel } from "@/shared/store/use-breadcrumb-store";
import SupportDetail from "@/features/supports/components/support-detail";

import { useLineEditor, type LineEditor } from "../hooks/use-line-editor";
import { useDeleteQuotation, useQuotation, useRefreshQuotation, useRemoveLine } from "../hooks/use-quotations";
import { formatCount, formatDateTime, formatDay } from "../lib/format";
import { downloadQuotationExcel, downloadQuotationFlatFile } from "../services/quotations.service";
import type { Quotation, QuotationLine } from "../types/quotations.types";
import AddProductsDialog from "./add-products-dialog";
import GenerateDialog from "./generate-dialog";
import LineDetailDialog from "./line-detail-dialog";
import { LinesList, LinesTable } from "./lines-table";
import { QuotationStatusBadge } from "./quotation-badges";
import { QuotationLoadError, QuotationRulesLink } from "./quotations-gate";
import { ToggleChip } from "./toggle-chip";

const PAGE_SIZE = 50;

type LineFilter = "all" | "changed" | "failing" | "support" | "added";

const failing = (line: QuotationLine) => line.compliance !== null && line.compliance !== "cumple";

const FILTERS: Record<LineFilter, (line: QuotationLine) => boolean> = {
  all: () => true,
  changed: (line) => line.new_price !== null,
  failing,
  support: (line) => line.support !== null,
  added: (line) => line.origin === "agregado",
};

export default function QuotationEditor({ quotationId, basePath }: { quotationId: string; basePath: string }) {
  const quotation = useQuotation(quotationId);
  useBreadcrumbLabel(`${basePath}/${quotationId}`, quotation.data?.customer_name);

  if (quotation.isPending) {
    return (
      <div className="space-y-4" aria-busy="true" aria-label="Cargando cotización">
        <div className="h-28 animate-pulse rounded-lg bg-canvas-subtle" />
        <div className="h-96 animate-pulse rounded-lg bg-canvas-subtle" />
      </div>
    );
  }
  if (quotation.isError && !quotation.data) {
    return (
      <QuotationLoadError
        error={quotation.error}
        onRetry={() => void quotation.refetch()}
        subject="esta cotización"
        action={
          quotation.error instanceof ApiError && quotation.error.status === 404 ? (
            <Link href={basePath} className={buttonVariants({ variant: "outline" })}>Ver las cotizaciones</Link>
          ) : undefined
        }
      />
    );
  }
  return <Editor quotation={quotation.data} basePath={basePath} />;
}

function Editor({ quotation, basePath }: { quotation: Quotation; basePath: string }) {
  const router = useRouter();
  const editor = useLineEditor(quotation);
  const refresh = useRefreshQuotation(quotation.id);
  const removeLine = useRemoveLine(quotation.id);
  const remove = useDeleteQuotation();
  const [adding, setAdding] = useState(false);
  const [removingSku, setRemovingSku] = useState<string | null>(null);
  const [filter, setFilter] = useState<LineFilter>("all");
  const [text, setText] = useState("");
  const [page, setPage] = useState(1);
  const [generating, setGenerating] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [detailLine, setDetailLine] = useState<QuotationLine | null>(null);
  const [agreementId, setAgreementId] = useState<string | null>(null);
  const [downloading, setDownloading] = useState<"xlsx" | "txt" | null>(null);
  const q = useDebouncedValue(text.trim().toLowerCase());

  const counts = useMemo(
    () => ({
      all: quotation.lines.length,
      changed: quotation.lines.filter(FILTERS.changed).length,
      failing: quotation.lines.filter(failing).length,
      support: quotation.lines.filter(FILTERS.support).length,
      added: quotation.lines.filter(FILTERS.added).length,
    }),
    [quotation.lines]
  );

  const visible = useMemo(
    () =>
      quotation.lines.filter(
        (line) =>
          FILTERS[filter](line) &&
          (q === "" ||
            line.sku.toLowerCase().includes(q) ||
            (line.description ?? "").toLowerCase().includes(q) ||
            (line.supplier_name ?? "").toLowerCase().includes(q))
      ),
    [quotation.lines, filter, q]
  );
  const lastPage = Math.max(1, Math.ceil(visible.length / PAGE_SIZE));
  const currentPage = Math.min(page, lastPage);
  const pageLines = visible.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  const filtered = filter !== "all" || q !== "";

  const chooseFilter = (next: LineFilter) => {
    setFilter(next);
    setPage(1);
  };
  const clearFilters = () => {
    setFilter("all");
    setText("");
    setPage(1);
  };

  const busy = editor.unsaved || refresh.isPending || removeLine.isPending;
  const generated = quotation.status === "generado";

  const runRemoveLine = (line: QuotationLine) => {
    setRemovingSku(line.sku);
    removeLine.mutate(
      { version: quotation.version, sku: line.sku },
      {
        onSuccess: () => toast.success(`Se quitó ${line.sku} de la cotización.`),
        onError: (failure) => toast.error(errorMessage(failure), { duration: Infinity }),
        onSettled: () => setRemovingSku(null),
      }
    );
  };

  const runRefresh = () =>
    refresh.mutate(quotation.version, {
      onSuccess: () => toast.success("Cotización actualizada con las ventas, los costos y los apoyos de hoy. Tus precios nuevos se conservaron."),
      onError: (failure) => toast.error(errorMessage(failure), { duration: Infinity }),
    });

  const download = async (kind: "xlsx" | "txt") => {
    setDownloading(kind);
    try {
      await (kind === "xlsx" ? downloadQuotationExcel(quotation.id) : downloadQuotationFlatFile(quotation.id));
    } catch (failure) {
      toast.error(errorMessage(failure), { duration: Infinity });
    } finally {
      setDownloading(null);
    }
  };

  const confirmDelete = () =>
    remove.mutate(quotation.id, {
      onSuccess: () => {
        toast.success(`Cotización de ${quotation.customer_name} eliminada.`);
        router.push(basePath);
      },
      onError: (failure) => setDeleteError(errorMessage(failure)),
    });

  return (
    <div className="mx-auto w-full max-w-[1600px] space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
        <Link
          href={basePath}
          className="inline-flex min-h-8 items-center gap-1 rounded-sm text-sm text-text-secondary hover:text-text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring max-md:min-h-11"
        >
          <ArrowLeft className="size-4" aria-hidden="true" /> Cotizaciones
        </Link>
        <QuotationRulesLink basePath={basePath} />
      </div>

      <header className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div className="min-w-0 space-y-2">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <h1 className="text-2xl font-semibold tracking-tight">{quotation.customer_name}</h1>
            <QuotationStatusBadge status={quotation.status} label={quotation.status_label} />
          </div>
          <CustomerFacts quotation={quotation} />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" onClick={() => setAdding(true)} disabled={busy} className="max-md:h-11">
            <PackagePlus aria-hidden="true" /> Agregar productos
          </Button>
          <Button variant="outline" onClick={runRefresh} disabled={busy} className="max-md:h-11">
            <RefreshCw className={cn(refresh.isPending && "animate-spin")} aria-hidden="true" />
            {refresh.isPending ? "Refrescando…" : "Refrescar"}
          </Button>
          {generated && (
            <>
              <Button variant="outline" onClick={() => void download("xlsx")} disabled={downloading !== null} className="max-md:h-11">
                {downloading === "xlsx" ? <Loader2 className="animate-spin" aria-hidden="true" /> : <FileSpreadsheet aria-hidden="true" />}
                Excel
              </Button>
              <Button variant="outline" onClick={() => void download("txt")} disabled={downloading !== null} className="max-md:h-11">
                {downloading === "txt" ? <Loader2 className="animate-spin" aria-hidden="true" /> : <FileText aria-hidden="true" />}
                Plano SIESA
              </Button>
            </>
          )}
          <Button
            onClick={() => setGenerating(true)}
            disabled={busy || counts.changed === 0}
            title={counts.changed === 0 ? "Escribe al menos un precio nuevo para generar el formato." : undefined}
            className="max-md:h-11"
          >
            <FileCheck2 aria-hidden="true" /> {generated ? "Generar de nuevo" : "Generar"}
          </Button>
          <Menu
            align="end"
            trigger={<MoreHorizontal className="size-4" aria-hidden="true" />}
            triggerClassName={cn(buttonVariants({ variant: "ghost", size: "icon" }), "max-md:size-11")}
            triggerLabel="Más acciones de la cotización"
          >
            <MenuItem onClick={() => { setDeleteError(null); setDeleting(true); }}>
              <Trash2 aria-hidden="true" /> Eliminar cotización
            </MenuItem>
          </Menu>
        </div>
      </header>

      <PriceListNotice quotation={quotation} />
      <Warnings quotation={quotation} />
      <Summary quotation={quotation} />

      <SaveStatus editor={editor} />

      <div className={cn("sticky top-0 z-20 flex flex-col gap-3 bg-canvas py-2 lg:flex-row lg:items-center", quotation.lines.length === 0 && "hidden")}>
        <div className="relative w-full lg:max-w-sm">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-text-secondary" aria-hidden="true" />
          <Input
            type="search"
            value={text}
            onChange={(event) => {
              setText(event.target.value);
              setPage(1);
            }}
            placeholder="Referencia, descripción o proveedor"
            aria-label="Buscar referencias"
            className="pl-9 max-md:h-11"
          />
        </div>
        <div role="group" aria-label="Filtrar referencias" className="flex flex-wrap gap-2">
          <ToggleChip active={filter === "all"} onClick={() => chooseFilter("all")} count={counts.all}>Todas</ToggleChip>
          <ToggleChip active={filter === "changed"} onClick={() => chooseFilter("changed")} count={counts.changed}>Con precio nuevo</ToggleChip>
          <ToggleChip active={filter === "failing"} onClick={() => chooseFilter("failing")} count={counts.failing}>No cumplen</ToggleChip>
          <ToggleChip active={filter === "support"} onClick={() => chooseFilter("support")} count={counts.support}>Con apoyo</ToggleChip>
          <ToggleChip active={filter === "added"} onClick={() => chooseFilter("added")} count={counts.added}>Agregados</ToggleChip>
        </div>
      </div>

      {quotation.lines.length === 0 ? (
        <StatePanel
          icon={PackagePlus}
          title="El cliente no tiene ventas en la ventana"
          action={
            <Button onClick={() => setAdding(true)} disabled={busy} className="max-md:h-11">
              <PackagePlus aria-hidden="true" /> Agregar productos
            </Button>
          }
        >
          No compró nada en los últimos {quotation.window_months} meses, así que no hay último precio de qué partir.
          Agrega las referencias que le vas a cotizar: cada una trae su costo, margen objetivo, apoyos e impuesto de
          licores.
        </StatePanel>
      ) : visible.length === 0 ? (
        <StatePanel
          icon={FileX2}
          title="Ninguna referencia coincide"
          action={<Button variant="outline" onClick={clearFilters}>Ver todas las referencias</Button>}
        >
          {filter === "failing"
            ? "Todos los precios nuevos cumplen la regla."
            : filter === "changed"
              ? "Aún no hay precios nuevos: escríbelos en la columna «Precio nuevo»."
              : filter === "added"
                ? "Aún no agregaste referencias fuera del histórico. Usa «Agregar productos»."
                : "Prueba con otra referencia o con menos palabras de la descripción."}
        </StatePanel>
      ) : (
        <div className="space-y-3">
          <LinesList
            lines={pageLines}
            editor={editor}
            onOpenDetail={setDetailLine}
            onRemove={runRemoveLine}
            removing={removingSku}
            canRemove={!busy}
          />
          <LinesTable
            lines={pageLines}
            editor={editor}
            onOpenDetail={setDetailLine}
            onRemove={runRemoveLine}
            removing={removingSku}
            canRemove={!busy}
          />
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-xs tabular-nums text-text-secondary">
              {formatCount(visible.length)} {visible.length === 1 ? "referencia" : "referencias"}
              {filtered && ` de ${formatCount(counts.all)}`}
            </span>
            <Pager page={currentPage} size={PAGE_SIZE} total={visible.length} count={pageLines.length} onPageChange={setPage} />
          </div>
        </div>
      )}

      <GenerateDialog quotation={quotation} open={generating} onOpenChange={setGenerating} />
      <AddProductsDialog quotation={quotation} open={adding} onOpenChange={setAdding} />
      <LineDetailDialog
        line={detailLine}
        onClose={() => setDetailLine(null)}
        onOpenAgreement={(id) => {
          setDetailLine(null);
          setAgreementId(id);
        }}
      />
      <SupportDetail id={agreementId} onClose={() => setAgreementId(null)} />
      <ConfirmDeleteDialog
        open={deleting}
        onOpenChange={setDeleting}
        title="¿Eliminar esta cotización?"
        confirmLabel="Eliminar cotización"
        onConfirm={confirmDelete}
        isPending={remove.isPending}
        error={deleteError}
      >
        Los precios nuevos de {quotation.customer_name} se pierden; los archivos ya descargados no cambian.
      </ConfirmDeleteDialog>
    </div>
  );
}

function CustomerFacts({ quotation }: { quotation: Quotation }) {
  const facts: [string, React.ReactNode][] = [
    ["NIT", <span key="nit" className="font-mono">{quotation.customer_nit}</span>],
    ["Canal", quotation.channel ?? "Sin canal"],
    ["CO que factura", quotation.billing_center_code ?? "—"],
    ["Vendedor", quotation.salesperson_name ?? "—"],
    ["Ventana", `${quotation.window_months} meses`],
  ];
  return (
    <div className="space-y-1">
      <dl className="flex flex-wrap gap-x-5 gap-y-1 text-sm">
        {facts.map(([label, value]) => (
          <div key={label} className="flex gap-1.5">
            <dt className="text-text-secondary">{label}</dt>
            <dd>{value}</dd>
          </div>
        ))}
      </dl>
      <p className="text-[13px] text-text-secondary">
        Armada el {formatDateTime(quotation.built_at)}
        {quotation.cost_cut_date && ` · costo al corte del ${formatDay(quotation.cost_cut_date)}`}
        {quotation.generated_at &&
          ` · generada el ${formatDateTime(quotation.generated_at)}${quotation.generated_by ? ` por ${quotation.generated_by}` : ""}`}
        {quotation.activation_date && ` · activa desde el ${formatDay(quotation.activation_date)}`}
      </p>
    </div>
  );
}

/** The SIESA list the prices go to, and how many customers share it. */
function PriceListNotice({ quotation }: { quotation: Quotation }) {
  const shared = quotation.price_list_customers ?? 0;
  const target = quotation.export_price_list_id ?? quotation.price_list_id;
  return (
    <div className="flex flex-col gap-1 rounded-lg border border-border bg-surface px-4 py-3 text-sm sm:flex-row sm:items-baseline sm:gap-3">
      <p>
        <span className="text-text-secondary">Lista SIESA del cliente </span>
        <span className="font-mono font-semibold">{quotation.price_list_id ?? "—"}</span>
        {quotation.price_list_name && <span> {quotation.price_list_name}</span>}
        {target && target !== quotation.price_list_id && (
          <span className="text-text-secondary">
            {" "}· el formato se generó para la lista <span className="font-mono text-text-primary">{target}</span>
          </span>
        )}
      </p>
      {shared > 1 && (
        <p className="flex items-start gap-1.5 text-text-secondary">
          <AlertTriangle className="mt-0.5 size-4 shrink-0 text-warning" aria-hidden="true" />
          <span>
            La comparten <strong className="tabular-nums text-text-primary">{formatCount(shared)}</strong> clientes activos: un
            precio cargado en ella les cambia a todos.
          </span>
        </p>
      )}
    </div>
  );
}

/** What the API found odd about the customer, in its words. */
function Warnings({ quotation }: { quotation: Quotation }) {
  // The shared list has its own notice, and "sin ventas" its own empty state with the way out.
  const warnings = quotation.warnings.filter(
    (warning) => warning.code !== "lista_compartida" && !(warning.code === "sin_ventas" && quotation.lines.length === 0)
  );
  if (warnings.length === 0) return null;
  return (
    <ul className="space-y-1 rounded-lg bg-warning-surface px-4 py-3 text-sm" aria-label="Avisos de la cotización">
      {warnings.map((warning) => (
        <li key={warning.code} className="flex items-start gap-2">
          <AlertTriangle className="mt-0.5 size-4 shrink-0 text-warning" aria-hidden="true" />
          <span>{warning.label}</span>
        </li>
      ))}
    </ul>
  );
}

function Summary({ quotation }: { quotation: Quotation }) {
  const items: { label: string; value: number; alert?: boolean }[] = [
    { label: "Referencias", value: quotation.line_count },
    { label: "Con precio nuevo", value: quotation.changed_count },
    { label: "No cumplen la regla", value: quotation.below_rule_count, alert: quotation.below_rule_count > 0 },
  ];
  return (
    <dl className="grid grid-cols-3 gap-3">
      {items.map((item) => (
        <div key={item.label} className="min-w-0 rounded-lg border border-border bg-surface px-4 py-3">
          <dt className="text-[13px] text-text-secondary">{item.label}</dt>
          <dd className={cn("text-2xl font-semibold tabular-nums", item.alert && "text-danger")}>{formatCount(item.value)}</dd>
        </div>
      ))}
    </dl>
  );
}

/**
 * Where the typed prices stand. Polite live region: a save is not urgent news,
 * a conflict is shown as an alert with what to do.
 */
function SaveStatus({ editor }: { editor: LineEditor }) {
  if (editor.state === "conflict") {
    return (
      <div role="alert" className="flex flex-col gap-3 rounded-lg bg-warning-surface px-4 py-3 text-sm sm:flex-row sm:items-center sm:justify-between">
        <p className="flex items-start gap-2">
          <AlertTriangle className="mt-0.5 size-4 shrink-0 text-warning" aria-hidden="true" />
          <span>
            La cotización cambió desde otra pestaña o por otra persona, así que tus últimos precios no se guardaron. Ya
            cargamos la versión actual; tus precios siguen escritos en la tabla.
          </span>
        </p>
        <div className="flex shrink-0 gap-2">
          <Button variant="outline" onClick={editor.discard} className="max-md:h-11">Descartar mis precios</Button>
          <Button onClick={() => void editor.retry()} className="max-md:h-11">Guardar mis precios</Button>
        </div>
      </div>
    );
  }
  return (
    <p aria-live="polite" className="flex min-h-5 items-center gap-1.5 text-[13px] text-text-secondary">
      {editor.state === "saving" ? (
        <><Loader2 className="size-3.5 animate-spin" aria-hidden="true" /> Guardando precios…</>
      ) : editor.state === "waiting" ? (
        "Cambios sin guardar; se guardan al dejar de escribir."
      ) : editor.state === "error" ? (
        <span className="text-danger">No se guardaron los últimos precios: {editor.failure} Corrige el valor y se intentará de nuevo.</span>
      ) : editor.invalid.length > 0 ? (
        <span className="text-danger">
          {editor.invalid.length === 1
            ? `El precio de ${editor.invalid[0].sku} no se puede leer: ${editor.invalid[0].message}`
            : `${editor.invalid.length} precios no se pueden leer (${editor.invalid.map((item) => item.sku).join(", ")}); se marcan en rojo.`}{" "}
          No se guarda hasta corregirlo.
        </span>
      ) : (
        <><Check className="size-3.5" aria-hidden="true" /> Precios guardados</>
      )}
    </p>
  );
}
