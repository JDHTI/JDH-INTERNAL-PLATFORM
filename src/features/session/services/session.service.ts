import { apiFetch } from "@/shared/lib/api-client";

import { toSessionUser, type SessionUser, type SessionUserDto } from "../types/session.types";

export async function getCurrentUser(): Promise<SessionUser> {
  return toSessionUser(await apiFetch<SessionUserDto>("/users/me"));
}

export type { SessionUser };
