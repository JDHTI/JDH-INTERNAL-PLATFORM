"use client";

import { useState } from "react";
import { CloudOff, FileSpreadsheet, FileX2, Percent, RefreshCw, Search } from "lucide-react";

import { useCanManage } from "@/features/supports/hooks/use-supports";
import Pager from "@/shared/components/pager";
import StatePanel from "@/shared/components/state-panel";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { Dropdown } from "@/shared/components/ui/dropdown";
import { Input } from "@/shared/components/ui/input";
import { Switch } from "@/shared/components/ui/switch";
import { useDebouncedValue } from "@/shared/hooks/use-debounced-value";
import { ApiError, errorMessage } from "@/shared/lib/api-client";
import { toNumber, type Decimal } from "@/shared/lib/format";
import { cn } from "@/shared/lib/utils";

import { findCommercialMaster, type MasterColumn } from "../config/masters.config";
import { useCommercialMaster } from "../hooks/use-commercial-masters";
import type { CommercialMasterKey, SupplierNit } from "../types/commercial-master.types";
import MarginEditDialog from "./margin-edit-dialog";
import MarginUpdaterDialog from "./margin-updater-dialog";
import PriceIncreasesView from "./price-increases-view";
import ProductDialog from "./product-dialog";

const PAGE_SIZE = 50;

const numberFormat = new Intl.NumberFormat("es-CO");
const percentFormat = new Intl.NumberFormat("es-CO", { style: "percent", maximumFractionDigits: 2 });

/**
 * Server-paged table of one general master. The server already lists active
 * rows first and inactive ones last, so the order is never touched here.
 * Products are the exception to read-only: their code opens the product, and
 * managers can edit it or update margins from a file.
 */
