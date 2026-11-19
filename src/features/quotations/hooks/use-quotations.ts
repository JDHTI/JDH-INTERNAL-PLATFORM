"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { ApiError } from "@/shared/lib/api-client";

import { useQuotationKind } from "../lib/kind";

import {
  addLines,
  addLocalLine,
  compareCostCenters,
  confirmQuotation,
  createListUpdate,
  createGroupQuotation,
  createQuotation,
  createTemporaryQuotation,
  deleteQuotation,
  getQuotation,
  getQuotationPermissions,
  getQuotationManual,
  getQuotationRules,
  listBillingCenters,
  listQuotations,
  markUploaded,
  refreshQuotation,
  removeLine,
  returnQuotation,
  updateCostCenters,
  updateLines,
  updateOffer,
  validateQuotation,
} from "../services/quotations.service";
import type {
  ConfirmOptions,
  LineChange,
  LineImport,
  LocalLineInput,
  OfferSettings,
  Quotation,
  QuotationKind,
  QuotationListParams,
  TemporaryQuotationInput,
  ValidateOptions,
  WindowMonths,
} from "../types/quotations.types";

export const quotationKeys = {
  all: ["quotations"] as const,
  permissions: (kind: QuotationKind = "cotizacion") => [...quotationKeys.all, "permissions", kind] as const,
  rules: () => [...quotationKeys.all, "rules"] as const,
  lists: () => [...quotationKeys.all, "list"] as const,
  list: (params: QuotationListParams) => [...quotationKeys.lists(), params] as const,
  detail: (id: string) => [...quotationKeys.all, "detail", id] as const,
};

const retryTransient = (count: number, error: Error) =>
  !(error instanceof ApiError && [401, 403, 404, 409, 422, 429, 503].includes(error.status)) && count < 1;

/** The permissions of the module the page is in (quoter or list updates), or of `kind` when given. */
export function useQuotationPermissions(kind?: QuotationKind) {
  const pageKind = useQuotationKind();
  const which = kind ?? pageKind;
  return useQuery({
    queryKey: quotationKeys.permissions(which),
    queryFn: () => getQuotationPermissions(which),
    staleTime: 5 * 60_000,
    retry: retryTransient,
  });
}

/** Starts a list update from a customer's list or a list chosen by code or name, in the page's module. */
export function useCreateListUpdate() {
  const store = useStoreQuotation();
  const kind = useQuotationKind();
  return useMutation({
    mutationFn: (input: { customer_nit: string } | { price_list_id: string }) =>
      createListUpdate({ ...input, kind: kind === "principal" ? "principal" : "lista" }),
    onSuccess: store,
  });
}

export function useQuotationRules(enabled = true) {
  return useQuery({
    queryKey: quotationKeys.rules(),
    queryFn: getQuotationRules,
    enabled,
    staleTime: 10 * 60_000,
    retry: retryTransient,
  });
}

/** The operating manual: what Comercial reads instead of the rules. */
export function useQuotationManual(enabled = true) {
  return useQuery({
    queryKey: [...quotationKeys.all, "manual"] as const,
    queryFn: getQuotationManual,
    enabled,
    staleTime: 60 * 60_000,
    retry: retryTransient,
  });
}

/**
 * Whether the person reads the calculation rules (BI) or the manual
 * (Comercial). An API older than the split says nothing: the rules, as before.
 */
export function useSeesQuotationRules(): boolean | undefined {
  const permissions = useQuotationPermissions();
  if (permissions.isPending) return undefined;
  return permissions.data?.can_see_rules !== false;
}

export function useQuotations(params: QuotationListParams) {
  return useQuery({
    queryKey: quotationKeys.list(params),
    queryFn: () => listQuotations(params),
    retry: retryTransient,
    placeholderData: keepPreviousData,
  });
}

export function useQuotation(id: string) {
  return useQuery({
    queryKey: quotationKeys.detail(id),
    queryFn: () => getQuotation(id),
    retry: retryTransient,
  });
}

/**
 * Every write answers with the whole quotation, so the detail cache takes it
 * as is and only the lists (counts, status, updated_at) are refetched.
 */
function useStoreQuotation() {
  const client = useQueryClient();
  return (quotation: Quotation) => {
    client.setQueryData(quotationKeys.detail(quotation.id), quotation);
    void client.invalidateQueries({ queryKey: quotationKeys.lists() });
  };
}

