import { apiFetch } from "@/shared/lib/api-client";

import type {
  AdminUserDto,
  AreaMemberDto,
  AreaRoleDto,
  UserPageDto,
} from "../types/admin.types";
import type { AreaDto } from "@/features/areas/types/area.types";

export interface AreaCreatePayload {
  slug: string;
  name: string;
  icon?: string | null;
  sort_order?: number;
  responsible_email?: string | null;
}

export interface AreaUpdatePayload {
  name?: string;
  icon?: string | null;
  sort_order?: number;
  responsible_email?: string | null;
}

export async function listAdminAreas(): Promise<AreaDto[]> {
  return apiFetch<AreaDto[]>("/areas");
}

export async function createAdminArea(payload: AreaCreatePayload): Promise<AreaDto> {
  return apiFetch<AreaDto>("/areas", { method: "POST", body: payload });
}

export async function updateAdminArea(
  slug: string,
  payload: AreaUpdatePayload
): Promise<AreaDto> {
  return apiFetch<AreaDto>(`/areas/${encodeURIComponent(slug)}`, {
    method: "PATCH",
    body: payload,
  });
}

export async function deleteAdminArea(slug: string): Promise<boolean> {
  await apiFetch<void>(`/areas/${encodeURIComponent(slug)}`, { method: "DELETE" });
  return true;
}

export async function listAreaRoles(slug: string): Promise<AreaRoleDto[]> {
  return apiFetch<AreaRoleDto[]>(`/areas/${encodeURIComponent(slug)}/roles`);
}

export async function createAreaRole(slug: string, name: string): Promise<AreaRoleDto> {
  return apiFetch<AreaRoleDto>(`/areas/${encodeURIComponent(slug)}/roles`, {
    method: "POST",
    body: { name },
  });
}

export async function updateAreaRole(
  slug: string,
  roleId: string,
  name: string
): Promise<AreaRoleDto> {
  return apiFetch<AreaRoleDto>(
    `/areas/${encodeURIComponent(slug)}/roles/${encodeURIComponent(roleId)}`,
    { method: "PATCH", body: { name } }
  );
}

export async function deleteAreaRole(slug: string, roleId: string): Promise<void> {
  return apiFetch<void>(
    `/areas/${encodeURIComponent(slug)}/roles/${encodeURIComponent(roleId)}`,
    { method: "DELETE" }
  );
}

export async function listAreaMembers(slug: string): Promise<AreaMemberDto[]> {
  return apiFetch<AreaMemberDto[]>(`/areas/${encodeURIComponent(slug)}/members`);
}

export async function addAreaMember(
  slug: string,
  email: string,
  roleId: string
): Promise<AreaMemberDto> {
  return apiFetch<AreaMemberDto>(`/areas/${encodeURIComponent(slug)}/members`, {
    method: "POST",
    body: { email, role_id: roleId },
  });
}

export async function updateAreaMember(
  slug: string,
  memberId: string,
  roleId: string
): Promise<AreaMemberDto> {
  return apiFetch<AreaMemberDto>(
    `/areas/${encodeURIComponent(slug)}/members/${encodeURIComponent(memberId)}`,
    { method: "PATCH", body: { role_id: roleId } }
  );
}

export async function deleteAreaMember(slug: string, memberId: string): Promise<void> {
  return apiFetch<void>(
    `/areas/${encodeURIComponent(slug)}/members/${encodeURIComponent(memberId)}`,
    { method: "DELETE" }
  );
}

export async function listActiveUsers(
  offset = 0,
  limit = 100
): Promise<UserPageDto> {
  return apiFetch<UserPageDto>("/users", {
    query: { offset, limit, is_active: "true" },
  });
}

export type { AdminUserDto };
