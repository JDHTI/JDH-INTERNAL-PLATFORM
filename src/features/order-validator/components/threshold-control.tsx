"use client";

import { useId, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { errorMessage } from "@/shared/lib/api-client";

import { useRevalidateBatch } from "../hooks/use-order-validator";
import { THRESHOLD_MAX, THRESHOLD_MIN, formatThreshold, parseThresholdPoints } from "../lib/format";
import type { ValidationBatch } from "../types/order-validator.types";

/**
 * The margin threshold of a file: the points a line may fall short of its
 * target and still be released. Everyone sees the one in force; managers can
 * change it, which validates the whole file again (manual approvals stay) and
 * reloads the counts and the orders.
 */
export default function ThresholdControl({ batch, canManage }: { batch: ValidationBatch; canManage: boolean }) {
  const id = useId();
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const revalidate = useRevalidateBatch();

  if (!canManage) {
    return (
      <p className="text-sm">
        <span className="text-text-secondary">Umbral de margen: </span>
        <span className="font-medium tabular-nums">{formatThreshold(batch.margin_threshold_points)}</span>
      </p>
    );
  }

  const apply = (event: React.FormEvent) => {
    event.preventDefault();
    const parsed = parseThresholdPoints(text);
    if (parsed === null || parsed === "invalid") {
      setError(`Escribe un número entre ${THRESHOLD_MIN} y ${THRESHOLD_MAX} puntos.`);
      return;
    }
    setError(null);
    revalidate.mutate(
      { id: batch.id, thresholdPoints: Number(parsed) },
      {
        onSuccess: (updated) => {
          setText("");
          toast.success(
            `Umbral de ${formatThreshold(updated.margin_threshold_points)}: ${updated.ready_order_count} de ${updated.order_count} pedidos listos.`
          );
        },
        onError: (failure) => setError(errorMessage(failure)),
      }
    );
  };

  return (
    <div className="space-y-1.5">
      <form onSubmit={apply} className="flex flex-wrap items-end gap-x-3 gap-y-2" noValidate>
        <div className="space-y-1">
          <label htmlFor={id} className="block text-[13px] font-medium">
            Umbral de margen (pts)
          </label>
          <Input
            id={id}
            inputMode="decimal"
            value={text}
            onChange={(event) => setText(event.target.value)}
            placeholder={String(Number(batch.margin_threshold_points)).replace(".", ",")}
            aria-invalid={error ? true : undefined}
            aria-describedby={`${id}-state`}
            className="w-32"
          />
        </div>
        <Button type="submit" variant="outline" disabled={revalidate.isPending}>
          {revalidate.isPending ? "Aplicando…" : "Aplicar"}
        </Button>
        <p id={`${id}-state`} className="pb-1.5 text-[13px] text-text-secondary">
          En uso: <span className="font-medium tabular-nums text-text-primary">{formatThreshold(batch.margin_threshold_points)}</span>. Una
          línea se libera aunque le falten hasta esos puntos.
        </p>
      </form>
      {error && (
        <p role="alert" className="text-[13px] text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
