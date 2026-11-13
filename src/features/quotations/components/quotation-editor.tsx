"use client";

import { useId, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  ArrowLeft,
  Check,
  CheckCircle2,
  CloudUpload,
  FileSpreadsheet,
  FileText,
  FileCheck2,
  FileUp,
  FileX2,
  FilterX,
  HandCoins,
  Hourglass,
  Loader2,
  MessageSquareWarning,
  MoreHorizontal,
  PackageOpen,
  PackagePlus,
  RefreshCw,
  Save,
  Search,
  Send,
  Sheet,
  Trash2,
  Undo2,
} from "lucide-react";
import { toast } from "sonner";

import Pager from "@/shared/components/pager";
import StatePanel from "@/shared/components/state-panel";
import { Badge } from "@/shared/components/ui/badge";
import { Button, buttonVariants } from "@/shared/components/ui/button";
import ConfirmDeleteDialog from "@/shared/components/ui/confirm-delete-dialog";
import { InfoPopover } from "@/shared/components/ui/info-popover";
import { Input } from "@/shared/components/ui/input";
import { Menu, MenuItem } from "@/shared/components/ui/menu";
import { MultiSelect } from "@/shared/components/ui/multi-select";
import { Switch } from "@/shared/components/ui/switch";
import { useDebouncedValue } from "@/shared/hooks/use-debounced-value";
import { ApiError, errorMessage } from "@/shared/lib/api-client";
import { cn } from "@/shared/lib/utils";
import { useBreadcrumbLabel } from "@/shared/store/use-breadcrumb-store";
import SupportDetail from "@/features/supports/components/support-detail";

import { useLineEditor, type LineEditor } from "../hooks/use-line-editor";
import { useLineImport } from "../hooks/use-line-import";
import {
  useBillingCenters,
  useDeleteQuotation,
  useQuotation,
  useUpdateCostCenters,
  useUpdateOffer,
  useQuotationPermissions,
  useRefreshQuotation,
  useRemoveLine,
} from "../hooks/use-quotations";
import { useLineNote, useReviewLines, useStockTotals } from "../hooks/use-list-review";
import { formatCount, formatDateTime, formatDay, isValidated } from "../lib/format";
import { KIND_COPY } from "../lib/kind";
import { INDICATORS, type Indicator, type Sort, distinctValues, sortLines, supplierOf } from "../lib/line-status";
import { LIST_FILTERS, type ListFilter } from "../lib/list-review";
import { offerTotals } from "../lib/offer";
import { downloadLinesTemplate, downloadQuotationExcel, downloadQuotationFlatFile } from "../services/quotations.service";
import { type ImportResult, type Quotation, type QuotationLine, type ReviewStatus, isListKind } from "../types/quotations.types";
import { ListFilters } from "./list-review-controls";
import AddProductsDialog, { EMPTY_DRAFT, type ImportDraft } from "./add-products-dialog";
import BulkPricingPanel from "./bulk-pricing-panel";
import CostCentersSelect, { costCentersLabel, NATIONAL_LABEL } from "./cost-centers-select";
import LineDetailDialog from "./line-detail-dialog";
import { LinesList, LinesTable, type LineSelection, type ReviewControl } from "./lines-table";
import LocalProductDialog from "./local-product-dialog";
import { TotalsTable } from "./offer-document";
import OfferSection from "./offer-section";
import { QuotationStatusBadge } from "./quotation-badges";
import QuotationIndicators from "./quotation-indicators";
import { QuotationLoadError, QuotationRulesLink } from "./quotations-gate";
import { ConfirmDialog } from "./confirm-wizard";
import { ReturnDialog, UploadedDialog, ValidateDialog } from "./review-dialogs";
import SupportRequestDialog, { canAskSupport } from "./support-request-dialog";
import { ToggleChip } from "@/shared/components/ui/toggle-chip";

const PAGE_SIZE = 50;

type Download = "xlsx" | "txt" | "template";
const DOWNLOADS: Record<Download, (id: string) => Promise<void>> = {
  xlsx: downloadQuotationExcel,
  txt: downloadQuotationFlatFile,
  template: downloadLinesTemplate,
};

/**
 * The indicators are the main filters; "inactive" and "imported" (what the
 * last paste added or revalidated) are chips that appear only when they apply.
 */
type LineFilter = Indicator | "inactive" | "imported";

const inactive = (line: QuotationLine) => !line.is_active;
/** What confirming needs at least one of: an active line with a new price, from SIESA or local. */
const priced = (line: QuotationLine) => line.new_price !== null && line.is_active;

const EMPTY_FILTER_TEXT: Partial<Record<LineFilter, string>> = {
  objetivo: "Ninguna línea llega al margen objetivo todavía.",
  rango: "Ninguna línea queda entre el mínimo y el objetivo.",
  minimo: "Ninguna línea queda bajo el mínimo.",
  sin_referencia: "Todas las referencias tienen último precio.",
  local: "Aún no creaste productos para cotizar. Usa «Crear producto».",
  sin_precio: "Todas las referencias activas tienen precio nuevo.",
  apoyo: "Ninguna referencia tiene un apoyo aplicado.",
};