/** An existing customer (from SIESA) or a temporary one registered on the quotation. */
export function useCreateQuotation() {
  const store = useStoreQuotation();
  return useMutation({
    mutationFn: (
      input:
        | { kind: "existing"; customerNit: string; windowMonths: WindowMonths; empty: boolean }
        | { kind: "group"; businessGroup: string; windowMonths: WindowMonths; empty: boolean }
        | ({ kind: "temporary" } & TemporaryQuotationInput)
    ) =>
      input.kind === "existing"
        ? createQuotation(input.customerNit, input.windowMonths, input.empty)
        : input.kind === "group"
          ? createGroupQuotation(input.businessGroup, input.windowMonths, input.empty)
          : createTemporaryQuotation({ temporary_customer: input.temporary_customer, billing_center_code: input.billing_center_code }),
    onSuccess: store,
  });
}

export function useBillingCenters() {
  return useQuery({
    queryKey: [...quotationKeys.all, "billing-centers"] as const,
    queryFn: listBillingCenters,
    staleTime: 30 * 60_000,
    retry: retryTransient,
  });
}

/**
 * Which of the ticked centers costs the most for this quotation's references,
 * while two or more are ticked. Keyed by the version: a priced line changes it.
 */
export function useCostCentersComparison(id: string, version: number, codes: string[]) {
  const sorted = [...codes].sort();
  return useQuery({
    queryKey: [...quotationKeys.all, "compare-centers", id, version, sorted.join(",")] as const,
    queryFn: () => compareCostCenters(id, sorted),
    enabled: sorted.length > 1,
    staleTime: 5 * 60_000,
    retry: false,
  });
}

export function useUpdateCostCenters(id: string) {
  const store = useStoreQuotation();
  return useMutation({
    mutationFn: ({ version, codes }: { version: number; codes: string[] }) => updateCostCenters(id, version, codes),
    onSuccess: store,
  });
}

export function useMarkUploaded(id: string) {
  const store = useStoreQuotation();
  return useMutation({
    mutationFn: (version: number) => markUploaded(id, version),
    onSuccess: store,
  });
}

export function useUpdateOffer(id: string) {
  const store = useStoreQuotation();
  return useMutation({
    mutationFn: ({ version, settings }: { version: number; settings: OfferSettings }) => updateOffer(id, version, settings),
    onSuccess: store,
  });
}

export function useUpdateLines(id: string) {
  const store = useStoreQuotation();
  return useMutation({
    mutationFn: ({ version, lines }: { version: number; lines: LineChange[] }) => updateLines(id, version, lines),
    onSuccess: store,
  });
}

export function useAddLines(id: string) {
  const store = useStoreQuotation();
  return useMutation({
    // The answer is the whole quotation: it goes to the cache as is, with no GET after it.
    mutationFn: ({ version, ...input }: { version: number } & LineImport) => addLines(id, version, input),
    onSuccess: store,
  });
}

export function useAddLocalLine(id: string) {
  const store = useStoreQuotation();
  return useMutation({
    mutationFn: ({ version, input }: { version: number; input: LocalLineInput }) => addLocalLine(id, version, input),
    onSuccess: store,
  });
}

export function useRemoveLine(id: string) {
  const store = useStoreQuotation();
  return useMutation({
    mutationFn: ({ version, sku }: { version: number; sku: string }) => removeLine(id, sku, version),
    onSuccess: store,
  });
}

export function useRefreshQuotation(id: string) {
  const store = useStoreQuotation();
  return useMutation({
    mutationFn: (version: number) => refreshQuotation(id, version),
    onSuccess: store,
  });
}

export function useConfirmQuotation(id: string) {
  const store = useStoreQuotation();
  return useMutation({
    mutationFn: ({ version, options }: { version: number; options: ConfirmOptions }) => confirmQuotation(id, version, options),
    onSuccess: store,
  });
}

export function useReturnQuotation(id: string) {
  const store = useStoreQuotation();
  return useMutation({
    mutationFn: ({ version, note }: { version: number; note: string }) => returnQuotation(id, version, note),
    onSuccess: store,
  });
}

export function useValidateQuotation(id: string) {
  const store = useStoreQuotation();
  return useMutation({
    mutationFn: ({ version, options }: { version: number; options: ValidateOptions }) => validateQuotation(id, version, options),
    onSuccess: store,
  });
}

/**
 * Only the lists are refreshed: refetching the deleted quotation would answer
 * 404 and swap its page for an error while the caller is leaving it.
 */
export function useDeleteQuotation() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteQuotation(id),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: quotationKeys.lists() });
    },
  });
}
