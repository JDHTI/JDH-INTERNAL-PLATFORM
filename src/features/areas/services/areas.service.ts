import { apiFetch } from "@/shared/lib/api-client";

import { resolveAreaIcon } from "../area-icons";
import type { Area, AreaDto } from "../types/area.types";

function toArea(dto: AreaDto): Area {
  return {
    id: dto.id,
    slug: dto.slug,
    name: dto.name,
    path: `/${dto.slug}`,
    icon: resolveAreaIcon(dto.icon),
    remit: dto.remit,
    responsible: dto.responsible,
  };
}

/** Already filtered by access and ordered by sort_order on the server. */
export async function listAreas(): Promise<Area[]> {
  const areas = await apiFetch<AreaDto[]>("/areas");
  return areas.map(toArea);
}

/** 403 when the user has no access, 404 when the slug does not exist. */
export async function getArea(slug: string): Promise<Area> {
  return toArea(await apiFetch<AreaDto>(`/areas/${encodeURIComponent(slug)}`));
}
