"use client";

import { useState } from "react";
import { CheckCircle2, FileX2, Search } from "lucide-react";

import Pager from "@/shared/components/pager";
import StatePanel from "@/shared/components/state-panel";
import TableSkeleton from "@/shared/components/table-skeleton";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { ToggleChip } from "@/shared/components/ui/toggle-chip";
import { useDebouncedValue } from "@/shared/hooks/use-debounced-value";
import { errorMessage } from "@/shared/lib/api-client";
import { cn } from "@/shared/lib/utils";

import { useQuotations } from "../hooks/use-quotations";
import { formatCount } from "../lib/format";
import { QuotationCards, QuotationTable } from "./quotations-browser";
import { QuotationLoadError } from "./quotations-gate";

const PAGE_SIZE = 20;

type Stage = "pendiente_validacion" | "pendiente_carga";

const STAGES: { value: Stage; label: string; empty: string }[] = [
  {
    value: "pendiente_validacion",
    label: "Por validar",
    empty: "Cuando un asesor pida la actualización o la creación de una lista desde su cotización, aparece aquí para validarla o devolverla.",
  },
  {
    value: "pendiente_carga",
    label: "Por cargar",
    empty: "Las cotizaciones validadas aparecen aquí hasta que se cargan en SIESA y se marcan como cargadas.",
  },
];

/**
 * The customer quotations that ask for a SIESA list, in Actualización de
 * listas: the ones waiting for validation and the validated ones still to load.
 * Each opens in the editor, where BI validates (naming the new list on a
 * creation), returns it with a note, downloads the files and marks it loaded.
 */
export default function QuotationsToValidate({ basePath }: { basePath: string }) {
  const [stage, setStage] = useState<Stage>("pendiente_validacion");
  const [text, setText] = useState("");
  const [page, setPage] = useState(1);
  const q = useDebouncedValue(text.trim());

  const list = useQuotations({ kind: "cotizacion", mine: false, status: stage, q, page, size: PAGE_SIZE });
  // The counts on the chips, without the search: how much is waiting in each stage.
  const toValidate = useQuotations({ kind: "cotizacion", mine: false, status: "pendiente_validacion", q: "", page: 1, size: 1 });
  const toLoad = useQuotations({ kind: "cotizacion", mine: false, status: "pendiente_carga", q: "", page: 1, size: 1 });
  const counts: Record<Stage, number | null> = {
    pendiente_validacion: toValidate.data?.total ?? null,
    pendiente_carga: toLoad.data?.total ?? null,
  };

  const result = list.data;
  const items = result?.items ?? [];
  const current = STAGES.find((option) => option.value === stage)!;

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
        <div role="group" aria-label="Etapa" className="flex gap-2">
          {STAGES.map((option) => (
            <ToggleChip
              key={option.value}
              active={stage === option.value}
              count={counts[option.value]}
              onClick={() => {
                setStage(option.value);
                setPage(1);
              }}
            >
              {option.label}
            </ToggleChip>
          ))}
        </div>
        <div className="relative w-full sm:w-72">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-text-secondary" aria-hidden="true" />
          <Input
            type="search"
            value={text}
            onChange={(event) => {
              setText(event.target.value);
              setPage(1);
            }}
            placeholder="Cliente o NIT"
            aria-label="Buscar cotizaciones por cliente o NIT"
            className="pl-9 max-md:h-11"
          />
        </div>
      </div>

      {list.isPending ? (
        <TableSkeleton rows={6} label="Cargando cotizaciones" />
      ) : list.isError && !result ? (
        <QuotationLoadError error={list.error} onRetry={() => void list.refetch()} subject="las cotizaciones" />
      ) : items.length === 0 ? (
        q ? (
          <StatePanel
            icon={FileX2}
            title="Ninguna cotización coincide con la búsqueda"
            action={<Button variant="outline" onClick={() => setText("")}>Limpiar la búsqueda</Button>}
          >
            Prueba con el NIT completo.
          </StatePanel>
        ) : (
          <StatePanel icon={CheckCircle2} title={stage === "pendiente_validacion" ? "No hay cotizaciones por validar" : "No hay cotizaciones por cargar"}>
            {current.empty}
          </StatePanel>
        )
      ) : (
        <div className={cn("space-y-3", list.isPlaceholderData && "opacity-60")}>
          <QuotationCards items={items} basePath={basePath} showAuthor isList={false} />
          <QuotationTable items={items} basePath={basePath} showAuthor isList={false} />
          {result && (
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs tabular-nums text-text-secondary">
                {formatCount(result.total)} {result.total === 1 ? "cotización" : "cotizaciones"}
              </span>
              <Pager page={result.page} size={result.size} total={result.total} count={items.length} onPageChange={setPage} />
            </div>
          )}
          {list.isError && <p role="alert" className="text-sm text-danger">{errorMessage(list.error)}</p>}
        </div>
      )}
    </div>
  );
}
