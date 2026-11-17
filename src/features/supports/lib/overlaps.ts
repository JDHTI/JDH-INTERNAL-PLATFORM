import { ApiError } from "@/shared/lib/api-client";

import type { SupportOverlap } from "../types/support.types";

/**
 * The live supports a write crosses, when the API refused it for that: a 409
 * that lists them in `overlaps`. A 409 without the list is a stale version.
 */
export function overlapsOf(error: unknown): SupportOverlap[] | null {
  if (!(error instanceof ApiError) || error.status !== 409) return null;
  const list = (error.body as { overlaps?: unknown } | null)?.overlaps;
  return Array.isArray(list) && list.length > 0 ? (list as SupportOverlap[]) : null;
}
