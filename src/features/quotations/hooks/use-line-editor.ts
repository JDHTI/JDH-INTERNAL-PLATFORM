"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";

import { ApiError, errorMessage } from "@/shared/lib/api-client";

import { parsePriceInput, parseQuantityInput, priceInputText, quantityInputText, samePrice } from "../lib/format";
import { getQuotation } from "../services/quotations.service";
import type { Quotation } from "../types/quotations.types";
import { quotationKeys, useUpdateLines } from "./use-quotations";

/**
 * idle: nothing unsaved. waiting: edits queued for the next save. saving: a
 * PUT is in flight. conflict: the quotation changed elsewhere (409) and the
 * person decides whether to send their values again. error: the API refused
 * the batch; the next edit tries again.
 */
export type SaveState = "idle" | "waiting" | "saving" | "conflict" | "error";

/** The two editable cells of a line. Both go out in the same `PUT /lines`. */
export type LineField = "price" | "quantity";

const SAVE_DELAY_MS = 800;

const FIELD = {
  price: { key: "new_price", parse: parsePriceInput, show: priceInputText, word: "precio" },
  quantity: { key: "quantity", parse: parseQuantityInput, show: quantityInputText, word: "cantidad" },
} as const;

type Change = { new_price?: string | null; quantity?: string | null };

const draftKey = (field: LineField, sku: string) => `${field}|${sku}`;

/**
 * The editable cells of one quotation: the new price and, when it quotes
 * with quantities, the quantity. Each edit is queued by reference and, after
 * a pause in typing, the queue goes out as one `PUT /lines` with the version
 * the cache holds. Edits made while a save is in flight wait for it and go in
 * the next batch, so two saves never race with the same version, whichever
 * field they touch.
 */
