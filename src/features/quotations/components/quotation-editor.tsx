"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  ArrowLeft,
  Check,
  CheckCircle2,
  FileSpreadsheet,
  FileText,
  FileX2,
  Hourglass,
  Loader2,
  MessageSquareWarning,
  MoreHorizontal,
  PackagePlus,
  RefreshCw,
  Search,
  Send,
  Sheet,
  Trash2,
  Undo2,
} from "lucide-react";
import { toast } from "sonner";

import Pager from "@/shared/components/pager";
import StatePanel from "@/shared/components/state-panel";
import { Button, buttonVariants } from "@/shared/components/ui/button";
import ConfirmDeleteDialog from "@/shared/components/ui/confirm-delete-dialog";
import { InfoPopover } from "@/shared/components/ui/info-popover";
import { Input } from "@/shared/components/ui/input";
import { Menu, MenuItem } from "@/shared/components/ui/menu";
import { useDebouncedValue } from "@/shared/hooks/use-debounced-value";
import { ApiError, errorMessage } from "@/shared/lib/api-client";
import { cn } from "@/shared/lib/utils";
import { useBreadcrumbLabel } from "@/shared/store/use-breadcrumb-store";
import SupportDetail from "@/features/supports/components/support-detail";

import { useLineEditor, type LineEditor } from "../hooks/use-line-editor";
import { useLineImport } from "../hooks/use-line-import";
import {
  useDeleteQuotation,
  useQuotation,
  useQuotationPermissions,
  useRefreshQuotation,
  useRemoveLine,
} from "../hooks/use-quotations";
import { formatCount, formatDateTime, formatDay, isValidated } from "../lib/format";
import { downloadQuotationExcel, downloadQuotationFlatFile } from "../services/quotations.service";
import type { ImportResult, Quotation, QuotationLine } from "../types/quotations.types";
import AddProductsDialog, { EMPTY_DRAFT, type ImportDraft } from "./add-products-dialog";
import LineDetailDialog from "./line-detail-dialog";
import { LinesList, LinesTable, type LineSelection } from "./lines-table";
import MarginSelectionBar from "./margin-selection-bar";
import { QuotationStatusBadge } from "./quotation-badges";
import { QuotationLoadError, QuotationRulesLink } from "./quotations-gate";
import { ConfirmDialog, ReturnDialog, ValidateDialog } from "./review-dialogs";
import TemplateDialog from "./template-dialog";
import { ToggleChip } from "./toggle-chip";

const PAGE_SIZE = 50;

/** "imported" is what the last paste added or revalidated; it exists only after one. */
type LineFilter = "all" | "changed" | "failing" | "below" | "support" | "added" | "inactive" | "imported";

const failing = (line: QuotationLine) => line.is_active && line.compliance !== null && line.compliance !== "cumple";