export default function CommercialMasterTable({ masterKey }: { masterKey: CommercialMasterKey }) {
  // Looked up here, not passed down: the definition holds an icon component,
  // which a Server Component cannot hand to a Client Component.
  const master = findCommercialMaster(masterKey)!;
  const canManage = useCanManage();
  const [text, setText] = useState("");
  const [filterValues, setFilterValues] = useState<Record<string, string>>({});
  const [page, setPage] = useState(1);
  const [openSku, setOpenSku] = useState<string | null>(null);
  const [updatingMargins, setUpdatingMargins] = useState(false);
  const [marginSku, setMarginSku] = useState<string | null>(null);
  // Products only: the price increase history takes the table's place.
  const [showIncreases, setShowIncreases] = useState(false);
  // The same managers who load the margin file edit one product's margins by hand.
  const editsMargins = master.key === "productos" && canManage;
  const q = useDebouncedValue(text.trim());

  const query = useCommercialMaster({ master: master.key, q, filters: filterValues, page, size: PAGE_SIZE });
  const result = query.data;
  const rows = result?.items ?? [];
  const filtered = q !== "" || Object.values(filterValues).some((value) => value !== "");

  const clearFilters = () => {
    setText("");
    setFilterValues({});
    setPage(1);
  };

  if (master.key === "productos" && showIncreases) {
    return (
      <div className="space-y-3">
        <IncreasesSwitch checked onChange={setShowIncreases} />
        <PriceIncreasesView />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {master.key === "productos" && <IncreasesSwitch checked={false} onChange={setShowIncreases} />}
      <div className="flex flex-col gap-2 lg:flex-row">
        <div className="relative flex-1 lg:max-w-xl">
          <Search
            className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-text-secondary"
            aria-hidden="true"
          />
          <Input
            type="search"
            value={text}
            onChange={(event) => {
              setText(event.target.value);
              setPage(1);
            }}
            placeholder={master.searchPlaceholder}
            aria-label={`Buscar en ${master.name}`}
            className="pl-9"
          />
        </div>
        {master.filters.map((filter) => (
          <Dropdown
            key={filter.param}
            className="lg:w-48"
            value={filterValues[filter.param] ?? ""}
            onValueChange={(value) => {
              setFilterValues((current) => ({ ...current, [filter.param]: value }));
              setPage(1);
            }}
            options={[{ value: "", label: filter.allLabel }, ...filter.options]}
            aria-label={filter.ariaLabel}
          />
        ))}
        {filtered && (
          <Button variant="ghost" onClick={clearFilters}>
            Limpiar filtros
          </Button>
        )}
        {master.key === "productos" && canManage && (
          <Button variant="outline" className="lg:ml-auto" onClick={() => setUpdatingMargins(true)}>
            <FileSpreadsheet aria-hidden="true" /> Actualizar márgenes
          </Button>
        )}
      </div>

      {query.isPending ? (
        <div className="h-72 animate-pulse rounded-lg bg-canvas-subtle" aria-busy="true" aria-label={`Cargando ${master.name}`} />
      ) : query.isError && !result ? (
        <LoadError name={master.name} error={query.error} onRetry={() => query.refetch()} />
      ) : rows.length === 0 ? (
        filtered ? (
          <StatePanel
            icon={FileX2}
            title="Ningún registro coincide con los filtros"
            action={<Button variant="outline" onClick={clearFilters}>Limpiar filtros</Button>}
          >
            Prueba con otro texto o quita algún filtro.
          </StatePanel>
        ) : (
          <StatePanel icon={FileX2} title={`Aún no hay registros en ${master.name.toLowerCase()}`}>
            Los datos llegan cuando termina la sincronización de maestros y la importación de Excel.
          </StatePanel>
        )
      ) : (
        <div className={cn("space-y-3", query.isPlaceholderData && "opacity-60")}>
          <div className="overflow-x-auto rounded-lg border border-border bg-surface">
            <table className="w-full min-w-max text-left text-sm">
              <caption className="sr-only">{master.name}</caption>
              <thead className="bg-canvas-subtle text-[11px] font-semibold uppercase tracking-[0.06em] text-text-secondary">
                <tr>
                  {master.columns.map((column) => (
                    <th key={column.key} scope="col" className={cn("px-3 py-2", alignment(column))}>
                      {column.label}
                    </th>
                  ))}
                  {editsMargins && (
                    <th scope="col" className="sticky right-0 w-14 bg-canvas-subtle px-3 py-2">
                      <span className="sr-only">Acciones</span>
                    </th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {rows.map((row) => (
                  <tr
                    key={master.rowKey.map((key) => String(row[key] ?? "")).join("|")}
                    // An inactive row stays in the list, muted: the Estado column still says so in words.
                    className={cn("h-10 hover:bg-primary-subtle", row.is_active === false && "opacity-60")}
                  >
                    {master.columns.map((column) => (
                      <td key={column.key} className={cn("px-3 py-2", alignment(column), column.kind === "mono" && "font-mono text-[13px]")}>
                        <Cell column={column} value={row[column.key]} onOpenSku={setOpenSku} />
                      </td>
                    ))}
                    {editsMargins && (
                      <td className="sticky right-0 bg-surface px-2 py-1 text-right">
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => setMarginSku(String(row.sku))}
                          aria-label={`Editar márgenes de ${String(row.sku)}`}
                          title="Editar márgenes"
                        >
                          <Percent aria-hidden="true" />
                        </Button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {result && (
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs tabular-nums text-text-secondary">
                {numberFormat.format(result.total)} {result.total === 1 ? "registro" : "registros"}
              </span>
              <Pager page={result.page} size={result.size} total={result.total} count={rows.length} onPageChange={setPage} />
            </div>
          )}
          {query.isError && (
            <p role="alert" className="text-sm text-danger">
              {errorMessage(query.error)}
            </p>
          )}
        </div>
      )}

      {master.key === "productos" && (
        <>
          <ProductDialog sku={openSku} canManage={canManage} onClose={() => setOpenSku(null)} />
          <MarginUpdaterDialog open={updatingMargins} onClose={() => setUpdatingMargins(false)} />
          <MarginEditDialog sku={marginSku} onClose={() => setMarginSku(null)} />
        </>
      )}
    </div>
  );
}

/** Switches the products master between its table and the price increase history. */
function IncreasesSwitch({ checked, onChange }: { checked: boolean; onChange: (checked: boolean) => void }) {
  return (
    <div className="flex justify-end">
      {/* The switch is a button inside the label: the text names it and toggles it too. */}
      <label className="inline-flex min-h-8 cursor-pointer items-center gap-2 text-sm font-medium">
        Histórico de alza de precios
        <Switch checked={checked} onCheckedChange={onChange} />
      </label>
    </div>
  );
}

const alignment = (column: MasterColumn) => (column.kind === "count" || column.kind === "pct" ? "text-right tabular-nums" : "");

function Cell({
  column,
  value,
  onOpenSku,
}: {
  column: MasterColumn;
  value: unknown;
  onOpenSku: (sku: string) => void;
}) {
  switch (column.kind) {
    case "active":
      return value ? <Badge tone="success">Activo</Badge> : <Badge>Inactivo</Badge>;
    // Decimals arrive as strings or numbers depending on the field.
    case "count":
      return toNumber(value as Decimal | null) === null ? "—" : numberFormat.format(Number(value));
    case "pct":
      return toNumber(value as Decimal | null) === null ? "—" : percentFormat.format(Number(value));
    case "sku":
      return typeof value === "string" && value !== "" ? (
        <button
          type="button"
          onClick={() => onOpenSku(value)}
          aria-label={`Ver el producto ${value}`}
          className="rounded-sm font-mono text-[13px] hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        >
          {value}
        </button>
      ) : (
        "—"
      );
    case "liquor":
      return (toNumber(value as Decimal | null) ?? 0) > 0 ? <Badge tone="warning">Impuesto licor</Badge> : "—";
    case "nits":
      return <Nits nits={Array.isArray(value) ? (value as SupplierNit[]) : []} />;
    default:
      return value === null || value === undefined || value === "" ? "—" : String(value);
  }
}

/** The primary NIT first; one that was never confirmed says so instead of looking settled. */
function Nits({ nits }: { nits: SupplierNit[] }) {
  if (nits.length === 0) return "—";
  const ordered = [...nits].sort((a, b) => Number(b.is_primary) - Number(a.is_primary));
  return (
    <span className="flex flex-wrap gap-x-3 gap-y-1">
      {ordered.map((item) => (
        <span key={item.nit} className="whitespace-nowrap font-mono text-[13px]">
          {item.nit}
          {item.is_primary && <span className="font-sans text-xs text-text-secondary"> principal</span>}
          {!item.confirmed && <span className="font-sans text-xs text-warning"> sin confirmar</span>}
        </span>
      ))}
    </span>
  );
}

function LoadError({ name, error, onRetry }: { name: string; error: Error; onRetry: () => void }) {
  const status = error instanceof ApiError ? error.status : null;
  const title =
    status === 404
      ? "Este maestro todavía no está disponible"
      : status === 429
        ? "Demasiadas consultas seguidas"
        : `No se pudo cargar ${name.toLowerCase()}`;
  const description =
    status === 404
      ? "El API aún no publica estos datos. Cuando se despliegue, aparecerán aquí sin cambios en esta pantalla."
      : status === 429
        ? "Espera unos segundos y vuelve a intentarlo."
        : errorMessage(error);
  return (
    <StatePanel
      icon={CloudOff}
      tone="danger"
      title={title}
      action={
        <Button variant="outline" onClick={onRetry}>
          <RefreshCw aria-hidden="true" /> Reintentar
        </Button>
      }
    >
      {description}
    </StatePanel>
  );
}
