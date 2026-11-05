import NewCaseScreen from "@/features/pqrsf/components/new-case-form";
import { requireModule } from "@/features/areas/server/area-access";

export default async function NewPqrsfCasePage({
  params,
}: {
  params: Promise<{ area: string }>;
}) {
  const { area } = await params;
  await requireModule(area, "pqrsf");

  return <NewCaseScreen area={area} />;
}
