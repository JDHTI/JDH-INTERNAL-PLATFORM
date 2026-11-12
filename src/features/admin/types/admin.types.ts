import type { AreaDto, ModuleAction, RoleRefDto, UserRef } from "@/features/areas/types/area.types";

export interface AreaRoleDto {
  id: string;
  name: string;
  /**
   * The area's fixed leader role (Líder, Director): every permission of the
   * area, never deleted, its permissions never changed (409). It can be renamed.
   * The API lists it first.
   */
  is_leader: boolean;
  created_at: string;
  updated_at: string;
}

export interface AreaMemberDto {
  id: string;
  user: UserRef;
  role: RoleRefDto;
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
  role: RoleRefDto;
  grants: RoleGrantDto[];
}

/** A module of the API catalog, switchable per area. */
export interface PlatformModuleDto {
  key: string;
  label: string;
  description: string;
  /** Takes settings when switched on; only `maestros`, which picks the area's masters. */
  configurable: boolean;
  /** Only its default areas (`area_slugs`) may have it: it cannot be switched on anywhere else. */
  locked?: boolean;
  area_slugs?: string[];
}

/** `maestros`: the masters the area sees; absent or empty means every master. */
export interface AreaModuleConfig {
  masters?: string[];
}

export interface AreaModuleStateDto {
  enabled: boolean;
  config: AreaModuleConfig;
  /** No stored choice: the catalog default applies. */
  is_default: boolean;
}

/** GET /permissions/modules: every module and, per area, whether it is on. */
export interface ModuleMatrixDto {
  modules: PlatformModuleDto[];
  areas: {
    area_id: string;
    slug: string;
    name: string;
    modules: Record<string, AreaModuleStateDto>;
  }[];
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