export function useLineEditor(quotation: Quotation) {
  const client = useQueryClient();
  const update = useUpdateLines(quotation.id);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [state, setState] = useState<SaveState>("idle");
  const [failure, setFailure] = useState<string | null>(null);
  const pending = useRef(new Map<string, Change>());
  const inflight = useRef(false);
  /** The save in flight, so "Guardar borrador" can wait for it instead of reporting too early. */
  const running = useRef<Promise<boolean> | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const stateRef = useRef<SaveState>("idle");

  const setSaveState = (next: SaveState) => {
    stateRef.current = next;
    setState(next);
  };

  const saved = useMemo(
    () => ({
      price: new Map(quotation.lines.map((line) => [line.sku, line.new_price])),
      quantity: new Map(quotation.lines.map((line) => [line.sku, line.quantity])),
    }),
    [quotation.lines]
  );

  const version = () => client.getQueryData<Quotation>(quotationKeys.detail(quotation.id))?.version ?? quotation.version;

  const queue = (sku: string, field: LineField, value: string | null) => {
    pending.current.set(sku, { ...pending.current.get(sku), [FIELD[field].key]: value });
  };
  const unqueue = (sku: string, field: LineField) => {
    const change = pending.current.get(sku);
    if (!change) return;
    const rest = { ...change };
    delete rest[FIELD[field].key];
    if (Object.keys(rest).length === 0) pending.current.delete(sku);
    else pending.current.set(sku, rest);
  };

  /** Sends the queue. True when everything typed is saved (or nothing was pending), false when the API refused it. */
  const flush = (): Promise<boolean> => {
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
    }
    if (inflight.current) return running.current ?? Promise.resolve(false);
    if (pending.current.size === 0) return Promise.resolve(true);
    running.current = send().finally(() => {
      running.current = null;
    });
    return running.current;
  };

  const send = async (): Promise<boolean> => {
    const batch = new Map(pending.current);
    pending.current.clear();
    inflight.current = true;
    setSaveState("saving");
    try {
      await update.mutateAsync({ version: version(), lines: [...batch].map(([sku, change]) => ({ sku, ...change })) });
      inflight.current = false;
      setFailure(null);
      // A cell that still says what was sent now shows the API's value; one
      // typed over meanwhile keeps its draft and is already queued again.
      setDrafts((current) => {
        const next = { ...current };
        for (const [sku, change] of batch) {
          for (const field of ["price", "quantity"] as const) {
            const key = FIELD[field].key;
            const draft = next[draftKey(field, sku)];
            if (!(key in change) || draft === undefined || pending.current.get(sku)?.[key] !== undefined) continue;
            const typed = FIELD[field].parse(draft);
            if ("value" in typed && samePrice(typed.value, change[key])) delete next[draftKey(field, sku)];
          }
        }
        return next;
      });
      // Typed while this batch was out: it goes now, and the caller waits for it too.
      if (pending.current.size > 0) return await send();
      setSaveState("idle");
      return true;
    } catch (error) {
      inflight.current = false;
      for (const [sku, change] of batch) pending.current.set(sku, { ...change, ...pending.current.get(sku) });
      setFailure(errorMessage(error));
      if (error instanceof ApiError && error.status === 409) {
        setSaveState("conflict");
        void client.invalidateQueries({ queryKey: quotationKeys.detail(quotation.id) });
      } else {
        setSaveState("error");
      }
      return false;
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

  const edit = (sku: string, text: string, field: LineField = "price") => {
    const key = draftKey(field, sku);
    setDrafts((current) => ({ ...current, [key]: text }));
    const parsed = FIELD[field].parse(text);
    if ("error" in parsed) {
      setErrors((current) => ({ ...current, [key]: parsed.error }));
      unqueue(sku, field);
      schedule();
      return;
    }
    setErrors((current) => {
      if (!(key in current)) return current;
      const next = { ...current };
      delete next[key];
      return next;
    });
    if (samePrice(parsed.value, saved[field].get(sku)) && !inflight.current) unqueue(sku, field);
    else queue(sku, field, parsed.value);
    schedule();
  };

  /**
   * After a 409: read the current version straight from the API, so the save
   * never depends on whether a background refetch has landed in the cache,
   * then send the queued values over it.
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

  /** Drops every unsaved value and shows what the API has. */
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

  // Leaving with values that never reached the API loses them silently otherwise.
  useEffect(() => {
    if (!unsaved) return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [unsaved]);

  /*
   * Protection for what is still queued: hiding the tab (opening the offer's
   * preview, switching apps) sends it at once instead of waiting for the
   * pause, and so does leaving the editor through an in-app link, which
   * `beforeunload` never sees. The mutation outlives the unmount and writes
   * the answer into the shared cache.
   */
  const flushRef = useRef(flush);
  useEffect(() => {
    flushRef.current = flush;
  });
  useEffect(() => {
    // The same Map for the editor's whole life (it is cleared, never replaced).
    const queue = pending.current;
    const onHide = () => {
      if (document.visibilityState === "hidden" && stateRef.current !== "conflict") void flushRef.current();
    };
    document.addEventListener("visibilitychange", onHide);
    return () => {
      document.removeEventListener("visibilitychange", onHide);
      if (timer.current) clearTimeout(timer.current);
      if (queue.size > 0 && stateRef.current !== "conflict") void flushRef.current();
    };
  }, []);

  return {
    /** What the cell shows: the typed text, or the saved value. */
    textFor: (sku: string, field: LineField = "price") => drafts[draftKey(field, sku)] ?? FIELD[field].show(saved[field].get(sku)),
    errorFor: (sku: string, field: LineField = "price"): string | undefined => errors[draftKey(field, sku)],
    isDirty: (sku: string, field: LineField = "price") => drafts[draftKey(field, sku)] !== undefined,
    edit,
    /** Saves now instead of waiting for the pause (Enter, "Guardar borrador"); resolves true when all is saved. */
    saveNow: flush,
    /** Whether something typed has not reached the API yet. */
    hasPending: () => pending.current.size > 0 || inflight.current,
    retry,
    discard,
    state,
    failure,
    unsaved,
    /** Cells whose text cannot be read, with why: the cell itself only turns red. */
    invalid: Object.entries(errors).map(([key, message]) => {
      const [field, sku] = key.split("|") as [LineField, string];
      return { sku, field, word: FIELD[field].word, message };
    }),
  };
}

export type LineEditor = ReturnType<typeof useLineEditor>;
