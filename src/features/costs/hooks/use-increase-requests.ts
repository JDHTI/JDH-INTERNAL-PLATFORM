"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { commercialMasterKeys } from "@/features/commercial-masters/hooks/use-commercial-masters";
import { ApiError } from "@/shared/lib/api-client";

import {
  approveIncreaseRequest,
  createIncreaseRequest,
  downloadRequestFile,
  downloadTemplate,
  getIncreaseRequest,
  listIncreaseRequests,
  listSupplierItems,
  rejectIncreaseRequest,
  updateRequestLine,
  uploadIncreaseWorkbook,
} from "../services/increase-requests.service";
import type { LineInput, LinePatch, RequestStatus } from "../types/increase-requests.types";
import { costKeys } from "./use-costs";

export const requestKeys = {
  all: [...costKeys.all, "increase-requests"] as const,
  list: (params: object) => [...requestKeys.all, "list", params] as const,
  detail: (id: string) => [...requestKeys.all, "detail", id] as const,
  items: (supplier: string, q: string) => [...requestKeys.all, "items", supplier, q] as const,
};

const retryTransient = (count: number, error: Error) =>
  !(error instanceof ApiError && [401, 403, 404, 409, 422, 429].includes(error.status)) && count < 1;

export function useIncreaseRequests(params: { status: RequestStatus | ""; supplier: string; page: number; size: number }) {
  return useQuery({
    queryKey: requestKeys.list(params),
    queryFn: () => listIncreaseRequests(params),
    retry: retryTransient,
    placeholderData: keepPreviousData,
  });
}

export function useIncreaseRequest(id: string) {
  return useQuery({ queryKey: requestKeys.detail(id), queryFn: () => getIncreaseRequest(id), retry: retryTransient });
}

export function useSupplierItems(supplier: string | null, q: string) {
  return useQuery({
    queryKey: requestKeys.items(supplier ?? "", q),
    queryFn: () => listSupplierItems(supplier!, q),
    enabled: supplier !== null,
    retry: retryTransient,
    staleTime: 5 * 60_000,
    placeholderData: keepPreviousData,
  });
}

export function useDownloadTemplate() {
  return useMutation({ mutationFn: (supplierCode: string) => downloadTemplate(supplierCode) });
}

export function useDownloadRequestFile() {
  return useMutation({ mutationFn: ({ id, name }: { id: string; name: string }) => downloadRequestFile(id, name) });
}

/** Simulating writes nothing; applying adds a request to the tray. */
export function useUploadIncreaseWorkbook() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ supplier, file, note, apply }: { supplier: string; file: File; note: string; apply: boolean }) =>
      uploadIncreaseWorkbook(supplier, file, note, apply),
    onSuccess: (report) => {
      if (report.applied) return client.invalidateQueries({ queryKey: requestKeys.all });
    },
  });
}

export function useCreateIncreaseRequest() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ supplier, note, lines }: { supplier: string; note: string; lines: LineInput[] }) =>
      createIncreaseRequest(supplier, note, lines),
    onSuccess: () => client.invalidateQueries({ queryKey: requestKeys.all }),
  });
}

/** Line edits and decisions answer the whole request; it goes straight into the cache. */
function useRequestMutation<T>(mutationFn: (input: T) => ReturnType<typeof getIncreaseRequest>, touchesLedger = false) {
  const client = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: (request) => {
      client.setQueryData(requestKeys.detail(request.id), request);
      return Promise.all([
        client.invalidateQueries({ queryKey: [...requestKeys.all, "list"] }),
        touchesLedger ? client.invalidateQueries({ queryKey: commercialMasterKeys.all }) : undefined,
      ]);
    },
  });
}

export function useUpdateRequestLine() {
  return useRequestMutation(({ id, lineId, patch }: { id: string; lineId: string; patch: LinePatch }) =>
    updateRequestLine(id, lineId, patch)
  );
}

/** Approving writes the accepted lines into the increase ledger. */
export function useApproveIncreaseRequest() {
  return useRequestMutation(({ id, note }: { id: string; note: string }) => approveIncreaseRequest(id, note), true);
}

export function useRejectIncreaseRequest() {
  return useRequestMutation(({ id, note }: { id: string; note: string }) => rejectIncreaseRequest(id, note));
}
