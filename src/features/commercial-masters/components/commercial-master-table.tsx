"use client";

import { useState } from "react";
import { CloudOff, FileX2, RefreshCw, Search } from "lucide-react";

import Pager from "@/shared/components/pager";
import StatePanel from "@/shared/components/state-panel";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { useDebouncedValue } from "@/shared/hooks/use-debounced-value";
import { ApiError, errorMessage } from "@/shared/lib/api-client";
import { toNumber, type Decimal } from "@/shared/lib/format";
import { cn } from "@/shared/lib/utils";

import type { CommercialMasterDef, MasterColumn } from "../config/masters.config";
import { useCommercialMaster } from "../hooks/use-commercial-masters";
import type { SupplierNit } from "../types/commercial-master.types";

const PAGE_SIZE = 50;

const numberFormat = new Intl.NumberFormat("es-CO");
const percentFormat = new Intl.NumberFormat("es-CO", { style: "percent", maximumFractionDigits: 2 });

/**
 * Read-only, server-paged table of one general master. Nothing in a row is
 * actionable: the sidebar dropdown is what moves between masters.
 */
export default function CommercialMasterTable({ master }: { master: CommercialMasterDef }) {
  const [text, setText] = useState("");
  const [page, setPage] = useState(1);
  const q = useDebouncedValue(text.trim());

  const query = useCommercialMaster({ master: master.key, q, page, size: PAGE_SIZE });
  const result = query.data;
  const rows = result?.items ?? [];

  return (
    <div className="space-y-4">
      <div className="relative max-w-xl">
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

      {query.isPending ? (
        <div className="h-72 animate-pulse rounded-lg bg-canvas-subtle" aria-busy="true" aria-label={`Cargando ${master.name}`} />
      ) : query.isError && !result ? (
        <LoadError name={master.name} error={query.error} onRetry={() => query.refetch()} />
      ) : rows.length === 0 ? (
        q !== "" ? (
          <StatePanel icon={FileX2} title="Ningún registro coincide con la búsqueda">
            Prueba con otro texto.
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
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {rows.map((row) => (
                  <tr key={master.rowKey.map((key) => String(row[key] ?? "")).join("|")} className="h-10 hover:bg-primary-subtle">
                    {master.columns.map((column) => (
                      <td key={column.key} className={cn("px-3 py-2", alignment(column), column.kind === "mono" && "font-mono text-[13px]")}>
                        <Cell column={column} value={row[column.key]} />
                      </td>
                    ))}
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
    </div>
  );
}

const alignment = (column: MasterColumn) => (column.kind === "count" || column.kind === "pct" ? "text-right tabular-nums" : "");

function Cell({ column, value }: { column: MasterColumn; value: unknown }) {
  switch (column.kind) {
    case "active":
      return value ? <Badge tone="success">Activo</Badge> : <Badge>Inactivo</Badge>;
    // Decimals arrive as strings or numbers depending on the field.
    case "count":
      return toNumber(value as Decimal | null) === null ? "—" : numberFormat.format(Number(value));
    case "pct":
      return toNumber(value as Decimal | null) === null ? "—" : percentFormat.format(Number(value));
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
