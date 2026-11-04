import { notFound } from "next/navigation";

import NewCaseScreen from "@/features/pqrsf/components/new-case-form";
import { isAvailableModule } from "@/shared/config/areas.config";

export default async function NewPqrsfCasePage({
  params,
}: {
  params: Promise<{ area: string }>;
}) {
  const { area } = await params;
  if (!isAvailableModule(area, "pqrsf")) notFound();

  return <NewCaseScreen area={area} />;
}
