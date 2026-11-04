"use client";

import { useQuery } from "@tanstack/react-query";

import { ApiError } from "@/shared/lib/api-client";

import {
  listActiveUsers,
  listAdminAreas,
  listAreaMembers,
  listAreaRoles,
} from "../services/admin.service";

export const adminKeys = {
  all: ["admin"] as const,
  areas: () => [...adminKeys.all, "areas"] as const,
  roles: (slug: string) => [...adminKeys.all, "roles", slug] as const,
  members: (slug: string) => [...adminKeys.all, "members", slug] as const,
  users: () => [...adminKeys.all, "users"] as const,
};

const retryTransient = (count: number, error: Error) =>
  !(error instanceof ApiError && [401, 403, 404, 409, 422].includes(error.status)) &&
  count < 1;

export function useAdminAreas(enabled = true) {
  return useQuery({
    queryKey: adminKeys.areas(),
    queryFn: listAdminAreas,
    enabled,
    retry: retryTransient,
  });
}

export function useAreaRoles(slug: string | undefined) {
  return useQuery({
    queryKey: adminKeys.roles(slug ?? ""),
    queryFn: () => listAreaRoles(slug!),
    enabled: Boolean(slug),
    retry: retryTransient,
  });
}

export function useAreaMembers(slug: string | undefined) {
  return useQuery({
    queryKey: adminKeys.members(slug ?? ""),
    queryFn: () => listAreaMembers(slug!),
    enabled: Boolean(slug),
    retry: retryTransient,
  });
}

export function useActiveUsers(offset = 0, enabled = true) {
  return useQuery({
    queryKey: [...adminKeys.users(), offset],
    queryFn: () => listActiveUsers(offset),
    enabled,
    retry: retryTransient,
  });
}
