"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { CloudOff } from "lucide-react";

import { Button, buttonVariants } from "@/shared/components/ui/button";
import { Dialog, DialogError, DialogFooter } from "@/shared/components/ui/dialog";
import { errorMessage } from "@/shared/lib/api-client";

import { useGenerateSiesaLoad } from "../hooks/use-commercial-masters";
import { generateSiesaLoad } from "../services/commercial-masters.service";
import type { SiesaLoadSelection } from "../types/price-increases.types";
import { LoadFiles, LoadRowsTable, LoadSteps } from "./siesa-load-parts";

const numberFormat = new Intl.NumberFormat("es-CO");

/**
 * Steps 2 and 3 of a SIESA load: the review of the selection (what goes, with
 * the supplier, unit, price and date SIESA takes, and what is left out and
 * why), then «Generar lote», which stores it and offers its two files.
 */
export default function SiesaLoadDialog({
  selection,
  onClose,
  onGenerated,
}: {
  /** Null keeps the dialog closed. */
  selection: SiesaLoadSelection | null;
  onClose: () => void;
  /** The selection is in a load now: the history drops it. */
  onGenerated: () => void;
}) {
  return (
    <Dialog
      open={selection !== null}
      onOpenChange={(open) => !open && onClose()}
      wide
      title="Generar cargue a SIESA"
      description="Cotizaciones de proveedor (Impodatos 0212) con el costo nuevo sin impuesto saludable."
    >
      {selection && <Review selection={selection} onClose={onClose} onGenerated={onGenerated} />}
    </Dialog>
  );
}

function Review({ selection, onClose, onGenerated }: { selection: SiesaLoadSelection; onClose: () => void; onGenerated: () => void }) {
  const pathname = usePathname();
  // The review writes nothing: a query, read again only when the selection changes.
  const preview = useQuery({
    queryKey: ["commercial-masters", "siesa-load-preview", selection],
    queryFn: () => generateSiesaLoad(selection, false),
    retry: false,
    gcTime: 0,
    staleTime: Infinity,
  });
  const generate = useGenerateSiesaLoad();
  const load = generate.data?.load ?? null;

  if (load) {
    return (
      <div className="space-y-4">
        <p className="text-sm">
          Lote <span className="font-semibold tabular-nums">{load.number}</span> generado con {numberFormat.format(load.row_count)}{" "}
          {load.row_count === 1 ? "cotización" : "cotizaciones"}. Descarga el TXT y cárgalo en SIESA; después confirma el cargue en
          «Lotes de cargue».
        </p>
        <LoadFiles load={load} />
        <DialogFooter>
          <Link href={`${pathname}?vista=lotes`} className={buttonVariants({ variant: "outline" })} onClick={onClose}>
            Ir a lotes de cargue
          </Link>
          <Button onClick={onClose}>Listo</Button>
        </DialogFooter>
      </div>
    );
  }

  const rows = preview.data?.rows ?? [];
  const excluded = preview.data?.excluded ?? [];

  return (
    <div className="space-y-4">
      <LoadSteps />
      {preview.isPending ? (
        <div className="h-48 animate-pulse rounded-lg bg-canvas-subtle" aria-busy="true" aria-label="Revisando las alzas elegidas" />
      ) : preview.isError ? (
        <p role="alert" className="flex items-start gap-2 text-sm text-danger">
          <CloudOff className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          {errorMessage(preview.error)}
        </p>
      ) : (
        <>
          <section className="space-y-2" aria-labelledby="load-goes">
            <h3 id="load-goes" className="text-sm font-semibold">
              Van a SIESA <span className="font-normal text-text-secondary tabular-nums">({numberFormat.format(rows.length)})</span>
            </h3>
            {rows.length === 0 ? (
              <p className="text-sm text-text-secondary">Ninguna de las alzas elegidas puede ir a SIESA: mira los motivos abajo.</p>
            ) : (
              <LoadRowsTable rows={rows} caption="Cotizaciones que van a SIESA" />
            )}
          </section>
          {excluded.length > 0 && (
            <section className="space-y-2" aria-labelledby="load-out">
              <h3 id="load-out" className="text-sm font-semibold">
                Quedan por fuera <span className="font-normal text-text-secondary tabular-nums">({numberFormat.format(excluded.length)})</span>
              </h3>
              <ul className="max-h-48 divide-y divide-border overflow-auto rounded-lg border border-border text-[13px]">
                {excluded.map((item) => (
                  <li key={item.increase_id} className="flex gap-3 px-2.5 py-1.5">
                    <span className="w-28 shrink-0 font-mono">{item.sku}</span>
                    <span className="text-text-secondary">{item.reason}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </>
      )}

      <DialogError message={generate.isError ? errorMessage(generate.error) : null} />
      <DialogFooter>
        <Button variant="outline" onClick={onClose}>
          Cancelar
        </Button>
        <Button
          onClick={() => generate.mutate({ selection, apply: true }, { onSuccess: (result) => result.load && onGenerated() })}
          disabled={rows.length === 0 || generate.isPending}
        >
          {generate.isPending ? "Generando…" : `Generar lote (${numberFormat.format(rows.length)})`}
        </Button>
      </DialogFooter>
    </div>
  );
}
