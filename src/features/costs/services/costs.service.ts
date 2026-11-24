import { apiBlob, apiFetch } from "@/shared/lib/api-client";

import type {
  CostPermissions,
  CostReason,
  CreditNoteInput,
  EntryOptions,
  EntryPage,
  EntryParams,
  NoveltyDetail,
  NoveltyPage,
  NoveltyParams,
} from "../types/costs.types";

const COSTS = "/costs";

/** What the person may do in each Costos view. Open: no access answers false, not 403. */
export function getCostPermissions(): Promise<CostPermissions> {
  return apiFetch<CostPermissions>(`${COSTS}/permissions`);
}

/** The reasons a line can take, in their order; only the active ones can be given. */
export function listCostReasons(): Promise<CostReason[]> {
  return apiFetch<CostReason[]>(`${COSTS}/reasons`);
}

/** The purchase entries of a period against the quotation in force on each day. */
export function listEntries(params: EntryParams): Promise<EntryPage> {
  return apiFetch<EntryPage>(`${COSTS}/entries`, {
    query: {
      since: params.since,
      until: params.until,
      q: params.q || undefined,
      status: params.status || undefined,
      // `novelty` and `status` exclude each other: a status chip is the narrower one.
      novelty: params.novelty && !params.status ? "true" : undefined,
      supplier: params.supplier || undefined,
      co: params.co || undefined,
      warehouse: params.warehouse || undefined,
      reason_id: params.reasonId || undefined,
      sort: params.sort,
      order: params.order,
      page: params.page,
      size: params.size,
    },
  });
}

/** The C.O. and warehouses that have entries in the period, for the filter dropdowns. */
export function getEntryOptions(since: string, until: string): Promise<EntryOptions> {
  // Without dates the API reads its default period, the last 30 days.
  return apiFetch<EntryOptions>(`${COSTS}/entries/options`, { query: { since: since || undefined, until: until || undefined } });
}

/** The one reason of a line, or none; the line becomes a novelty if it was not one. */
export function setEntryReason(lineKey: string, reasonId: string | null): Promise<NoveltyDetail> {
  return apiFetch<NoveltyDetail>(`${COSTS}/entries/${encodeURIComponent(lineKey)}/reason`, {
    method: "PUT",
    body: { reason_id: reasonId },
  });
}

export function listNovelties(params: NoveltyParams): Promise<NoveltyPage> {
  return apiFetch<NoveltyPage>(`${COSTS}/novelties`, {
    query: {
      status: params.status || undefined,
      since: params.since || undefined,
      until: params.until || undefined,
      supplier: params.supplier || undefined,
      co: params.co || undefined,
      reason_id: params.reasonId || undefined,
      kind: params.kind || undefined,
      q: params.q || undefined,
      sort: params.sort,
      order: params.order,
      page: params.page,
      size: params.size,
    },
  });
}

const noveltyPath = (id: string) => `${COSTS}/novelties/${encodeURIComponent(id)}`;

export function getNovelty(id: string): Promise<NoveltyDetail> {
  return apiFetch<NoveltyDetail>(noveltyPath(id));
}

export function setNoveltyReason(id: string, reasonId: string | null): Promise<NoveltyDetail> {
  return apiFetch<NoveltyDetail>(`${noveltyPath(id)}/reason`, { method: "PUT", body: { reason_id: reasonId } });
}

/**
 * The supplier's credit note. A number the supplier already has reuses its
 * file, so the file is optional then; 409 when the novelty already has one
 * or its entry was voided.
 */
export function attachCreditNote(id: string, { number, amount, file }: CreditNoteInput): Promise<NoveltyDetail> {
  const body = new FormData();
  body.append("number", number);
  body.append("amount", amount);
  if (file) body.append("file", file);
  return apiFetch<NoveltyDetail>(`${noveltyPath(id)}/credit-note`, { method: "POST", body });
}

export function detachCreditNote(id: string): Promise<NoveltyDetail> {
  return apiFetch<NoveltyDetail>(`${noveltyPath(id)}/credit-note`, { method: "DELETE" });
}

/** The credit note's PDF or picture, for the in-app preview; the caller owns the object URL. */
export async function getCreditNoteBlob(id: string): Promise<Blob> {
  const { blob } = await apiBlob(`${noveltyPath(id)}/credit-note/file`, { inline: true });
  return blob;
}