const FILTERS: Record<Exclude<LineFilter, "imported">, (line: QuotationLine) => boolean> = {
  all: () => true,
  changed: (line) => line.new_price !== null && line.is_active,
  failing,
  below: (line) => line.below_target,
  support: (line) => line.support !== null,
  added: (line) => line.origin === "agregado",
  inactive: (line) => !line.is_active,
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
  // The gate around this screen has already loaded the permissions.
  const permissions = useQuotationPermissions().data;
  // The API decides which quotations each person opens (Comercial: its own; BI and admins: all),
  // so whoever opens one and quotes has the whole editor.
  const canManage = permissions?.can_manage === true;
  const canValidate = permissions?.can_validate === true;
  const pendingReview = quotation.status === "pendiente_validacion";
  const editable = canManage && !pendingReview;

  const editor = useLineEditor(quotation);
  const refresh = useRefreshQuotation(quotation.id);
  const removeLine = useRemoveLine(quotation.id);
  const remove = useDeleteQuotation();
  const importer = useLineImport(quotation);
  const [adding, setAdding] = useState(false);
  const [importDraft, setImportDraft] = useState<ImportDraft>(EMPTY_DRAFT);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [removingSku, setRemovingSku] = useState<string | null>(null);
  const [filter, setFilter] = useState<LineFilter>("all");
  const [text, setText] = useState("");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Set<string>>(() => new Set());
  const [dialog, setDialog] = useState<"confirm" | "return" | "validate" | "template" | "delete" | null>(null);
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
      below: quotation.lines.filter(FILTERS.below).length,
      support: quotation.lines.filter(FILTERS.support).length,
      added: quotation.lines.filter(FILTERS.added).length,
      inactive: quotation.lines.filter(FILTERS.inactive).length,
    }),
    [quotation.lines]
  );

  const imported = useMemo(() => new Set(importer.lastImport ?? []), [importer.lastImport]);
  const visible = useMemo(
    () =>
      quotation.lines.filter(
        (line) =>
          (filter === "imported" ? imported.has(line.sku) : FILTERS[filter](line)) &&
          (q === "" ||
            line.sku.toLowerCase().includes(q) ||
            (line.description ?? "").toLowerCase().includes(q) ||
            (line.supplier_name ?? "").toLowerCase().includes(q))
      ),
    [quotation.lines, filter, q, imported]
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

  const busy = editor.unsaved || refresh.isPending || removeLine.isPending || importer.isPending;
  // Pending rows go after the last row of the list, so only the last page shows them.
  const pending = currentPage === lastPage ? importer.pending : [];
  const hasRows = quotation.lines.length > 0 || importer.pending.length > 0;

  // The columns of the outcome appear once there is an outcome to show.
  const hasChanges = useMemo(() => quotation.lines.some((line) => line.new_price !== null), [quotation.lines]);
  const filteredSkus = useMemo(() => visible.map((line) => line.sku), [visible]);

  const selection: LineSelection | undefined = editable
    ? {
        selected,
        scope: filteredSkus,
        toggle: (sku) =>
          setSelected((current) => {
            const next = new Set(current);
            if (!next.delete(sku)) next.add(sku);
            return next;
          }),
        // Every reference of the filter and search, on every page.
        toggleAll: () =>
          setSelected((current) => {
            const next = new Set(current);
            const all = filteredSkus.every((sku) => next.has(sku));
            for (const sku of filteredSkus) {
              if (all) next.delete(sku);
              else next.add(sku);
            }
            return next;
          }),
      }
    : undefined;

  const openImport = () => {
    setImportResult(null);
    setImportError(null);
    setAdding(true);
  };

  /*
   * The dialog closes the moment the list is sent: the table shows what is
   * being added as pending rows. It reopens only when something is left to
   * do: references that do not exist (back in the paste box to correct), or
   * a refusal (the draft is kept as typed).
   */
  const submitImport = () => {
    const draft = importDraft;
    setAdding(false);
    setText("");
    chooseFilter("imported");
    importer.run(
      { text: draft.text, skus: draft.picks.map((pick) => pick.sku) },
      {
        onResult: (result) => {
          const summary = [
            result.added.length > 0 ? `${formatCount(result.added.length)} ${result.added.length === 1 ? "agregada" : "agregadas"}` : null,
            result.revalidated.length > 0
              ? `${formatCount(result.revalidated.length)} ${result.revalidated.length === 1 ? "revalidada" : "revalidadas"}`
              : null,
          ]
            .filter(Boolean)
            .join(" · ");
          if (result.not_found.length > 0 || result.inactive.length > 0) {
            setImportDraft({ picks: [], text: result.not_found.join("\n") });
            setImportResult(result);
            setImportError(null);
            setAdding(true);
          } else {
            setImportDraft(EMPTY_DRAFT);
            importer.flash(result.revalidated);
            toast.success(`${summary}. Escribe el precio nuevo en la tabla.`);
          }
        },
        onError: (failure) => {
          setImportResult(null);
          setImportError(errorMessage(failure));
          setAdding(true);
          chooseFilter("all");
        },
      }
    );
  };

  const runRemoveLine = (line: QuotationLine) => {
    setRemovingSku(line.sku);
    removeLine.mutate(
      { version: quotation.version, sku: line.sku },
      {
        onSuccess: () => {
          setSelected((current) => {
            const next = new Set(current);
            next.delete(line.sku);
            return next;
          });
          toast.success(`Se quitó ${line.sku} de la cotización.`);
        },
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

  const closeDialog = () => setDialog(null);

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
          {editable && (
            <Button variant="outline" onClick={runRefresh} disabled={busy} className="max-md:h-11">
              <RefreshCw className={cn(refresh.isPending && "animate-spin")} aria-hidden="true" />
              {refresh.isPending ? "Refrescando…" : "Refrescar"}
            </Button>
          )}
          {editable && (
            <Button variant="outline" onClick={() => setDialog("template")} disabled={busy} className="max-md:h-11">
              <Sheet aria-hidden="true" /> Plantilla
            </Button>
          )}
          {isValidated(quotation.status) && (
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
          {pendingReview && canValidate && (
            <>
              <Button variant="outline" onClick={() => setDialog("return")} className="max-md:h-11">
                <Undo2 aria-hidden="true" /> Devolver
              </Button>
              <Button onClick={() => setDialog("validate")} className="max-md:h-11">
                <CheckCircle2 aria-hidden="true" /> Validar
              </Button>
            </>
          )}
          {pendingReview && canManage && !canValidate && (
            <Button variant="outline" onClick={() => setDialog("return")} className="max-md:h-11">
              <Undo2 aria-hidden="true" /> Retirar de validación
            </Button>
          )}
          {canManage && quotation.status === "borrador" && (
            <Button
              onClick={() => setDialog("confirm")}
              disabled={busy || counts.changed === 0}
              title={counts.changed === 0 ? "Escribe al menos un precio nuevo para confirmar." : undefined}
              className="max-md:h-11"
            >
              <Send aria-hidden="true" /> Confirmar
            </Button>
          )}
          {canManage && (
            <Menu
              align="end"
              trigger={<MoreHorizontal className="size-4" aria-hidden="true" />}
              triggerClassName={cn(buttonVariants({ variant: "ghost", size: "icon" }), "max-md:size-11")}
              triggerLabel="Más acciones de la cotización"
            >
              <MenuItem
                onClick={() => {
                  setDeleteError(null);
                  setDialog("delete");
                }}
              >
                <Trash2 aria-hidden="true" /> Eliminar cotización
              </MenuItem>
            </Menu>
          )}
        </div>
      </header>

      <ReviewBanner quotation={quotation} canManage={canManage} canValidate={canValidate} />
      <Warnings quotation={quotation} />
      <Summary quotation={quotation} />

      {editable && <SaveStatus editor={editor} />}

      <div className={cn("sticky top-0 z-20 space-y-2 bg-canvas py-2", !hasRows && "hidden")}>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="relative w-full sm:max-w-sm">
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
          {editable && (
            // Next to the references it adds to, not among the quotation's own actions.
            <Button variant="outline" onClick={openImport} disabled={busy} className="sm:ml-auto max-md:h-11">
              <PackagePlus aria-hidden="true" /> Agregar productos
            </Button>
          )}
        </div>
        <div role="group" aria-label="Filtrar referencias" className="flex flex-wrap gap-2">
          <ToggleChip active={filter === "all"} onClick={() => chooseFilter("all")} count={counts.all}>Todas</ToggleChip>
          <ToggleChip active={filter === "changed"} onClick={() => chooseFilter("changed")} count={counts.changed}>Con precio nuevo</ToggleChip>
          <ToggleChip active={filter === "failing"} onClick={() => chooseFilter("failing")} count={counts.failing}>No cumplen</ToggleChip>
          <ToggleChip active={filter === "below"} onClick={() => chooseFilter("below")} count={counts.below}>Bajo el objetivo</ToggleChip>
          <ToggleChip active={filter === "support"} onClick={() => chooseFilter("support")} count={counts.support}>Con apoyo</ToggleChip>
          <ToggleChip active={filter === "added"} onClick={() => chooseFilter("added")} count={counts.added}>Agregados</ToggleChip>
          {counts.inactive > 0 && (
            <ToggleChip active={filter === "inactive"} onClick={() => chooseFilter("inactive")} count={counts.inactive}>Inactivas</ToggleChip>
          )}
          {importer.lastImport && (
            <ToggleChip
              active={filter === "imported"}
              onClick={() => chooseFilter("imported")}
              count={importer.isPending ? null : importer.lastImport.length}
            >
              Última importación
            </ToggleChip>
          )}
        </div>
        {editable && (
          <MarginSelectionBar
            quotation={quotation}
            selected={selected}
            filteredSkus={filteredSkus}
            onSelectionChange={setSelected}
            disabled={busy}
          />
        )}
      </div>

      {!hasRows ? (
        <StatePanel
          icon={PackagePlus}
          title="El cliente no tiene ventas en la ventana"
          action={
            editable ? (
              <Button onClick={openImport} disabled={busy} className="max-md:h-11">
                <PackagePlus aria-hidden="true" /> Agregar productos
              </Button>
            ) : undefined
          }
        >
          No compró nada en los últimos {quotation.window_months} meses, así que no hay último precio de qué partir.
          {editable && " Agrega las referencias que le vas a cotizar: cada una trae su costo, margen objetivo, apoyos e impuesto de licores."}
        </StatePanel>
      ) : visible.length === 0 && pending.length === 0 ? (
        <StatePanel
          icon={FileX2}
          title="Ninguna referencia coincide"
          action={<Button variant="outline" onClick={clearFilters}>Ver todas las referencias</Button>}
        >
          {filter === "failing"
            ? "Todos los precios nuevos cumplen la regla."
            : filter === "below"
              ? "Ningún último precio deja el margen bajo el objetivo."
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
            editable={editable}
            onOpenDetail={setDetailLine}
            onRemove={runRemoveLine}
            removing={removingSku}
            canRemove={!busy}
            selection={selection}
            pending={pending}
            highlight={importer.highlight}
            showOutcome={hasChanges}
          />
          <LinesTable
            lines={pageLines}
            editor={editor}
            editable={editable}
            onOpenDetail={setDetailLine}
            onRemove={runRemoveLine}
            removing={removingSku}
            canRemove={!busy}
            selection={selection}
            pending={pending}
            highlight={importer.highlight}
            showOutcome={hasChanges}
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

      <ConfirmDialog quotation={quotation} open={dialog === "confirm"} onOpenChange={(open) => !open && closeDialog()} />
      <ReturnDialog
        quotation={quotation}
        open={dialog === "return"}
        onOpenChange={(open) => !open && closeDialog()}
        asValidator={canValidate}
      />
      <ValidateDialog quotation={quotation} open={dialog === "validate"} onOpenChange={(open) => !open && closeDialog()} />
      <TemplateDialog quotation={quotation} open={dialog === "template"} onOpenChange={(open) => !open && closeDialog()} />
      <AddProductsDialog
        quotation={quotation}
        open={adding}
        onOpenChange={(open) => {
          setAdding(open);
          // Reopened to correct a paste: the revalidated rows flash once the table is visible again.
          if (!open && importResult) {
            importer.flash(importResult.revalidated);
            setImportResult(null);
          }
        }}
        draft={importDraft}
        onDraftChange={setImportDraft}
        result={importResult}
        error={importError}
        onSubmit={submitImport}
      />
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
        open={dialog === "delete"}
        onOpenChange={(open) => !open && closeDialog()}
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
    [
      "Lista SIESA",
      <span key="list" className="font-mono" title={quotation.price_list_name ?? undefined}>
        {quotation.price_list_id ?? "—"}
      </span>,
    ],
    ["CO que factura", quotation.billing_center_code ?? "—"],
    ["Regional", quotation.regional_label ?? "—"],
    ["Familia", quotation.price_family_label ?? "—"],
    ["Bodega", quotation.stock_source ?? "—"],
    ["Vendedor", quotation.salesperson_name ?? "—"],
    ["Ventana", `${quotation.window_months} meses`],
    ["Creada por", quotation.created_by],
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
      <QuotationHistory quotation={quotation} />
    </div>
  );
}

/** When the quotation was built, confirmed and validated, and by whom: on demand, not on screen. */
function QuotationHistory({ quotation }: { quotation: Quotation }) {
  const by = (person: string | null) => (person ? ` por ${person}` : "");
  const events: [string, string][] = [
    ["Armada", formatDateTime(quotation.built_at)],
    ...(quotation.cost_cut_date ? [["Costo al corte", formatDay(quotation.cost_cut_date)] as [string, string]] : []),
    ...(quotation.confirmed_at
      ? [["Confirmada", `${formatDateTime(quotation.confirmed_at)}${by(quotation.confirmed_by)}`] as [string, string]]
      : []),
    ...(quotation.validated_at
      ? [["Validada", `${formatDateTime(quotation.validated_at)}${by(quotation.validated_by)}`] as [string, string]]
      : []),
  ];
  return (
    <InfoPopover label="Historial" title="Historial de la cotización">
      <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1">
        {events.map(([label, value]) => (
          <div key={label} className="contents">
            <dt className="text-text-secondary">{label}</dt>
            <dd>{value}</dd>
          </div>
        ))}
      </dl>
    </InfoPopover>
  );
}

/**
 * Where the quotation stands in the review, in words: why it came back, what
 * it is waiting for and what was asked, or what was released.
 */
function ReviewBanner({ quotation, canManage, canValidate }: { quotation: Quotation; canManage: boolean; canValidate: boolean }) {
  const target = quotation.export_price_list_id ?? quotation.price_list_id ?? "—";
  const plan =
    quotation.list_action === "creacion"
      ? `Crear la lista ${target}${quotation.new_list_name ? ` (${quotation.new_list_name})` : ""}`
      : `Actualizar la lista ${target}`;
  const activation = quotation.activation_date ? `, activa desde el ${formatDay(quotation.activation_date)}` : "";

  if (quotation.status === "borrador" && quotation.review_note) {
    return (
      <div role="status" className="flex items-start gap-2 rounded-lg bg-warning-surface px-4 py-3 text-sm">
        <MessageSquareWarning className="mt-0.5 size-4 shrink-0 text-warning" aria-hidden="true" />
        <p>
          <strong>Devuelta a borrador:</strong> {quotation.review_note}
        </p>
      </div>
    );
  }
  if (quotation.status === "pendiente_validacion") {
    return (
      <div role="status" className="flex items-start gap-2 rounded-lg bg-warning-surface px-4 py-3 text-sm">
        <Hourglass className="mt-0.5 size-4 shrink-0 text-warning" aria-hidden="true" />
        <p>
          <strong>{plan}{activation}.</strong>{" "}
          {canValidate
            ? "Revisa los precios y valídala para liberar el Excel y el plano, o devuélvela al asesor con una nota."
            : canManage
              ? "Espera la validación del área BI; mientras tanto no se puede editar. Si necesitas cambiar algo, retírala de validación."
              : "Espera la validación del área BI."}
        </p>
      </div>
    );
  }
  if (isValidated(quotation.status)) {
    // Validated: what was decided is done, so it reads in the past.
    const done =
      quotation.list_action === "creacion"
        ? `Validada para crear la lista ${target}${quotation.new_list_name ? ` (${quotation.new_list_name})` : ""}`
        : `Validada para actualizar la lista ${target}`;
    return (
      <div role="status" className="flex items-start gap-2 rounded-lg bg-success-surface px-4 py-3 text-sm">
        <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-success" aria-hidden="true" />
        <p>
          <strong>{done}{activation}.</strong> Descarga el Excel y el plano para cargarlos en SIESA
          {quotation.list_action === "creacion" ? "; asignar la lista nueva al cliente se hace a mano en SIESA." : "."}
          {canManage && " Si cambias un precio, vuelve a borrador y hay que confirmarla otra vez."}
        </p>
      </div>
    );
  }
  return null;
}

/*
 * Warnings the editor does not show. The shared list is said where it matters,
 * in the confirm dialog before anyone writes to it; the branch mismatches
 * (several CO or lists among the branches) were noise for the advisor, by
 * business decision (2026-11-03); list 1 is explained in the confirm dialog.
 * "sin ventas" has its own empty state.
 */
const HIDDEN_WARNINGS = new Set(["lista_compartida", "co_distintos", "listas_distintas", "lista_general"]);

/** What the API found odd about the customer, in its words. */
function Warnings({ quotation }: { quotation: Quotation }) {
  const warnings = quotation.warnings.filter(
    (warning) => !HIDDEN_WARNINGS.has(warning.code) && !(warning.code === "sin_ventas" && quotation.lines.length === 0)
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
  const items: { label: string; value: number; alert?: "danger" | "warning" }[] = [
    { label: "Referencias", value: quotation.line_count },
    { label: "Con precio nuevo", value: quotation.changed_count },
    { label: "No cumplen la regla", value: quotation.below_rule_count, alert: quotation.below_rule_count > 0 ? "danger" : undefined },
    { label: "Bajo el objetivo", value: quotation.below_target_count, alert: quotation.below_target_count > 0 ? "warning" : undefined },
  ];
  return (
    <dl className="grid grid-cols-2 gap-3 md:grid-cols-4">
      {items.map((item) => (
        <div key={item.label} className="min-w-0 rounded-lg border border-border bg-surface px-4 py-3">
          <dt className="text-[13px] text-text-secondary">{item.label}</dt>
          <dd
            className={cn(
              "text-2xl font-semibold tabular-nums",
              item.alert === "danger" && "text-danger",
              item.alert === "warning" && "text-warning"
            )}
          >
            {formatCount(item.value)}
          </dd>
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
