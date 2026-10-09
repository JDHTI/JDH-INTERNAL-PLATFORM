import { notFound } from "next/navigation";

import DeliveryList from "@/features/pqrsf/components/delivery-list";
import { isAvailableModule } from "@/shared/config/areas.config";

export default async function PqrsfDeliveriesPage({
  params,
}: {
  params: Promise<{ area: string }>;
}) {
  const { area } = await params;
  if (!isAvailableModule(area, "pqrsf")) notFound();

  return <DeliveryList area={area} />;
}
