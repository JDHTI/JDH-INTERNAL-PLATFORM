"use client";

import { useId, useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { errorMessage } from "@/shared/lib/api-client";
import { cn } from "@/shared/lib/utils";

import { useSetMarginThreshold } from "../hooks/use-order-validator";
import { THRESHOLD_MAX, THRESHOLD_MIN, formatThreshold, parseThresholdPoints } from "../lib/format";
import type { ValidationBatch } from "../types/order-validator.types";

const EXPLANATION =
  "Puntos que se suman al margen de cada pedido antes de compararlo con su objetivo: con 0,5, un pedido al 19,5 % frente a un objetivo del 20 % queda listo.";

/**
 * A yes or no for the whole list: does the threshold in play release any
 * order the margin alone would not? It is not a per-order mark. Yes carries
 * the accent color and the count, no is neutral; it follows the number being
 * tried and, with none typed, the saved one.
 */
function ReleaseSignal({ released, className }: { released: number | null; className?: string }) {
  if (released === null) return null;
  const yes = released > 0;
  return (
    <Badge
      tone={yes ? "info" : "neutral"}
      className={cn("px-2.5 py-1 text-sm font-semibold", className)}
      title="Pedidos que pasan a listos solo por sumar el umbral al margen del pedido"
    >
      <span className={cn("font-normal", yes ? "" : "text-text-secondary")}>Libera pedidos: </span>
      {yes ? <>Sí <span className="tabular-nums">({released})</span></> : "No"}
    </Badge>
  );
}

/**
 * The margin threshold of a file, in the search bar's row. Managers type points
 * (0 to 20): while the box holds a number the list below already shows what it
 * would do (the screen asks the API to try it without saving), and "Aplicar"
 * saves it, recalculates which orders it releases (the lines are not validated
 * again, manual approvals stay) and reloads the counts. Everyone else sees the
 * threshold in force, read only.
 */
export default function ThresholdControl({
  batch,
  canManage,
  value,
  onChange,
  previewing,
  released,
}: {
  batch: ValidationBatch;
  canManage: boolean;
  /** What is typed; the screen owns it so it can try the number on the list. */
  value: string;
  onChange: (text: string) => void;
  /** The list below is showing an unsaved threshold. */
  previewing: boolean;
  /** Orders the threshold in play releases; null until the list answers. */
  released: number | null;
}) {
  const id = useId();
  const [error, setError] = useState<string | null>(null);
  const save = useSetMarginThreshold();

  if (!canManage) {
    return (
      <div className="flex flex-wrap items-center gap-2 lg:pb-1.5">
        <p className="text-sm" title={EXPLANATION}>
          <span className="text-text-secondary">Umbral de margen: </span>
          <span className="font-medium tabular-nums">{formatThreshold(batch.margin_threshold_points)}</span>
        </p>
        <ReleaseSignal released={released} />
      </div>
    );
  }

  const apply = (event: React.FormEvent) => {
    event.preventDefault();
    const parsed = parseThresholdPoints(value);
    if (parsed === null || parsed === "invalid") {
      setError(`Escribe un número entre ${THRESHOLD_MIN} y ${THRESHOLD_MAX} puntos.`);
      return;
    }
    setError(null);
    save.mutate(
      { id: batch.id, thresholdPoints: Number(parsed) },
      {
        onSuccess: (updated) => {
          onChange("");
          toast.success(
            `Umbral de ${formatThreshold(updated.margin_threshold_points)}: ${updated.ready_order_count} de ${updated.order_count} pedidos listos.`
          );
        },
        onError: (failure) => setError(errorMessage(failure)),
      }
    );
  };

  // The label sits above; below it the box, the button right against it and what is in use,
  // the preview notice or any error in the same spot after them. The row is one box tall, so
  // it lines up with the search box beside it.
  return (
    <form onSubmit={apply} noValidate className="space-y-1">
      <label htmlFor={id} className="block text-[13px] font-medium" title={EXPLANATION}>
        Umbral de margen (pts)
      </label>
      <div className="flex flex-wrap items-center gap-x-1 gap-y-1">
        <Input
          id={id}
          inputMode="decimal"
          value={value}
          onChange={(event) => {
            setError(null);
            onChange(event.target.value);
          }}
          placeholder={String(Number(batch.margin_threshold_points)).replace(".", ",")}
          aria-invalid={error ? true : undefined}
          aria-describedby={`${id}-state`}
          className="w-28"
        />
        {/* The filled button: dark on the light theme, light on the dark one (the primary tokens). */}
        <Button type="submit" variant="primary" disabled={save.isPending}>
          {save.isPending ? "Aplicando…" : "Aplicar"}
        </Button>
        <ReleaseSignal released={released} className="ml-2" />
        <p
          id={`${id}-state`}
          role={error ? "alert" : undefined}
          aria-live={error ? undefined : "polite"}
          className={cn("ml-2 text-[13px]", error ? "text-danger" : "text-text-secondary")}
        >
          {error ?? (
            <>
              En uso: <span className="font-medium tabular-nums text-text-primary">{formatThreshold(batch.margin_threshold_points)}</span>
              {previewing && <span className="text-warning"> · Vista previa sin guardar</span>}
            </>
          )}
        </p>
      </div>
    </form>
  );
}
