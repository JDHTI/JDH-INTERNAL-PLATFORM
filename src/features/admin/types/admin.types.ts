import type { AreaDto, ModuleAction, UserRef } from "@/features/areas/types/area.types";

export interface AreaRoleDto {
  id: string;
  name: string;
  created_at: string;
  updated_at: string;
}

export interface AreaMemberDto {
  id: string;
  user: UserRef;
  role: { id: string; name: string };
  created_at: string;
  updated_at: string;
}

export interface AdminUserDto {
  id: string;
  tenant_id: string;
  entra_object_id: string;
  name: string;
  email: string | null;
  job_title: string | null;
  role: string;
  area_id: string | null;
  area_name: string | null;
  photo_available: boolean;
  is_active?: boolean;
}

export interface UserPageDto {
  items: AdminUserDto[];
  total: number;
  offset: number;
  limit: number;
}

/** GET /permissions/catalog: what a role of each area can grant. */
export interface PermissionCatalogDto {
  actions: ModuleAction[];
  /** The whole area, "*". */
  wildcard: string;
  areas: {
    slug: string;
    name: string;
    modules: CatalogModuleDto[];
  }[];
}

export interface CatalogModuleDto {
  key: string;
  label: string;
}

/** One grant of a role: a module key, or the wildcard, and the action. */
export interface RoleGrantDto {
  module: string;
  action: ModuleAction;
}

export interface RolePermissionsDto {
  role: { id: string; name: string };
  grants: RoleGrantDto[];
}

/** What the area form edits. The slug is derived from the name, never typed. */
export interface AreaDraft {
  name: string;
  icon: string;
  sort_order: string;
  responsible_email: string;
}

export function areaToDraft(area?: AreaDto): AreaDraft {
  return {
    name: area?.name ?? "",
    icon: area?.icon ?? "",
    sort_order: String(area?.sort_order ?? 0),
    responsible_email: area?.responsible?.email ?? "",
  };
}
