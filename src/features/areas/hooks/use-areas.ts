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

/** Areas the signed-in user may enter. The API does the filtering. */
export function useAreas() {
  return useQuery({
    queryKey: areaKeys.list(),
    queryFn: listAreas,
    staleTime: 5 * 60_000,
  });
}

export function useArea(slug: string) {
  return useQuery({
    queryKey: areaKeys.detail(slug),
    queryFn: () => getArea(slug),
    staleTime: 5 * 60_000,
    // 403 and 404 are answers, not transient failures.
    retry: (count, error) =>
      !(error instanceof ApiError && [401, 403, 404].includes(error.status)) &&
      count < 1,
  });
}

/**
 * Area in context for the shell: the one named by the URL's first segment,
 * or the user's first area on platform-wide pages like /configuracion.
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
  const area = areas.find((a) => a.slug === firstSegment) ?? areas[0];
  return { area, areas, isPending, isError };
}
