import { notFound } from "next/navigation";

import CaseDetailScreen from "@/features/pqrsf/components/case-detail";
import { isAvailableModule } from "@/shared/config/areas.config";

export default async function PqrsfCasePage({
  params,
}: {
  params: Promise<{ area: string; caseId: string }>;
}) {
  const { area, caseId } = await params;
  if (!isAvailableModule(area, "pqrsf")) notFound();

  return <CaseDetailScreen area={area} caseId={caseId} />;
}
