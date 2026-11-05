"use client";

import Link from "next/link";
import { FileSliders, Plus, Upload } from "lucide-react";

import { useArea } from "@/features/areas/hooks/use-areas";
import { canUseModule } from "@/features/areas/types/area.types";
import { buttonVariants } from "@/shared/components/ui/button";
import { SUPPORTS_MANAGER_AREA_SLUG, SUPPORT_REQUESTS_SEGMENT } from "@/shared/config/areas.config";

import { useCanManage } from "../hooks/use-supports";

/**
 * The ways to write supports, only for managers in the supports' owner area:
 * the screens behind them only write. Elsewhere, the way to ask for one when
 * the area has requests on.
 */
export default function SupportsToolbar({ area }: { area: string }) {
  const canManage = useCanManage();
  const current = useArea(area).data;

  if (area !== SUPPORTS_MANAGER_AREA_SLUG) {
    if (!current || !canUseModule(current, "solicitudes-apoyos")) return null;
    return (
      <Link href={`/${area}/${SUPPORT_REQUESTS_SEGMENT}`} className={buttonVariants({ variant: "outline" })}>
        Mis solicitudes
      </Link>
    );
  }
  if (!canManage) return null;
  const base = `/${area}/apoyos`;
  return (
    <div className="flex flex-wrap gap-2 md:justify-end">
      <Link href={`/${area}/${SUPPORT_REQUESTS_SEGMENT}`} className={buttonVariants({ variant: "outline" })}>Solicitudes JDH</Link>
      <Link href={`${base}/perfiles`} className={buttonVariants({ variant: "outline", className: "max-sm:h-11" })}>
        <FileSliders aria-hidden="true" /> Perfiles de proveedor
      </Link>
      <Link href={`${base}/carga`} className={buttonVariants({ variant: "outline", className: "max-sm:h-11" })}>
        <Upload aria-hidden="true" /> Carga masiva
      </Link>
      <Link href={`${base}/nuevo`} className={buttonVariants({ variant: "primary", className: "max-sm:h-11" })}>
        <Plus aria-hidden="true" /> Nuevo apoyo
      </Link>
    </div>
  );
}
