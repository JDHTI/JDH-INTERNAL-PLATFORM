import type { AreaDto, UserRef } from "@/features/areas/types/area.types";

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

export interface AreaDraft {
  slug: string;
  name: string;
  icon: string;
  sort_order: string;
  responsible_email: string;
}

export function areaToDraft(area?: AreaDto): AreaDraft {
  return {
    slug: area?.slug ?? "",
    name: area?.name ?? "",
    icon: area?.icon ?? "",
    sort_order: String(area?.sort_order ?? 0),
    responsible_email: area?.responsible?.email ?? "",
  };
}
