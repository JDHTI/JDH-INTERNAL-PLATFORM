import { requireModule } from "@/features/areas/server/area-access";
import RequestsPage from "@/features/supports/components/requests-page";
import { SUPPORT_REQUESTS_SEGMENT } from "@/shared/config/areas.config";

export default async function Page({ params }: { params: Promise<{ area: string }> }) {
  const { area } = await params;
  await requireModule(area, SUPPORT_REQUESTS_SEGMENT);
  return <RequestsPage />;
}
