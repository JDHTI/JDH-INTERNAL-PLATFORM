import { notFound } from "next/navigation";

import AdminGate from "@/features/admin/components/admin-gate";
import { ADMIN_SEGMENT, isAvailableModule } from "@/shared/config/areas.config";

/** Platform administration lives in TI only, and only for platform administrators. */
export default async function AdministrationLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ area: string }>;
}) {
  const { area } = await params;
  if (!isAvailableModule(area, ADMIN_SEGMENT)) notFound();
  return <AdminGate>{children}</AdminGate>;
}