export default function QuotationEditor({ quotationId, basePath }: { quotationId: string; basePath: string }) {
  const quotation = useQuotation(quotationId);
  const data = quotation.data;
  useBreadcrumbLabel(
    `${basePath}/${quotationId}`,
    data && isListKind(data.kind) ? (data.price_list_name ?? `Lista ${data.price_list_id}`) : data?.customer_name
  );

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
  const permissions = useQuotationPermissions(quotation.kind).data;
  // A list update goes to SIESA only: no customer offer, quantities or products only for quoting,
  // and its items are reviewed one by one instead of confirming the whole.
  const isList = isListKind(quotation.kind);
  const copy = KIND_COPY[quotation.kind];
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
  const [creatingLocal, setCreatingLocal] = useState(false);
  const [askingSupport, setAskingSupport] = useState(false);
  // A customer quotation only: an internal support is for one customer, never a list.
  const canAskSupportHere = !isList && permissions?.can_request_support === true;
  const supportCandidates = useMemo(
    () => (canAskSupportHere ? quotation.lines.filter(canAskSupport).length : 0),
    [canAskSupportHere, quotation.lines]
  );
  const [filter, setFilter] = useState<LineFilter>("all");
  // A list update filters by the item's review and by where its price leaves the margin.
  const [listFilter, setListFilter] = useState<ListFilter>("all");
  const stockTotals = useStockTotals(quotation.id, isList);
  const lineNote = useLineNote(quotation.id);
  const reviewLines = useReviewLines(quotation.id);
  // The review of an item changes on its own chip, in the row or in its detail; never in bulk.
  const setReview = (line: QuotationLine, status: ReviewStatus) =>
    reviewLines.mutateAsync({ version: quotation.version, skus: [line.sku], status }).then(
      (result) => {
        const skipped = result.skipped?.[0];
        if (skipped) toast.warning(`${line.description ?? line.sku}: ${skipped.reason}`);
      },
      (failure) => {
        toast.error(errorMessage(failure), { duration: Infinity });
      }
    );
  const reviewControl: ReviewControl = {
    canEdit: editable,
    canValidate: permissions?.can_validate === true,
    pending: reviewLines.isPending ? (reviewLines.variables?.skus[0] ?? null) : null,
    onChange: (line, status) => void setReview(line, status),
  };
  const [text, setText] = useState("");
  const [categories, setCategories] = useState<string[]>([]);
  const [suppliers, setSuppliers] = useState<string[]>([]);
  const [sort, setSort] = useState<Sort | null>(null);
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Set<string>>(() => new Set());
  const [dialog, setDialog] = useState<"confirm" | "return" | "validate" | "uploaded" | "delete" | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [detailLine, setDetailLine] = useState<QuotationLine | null>(null);
  const [agreementId, setAgreementId] = useState<string | null>(null);
  const [downloading, setDownloading] = useState<Download | null>(null);
  const q = useDebouncedValue(text.trim().toLowerCase());

  // Confirming needs one priced line, from SIESA or local: a temporary customer may have only local products.
  const pricedCount = useMemo(() => quotation.lines.filter(priced).length, [quotation.lines]);
  const inactiveCount = useMemo(() => quotation.lines.filter(inactive).length, [quotation.lines]);
  // The options come from this quotation's own lines, so each one lists only what it has.
  const categoryOptions = useMemo(() => distinctValues(quotation.lines, (line) => line.category), [quotation.lines]);
  const supplierOptions = useMemo(() => distinctValues(quotation.lines, supplierOf), [quotation.lines]);

  const imported = useMemo(() => new Set(importer.lastImport ?? []), [importer.lastImport]);
  const visible = useMemo(() => {
    const byCategory = new Set(categories);
    const bySupplier = new Set(suppliers);
    const matching = quotation.lines.filter(
      (line) =>
        (filter === "imported" ? imported.has(line.sku) : filter === "inactive" ? inactive(line) : INDICATORS[filter](line)) &&
        (listFilter === "all" || LIST_FILTERS[listFilter](line)) &&
        (q === "" || line.sku.toLowerCase().includes(q) || (line.description ?? "").toLowerCase().includes(q)) &&
        (byCategory.size === 0 || byCategory.has(line.category?.trim() ?? "")) &&
        (bySupplier.size === 0 || bySupplier.has(supplierOf(line)?.trim() ?? ""))
    );
    return sortLines(matching, sort);
  }, [quotation.lines, filter, listFilter, q, imported, categories, suppliers, sort]);
  const lastPage = Math.max(1, Math.ceil(visible.length / PAGE_SIZE));
  const currentPage = Math.min(page, lastPage);
  const pageLines = visible.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  const filtered = filter !== "all" || listFilter !== "all" || text.trim() !== "" || categories.length > 0 || suppliers.length > 0;

  const chooseFilter = (next: LineFilter) => {
    setFilter(next);
    setPage(1);
  };
  const chooseListFilter = (next: ListFilter) => {
    setListFilter(next);
    setPage(1);
  };
  const clearFilters = () => {
    setFilter("all");
    setListFilter("all");
    setText("");
    setCategories([]);
    setSuppliers([]);
    setPage(1);
  };

  const busy = editor.unsaved || refresh.isPending || removeLine.isPending || importer.isPending;
  // Pending rows go after the last row of the list, so only the last page shows them.
  const pending = currentPage === lastPage ? importer.pending : [];
  const hasRows = quotation.lines.length > 0 || importer.pending.length > 0;
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
          toast.success(`Se quitó ${line.description ?? line.sku} de ${copy.one}.`);
        },
        onError: (failure) => toast.error(errorMessage(failure), { duration: Infinity }),
        onSettled: () => setRemovingSku(null),
      }
    );
  };

  /**
   * The explicit save, on top of the autosave: sends whatever is queued right
   * away and says so. With nothing pending it confirms that all is saved.
   */
  const [savingDraft, setSavingDraft] = useState(false);
  const saveDraft = async () => {
    if (editor.invalid.length > 0) {
      toast.error("Hay celdas que no se pueden leer, marcadas en rojo. Corrígelas para guardar el borrador.", { duration: Infinity });
      return;
    }
    if (editor.state === "conflict") {
      toast.error("La cotización cambió en otra pestaña. Usa «Guardar mis cambios» en el aviso de arriba.", { duration: Infinity });
      return;
    }
    const hadChanges = editor.hasPending();
    setSavingDraft(true);
    const saved = await editor.saveNow();
    setSavingDraft(false);
    if (saved) toast.success(hadChanges ? "Borrador guardado." : "Todo está guardado. El borrador también se guarda solo mientras escribes.");
    else toast.error("No se guardó el borrador. El aviso bajo los indicadores dice por qué.", { duration: Infinity });
  };

  const runRefresh = () =>
    refresh.mutate(quotation.version, {
      onSuccess: () =>
        toast.success(
          isList
            ? "Actualización refrescada con la lista, los costos, la última venta y los apoyos de hoy. Tus precios nuevos se conservaron."
            : "Cotización actualizada con las ventas, los costos y los apoyos de hoy. Tus precios nuevos se conservaron."
        ),
      onError: (failure) => toast.error(errorMessage(failure), { duration: Infinity }),
    });

  const download = async (kind: Download) => {
    setDownloading(kind);
    try {
      await DOWNLOADS[kind](quotation.id);
    } catch (failure) {
      toast.error(errorMessage(failure), { duration: Infinity });
    } finally {
      setDownloading(null);
    }
  };

  const confirmDelete = () =>
    remove.mutate(quotation.id, {
      onSuccess: () => {
        toast.success(isList ? `Actualización de la lista ${quotation.price_list_id} eliminada.` : `Cotización de ${quotation.customer_name} eliminada.`);
        router.push(basePath);
      },
      onError: (failure) => setDeleteError(errorMessage(failure)),
    });

  const closeDialog = () => setDialog(null);

  const linesProps = {
    lines: pageLines,
    editor,
    editable,
    onOpenDetail: setDetailLine,
    onRemove: runRemoveLine,
    removing: removingSku,
    canRemove: !busy,
    selection,
    pending,
    highlight: importer.highlight,
    sort,
    onSort: (next: Sort | null) => {
      setSort(next);
      setPage(1);
    },
    withQuantities: !isList && quotation.quote_quantities,
    quantitiesEditable: canManage,
    // Only BI, who validates, sees the cost behind the suggested prices.
    showCost: canValidate,
    basePriceLabel: copy.basePrice,
    // A list update keeps the last sale in a tooltip beside the list's price.
    showLastSale: isList,
    listMeta: isList
      ? {
          stock: stockTotals.data?.items,
          stockState: stockTotals.isPending ? ("loading" as const) : stockTotals.isError ? ("error" as const) : ("ready" as const),
          review: reviewControl,
        }
      : undefined,
  };
  const totals = isList ? null : offerTotals(quotation);
  const title = isList ? (quotation.price_list_name ?? `Lista ${quotation.price_list_id}`) : quotation.customer_name;

  return (
    // A container: the cards, indicators and toolbar adapt to the room the sidebar leaves.
    <div className="@container mx-auto w-full max-w-[1600px] space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
        <Link
          href={basePath}
          className="inline-flex min-h-8 items-center gap-1 rounded-sm text-sm text-text-secondary hover:text-text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring max-md:min-h-11"
        >
          <ArrowLeft className="size-4" aria-hidden="true" /> {isList ? "Actualizaciones" : "Cotizaciones"}
        </Link>
        <QuotationRulesLink basePath={basePath} label={isList ? "Reglas de precios" : undefined} />
      </div>

      <header className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div className="min-w-0 space-y-1">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
            {!isList && <QuotationStatusBadge status={quotation.status} label={quotation.status_label} />}
          </div>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] text-text-secondary">
            <span>Creada por {quotation.created_by}</span>
            <QuotationHistory quotation={quotation} />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {editable && (
            <Button variant="outline" onClick={runRefresh} disabled={busy} className="max-md:h-11">
              <RefreshCw className={cn(refresh.isPending && "animate-spin")} aria-hidden="true" />
              {refresh.isPending ? "Refrescando…" : "Refrescar"}
            </Button>
          )}
          {canValidate && (
            <Button
              variant="outline"
              onClick={() => void download("template")}
              disabled={downloading !== null}
              title="Excel con todas las líneas y sus costos (cotización del proveedor, inventario y C.O.), para validar contra SIESA"
              className="max-md:h-11"
            >
              {downloading === "template" ? <Loader2 className="animate-spin" aria-hidden="true" /> : <Sheet aria-hidden="true" />}
              Plantilla
            </Button>
          )}
          {isValidated(quotation.status) && (
            <>
              <Button variant="outline" onClick={() => void download("xlsx")} disabled={downloading !== null} className="max-md:h-11">
                {downloading === "xlsx" ? <Loader2 className="animate-spin" aria-hidden="true" /> : <FileSpreadsheet aria-hidden="true" />}
                Excel SIESA
              </Button>
              <Button variant="outline" onClick={() => void download("txt")} disabled={downloading !== null} className="max-md:h-11">
                {downloading === "txt" ? <Loader2 className="animate-spin" aria-hidden="true" /> : <FileText aria-hidden="true" />}
                Plano SIESA
              </Button>
            </>
          )}
          {quotation.status === "pendiente_carga" && canValidate && (
            <Button onClick={() => setDialog("uploaded")} className="max-md:h-11">
              <FileCheck2 aria-hidden="true" /> Marcar como cargada
            </Button>
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
          {(editable || (canManage && !isList && quotation.quote_quantities)) && <AutosaveIndicator editor={editor} />}
          {editable && (
            <Button variant="outline" onClick={() => void saveDraft()} disabled={savingDraft} className="max-md:h-11">
              {savingDraft ? <Loader2 className="animate-spin" aria-hidden="true" /> : <Save aria-hidden="true" />} Guardar borrador
            </Button>
          )}
          {isList && (
            <Link href={`${basePath}/por-cargar`} className={cn(buttonVariants({ variant: "outline" }), "max-md:h-11")}>
              <CloudUpload aria-hidden="true" /> Por cargar
            </Link>
          )}
          {canManage && !isList && quotation.status === "borrador" && (
            <Button
              onClick={() => setDialog("confirm")}
              disabled={busy || pricedCount === 0}
              title={pricedCount === 0 ? "Escribe al menos un precio nuevo para confirmar." : undefined}
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
              triggerLabel={isList ? "Más acciones de la actualización" : "Más acciones de la cotización"}
            >
              <MenuItem
                onClick={() => {
                  setDeleteError(null);
                  setDialog("delete");
                }}
              >
                <Trash2 aria-hidden="true" /> {isList ? "Eliminar actualización" : "Eliminar cotización"}
              </MenuItem>
            </Menu>
          )}
        </div>
      </header>

      <CustomerCards quotation={quotation} canChangeCenter={editable && !busy} />
      <ReviewBanner quotation={quotation} canManage={canManage} canValidate={canValidate} />
      {/* The offer is put together while confirming; once confirmed it is here to preview and export. */}
      {!isList && quotation.status !== "borrador" && <OfferSection quotation={quotation} basePath={basePath} canEdit={canManage} />}
      <Warnings quotation={quotation} />

      {quotation.lines.length > 0 && !isList && (
        <QuotationIndicators
          lines={quotation.lines}
          active={filter === "inactive" || filter === "imported" ? null : filter}
          onSelect={chooseFilter}
        />
      )}
      {quotation.lines.length > 0 && isList && (
        <ListFilters lines={quotation.lines} active={listFilter} onSelect={chooseListFilter} />
      )}

      {editable && hasRows && (
        <BulkPricingPanel
          quotation={quotation}
          selected={selected}
          filteredSkus={filteredSkus}
          onSelectionChange={setSelected}
          disabled={busy}
        />
      )}

      {/* Quantities save in every status, so the status shows whenever something can be typed. */}
      {(editable || (canManage && !isList && quotation.quote_quantities)) && <SaveStatus editor={editor} />}

      {/*
        Laid out by the width the content really has, not the window's: with the sidebar
        open a laptop leaves the content as narrow as a tablet. One column, then filters
        two by two, then a single row.
      */}
      <div className={cn("space-y-2", !hasRows && "hidden")}>
        <div className="grid grid-cols-1 gap-2 @xl:grid-cols-2 @6xl:flex @6xl:flex-wrap @6xl:items-center">
          <div className="relative w-full @xl:col-span-2 @6xl:w-72">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-text-secondary" aria-hidden="true" />
            <Input
              type="search"
              value={text}
              onChange={(event) => {
                setText(event.target.value);
                setPage(1);
              }}
              placeholder="Referencia o descripción"
              aria-label="Buscar por referencia o descripción"
              className="pl-9 max-md:h-11"
            />
          </div>
          {categoryOptions.length > 0 && (
            <MultiSelect
              label="Categorías"
              allLabel="Todas las categorías"
              options={categoryOptions}
              value={categories}
              onValueChange={(next) => {
                setCategories(next);
                setPage(1);
              }}
              className="w-full @6xl:w-56"
            />
          )}
          {supplierOptions.length > 0 && (
            <MultiSelect
              label="Proveedores"
              allLabel="Todos los proveedores"
              options={supplierOptions}
              value={suppliers}
              onValueChange={(next) => {
                setSuppliers(next);
                setPage(1);
              }}
              className="w-full @6xl:w-56"
            />
          )}
          <Button variant="ghost" onClick={clearFilters} disabled={!filtered} className="justify-self-start max-md:h-11">
            <FilterX aria-hidden="true" /> Borrar filtros
          </Button>
          {canManage && (
            // Next to the references they work on, not among the quotation's own actions.
            <div className="flex flex-wrap items-center gap-x-3 gap-y-2 @xl:col-span-2 @6xl:ml-auto">
              {!isList && <QuantitiesToggle quotation={quotation} disabled={busy} />}
              {supportCandidates > 0 && (
                <Button variant="outline" onClick={() => setAskingSupport(true)} disabled={busy} className="max-md:h-11">
                  <HandCoins aria-hidden="true" /> Solicitar apoyo interno
                </Button>
              )}
              {editable && (
                <>
                  {!isList && (
                    <Button variant="outline" onClick={() => setCreatingLocal(true)} disabled={busy} className="max-md:h-11">
                      <PackageOpen aria-hidden="true" /> Crear producto
                    </Button>
                  )}
                  <Button variant="outline" onClick={openImport} disabled={busy} className="max-md:h-11">
                    <PackagePlus aria-hidden="true" /> Agregar productos
                  </Button>
                </>
              )}
            </div>
          )}
        </div>
        {(inactiveCount > 0 || importer.lastImport) && (
          <div role="group" aria-label="Más filtros" className="flex flex-wrap gap-2">
            {inactiveCount > 0 && (
              <ToggleChip active={filter === "inactive"} onClick={() => chooseFilter(filter === "inactive" ? "all" : "inactive")} count={inactiveCount}>
                Inactivas
              </ToggleChip>
            )}
            {importer.lastImport && (
              <ToggleChip
                active={filter === "imported"}
                onClick={() => chooseFilter(filter === "imported" ? "all" : "imported")}
                count={importer.isPending ? null : importer.lastImport.length}
              >
                Última importación
              </ToggleChip>
            )}
          </div>
        )}
      </div>

      {!hasRows && isList ? (
        <StatePanel
          icon={PackagePlus}
          title="La lista no tiene precios vigentes"
          action={
            editable ? (
              <Button onClick={openImport} disabled={busy} className="max-md:h-11">
                <PackagePlus aria-hidden="true" /> Agregar productos
              </Button>
            ) : undefined
          }
        >
          SIESA no tiene precios vigentes en la lista {quotation.price_list_id}.
          {editable && " Agrega las referencias que vas a cargar: cada una trae su costo, precios sugeridos y apoyos."}
        </StatePanel>
      ) : !hasRows ? (
        <StatePanel
          icon={PackagePlus}
          title="El cliente no tiene ventas en la ventana"
          action={
            editable ? (
              <div className="flex flex-wrap justify-center gap-2">
                <Button onClick={openImport} disabled={busy} className="max-md:h-11">
                  <PackagePlus aria-hidden="true" /> Agregar productos
                </Button>
                <Button variant="outline" onClick={() => setCreatingLocal(true)} disabled={busy} className="max-md:h-11">
                  <PackageOpen aria-hidden="true" /> Crear producto
                </Button>
              </div>
            ) : undefined
          }
        >
          No compró nada en los últimos {quotation.window_months} meses, así que no hay último precio de qué partir.
          {editable &&
            " Agrega las referencias que le vas a cotizar: cada una trae sus precios sugeridos, apoyos e impuesto al consumo. Si no existe en el portafolio, créala solo para cotizar."}
        </StatePanel>
      ) : visible.length === 0 && pending.length === 0 ? (
        <StatePanel
          icon={FileX2}
          title="Ninguna referencia coincide"
          action={<Button variant="outline" onClick={clearFilters}>Borrar filtros</Button>}
        >
          {(text.trim() === "" && categories.length === 0 && suppliers.length === 0 && EMPTY_FILTER_TEXT[filter]) ||
            "Prueba con otra referencia, menos palabras de la descripción, u otras categorías o proveedores."}
        </StatePanel>
      ) : (
        <div className="@container space-y-3">
          <LinesList {...linesProps} />
          <LinesTable {...linesProps} />
          {totals && (
            <section aria-labelledby="offer-totals-title" className="rounded-lg border border-border bg-surface p-4">
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div className="space-y-1">
                  <h2 id="offer-totals-title" className="text-base font-semibold">Consolidado de la oferta</h2>
                  <p className="max-w-md text-[13px] text-text-secondary">
                    Suma los ítems de la oferta que tienen cantidad, con el IVA de cada tarifa sobre su base. Es lo que sale en
                    la vista previa, el Excel y el PDF.
                  </p>
                </div>
                <TotalsTable totals={totals} className="md:ml-0" />
              </div>
            </section>
          )}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-xs tabular-nums text-text-secondary">
              {formatCount(visible.length)} {visible.length === 1 ? "referencia" : "referencias"}
              {filtered && ` de ${formatCount(quotation.lines.length)}`}
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
      <UploadedDialog quotation={quotation} open={dialog === "uploaded"} onOpenChange={(open) => !open && closeDialog()} />
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
      {canAskSupportHere && (
        <SupportRequestDialog quotation={quotation} preselected={selected} open={askingSupport} onOpenChange={setAskingSupport} />
      )}
      <LocalProductDialog
        quotation={quotation}
        open={creatingLocal}
        onOpenChange={setCreatingLocal}
        onCreated={(sku) => {
          // Shown where it can be seen: the local products, on the page where it landed.
          setText("");
          setCategories([]);
          setSuppliers([]);
          chooseFilter("local");
          importer.flash([sku]);
        }}
      />
      <LineDetailDialog
        line={detailLine ? (quotation.lines.find((line) => line.sku === detailLine.sku) ?? detailLine) : null}
        item={
          isList
            ? {
                quotationId: quotation.id,
                canEdit: editable,
                saveNote: (note) => lineNote.mutateAsync({ version: quotation.version, sku: detailLine?.sku ?? "", note }),
                review: reviewControl,
              }
            : undefined
        }
        forList={isList}
        showCost={canValidate}
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
        title={isList ? "¿Eliminar esta actualización?" : "¿Eliminar esta cotización?"}
        confirmLabel={isList ? "Eliminar actualización" : "Eliminar cotización"}
        onConfirm={confirmDelete}
        isPending={remove.isPending}
        error={deleteError}
      >
        Los precios nuevos de {title} se pierden; los archivos ya descargados no cambian.
      </ConfirmDeleteDialog>
    </div>
  );
}

/**
 * Quote with quantities, beside the actions that add lines: it changes the
 * table (a quantity per line, the consolidation), so it lives with the table,
 * not in the offer. Saved at once (`PATCH /offer`); it never touches prices.
 */
function QuantitiesToggle({ quotation, disabled }: { quotation: Quotation; disabled: boolean }) {
  const update = useUpdateOffer(quotation.id);
  const id = useId();
  return (
    <span className="inline-flex min-h-9 items-center gap-2 max-md:min-h-11">
      <Switch
        checked={quotation.quote_quantities}
        disabled={disabled || update.isPending}
        onCheckedChange={(next) =>
          update.mutate(
            { version: quotation.version, settings: { quote_quantities: next } },
            { onError: (failure) => toast.error(errorMessage(failure), { duration: Infinity }) }
          )
        }
        aria-labelledby={`${id}-label`}
      />
      <span id={`${id}-label`} className="text-sm font-medium">
        Cotizar con cantidades
      </span>
      {update.isPending && <Loader2 className="size-3.5 animate-spin text-text-secondary" aria-hidden="true" />}
    </span>
  );
}

type Fact = [label: string, value: React.ReactNode];

/**
 * The customer's facts in three groups, each answering one question: who the
 * customer is, which list the prices go to, and where the cost comes from.
 * Three cards side by side instead of one long line of label-value pairs.
 */
function CustomerCards({ quotation, canChangeCenter }: { quotation: Quotation; canChangeCenter: boolean }) {
  const sharedList = quotation.price_list_customers;
  const temporary = quotation.is_temporary_customer ? quotation.temporary_customer : null;
  const listFacts: Fact[] = [
    [
      "Lista SIESA",
      <span key="list" className="block truncate" title={quotation.price_list_name ?? undefined}>
        <span className="font-mono">{quotation.price_list_id ?? "—"}</span>
        {quotation.price_list_name && <span className="text-text-secondary"> · {quotation.price_list_name}</span>}
      </span>,
    ],
    ["Familia", quotation.price_family_label ?? "—"],
  ];
  const groups: { title: string; badge?: React.ReactNode; facts: Fact[] }[] =
    isListKind(quotation.kind)
      ? [
          {
            title: "Lista de precios",
            facts: [
              ...listFacts,
              ["Clientes", sharedList ? `${formatCount(sharedList)} con sucursales activas` : "Sin clientes activos"],
            ],
          },
          {
            title: "Origen",
            facts: [
              [
                "Desde",
                quotation.source === "cliente" ? (
                  <span key="from" className="block truncate">
                    {quotation.customer_name} <span className="font-mono text-text-secondary">NIT {quotation.customer_nit}</span>
                  </span>
                ) : (
                  "La lista, por su código o nombre"
                ),
              ],
              ["Canal", quotation.channel ?? "Sin canal: margen Lista 1"],
              ["Última venta", quotation.source === "cliente" ? "Del cliente, últimos 12 meses" : "De los clientes de la lista, últimos 12 meses"],
            ],
          },
          {
            title: "Centro de operación y despacho",
            facts: [
              ["C.O.", <CostCentersField key="co" quotation={quotation} editable={canChangeCenter} />],
              ["Regional", quotation.regional_label ?? "—"],
              ["Bodega", quotation.stock_source ?? "—"],
            ],
          },
        ]
      : [
    temporary
      ? {
          title: "Cliente",
          // Not in SIESA yet: registered on this quotation only.
          badge: <Badge tone="warning" className="px-1.5 py-0 text-xs">Temporal</Badge>,
          facts: [
            ["Razón social", temporary.legal_name],
            ...(temporary.trade_name ? [["Nombre comercial", temporary.trade_name] as Fact] : []),
            ["NIT", temporary.nit ? <span key="nit" className="font-mono">{temporary.nit}</span> : "Sin NIT"],
          ],
        }
      : {
          title: "Cliente",
          facts: [
            ["NIT", <span key="nit" className="font-mono">{quotation.customer_nit}</span>],
            ["Canal", quotation.channel ?? "Sin canal"],
            ["Vendedor", quotation.salesperson_name ?? "—"],
          ],
        },
    {
      title: "Lista de precios",
      facts: temporary
        ? [["Lista SIESA", "Sin lista: al validar se le crea una nueva"]]
        : [
            [
              "Lista SIESA",
              <span key="list" className="block truncate" title={quotation.price_list_name ?? undefined}>
                <span className="font-mono">{quotation.price_list_id ?? "—"}</span>
                {quotation.price_list_name && <span className="text-text-secondary"> · {quotation.price_list_name}</span>}
              </span>,
            ],
            ["Familia", quotation.price_family_label ?? "—"],
            [
              "Ventana",
              `${quotation.window_months} meses${sharedList && sharedList > 1 ? ` · lista de ${formatCount(sharedList)} clientes` : ""}`,
            ],
          ],
    },
    {
      title: "Centro de operación y despacho",
      facts: [
        ["C.O.", <CostCentersField key="co" quotation={quotation} editable={canChangeCenter} />],
        ["Regional", quotation.regional_label ?? "—"],
        ["Bodega", quotation.stock_source ?? "—"],
      ],
    },
  ];
  return (
    <div className="grid gap-3 @3xl:grid-cols-3">
      {groups.map((group) => (
        <section key={group.title} aria-label={group.title} className="min-w-0 rounded-lg border border-border bg-surface px-4 py-3">
          <h2 className="mb-2 flex items-center gap-2 text-sm font-semibold">
            {group.title}
            {group.badge}
          </h2>
          <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-1 text-sm">
            {group.facts.map(([label, value]) => (
              <div key={label} className="contents">
                <dt className="text-text-secondary">{label}</dt>
                <dd className="min-w-0">{value}</dd>
              </div>
            ))}
          </dl>
        </section>
      ))}
    </div>
  );
}

const sameCodes = (a: string[], b: string[]) => a.length === b.length && a.every((code, index) => code === b[index]);

/**
 * Where the cost of every line comes from: Nacional or one or more operation
 * centers (a customer billed from several centers starts Nacional). While
 * several are ticked, the dropdown marks the costliest before applying.
 * Changing it recalculates every line, keeps the new prices and sends the
 * quotation back to draft, so it asks first. No notes under it: the card stays
 * as compact as the other two.
 */
function CostCentersField({ quotation, editable }: { quotation: Quotation; editable: boolean }) {
  const id = useId();
  const update = useUpdateCostCenters(quotation.id);
  const centers = useBillingCenters();
  const [choice, setChoice] = useState<string[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const current = quotation.cost_centers;

  if (!editable) return <span>{costCentersLabel(current, centers.data)}</span>;

  const apply = () => {
    if (!choice) return;
    setError(null);
    update.mutate(
      { version: quotation.version, codes: choice },
      {
        onSuccess: () => {
          setChoice(null);
          toast.success("Precios recalculados con el nuevo C.O. Tus precios nuevos se conservaron.");
        },
        onError: (failure) => setError(errorMessage(failure)),
      }
    );
  };

  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="sr-only">C.O. del que sale el costo</label>
      <CostCentersSelect
        id={id}
        quotation={quotation}
        value={choice ?? current}
        onChange={(codes) => setChoice(sameCodes(codes, current) ? null : codes)}
        disabled={update.isPending}
      />
      {choice && (
        <div role="group" aria-label="Cambiar el C.O." className="space-y-1.5 rounded-md bg-canvas-subtle p-2 text-[13px]">
          <p>Recalcula todas las líneas y vuelve a borrador.</p>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" onClick={apply} disabled={update.isPending} className="max-md:h-11">
              {update.isPending && <Loader2 className="animate-spin" aria-hidden="true" />}
              Cambiar a {choice.length === 0 ? NATIONAL_LABEL : choice.join(", ")}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setChoice(null)} disabled={update.isPending} className="max-md:h-11">
              Cancelar
            </Button>
          </div>
        </div>
      )}
      {error && <p role="alert" className="text-[13px] text-danger">{error}</p>}
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
    ...(quotation.uploaded_at
      ? [["Cargada en SIESA", `${formatDateTime(quotation.uploaded_at)}${by(quotation.uploaded_by)}`] as [string, string]]
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
  // On a creation the validator names the list, so until validation there is no code to show.
  const plan =
    quotation.list_action === "creacion"
      ? quotation.export_price_list_id
        ? `Crear la lista ${target}${quotation.new_list_name ? ` (${quotation.new_list_name})` : ""}`
        : "Crear una lista nueva"
      : `Actualizar la lista ${target}`;
  const activation = quotation.activation_date ? `, activa desde el ${formatDay(quotation.activation_date)}` : "";
  const failing = quotation.below_rule_count;

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
            ? `Revisa los precios y valídala para liberar el Excel y el plano${quotation.list_action === "creacion" ? " (al validar le pones el código a la lista)" : ""}, o devuélvela al asesor con una nota.`
            : canManage
              ? "Espera la validación del área BI; mientras tanto no se puede editar. Si necesitas cambiar algo, retírala de validación."
              : "Espera la validación del área BI."}
          {failing > 0 && (
            <span className="mt-1 block">
              {failing === 1 ? "1 referencia con precio nuevo queda" : `${formatCount(failing)} referencias con precio nuevo quedan`} bajo la
              regla (bajo el mínimo, sin objetivo o sin costo); el indicador «Inferior al mínimo» las muestra.
            </span>
          )}
        </p>
      </div>
    );
  }
  if (quotation.status === "pendiente_carga") {
    const done =
      quotation.list_action === "creacion"
        ? `Validada para crear la lista ${target}${quotation.new_list_name ? ` (${quotation.new_list_name})` : ""}`
        : `Validada para actualizar la lista ${target}`;
    return (
      <div role="status" className="flex items-start gap-2 rounded-lg bg-info-surface px-4 py-3 text-sm">
        <FileUp className="mt-0.5 size-4 shrink-0 text-info" aria-hidden="true" />
        <p>
          <strong>{done}{activation}.</strong>{" "}
          {canValidate
            ? "Descarga el Excel y el plano, cárgalos en SIESA y márcala como cargada."
            : "Falta que el área BI la cargue en SIESA."}
          {quotation.list_action === "creacion" && " Asignar la lista nueva al cliente se hace a mano en SIESA."}
          {canManage && " Si cambias un precio, vuelve a borrador y hay que confirmarla otra vez."}
        </p>
      </div>
    );
  }
  if (quotation.status === "cargada") {
    return (
      <div role="status" className="flex items-start gap-2 rounded-lg bg-success-surface px-4 py-3 text-sm">
        <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-success" aria-hidden="true" />
        <p>
          <strong>
            Cargada en SIESA{quotation.uploaded_at ? ` el ${formatDateTime(quotation.uploaded_at)}` : ""}
            {quotation.uploaded_by ? ` por ${quotation.uploaded_by}` : ""}.
          </strong>{" "}
          {quotation.list_action === "creacion" ? `Lista ${target} creada${activation}.` : `Lista ${target} actualizada${activation}.`}
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

/**
 * The autosave at a glance, beside "Guardar borrador": a polite live region,
 * since a save is not urgent news. The problems (conflict, refusal, cells that
 * cannot be read) are spelled out by SaveStatus under the indicators.
 */
function AutosaveIndicator({ editor }: { editor: LineEditor }) {
  const look =
    editor.state === "saving"
      ? { icon: <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />, text: "Guardando…" }
      : editor.state === "conflict" || editor.state === "error" || editor.invalid.length > 0
        ? { icon: <AlertTriangle className="size-3.5 text-warning" aria-hidden="true" />, text: "Sin guardar" }
        : editor.state === "waiting"
          ? { icon: <Hourglass className="size-3.5" aria-hidden="true" />, text: "Cambios por guardar" }
          : { icon: <Check className="size-3.5" aria-hidden="true" />, text: "Guardado" };
  return (
    <span
      aria-live="polite"
      title="Se guarda solo al dejar de escribir, al cambiar de pestaña y al salir del editor."
      className="inline-flex min-h-9 items-center gap-1.5 px-1 text-[13px] text-text-secondary"
    >
      {look.icon}
      <span>
        <span className="sr-only">Autoguardado: </span>
        {look.text}
      </span>
    </span>
  );
}

/**
 * What went wrong with the typed values, with what to do. Nothing when all is
 * well: the indicator in the header already says it.
 */
function SaveStatus({ editor }: { editor: LineEditor }) {
  if (editor.state === "conflict") {
    return (
      <div role="alert" className="flex flex-col gap-3 rounded-lg bg-warning-surface px-4 py-3 text-sm sm:flex-row sm:items-center sm:justify-between">
        <p className="flex items-start gap-2">
          <AlertTriangle className="mt-0.5 size-4 shrink-0 text-warning" aria-hidden="true" />
          <span>
            La cotización cambió desde otra pestaña o por otra persona, así que tus últimos cambios no se guardaron. Ya
            cargamos la versión actual; lo que escribiste sigue en la tabla.
          </span>
        </p>
        <div className="flex shrink-0 gap-2">
          <Button variant="outline" onClick={editor.discard} className="max-md:h-11">Descartar mis cambios</Button>
          <Button onClick={() => void editor.retry()} className="max-md:h-11">Guardar mis cambios</Button>
        </div>
      </div>
    );
  }
  if (editor.state !== "error" && editor.invalid.length === 0) return null;
  return (
    <p role="alert" className="flex items-start gap-1.5 text-[13px] text-danger">
      <AlertTriangle className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
      {editor.state === "error" ? (
        <span>No se guardaron los últimos cambios: {editor.failure} Corrige el valor y se intentará de nuevo.</span>
      ) : (
        <span>
          {editor.invalid.length === 1
            ? `La ${editor.invalid[0].word === "precio" ? "celda de precio" : "cantidad"} de ${editor.invalid[0].sku} no se puede leer: ${editor.invalid[0].message}`
            : `${editor.invalid.length} celdas no se pueden leer (${editor.invalid.map((item) => item.sku).join(", ")}); se marcan en rojo.`}{" "}
          No se guarda hasta corregirlo.
        </span>
      )}
    </p>
  );
}
