"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { ApiError } from "@/shared/lib/api-client";

import {
  deleteBatch,
  getBatch,
  getValidatorCatalogs,
  getValidatorPermissions,
  listBatches,
  listOrders,
  revalidateBatch,
  uploadBatch,
} from "../services/order-validator.service";
import type { OrderParams } from "../types/order-validator.types";

export const validatorKeys = {
  all: ["order-validations"] as const,
  catalogs: () => [...validatorKeys.all, "catalogs"] as const,
  permissions: () => [...validatorKeys.all, "permissions"] as const,
  batches: (page: number, size: number) => [...validatorKeys.all, "batches", page, size] as const,
  batch: (id: string) => [...validatorKeys.all, "batch", id] as const,
  orders: (params: OrderParams) => [...validatorKeys.all, "orders", params] as const,
};

const retryTransient = (count: number, error: Error) =>
  !(error instanceof ApiError && [401, 403, 404, 422, 429].includes(error.status)) && count < 1;

/** Upload and revalidate controls show only when the API says the caller may manage. */
export function useCanManageValidations(): boolean {
  const permissions = useQuery({
    queryKey: validatorKeys.permissions(),
    queryFn: getValidatorPermissions,
    staleTime: 5 * 60_000,
    retry: retryTransient,
  });
  return permissions.data?.can_manage === true;
}

export function useValidatorCatalogs() {
  return useQuery({
    queryKey: validatorKeys.catalogs(),
    queryFn: getValidatorCatalogs,
    staleTime: 10 * 60_000,
    retry: retryTransient,
  });
}

export function useBatches(page: number, size: number) {
  return useQuery({
    queryKey: validatorKeys.batches(page, size),
    queryFn: () => listBatches(page, size),
    retry: retryTransient,
    placeholderData: keepPreviousData,
  });
}

export function useBatch(id: string) {
  return useQuery({
    queryKey: validatorKeys.batch(id),
    queryFn: () => getBatch(id),
    retry: retryTransient,
  });
}

export function useBatchOrders(params: OrderParams) {
  return useQuery({
    queryKey: validatorKeys.orders(params),
    queryFn: () => listOrders(params),
    retry: retryTransient,
    placeholderData: keepPreviousData,
  });
}

export function useUploadBatch() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (file: File) => uploadBatch(file),
    onSuccess: () => client.invalidateQueries({ queryKey: [...validatorKeys.all, "batches"] }),
  });
}

export function useDeleteBatch() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteBatch(id),
    onSuccess: () => client.invalidateQueries({ queryKey: validatorKeys.all }),
  });
}

/** Every line is decided again, so the batch's counts and all its cached orders are stale. */
export function useRevalidateBatch() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => revalidateBatch(id),
    onSuccess: () => client.invalidateQueries({ queryKey: validatorKeys.all }),
  });
}
