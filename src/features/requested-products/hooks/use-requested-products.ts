"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { ApiError } from "@/shared/lib/api-client";

import { getRequestedProductPermissions, listRequestedProducts, updateRequestedProduct } from "../services/requested-products.service";
import type { RequestedProductChange, RequestedProductParams } from "../types/requested-products.types";

export const requestedProductKeys = {
  all: ["requested-products"] as const,
  permissions: () => [...requestedProductKeys.all, "permissions"] as const,
  list: (params: RequestedProductParams) => [...requestedProductKeys.all, "list", params] as const,
};

const retryTransient = (count: number, error: Error) =>
  !(error instanceof ApiError && [401, 403, 404, 422, 429, 503].includes(error.status)) && count < 1;

export function useRequestedProductPermissions() {
  return useQuery({
    queryKey: requestedProductKeys.permissions(),
    queryFn: getRequestedProductPermissions,
    staleTime: 5 * 60_000,
    retry: retryTransient,
  });
}

export function useRequestedProducts(params: RequestedProductParams, enabled = true) {
  return useQuery({
    queryKey: requestedProductKeys.list(params),
    queryFn: () => listRequestedProducts(params),
    retry: retryTransient,
    placeholderData: keepPreviousData,
    enabled,
  });
}

/**
 * A change of status touches the local lines of every quotation that quotes
 * it: the open quotations refetch, so their "Usar la referencia" appears.
 */
export function useUpdateRequestedProduct() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ id, change }: { id: string; change: RequestedProductChange }) => updateRequestedProduct(id, change),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: requestedProductKeys.all });
      void client.invalidateQueries({ queryKey: ["quotations", "detail"] });
    },
  });
}
