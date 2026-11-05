import { apiFetch } from "@/shared/lib/api-client";

import {
  ROSTER_PAGE_SIZE,
  type MySalesScope,
  type RosterFilters,
  type RosterPage,
  type SalespersonKind,
  type SalespersonLink,
  type SyncResult,
  type UserLinks,
} from "../types/salespeople.types";

const BASE = "/salespeople";

export function getMySalesScope(): Promise<MySalesScope> {
  return apiFetch(`${BASE}/me`);
}

export function listRoster(filters: RosterFilters): Promise<RosterPage> {
  return apiFetch(`${BASE}/roster`, {
    query: {
      kind: filters.kind,
      q: filters.q || undefined,
      // `buildUrl` drops `false`, so the filter travels as text.
      linked: filters.linked === undefined ? undefined : String(filters.linked),
      page: filters.page,
      size: ROSTER_PAGE_SIZE,
    },
  });
}

/** 404 when nobody has that e-mail. */
export function getUserLinks(email: string): Promise<UserLinks> {
  return apiFetch(`${BASE}/links`, { query: { email } });
}

/** 404: the code is not in SIESA or the person does not exist. 409: someone else holds it by hand. */
export function createLink(body: { email: string; kind: SalespersonKind; code: string }): Promise<SalespersonLink> {
  return apiFetch(`${BASE}/links`, { method: "POST", body });
}

/** The code stays excluded: the e-mail sync never gives it back on its own. */
export function deleteLink(linkId: string): Promise<void> {
  return apiFetch(`${BASE}/links/${encodeURIComponent(linkId)}`, { method: "DELETE" });
}

export function syncLinksByEmail(): Promise<SyncResult> {
  return apiFetch(`${BASE}/sync`, { method: "POST" });
}
