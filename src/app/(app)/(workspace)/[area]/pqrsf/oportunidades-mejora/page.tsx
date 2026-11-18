import OmHistory from "@/features/pqrsf/components/om-history";
import { requireModule } from "@/features/areas/server/area-access";

export default async function PqrsfImprovementOpportunitiesPage({
  params,
}: {
  params: Promise<{ area: string }>;
}) {
  const { area } = await params;
  await requireModule(area, "pqrsf");

  return <OmHistory area={area} />;
}
