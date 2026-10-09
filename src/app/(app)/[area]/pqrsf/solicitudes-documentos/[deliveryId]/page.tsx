import { notFound } from "next/navigation";

import DeliveryDetailScreen from "@/features/pqrsf/components/delivery-detail";
import { isAvailableModule } from "@/shared/config/areas.config";

export default async function PqrsfDeliveryDetailPage({
  params,
}: {
  params: Promise<{ area: string; deliveryId: string }>;
}) {
  const { area, deliveryId } = await params;
  if (!isAvailableModule(area, "pqrsf")) notFound();

  return <DeliveryDetailScreen area={area} deliveryId={deliveryId} />;
}
