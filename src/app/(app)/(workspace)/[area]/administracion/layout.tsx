import AdminGate from "@/features/admin/components/admin-gate";
import { requireModule } from "@/features/areas/server/area-access";
import { ADMIN_SEGMENT } from "@/shared/config/areas.config";

/** Platform administration lives in TI only, and only for platform administrators. */
export default async function AdministrationLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ area: string }>;
}) {
  const { area } = await params;
  await requireModule(area, ADMIN_SEGMENT);
  return <AdminGate>{children}</AdminGate>;
}
