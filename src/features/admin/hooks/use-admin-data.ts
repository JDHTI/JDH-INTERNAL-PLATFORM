"use client";

import { useQueries, useQuery } from "@tanstack/react-query";

import { ApiError } from "@/shared/lib/api-client";

import {
  getModuleMatrix,
  getPermissionCatalog,
  getRolePermissions,
  listActiveUsers,
  listAdminAreas,
  listAreaMembers,
  listAreaRoles,
} from "../services/admin.service";
import type { RoleGrantDto } from "../types/admin.types";

export const adminKeys = {
  all: ["admin"] as const,
  areas: () => [...adminKeys.all, "areas"] as const,
  roles: (slug: string) => [...adminKeys.all, "roles", slug] as const,
  permissions: (slug: string, roleId: string) =>
    [...adminKeys.all, "permissions", slug, roleId] as const,
  members: (slug: string) => [...adminKeys.all, "members", slug] as const,
  users: () => [...adminKeys.all, "users"] as const,
  catalog: () => [...adminKeys.all, "catalog"] as const,
  modules: () => [...adminKeys.all, "modules"] as const,
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

/** The grants of every role of the area, by role id; a role still loading is absent. */
export function useRolePermissions(
  slug: string | undefined,
  roleIds: string[]
): Record<string, RoleGrantDto[]> {
  return useQueries({
    queries: roleIds.map((roleId) => ({
      queryKey: adminKeys.permissions(slug ?? "", roleId),
      queryFn: () => getRolePermissions(slug!, roleId),
      enabled: Boolean(slug),
      retry: retryTransient,
    })),
    combine: (results) =>
      Object.fromEntries(
        results.flatMap((result, index) =>
          result.data ? [[roleIds[index]!, result.data.grants]] : []
        )
      ),
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

/** Every module and whether each area has it on. */
export function useModuleMatrix(enabled = true) {
  return useQuery({
    queryKey: adminKeys.modules(),
    queryFn: getModuleMatrix,
    enabled,
    retry: retryTransient,
  });
}

/** The modules each area can grant: the ones switched on there. A toggle invalidates it. */
export function usePermissionCatalog(enabled = true) {
  return useQuery({
    queryKey: adminKeys.catalog(),
    queryFn: getPermissionCatalog,
    enabled,
    staleTime: 5 * 60_000,
    retry: retryTransient,
  });
}
