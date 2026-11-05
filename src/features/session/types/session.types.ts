import { PROFILE_PHOTO_URL } from "@/shared/lib/api-client";

export interface SessionUserDto {
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

export interface SessionUser {
  id: string;
  displayName: string;
  email: string;
  jobTitle: string | null;
  photoUrl: string | null;
  role: string;
  isActive: boolean;
}

/** Global roles from the API: the owner and admins administer the platform; moderators only read. */
export const PLATFORM_ADMIN_ROLES: readonly string[] = ["owner", "admin"];

export function isPlatformAdmin(role: string | null | undefined): boolean {
  return role != null && PLATFORM_ADMIN_ROLES.includes(role);
}

const ROLE_LABELS: Record<string, string> = {
  owner: "Propietario",
  admin: "Administrador",
  moderator: "Moderador",
  user: "Usuario",
};

export function roleLabel(role: string | null | undefined): string {
  return (role && ROLE_LABELS[role]) || "Usuario";
}

export function toSessionUser(dto: SessionUserDto): SessionUser {
  return {
    id: dto.id,
    displayName: dto.name,
    email: dto.email ?? "Sin correo registrado",
    jobTitle: dto.job_title,
    photoUrl: dto.photo_available ? PROFILE_PHOTO_URL : null,
    role: dto.role,
    isActive: dto.is_active ?? true,
  };
}

export function getInitials(displayName: string): string {
  const words = displayName.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "?";
  const first = words[0]!.charAt(0);
  const last = words.length > 1 ? words[words.length - 1]!.charAt(0) : "";
  return (first + last).toUpperCase();
}
