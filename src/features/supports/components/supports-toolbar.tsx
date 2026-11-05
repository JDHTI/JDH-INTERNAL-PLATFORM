"use client";

import Link from "next/link";
import { FileSliders, Plus, Upload } from "lucide-react";

import { useArea } from "@/features/areas/hooks/use-areas";
import { canUseModule } from "@/features/areas/types/area.types";
import { buttonVariants } from "@/shared/components/ui/button";
import { SUPPORT_REQUESTS_SEGMENT } from "@/shared/config/areas.config";

import { useSupportPermissions } from "../hooks/use-supports";

/**
 * The ways to write supports, for whoever manages them: the screens behind
 * them only write. Whoever does not, gets the way to their own requests. The
 * requests link shows only when the area has that module on.
 */
export default function SupportsToolbar({ area }: { area: string }) {
  const permissions = useSupportPermissions().data;
  const current = useArea(area).data;
  const requests = current && canUseModule(current, "solicitudes-apoyos") ? `/${area}/${SUPPORT_REQUESTS_SEGMENT}` : null;

  if (permissions?.can_manage !== true) {
    if (!requests || permissions?.can_request !== true) return null;
    return (
      <Link href={requests} className={buttonVariants({ variant: "outline" })}>
        Mis solicitudes
      </Link>
    );
  }
  const base = `/${area}/apoyos`;
  return (
    <div className="flex flex-wrap gap-2 md:justify-end">
      {requests && permissions.can_review && (
        <Link href={requests} className={buttonVariants({ variant: "outline" })}>Solicitudes JDH</Link>
      )}
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
