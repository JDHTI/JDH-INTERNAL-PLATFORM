import CaseDetailScreen from "@/features/pqrsf/components/case-detail";
import { requireModule } from "@/features/areas/server/area-access";

export default async function PqrsfCasePage({
  params,
}: {
  params: Promise<{ area: string; caseId: string }>;
}) {
  const { area, caseId } = await params;
  await requireModule(area, "pqrsf");

  return <CaseDetailScreen area={area} caseId={caseId} />;
}
