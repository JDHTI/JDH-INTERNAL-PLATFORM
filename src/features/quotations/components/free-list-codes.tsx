"use client";

import { useId, useState } from "react";
import { useInfiniteQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";

import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { useDebouncedValue } from "@/shared/hooks/use-debounced-value";
import { errorMessage } from "@/shared/lib/api-client";
import { cn } from "@/shared/lib/utils";

import { formatCount } from "../lib/format";
import { getAvailableListCodes } from "../services/quotations.service";

const PAGE = 30;

/**
 * The list codes still free in SIESA, as chips that fill the code field: the
 * first ones in order, «Ver más» for the next page, and a «Desde» box to jump
 * ahead (codes after what is typed). The count says how much room is left.
 */
export default function FreeListCodes({ value, onPick }: { value: string; onPick: (code: string) => void }) {
  const id = useId();
  const [from, setFrom] = useState("");
  const after = useDebouncedValue(from.trim().toUpperCase());
  const codes = useInfiniteQuery({
    queryKey: ["quotations", "list-codes", "available", after],
    queryFn: ({ pageParam }) => getAvailableListCodes(pageParam, PAGE),
    initialPageParam: after,
    getNextPageParam: (last) => last.next_after ?? undefined,
    staleTime: 60_000,
    retry: false,
  });
  const first = codes.data?.pages[0];
  const items = codes.data?.pages.flatMap((page) => page.items) ?? [];

  return (
    <div className="space-y-2 rounded-md bg-canvas-subtle p-3">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div className="space-y-0.5">
          <p id={`${id}-title`} className="text-[13px] font-medium">Códigos libres</p>
          <p className="text-xs text-text-secondary" aria-live="polite">
            {first ? `${formatCount(first.free)} códigos libres de ${formatCount(first.free + first.used)}` : "Consultando SIESA…"}
          </p>
        </div>
        <div className="w-28">
          <label htmlFor={`${id}-from`} className="sr-only">Ver códigos desde</label>
          <Input
            id={`${id}-from`}
            value={from}
            maxLength={3}
            placeholder="Desde…"
            onChange={(event) => setFrom(event.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""))}
            className="h-8 font-mono uppercase max-md:h-11"
            autoComplete="off"
          />
        </div>
      </div>

      {codes.isError ? (
        <p role="alert" className="text-[13px] text-danger">No se pudieron leer los códigos libres: {errorMessage(codes.error)}</p>
      ) : codes.isPending ? (
        <div className="h-16 animate-pulse rounded-md bg-surface" aria-busy="true" aria-label="Cargando códigos libres" />
      ) : items.length === 0 ? (
        <p className="text-[13px] text-text-secondary">No hay códigos libres{after ? ` después de ${after}` : ""}.</p>
      ) : (
        <div role="group" aria-labelledby={`${id}-title`} className="flex max-h-40 flex-wrap gap-1.5 overflow-y-auto">
          {items.map((code) => (
            <button
              key={code}
              type="button"
              aria-pressed={value === code}
              onClick={() => onPick(code)}
              className={cn(
                "min-h-7 rounded-sm border px-2 font-mono text-[13px] transition-colors duration-150 max-md:min-h-11",
                "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
                value === code ? "border-primary bg-primary text-text-on-primary" : "border-border-control bg-surface hover:bg-primary-subtle"
              )}
            >
              {code}
            </button>
          ))}
        </div>
      )}

      {codes.hasNextPage && (
        <Button variant="ghost" size="sm" onClick={() => void codes.fetchNextPage()} disabled={codes.isFetchingNextPage} className="max-md:h-11">
          {codes.isFetchingNextPage && <Loader2 className="animate-spin" aria-hidden="true" />} Ver más
        </Button>
      )}
    </div>
  );
}
