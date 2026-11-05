"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { ApiError } from "@/shared/lib/api-client";

import {
  createLink,
  deleteLink,
  getMySalesScope,
  getUserLinks,
  listRoster,
  syncLinksByEmail,
} from "../services/salespeople.service";
import type { RosterFilters } from "../types/salespeople.types";

export const salespeopleKeys = {
  all: ["salespeople"] as const,
  me: () => [...salespeopleKeys.all, "me"] as const,
  roster: (filters: RosterFilters) => [...salespeopleKeys.all, "roster", filters] as const,
  links: (email: string) => [...salespeopleKeys.all, "links", email] as const,
};

const retryTransient = (count: number, error: Error) =>
  !(error instanceof ApiError && [401, 403, 404, 409, 422].includes(error.status)) && count < 1;

export function useMySalesScope() {
  return useQuery({ queryKey: salespeopleKeys.me(), queryFn: getMySalesScope, staleTime: 60_000, retry: retryTransient });
}

export function useRoster(filters: RosterFilters) {
  return useQuery({
    queryKey: salespeopleKeys.roster(filters),
    queryFn: () => listRoster(filters),
    placeholderData: keepPreviousData,
    staleTime: 30_000,
    retry: retryTransient,
  });
}

export function useUserLinks(email: string | null) {
  return useQuery({
    queryKey: salespeopleKeys.links(email ?? ""),
    queryFn: () => getUserLinks(email!),
    enabled: Boolean(email),
    retry: retryTransient,
  });
}

/*
 * A link changes the roster, the person's codes and, for whoever is linked,
 * the quoter's scope: every salespeople query is refreshed, and the quoter's
 * permissions too.
 */
function useInvalidateAll() {
  const client = useQueryClient();
  return () =>
    Promise.all([
      client.invalidateQueries({ queryKey: salespeopleKeys.all }),
      client.invalidateQueries({ queryKey: ["quotations"] }),
    ]);
}

export function useCreateLink() {
  const invalidate = useInvalidateAll();
  return useMutation({ mutationFn: createLink, onSuccess: invalidate });
}

export function useDeleteLink() {
  const invalidate = useInvalidateAll();
  return useMutation({ mutationFn: deleteLink, onSuccess: invalidate });
}

export function useSyncLinks() {
  const invalidate = useInvalidateAll();
  return useMutation({ mutationFn: syncLinksByEmail, onSuccess: invalidate });
}
