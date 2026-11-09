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
  FilterX,
  Hourglass,
  Loader2,
  MessageSquareWarning,
  MoreHorizontal,
  PackageOpen,
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
import { MultiSelect } from "@/shared/components/ui/multi-select";
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
import { INDICATORS, type Indicator, type Sort, distinctValues, isLocal, sortLines, supplierOf } from "../lib/line-status";
import { downloadQuotationExcel, downloadQuotationFlatFile } from "../services/quotations.service";
import type { ImportResult, Quotation, QuotationLine } from "../types/quotations.types";
import AddProductsDialog, { EMPTY_DRAFT, type ImportDraft } from "./add-products-dialog";
import BulkPricingPanel from "./bulk-pricing-panel";
import LineDetailDialog from "./line-detail-dialog";
import { LinesList, LinesTable, type LineSelection } from "./lines-table";
import LocalProductDialog from "./local-product-dialog";
import { QuotationStatusBadge } from "./quotation-badges";
import QuotationIndicators from "./quotation-indicators";
import { QuotationLoadError, QuotationRulesLink } from "./quotations-gate";
import { ConfirmDialog, ReturnDialog, ValidateDialog } from "./review-dialogs";
import TemplateDialog from "./template-dialog";
import { ToggleChip } from "./toggle-chip";

const PAGE_SIZE = 50;

/**
 * The indicators are the main filters; "inactive" and "imported" (what the
 * last paste added or revalidated) are chips that appear only when they apply.
 */
type LineFilter = Indicator | "inactive" | "imported";

const inactive = (line: QuotationLine) => !line.is_active;
/** What confirming counts: an active SIESA reference with a new price. Local products never reach SIESA. */
const changed = (line: QuotationLine) => line.new_price !== null && line.is_active && !isLocal(line);

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
  const [creatingLocal, setCreatingLocal] = useState(false);
  const [filter, setFilter] = useState<LineFilter>("all");
  const [text, setText] = useState("");
  const [categories, setCategories] = useState<string[]>([]);
  const [suppliers, setSuppliers] = useState<string[]>([]);
  const [sort, setSort] = useState<Sort | null>(null);
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Set<string>>(() => new Set());
  const [dialog, setDialog] = useState<"confirm" | "return" | "validate" | "template" | "delete" | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [detailLine, setDetailLine] = useState<QuotationLine | null>(null);
  const [agreementId, setAgreementId] = useState<string | null>(null);
  const [downloading, setDownloading] = useState<"xlsx" | "txt" | null>(null);
  const q = useDebouncedValue(text.trim().toLowerCase());

  const changedCount = useMemo(() => quotation.lines.filter(changed).length, [quotation.lines]);
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
        (q === "" || line.sku.toLowerCase().includes(q) || (line.description ?? "").toLowerCase().includes(q)) &&
        (byCategory.size === 0 || byCategory.has(line.category?.trim() ?? "")) &&
        (bySupplier.size === 0 || bySupplier.has(supplierOf(line)?.trim() ?? ""))
    );
    return sortLines(matching, sort);
  }, [quotation.lines, filter, q, imported, categories, suppliers, sort]);
  const lastPage = Math.max(1, Math.ceil(visible.length / PAGE_SIZE));
  const currentPage = Math.min(page, lastPage);
  const pageLines = visible.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  const filtered = filter !== "all" || text.trim() !== "" || categories.length > 0 || suppliers.length > 0;

  const chooseFilter = (next: LineFilter) => {
    setFilter(next);
    setPage(1);
  };
  const clearFilters = () => {
    setFilter("all");
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
          toast.success(`Se quitó ${line.description ?? line.sku} de la cotización.`);
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
    // The cost stays with the validating area (BI and admins); Comercial quotes from the prices.
    showCost: canValidate,
    sort,
    onSort: (next: Sort | null) => {
      setSort(next);
      setPage(1);
    },
  };

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
        <div className="min-w-0 space-y-1">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <h1 className="text-2xl font-semibold tracking-tight">{quotation.customer_name}</h1>
            <QuotationStatusBadge status={quotation.status} label={quotation.status_label} />
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
              disabled={busy || changedCount === 0}
              title={changedCount === 0 ? "Escribe al menos un precio nuevo en una referencia de SIESA para confirmar." : undefined}
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

      <CustomerCards quotation={quotation} />
      <ReviewBanner quotation={quotation} canManage={canManage} canValidate={canValidate} />
      <Warnings quotation={quotation} />

      {quotation.lines.length > 0 && (
        <QuotationIndicators
          lines={quotation.lines}
          active={filter === "inactive" || filter === "imported" ? null : filter}
          onSelect={chooseFilter}
        />
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

      {editable && <SaveStatus editor={editor} />}

      <div className={cn("space-y-2", !hasRows && "hidden")}>
        <div className="flex flex-col gap-2 lg:flex-row lg:flex-wrap lg:items-center">
          <div className="relative w-full lg:w-72">
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
              className="w-full lg:w-56"
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
              className="w-full lg:w-56"
            />
          )}
          <Button variant="ghost" onClick={clearFilters} disabled={!filtered} className="max-md:h-11">
            <FilterX aria-hidden="true" /> Borrar filtros
          </Button>
          {editable && (
            // Next to the references they add to, not among the quotation's own actions.
            <div className="flex flex-wrap gap-2 lg:ml-auto">
              <Button variant="outline" onClick={() => setCreatingLocal(true)} disabled={busy} className="max-md:h-11">
                <PackageOpen aria-hidden="true" /> Crear producto
              </Button>
              <Button variant="outline" onClick={openImport} disabled={busy} className="max-md:h-11">
                <PackagePlus aria-hidden="true" /> Agregar productos
              </Button>
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

      {!hasRows ? (
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
            " Agrega las referencias que le vas a cotizar: cada una trae su costo, margen objetivo, apoyos e impuesto de licores. Si no existe en el portafolio, créala solo para cotizar."}
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
        line={detailLine}
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

type Fact = [label: string, value: React.ReactNode];

/**
 * The customer's facts in three groups, each answering one question: who the
 * customer is, which list the prices go to, and where the cost comes from.
 * Three cards side by side instead of one long line of label-value pairs.
 */
function CustomerCards({ quotation }: { quotation: Quotation }) {
  const sharedList = quotation.price_list_customers;
  const groups: { title: string; facts: Fact[] }[] = [
    {
      title: "Cliente",
      facts: [
        ["NIT", <span key="nit" className="font-mono">{quotation.customer_nit}</span>],
        ["Canal", quotation.channel ?? "Sin canal"],
        ["Vendedor", quotation.salesperson_name ?? "—"],
      ],
    },
    {
      title: "Lista de precios",
      facts: [
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
      title: "Costo",
      facts: [
        ["C.O. que factura", quotation.billing_center_code ?? "—"],
        ["Regional", quotation.regional_label ?? "—"],
        ["Bodega", quotation.stock_source ?? "—"],
      ],
    },
  ];
  return (
    <div className="grid gap-3 md:grid-cols-3">
      {groups.map((group) => (
        <section key={group.title} aria-label={group.title} className="min-w-0 rounded-lg border border-border bg-surface px-4 py-3">
          <h2 className="mb-2 text-sm font-semibold">{group.title}</h2>
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
