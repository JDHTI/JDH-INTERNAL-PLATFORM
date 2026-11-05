import CatalogSettings from "@/features/pqrsf/components/catalog-settings";
import { requireModule } from "@/features/areas/server/area-access";

export default async function PqrsfSettingsPage({
  params,
}: {
  params: Promise<{ area: string }>;
}) {
  const { area } = await params;
  await requireModule(area, "pqrsf");

  return <CatalogSettings area={area} />;
}
