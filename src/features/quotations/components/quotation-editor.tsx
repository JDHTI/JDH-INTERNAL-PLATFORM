"use client";

import { useId, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
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
import { useStoredPreference } from "@/shared/hooks/use-stored-preference";
import { ApiError, errorMessage } from "@/shared/lib/api-client";
import { cn } from "@/shared/lib/utils";
import { useBreadcrumbLabel } from "@/shared/store/use-breadcrumb-store";
import SupportDetail from "@/features/supports/components/support-detail";

import { useLineEditor, type LineEditor } from "../hooks/use-line-editor";
import { useLineImport } from "../hooks/use-line-import";
import {
  useBillingCenters,
  useDeleteQuotation,
  useLastSalesRetry,
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
import { ACTIVATION_PASSED_TEXT, activationPassed } from "../lib/activation";
import { LIST_FILTERS, type ListFilter } from "../lib/list-review";
import { offerTotals } from "../lib/offer";
import { downloadLinesTemplate, downloadQuotationExcel, downloadQuotationFlatFile } from "../services/quotations.service";
import { type ImportResult, type Quotation, type QuotationLine, type ReviewStatus, isClosed, isListKind } from "../types/quotations.types";
import { ListFilters } from "./list-review-controls";
import MoreFilters from "./more-filters";
import CustomizeFilters from "./customize-filters";
import AddProductsDialog, { EMPTY_DRAFT, type ImportDraft } from "./add-products-dialog";
import BulkPricingPanel from "./bulk-pricing-panel";
import { ExcludedSkus, ListTemplateMenu } from "./list-template";
import CostCentersSelect, { type CostChoice, costCentersLabel, costChoiceCodes, sameChoice } from "./cost-centers-select";
import LineDetailDialog from "./line-detail-dialog";
import { LinesList, LinesTable, type LineSelection, type ReviewControl } from "./lines-table";
import LocalProductDialog from "./local-product-dialog";
import { TotalsTable } from "./offer-document";
import OfferSection from "./offer-section";
import { DeletionNotice, QuotationStatusBadge } from "./quotation-badges";
import QuotationIndicators from "./quotation-indicators";
import { QuotationLoadError, QuotationRulesLink } from "./quotations-gate";
import { ConfirmDialog, ContinueDialog } from "./confirm-wizard";
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
type LineFilter = Indicator | "inactive" | "imported" | "nuevos" | "modificados" | "sin_cambios";

const inactive = (line: QuotationLine) => !line.is_active;
/** Added by hand, from SIESA or created only to quote: not from the sales history or the list. */
const isNew = (line: QuotationLine) => line.origin === "agregado" || line.origin === "local";
/** A price was written for it (confirmed with Enter and saved). */
const isModified = (line: QuotationLine) => line.new_price !== null;

/** The toolbar's own filters, beside the ones the indicators above also are. */
const OWN_FILTERS: Partial<Record<LineFilter, (line: QuotationLine) => boolean>> = {
  inactive,
  nuevos: isNew,
  modificados: isModified,
  sin_cambios: (line) => !isModified(line),
};

type ChipKey = "all" | "activos" | "modificados" | "sin_cambios" | "nuevos" | "objetivo" | "rango" | "minimo" | "apoyo" | "sin_referencia" | "local";
/** Every filter a person can keep in the toolbar: the chips and the two dropdowns. */
type ToolbarKey = ChipKey | "categorias" | "proveedores";

type ChipFilter = {
  key: ChipKey;
  label: string;
  help: string;
  forLists: boolean;
  /** A list update's words, where its reference (the list's price) changes them. */
  list?: { label: string; help: string };
};

/**
 * The chips, in the order they show wherever they are: in the toolbar or in «Más filtros».
 * The indicators above are only a summary, so every group they count can be filtered here.
 * «Activos» adds to the others (active and modified, active and below the minimum); the rest
 * are one at a time. A list update has the same ones (decided 2026-11-20), except the products
 * only for quoting it cannot have.
 */
const CHIP_FILTERS: ChipFilter[] = [
  { key: "all", label: "Todos", help: "Todas las referencias, activas e inactivas.", forLists: true },
  { key: "activos", label: "Activos", help: "Solo las referencias activas en SIESA. Se suma a los otros filtros.", forLists: true },
  { key: "modificados", label: "Modificados", help: "Solo las referencias a las que les escribiste un precio nuevo.", forLists: true },
  { key: "sin_cambios", label: "Sin cambios", help: "Las referencias que conservan su precio: sin precio nuevo.", forLists: true },
  { key: "nuevos", label: "Ítems nuevos", help: "Las agregadas a mano y los productos creados para cotizar.", forLists: true },
  { key: "objetivo", label: "Cumplen objetivo", help: "El margen con apoyo llega al objetivo o lo supera.", forLists: true },
  { key: "rango", label: "En rango", help: "Entre el mínimo y el objetivo.", forLists: true },
  { key: "minimo", label: "Bajo mínimo", help: "Por debajo del margen mínimo.", forLists: true },
  { key: "apoyo", label: "Con apoyo", help: "Con un apoyo del proveedor que entra en el margen.", forLists: true },
  {
    key: "sin_referencia",
    label: "Sin precio de referencia",
    help: "El cliente no la compró en la ventana.",
    forLists: true,
    list: { label: "Sin precio en la lista", help: "La lista no tiene precio vigente: el precio nuevo la agrega." },
  },
  { key: "local", label: "Sin SKU en SIESA", help: "Productos creados solo para cotizar.", forLists: false },
];

const TOOLBAR_OPTIONS: { key: ToolbarKey; label: string; forLists: boolean }[] = [
  ...CHIP_FILTERS,
  { key: "categorias", label: "Categorías", forLists: true },
  { key: "proveedores", label: "Proveedores", forLists: true },
];

/** What the toolbar shows until each person chooses: «Todos» is implied when no chip is on. */
const DEFAULT_TOOLBAR: readonly ToolbarKey[] = ["activos", "modificados", "minimo", "categorias", "proveedores"];
const TOOLBAR_KEYS = new Set<string>(TOOLBAR_OPTIONS.map((option) => option.key));
const parseToolbar = (stored: unknown): readonly ToolbarKey[] | null =>
  Array.isArray(stored) ? stored.filter((key): key is ToolbarKey => typeof key === "string" && TOOLBAR_KEYS.has(key)) : null;

/**
 * The new items first, the latest added on top, then the rest in the order the API gives;
 * a column sort, when chosen, orders everything.
 */
function newFirst(lines: QuotationLine[]): QuotationLine[] {
  const added = lines.filter(isNew).sort((a, b) => (b.position ?? 0) - (a.position ?? 0));
  return added.length === 0 ? lines : [...added, ...lines.filter((line) => !isNew(line))];
}

const EMPTY_FILTER_TEXT: Partial<Record<LineFilter, string>> = {
  nuevos: "Aún no agregaste referencias ni creaste productos para cotizar.",
  modificados: "Aún no confirmaste ningún precio nuevo. Escribe el precio y presiona Enter.",
  sin_cambios: "Todas las referencias tienen precio nuevo.",
  objetivo: "Ninguna línea llega al margen objetivo todavía.",
  rango: "Ninguna línea queda entre el mínimo y el objetivo.",
  minimo: "Ninguna línea queda bajo el mínimo.",
  sin_referencia: "Todas las referencias tienen último precio.",
  local: "Aún no creaste productos para cotizar. Usa «Crear producto».",
  sin_precio: "Todas las referencias activas tienen precio nuevo.",
  apoyo: "Ninguna referencia tiene un apoyo aplicado.",
};

export default function QuotationEditor({
  quotationId,
  basePath,
  rulesBasePath = basePath,
}: {
  quotationId: string;
  basePath: string;
  /** Where the rules link points, when the list it opens from has no rules page of its own. */
  rulesBasePath?: string;
}) {
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
  return <Editor quotation={quotation.data} basePath={basePath} rulesBasePath={rulesBasePath} />;
}

function Editor({ quotation, basePath, rulesBasePath }: { quotation: Quotation; basePath: string; rulesBasePath: string }) {
  const router = useRouter();
  // The gate around this screen has already loaded the permissions.
  const permissions = useQuotationPermissions(quotation.kind).data;
  // A list update goes to SIESA only: no customer offer, quantities or products only for quoting.
  const isList = isListKind(quotation.kind);
  // Only the main lists review item by item; a list update goes to validation whole, like a
  // quotation (the API answers 422 to an item review on it).
  const perItemReview = quotation.kind === "principal";
  const copy = KIND_COPY[quotation.kind];
  // The API decides which quotations each person opens (Comercial: its own; a coordinator, a
  // director or a Call Center leader: also their team's; BI and admins: all). Whoever quotes has
  // the whole editor on the ones they may edit (`can_edit`); a team's quotation opens read-only.
  const canManage = permissions?.can_manage === true && quotation.can_edit !== false;
  const canValidate = permissions?.can_validate === true;
  const pendingReview = quotation.status === "pendiente_validacion";
  // Validated or loaded: nothing changes any more, the API answers 409 to every edit.
  const closed = isClosed(quotation.status);
  const editable = canManage && !pendingReview && !closed;
  // Quantities and the offer still change while BI validates, never once it is validated.
  const offerEditable = canManage && !closed;

  const editor = useLineEditor(quotation);
  // The DWH's missing last sales: the notice goes away by itself once the API's retry reads them.
  useLastSalesRetry(quotation);
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
  // A temporary customer has no NIT in SIESA to register the support on.
  const canAskSupportHere = !isList && !quotation.is_temporary_customer && permissions?.can_request_support === true;
  const supportCandidates = useMemo(
    () => (canAskSupportHere ? quotation.lines.filter(canAskSupport).length : 0),
    [canAskSupportHere, quotation.lines]
  );
  const [filter, setFilter] = useState<LineFilter>("all");
  // «Activos» adds to the filter above instead of replacing it.
  const [onlyActive, setOnlyActive] = useState(false);
  const [toolbarKeys, setToolbarKeys] = useStoredPreference("jdh-quoter-toolbar-filters", DEFAULT_TOOLBAR, parseToolbar);
  const inToolbar = useMemo(() => new Set(toolbarKeys), [toolbarKeys]);
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
  const reviewControl: ReviewControl | undefined = perItemReview
    ? {
        canEdit: editable,
        canValidate: permissions?.can_validate === true,
        pending: reviewLines.isPending ? (reviewLines.variables?.skus[0] ?? null) : null,
        onChange: (line, status) => void setReview(line, status),
      }
    : undefined;
  // Sending a list update to validation needs one priced active line.
  const pricedCount = useMemo(() => quotation.lines.filter((line) => line.is_active && line.new_price !== null).length, [quotation.lines]);
  const [text, setText] = useState("");
  const [categories, setCategories] = useState<string[]>([]);
  const [suppliers, setSuppliers] = useState<string[]>([]);
  const [sort, setSort] = useState<Sort | null>(null);
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Set<string>>(() => new Set());
  const [dialog, setDialog] = useState<"continue" | "confirm" | "return" | "validate" | "uploaded" | "delete" | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [detailLine, setDetailLine] = useState<QuotationLine | null>(null);
  const [agreementId, setAgreementId] = useState<string | null>(null);
  const [downloading, setDownloading] = useState<Download | null>(null);
  const q = useDebouncedValue(text.trim().toLowerCase());

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
        (filter === "imported" ? imported.has(line.sku) : (OWN_FILTERS[filter] ?? INDICATORS[filter as Indicator])(line)) &&
        (!onlyActive || line.is_active) &&
        (listFilter === "all" || LIST_FILTERS[listFilter](line)) &&
        (q === "" || line.sku.toLowerCase().includes(q) || (line.description ?? "").toLowerCase().includes(q)) &&
        (byCategory.size === 0 || byCategory.has(line.category?.trim() ?? "")) &&
        (bySupplier.size === 0 || bySupplier.has(supplierOf(line)?.trim() ?? ""))
    );
    return sort ? sortLines(matching, sort) : newFirst(matching);
  }, [quotation.lines, filter, onlyActive, listFilter, q, imported, categories, suppliers, sort]);
  const quickCounts = useMemo(
    () => ({
      activos: quotation.lines.filter((line) => line.is_active).length,
      modificados: quotation.lines.filter(isModified).length,
      sin_cambios: quotation.lines.filter((line) => !isModified(line)).length,
      nuevos: quotation.lines.filter(isNew).length,
      objetivo: quotation.lines.filter(INDICATORS.objetivo).length,
      rango: quotation.lines.filter(INDICATORS.rango).length,
      minimo: quotation.lines.filter(INDICATORS.minimo).length,
      apoyo: quotation.lines.filter(INDICATORS.apoyo).length,
      sin_referencia: quotation.lines.filter(INDICATORS.sin_referencia).length,
      local: quotation.lines.filter(INDICATORS.local).length,
    }),
    [quotation.lines]
  );
  const chips = isList
    ? CHIP_FILTERS.filter((chip) => chip.forLists).map((chip) => (chip.list ? { ...chip, ...chip.list } : chip))
    : CHIP_FILTERS;
  const chipActive = (key: ChipKey) => (key === "all" ? filter === "all" && !onlyActive : key === "activos" ? onlyActive : filter === key);
  const hiddenChips = chips.filter((chip) => !inToolbar.has(chip.key));
  // How many filters are on inside «Más filtros», so its trigger never hides why the table is short.
  const moreActive =
    hiddenChips.filter((chip) => chip.key !== "all" && chipActive(chip.key)).length +
    (filter === "inactive" || filter === "imported" ? 1 : 0) +
    (!inToolbar.has("categorias") && categories.length > 0 ? 1 : 0) +
    (!inToolbar.has("proveedores") && suppliers.length > 0 ? 1 : 0);
  const lastPage = Math.max(1, Math.ceil(visible.length / PAGE_SIZE));
  const currentPage = Math.min(page, lastPage);
  const pageLines = visible.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  const filtered = filter !== "all" || onlyActive || listFilter !== "all" || text.trim() !== "" || categories.length > 0 || suppliers.length > 0;

  const chooseFilter = (next: LineFilter) => {
    setFilter(next);
    // Only the inactive ones and only the active ones would always be empty; what was just
    // imported shows whole, inactive ones included.
    if (next === "inactive" || next === "imported") setOnlyActive(false);
    setPage(1);
  };
  const toggleChip = (key: ChipKey) => {
    if (key === "all") {
      setOnlyActive(false);
      chooseFilter("all");
    } else if (key === "activos") {
      if (!onlyActive && filter === "inactive") setFilter("all");
      setOnlyActive(!onlyActive);
      setPage(1);
    } else {
      chooseFilter(filter === key ? "all" : key);
    }
  };
  const chip = (item: ChipFilter) => (
    <ToggleChip
      key={item.key}
      active={chipActive(item.key)}
      onClick={() => toggleChip(item.key)}
      count={item.key === "all" ? undefined : quickCounts[item.key]}
      title={item.help}
    >
      {item.label}
    </ToggleChip>
  );
  const dropdown = (key: "categorias" | "proveedores", className: string) =>
    key === "categorias"
      ? categoryOptions.length > 0 && (
          <MultiSelect
            key={key}
            label="Categorías"
            allLabel="Todas las categorías"
            options={categoryOptions}
            value={categories}
            onValueChange={(next) => {
              setCategories(next);
              setPage(1);
            }}
            className={className}
          />
        )
      : supplierOptions.length > 0 && (
          <MultiSelect
            key={key}
            label="Proveedores"
            allLabel="Todos los proveedores"
            options={supplierOptions}
            value={suppliers}
            onValueChange={(next) => {
              setSuppliers(next);
              setPage(1);
            }}
            className={className}
          />
        );
  const hiddenDropdowns = (["categorias", "proveedores"] as const).filter((key) => !inToolbar.has(key));
  const hasMore = hiddenChips.length > 0 || hiddenDropdowns.length > 0 || inactiveCount > 0 || Boolean(importer.lastImport);
  const chooseListFilter = (next: ListFilter) => {
    setListFilter(next);
    setPage(1);
  };
  const clearFilters = () => {
    setFilter("all");
    setOnlyActive(false);
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
    // A typed price counts only once confirmed: the save never confirms it on the person's behalf.
    if (saved && editor.unconfirmed.length > 0) {
      toast.warning(
        `${editor.unconfirmed.length === 1 ? "Un precio está escrito" : `${editor.unconfirmed.length} precios están escritos`} sin confirmar. Presiona Enter en cada uno para guardarlo.`,
        { duration: Infinity }
      );
      return;
    }
    if (saved) toast.success(hadChanges ? "Borrador guardado." : "Todo está guardado. El borrador también se guarda solo mientras escribes.");
    else toast.error("No se guardó el borrador. El aviso sobre la tabla dice por qué.", { duration: Infinity });
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
    stockOf: { quotationId: quotation.id, version: quotation.version },
    withQuantities: !isList && quotation.quote_quantities,
    quantitiesEditable: offerEditable,
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
  const title = isList
    ? (quotation.price_list_name ?? `Lista ${quotation.price_list_id}`)
    : quotation.customer_branch_id
      ? `${quotation.customer_name} · Sucursal ${quotation.customer_branch_id}`
      : quotation.customer_name;

  return (
    // A container: the cards, indicators and toolbar adapt to the room the sidebar leaves.
    // Fills the content area up to 2K (FullHD with the rail folded left an empty margin at 1600px);
    // past 2560px it centers, so an ultrawide screen does not stretch the table's rows.
    <div className="@container mx-auto w-full max-w-[2560px] space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
        <Link
          href={basePath}
          className="inline-flex min-h-8 items-center gap-1 rounded-sm text-sm text-text-secondary hover:text-text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring max-md:min-h-11"
        >
          <ArrowLeft className="size-4" aria-hidden="true" /> {isList ? "Actualizaciones" : "Cotizaciones"}
        </Link>
        <QuotationRulesLink basePath={rulesBasePath} label={isList ? "Reglas de precios" : undefined} />
      </div>

      <header className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div className="min-w-0 flex-1 space-y-1">
          {/* A long legal name stays on one line, cut with an ellipsis; the whole name is its tooltip. */}
          <div className="flex min-w-0 items-center gap-x-3">
            <h1 className="min-w-0 truncate text-2xl font-semibold tracking-tight" title={title ?? undefined}>
              {title}
            </h1>
            {!perItemReview && (
              <span className="shrink-0">
                <QuotationStatusBadge status={quotation.status} label={quotation.status_label} />
              </span>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] text-text-secondary">
            {quotation.business_group && (
              <span className="font-medium text-text-primary">
                Grupo empresarial: {quotation.business_group}
                {quotation.group_customers ? ` (${formatCount(quotation.group_customers)} ${quotation.group_customers === 1 ? "cliente" : "clientes"})` : ""}
              </span>
            )}
            <span>Creada por {quotation.created_by}</span>
            <QuotationHistory quotation={quotation} />
            <ExcludedSkus quotation={quotation} />
          </div>
        </div>

        {/* The actions keep their row; the name gives up its width instead. */}
        <div className="flex flex-wrap items-center gap-2 xl:shrink-0 xl:justify-end">
          {/* The save state leads the actions, left of «Refrescar», instead of between two buttons. */}
          {(editable || (offerEditable && !isList && quotation.quote_quantities)) && <AutosaveIndicator editor={editor} />}
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
          {editable && (
            <Button variant="outline" onClick={() => void saveDraft()} disabled={savingDraft} className="max-md:h-11">
              {savingDraft ? <Loader2 className="animate-spin" aria-hidden="true" /> : <Save aria-hidden="true" />} Guardar borrador
            </Button>
          )}
          {/* Only a list update (not the main lists): take references out with its template. */}
          {quotation.kind === "lista" && (
            <ListTemplateMenu quotation={quotation} canUpload={canManage && quotation.status === "borrador" && !busy} />
          )}
          {isList && (
            <Link href={`${basePath}/por-cargar`} className={cn(buttonVariants({ variant: "outline" }), "max-md:h-11")}>
              <CloudUpload aria-hidden="true" /> Por cargar
            </Link>
          )}
          {/* A list update goes to validation whole, like a quotation; the main lists review item by item. */}
          {canManage && isList && !perItemReview && quotation.status === "borrador" && (
            <Button
              onClick={() => setDialog("confirm")}
              disabled={busy || pricedCount === 0}
              title={pricedCount === 0 ? "Escribe al menos un precio nuevo para enviarla a validación." : undefined}
              className="max-md:h-11"
            >
              <Send aria-hidden="true" /> Enviar a validación
            </Button>
          )}
          {/* Ask for a list update or creation (BI validates); the offer goes out by hand from its PDF or Excel. */}
          {canManage && !isList && (
            <Button onClick={() => setDialog("continue")} disabled={busy} className="max-md:h-11">
              <ArrowRight aria-hidden="true" /> Continuar proceso
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
      {/* The figures right under who and where: how the quotation stands before anything else. */}
      {/* A list update shows the same figures (decided 2026-11-20); only the main lists keep their review panel. */}
      {quotation.lines.length > 0 && !perItemReview && <QuotationIndicators lines={quotation.lines} forList={isList} />}
      <ReviewBanner quotation={quotation} canManage={canManage} canValidate={canValidate} />
      {/* A draft never sent to validation is deleted 30 days after it was created; the API says when. */}
      <DeletionNotice deletedOn={quotation.deleted_on} />
      {/* The offer is there from the draft on: preview, adjust and download it before sending it. */}
      {!isList && <OfferSection quotation={quotation} basePath={basePath} canEdit={offerEditable} />}
      <Warnings quotation={quotation} />

      {quotation.lines.length > 0 && perItemReview && (
        <ListFilters lines={quotation.lines} active={listFilter} onSelect={chooseListFilter} withReview />
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
      {(editable || (offerEditable && !isList && quotation.quote_quantities)) && <SaveStatus editor={editor} />}

      {/*
        Two rows across the whole container: the filters each person chose to keep at hand
        (the rest wait in «Más filtros») and, under them, the actions on the references:
        «Agregar productos» alone on the left, the others on the right.
      */}
      <div className={cn("space-y-2", !hasRows && "hidden")}>
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative w-full @xl:w-64">
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
          {chips.some((item) => inToolbar.has(item.key)) && (
            <div role="group" aria-label="Filtros rápidos" className="flex flex-wrap gap-2">
              {chips.filter((item) => inToolbar.has(item.key)).map(chip)}
            </div>
          )}
          {inToolbar.has("categorias") && dropdown("categorias", "w-full @xl:w-52")}
          {inToolbar.has("proveedores") && dropdown("proveedores", "w-full @xl:w-52")}
          {hasMore && (
          <MoreFilters active={moreActive}>
            {hiddenChips.length > 0 && (
              <div role="group" aria-label="Filtros de la línea" className="flex flex-wrap gap-2">
                {hiddenChips.map(chip)}
              </div>
            )}
            {hiddenDropdowns.map((key) => dropdown(key, "w-full"))}
            {(inactiveCount > 0 || importer.lastImport) && (
              <div role="group" aria-label="Estado de la línea" className="flex flex-wrap gap-2">
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
          </MoreFilters>
          )}
          <CustomizeFilters
            options={isList ? [...chips, ...TOOLBAR_OPTIONS.filter((option) => option.key === "categorias" || option.key === "proveedores")] : TOOLBAR_OPTIONS}
            shown={inToolbar}
            onChange={setToolbarKeys}
            defaults={DEFAULT_TOOLBAR}
          />
          <Button variant="ghost" onClick={clearFilters} disabled={!filtered} className="max-md:h-11">
            <FilterX aria-hidden="true" /> Borrar filtros
          </Button>
        </div>
        {canManage && (
          // Next to the references they work on, not among the quotation's own actions. Adding
          // products is the usual step: it stands alone on the left, solid; the rest go right.
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
            {editable && (
              <Button onClick={openImport} disabled={busy} className="max-md:h-11">
                <PackagePlus aria-hidden="true" /> Agregar productos
              </Button>
            )}
            <div className="ml-auto flex flex-wrap items-center justify-end gap-x-3 gap-y-2">
              {!isList && offerEditable && <QuantitiesToggle quotation={quotation} disabled={busy} />}
              {supportCandidates > 0 && (
                <Button variant="outline" onClick={() => setAskingSupport(true)} disabled={busy} className="max-md:h-11">
                  <HandCoins aria-hidden="true" /> Solicitar margen autorizado
                </Button>
              )}
              {editable && !isList && (
                <Button variant="outline" onClick={() => setCreatingLocal(true)} disabled={busy} className="max-md:h-11">
                  <PackageOpen aria-hidden="true" /> Crear producto
                </Button>
              )}
            </div>
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

      {!isList && <ContinueDialog quotation={quotation} open={dialog === "continue"} onOpenChange={(open) => !open && closeDialog()} />}
      {isList && !perItemReview && (
        <ConfirmDialog quotation={quotation} open={dialog === "confirm"} onOpenChange={(open) => !open && closeDialog()} />
      )}
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
              ["Canal", quotation.channel ?? "Sin canal: margen Food Service"],
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
      : quotation.business_group
        ? {
            title: "Grupo empresarial",
            // The channel and the list are the ones most of the group's branches have.
            facts: [
              ["Grupo", quotation.business_group],
              ["Clientes", quotation.group_customers ? formatCount(quotation.group_customers) : "—"],
              ["Canal", quotation.channel ?? "Sin canal"],
            ],
          }
        : {
            title: "Cliente",
            facts: [
              ["NIT", <span key="nit" className="font-mono">{quotation.customer_nit}</span>],
              // Per branch (API #124): that branch's supports replace the NIT's and the group's.
              [
                "Sucursal",
                quotation.customer_branch_id ? (
                  <span key="branch" className="font-mono" title="Los apoyos de esta sucursal reemplazan a los del NIT y a los del grupo">
                    {quotation.customer_branch_id}
                  </span>
                ) : (
                  <span key="branch" title="Aplica el apoyo del NIT o, si no hay, el del grupo; los de sucursal no">Todo el NIT</span>
                ),
              ],
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

/**
 * Where the cost of every line comes from: Nacional or one or more operation
 * centers (a customer billed from several centers starts Nacional), each one
 * narrowed to some of its BP/BSP warehouses if ticked. While several centers
 * are ticked, the dropdown marks the costliest before applying.
 * Changing it recalculates every line, keeps the new prices and sends the
 * quotation back to draft, so it asks first. No notes under it: the card stays
 * as compact as the other two.
 */
function CostCentersField({ quotation, editable }: { quotation: Quotation; editable: boolean }) {
  const id = useId();
  const update = useUpdateCostCenters(quotation.id);
  const centers = useBillingCenters();
  const [choice, setChoice] = useState<CostChoice | null>(null);
  const [error, setError] = useState<string | null>(null);
  const current: CostChoice = { centers: quotation.cost_centers, warehouses: quotation.cost_warehouses ?? [] };

  if (!editable) {
    return (
      <span>
        {costCentersLabel(current.centers, centers.data)}
        {current.warehouses.length > 0 && <span className="text-text-secondary"> · {current.warehouses.join(", ")}</span>}
      </span>
    );
  }

  const apply = () => {
    if (!choice) return;
    setError(null);
    update.mutate(
      { version: quotation.version, codes: choice.centers, warehouses: choice.warehouses },
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
        onChange={(next) => setChoice(sameChoice(next, current) ? null : next)}
        disabled={update.isPending}
      />
      {choice && (
        <div role="group" aria-label="Cambiar el C.O." className="space-y-1.5 rounded-md bg-canvas-subtle p-2 text-[13px]">
          <p>Recalcula todas las líneas y vuelve a borrador.</p>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" onClick={apply} disabled={update.isPending} className="max-md:h-11">
              {update.isPending && <Loader2 className="animate-spin" aria-hidden="true" />}
              Cambiar a {costChoiceCodes(choice, centers.data)}
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
      ? [["Lista solicitada", `${formatDateTime(quotation.confirmed_at)}${by(quotation.confirmed_by)}`] as [string, string]]
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
          {canManage && " Ya no se edita: puedes descargar la oferta en PDF o Excel para el cliente."}
          {/* The API dates the files today when the start passed since validating. */}
          {activationPassed(quotation.activation_date) && ` ${ACTIVATION_PASSED_TEXT}`}
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
          {canManage && " Ya no se edita: para otros precios, arma una cotización nueva."}
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
 * The autosave at a glance, first among the actions: a polite live region,
 * since a save is not urgent news. The problems (conflict, refusal, cells that
 * cannot be read) are spelled out by SaveStatus above the table.
 */
function AutosaveIndicator({ editor }: { editor: LineEditor }) {
  const look =
    editor.state === "saving"
      ? { icon: <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />, text: "Guardando…" }
      : editor.state === "conflict" || editor.state === "error" || editor.invalid.length > 0
        ? { icon: <AlertTriangle className="size-3.5 text-warning" aria-hidden="true" />, text: "Sin guardar" }
        : editor.unconfirmed.length > 0
          ? { icon: <Hourglass className="size-3.5" aria-hidden="true" />, text: "Precios por confirmar" }
        : editor.state === "waiting"
          ? { icon: <Hourglass className="size-3.5" aria-hidden="true" />, text: "Cambios por guardar" }
          : { icon: <Check className="size-3.5" aria-hidden="true" />, text: "Guardado" };
  return (
    <span
      aria-live="polite"
      title="Cada precio se guarda al confirmarlo con Enter; las cantidades, al dejar de escribir."
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
  // Prices typed and not saved yet show their margin in the cell; the header's indicator counts them.
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
