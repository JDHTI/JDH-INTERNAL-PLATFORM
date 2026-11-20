"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Plus, Upload } from "lucide-react";

import { useArea } from "@/features/areas/hooks/use-areas";
import { canUseModule } from "@/features/areas/types/area.types";
import { Button, buttonVariants } from "@/shared/components/ui/button";
import { SUPPORT_REQUESTS_SEGMENT } from "@/shared/config/areas.config";

import { useSupportPermissions } from "../hooks/use-supports";
import SupportCreateDialog from "./support-create-form";

/**
 * The ways to write supports, for whoever manages them: the screens behind
 * them only write. Whoever does not, gets the way to their own requests. The
 * requests link shows only when the area has that module on. A new support is
 * created in a modal over the master; `?nuevo=1` (the old /apoyos/nuevo) opens it.
 */
export default function SupportsToolbar({ area, openNew = false }: { area: string; openNew?: boolean }) {
  const permissions = useSupportPermissions().data;
  const current = useArea(area).data;
  const router = useRouter();
  const pathname = usePathname();
  const asked = openNew;
  const [creating, setCreating] = useState(false);
  const requests = current && canUseModule(current, "solicitudes-apoyos") ? `/${area}/${SUPPORT_REQUESTS_SEGMENT}` : null;

  if (permissions?.can_manage !== true) {
    if (!requests) return null;
    // Whoever approves the internal supports without managing the master (the approval module
    // alone) still needs the way to the tray.
    if (permissions?.can_review_internal === true) {
      return (
        <Link href={requests} className={buttonVariants({ variant: "outline" })}>
          Solicitudes de apoyo
        </Link>
      );
    }
    if (permissions?.can_request_internal !== true) return null;
    return (
      <Link href={requests} className={buttonVariants({ variant: "outline" })}>
        Mis solicitudes
      </Link>
    );
  }
  const base = `/${area}/apoyos`;
  return (
    <div className="flex flex-wrap gap-2 md:justify-end">
      {requests && permissions.can_review_internal && (
        <Link href={requests} className={buttonVariants({ variant: "outline" })}>Solicitudes de apoyo</Link>
      )}
      <Link href={`${base}/carga`} className={buttonVariants({ variant: "outline", className: "max-sm:h-11" })}>
        <Upload aria-hidden="true" /> Carga masiva
      </Link>
      <Button onClick={() => setCreating(true)} className="max-sm:h-11">
        <Plus aria-hidden="true" /> Nuevo apoyo
      </Button>
      <SupportCreateDialog
        open={creating || asked}
        onClose={() => {
          setCreating(false);
          if (asked) router.replace(pathname, { scroll: false });
        }}
      />
    </div>
  );
}
