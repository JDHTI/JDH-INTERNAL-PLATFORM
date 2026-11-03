"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";

import { ApiError, errorMessage } from "@/shared/lib/api-client";

import { parsePriceInput, priceInputText, samePrice } from "../lib/format";
import { getQuotation } from "../services/quotations.service";
import type { Quotation } from "../types/quotations.types";
import { quotationKeys, useUpdateLines } from "./use-quotations";

/**
 * idle: nothing unsaved. waiting: edits queued for the next save. saving: a
 * PUT is in flight. conflict: the quotation changed elsewhere (409) and the
 * person decides whether to send their prices again. error: the API refused
 * the batch; the next edit tries again.
 */
export type SaveState = "idle" | "waiting" | "saving" | "conflict" | "error";

const SAVE_DELAY_MS = 800;

/**
 * The new-price cells of one quotation. Each edit is queued by reference and,
 * after a pause in typing, the queue goes out as one `PUT /lines` with the
 * version the cache holds. Edits made while a save is in flight wait for it
 * and go in the next batch, so two saves never race with the same version.
 */
export function useLineEditor(quotation: Quotation) {
  const client = useQueryClient();
  const update = useUpdateLines(quotation.id);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [state, setState] = useState<SaveState>("idle");
  const [failure, setFailure] = useState<string | null>(null);
  const pending = useRef(new Map<string, string | null>());
  const inflight = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const stateRef = useRef<SaveState>("idle");

  const setSaveState = (next: SaveState) => {
    stateRef.current = next;
    setState(next);
  };

  const saved = useMemo(() => new Map(quotation.lines.map((line) => [line.sku, line.new_price])), [quotation.lines]);

  const version = () => client.getQueryData<Quotation>(quotationKeys.detail(quotation.id))?.version ?? quotation.version;

  const flush = async (): Promise<void> => {
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
    }
    if (inflight.current || pending.current.size === 0) return;
    const batch = new Map(pending.current);
    pending.current.clear();
    inflight.current = true;
    setSaveState("saving");
    try {
      await update.mutateAsync({
        version: version(),
        lines: [...batch].map(([sku, newPrice]) => ({ sku, new_price: newPrice })),
      });
      inflight.current = false;
      setFailure(null);
      // A cell that still says what was sent now shows the API's value; one
      // typed over meanwhile keeps its draft and is already queued again.
      setDrafts((current) => {
        const next = { ...current };
        for (const [sku, sent] of batch) {
          if (pending.current.has(sku) || next[sku] === undefined) continue;
          const typed = parsePriceInput(next[sku]);
          if ("value" in typed && samePrice(typed.value, sent)) delete next[sku];
        }
        return next;
      });
      if (pending.current.size > 0) await flush();
      else setSaveState("idle");
    } catch (error) {
      inflight.current = false;
      for (const [sku, value] of batch) if (!pending.current.has(sku)) pending.current.set(sku, value);
      setFailure(errorMessage(error));
      if (error instanceof ApiError && error.status === 409) {
        setSaveState("conflict");
        void client.invalidateQueries({ queryKey: quotationKeys.detail(quotation.id) });
      } else {
        setSaveState("error");
      }
    }
  };

  const schedule = () => {
    if (timer.current) clearTimeout(timer.current);
    if (stateRef.current === "conflict") return;
    if (pending.current.size === 0) {
      if (!inflight.current) setSaveState("idle");
      return;
    }
    if (!inflight.current) setSaveState("waiting");
    timer.current = setTimeout(() => void flush(), SAVE_DELAY_MS);
  };

  const edit = (sku: string, text: string) => {
    setDrafts((current) => ({ ...current, [sku]: text }));
    const parsed = parsePriceInput(text);
    if ("error" in parsed) {
      setErrors((current) => ({ ...current, [sku]: parsed.error }));
      pending.current.delete(sku);
      schedule();
      return;
    }
    setErrors((current) => {
      if (!(sku in current)) return current;
      const next = { ...current };
      delete next[sku];
      return next;
    });
    if (samePrice(parsed.value, saved.get(sku)) && !inflight.current) pending.current.delete(sku);
    else pending.current.set(sku, parsed.value);
    schedule();
  };

  /**
   * After a 409: read the current version straight from the API, so the save
   * never depends on whether a background refetch has landed in the cache,
   * then send the queued prices over it.
   */
  const retry = async () => {
    if (inflight.current) return;
    setSaveState("saving");
    try {
      const fresh = await getQuotation(quotation.id);
      client.setQueryData(quotationKeys.detail(quotation.id), fresh);
    } catch (error) {
      setFailure(errorMessage(error));
      setSaveState("conflict");
      return;
    }
    if (pending.current.size === 0) {
      setSaveState("idle");
      return;
    }
    await flush();
  };

  /** Drops every unsaved price and shows what the API has. */
  const discard = () => {
    if (timer.current) clearTimeout(timer.current);
    pending.current.clear();
    setDrafts({});
    setErrors({});
    setFailure(null);
    setSaveState("idle");
    void client.invalidateQueries({ queryKey: quotationKeys.detail(quotation.id) });
  };

  const unsaved = state !== "idle" || Object.keys(errors).length > 0;

  // Leaving with prices that never reached the API loses them silently otherwise.
  useEffect(() => {
    if (!unsaved) return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [unsaved]);

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  return {
    /** What the cell shows: the typed text, or the saved price. */
    textFor: (sku: string) => drafts[sku] ?? priceInputText(saved.get(sku)),
    errorFor: (sku: string): string | undefined => errors[sku],
    isDirty: (sku: string) => drafts[sku] !== undefined,
    edit,
    /** Saves now instead of waiting for the pause, e.g. on Enter. */
    saveNow: () => void flush(),
    retry,
    discard,
    state,
    failure,
    unsaved,
    /** Cells whose text is not a price, with why: the cell itself only turns red. */
    invalid: Object.entries(errors).map(([sku, message]) => ({ sku, message })),
  };
}

export type LineEditor = ReturnType<typeof useLineEditor>;
