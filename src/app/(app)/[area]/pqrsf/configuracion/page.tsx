import { notFound } from "next/navigation";

import CatalogSettings from "@/features/pqrsf/components/catalog-settings";
import { isAvailableModule } from "@/shared/config/areas.config";

export default async function PqrsfSettingsPage({
  params,
}: {
  params: Promise<{ area: string }>;
}) {
  const { area } = await params;
  if (!isAvailableModule(area, "pqrsf")) notFound();

  return <CatalogSettings area={area} />;
}
