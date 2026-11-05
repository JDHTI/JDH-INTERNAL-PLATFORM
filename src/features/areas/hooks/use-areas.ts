"use client";

import { usePathname } from "next/navigation";
import { useQuery } from "@tanstack/react-query";

import { ApiError } from "@/shared/lib/api-client";

import { getArea, listAreas } from "../services/areas.service";
import type { Area } from "../types/area.types";

export const areaKeys = {
  all: ["areas"] as const,
  list: () => [...areaKeys.all, "list"] as const,
  detail: (slug: string) => [...areaKeys.all, "detail", slug] as const,
};

// No session, no access and no such area are answers, not transient failures.
const retryTransient = (count: number, error: Error) =>
  !(error instanceof ApiError && [401, 403, 404].includes(error.status)) &&
  count < 1;

/** Areas the signed-in user may enter. The API does the filtering. */
export function useAreas() {
  return useQuery({
    queryKey: areaKeys.list(),
    queryFn: listAreas,
    staleTime: 5 * 60_000,
    retry: retryTransient,
  });
}

export function useArea(slug: string) {
  return useQuery({
    queryKey: areaKeys.detail(slug),
    queryFn: () => getArea(slug),
    staleTime: 5 * 60_000,
    retry: retryTransient,
  });
}

/**
 * Area in context for the shell: the one named by the URL's first segment.
 * On the hub (/workspace) there is none, and the shell says so instead of
 * picking one on the person's behalf.
 */
export function useActiveArea(): {
  area: Area | undefined;
  areas: Area[];
  isPending: boolean;
  isError: boolean;
} {
  const pathname = usePathname();
  const { data: areas = [], isPending, isError } = useAreas();
  const [, firstSegment] = pathname.split("/");
  const area = areas.find((a) => a.slug === firstSegment);
  return { area, areas, isPending, isError };
}
