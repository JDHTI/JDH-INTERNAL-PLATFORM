import "server-only";

import { cache } from "react";
import { notFound, redirect } from "next/navigation";

import { backendFetch } from "@/intranet/lib/api/backend-fetch";
import { findModuleByPath } from "@/shared/config/areas.config";
import { ACCESS_DENIED_PARAM } from "@/shared/config/general.config";

import type { AreaDto } from "../types/area.types";

export interface AreaLookup {
  /** HTTP status of `GET /areas/{slug}`, or null when the API did not answer. */
  status: number | null;
  area: AreaDto | null;
}

/**
 * The area as the signed-in person sees it, asked once per request: the
 * `[area]` layout and the page under it share the answer.
 */
export const lookupArea = cache(async (slug: string): Promise<AreaLookup> => {
  const response = await backendFetch(`/areas/${encodeURIComponent(slug)}`).catch(() => null);
  if (!response) return { status: null, area: null };
  const area = response.ok ? ((await response.json().catch(() => null)) as AreaDto | null) : null;
  return { status: response.status, area };
});

/**
 * Guards a module page on the server. A route no module of the catalog
 * claims is a 404; a module the area has off, or the person's role does not
 * grant, goes back to the area overview with the notice. When the API did not
 * answer, the page renders and the client gate shows the error.
 */
export async function requireModule(areaSlug: string, segment: string): Promise<void> {
  const target = findModuleByPath(`/${areaSlug}/${segment}`);
  if (!target?.available) notFound();
  if (target.permission === undefined) return;

  const { area } = await lookupArea(areaSlug);
  if (area && !(target.permission in (area.my_modules ?? {}))) {
    redirect(`/${areaSlug}?${ACCESS_DENIED_PARAM}=modulo`);
  }
}
