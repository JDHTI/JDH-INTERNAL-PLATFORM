import { notFound } from "next/navigation";

import BatchView from "@/features/order-validator/components/batch-view";
import { isAvailableModule } from "@/shared/config/areas.config";

export default async function ValidadorPedidosArchivoPage({
  params,
}: {
  params: Promise<{ area: string; batchId: string }>;
}) {
  const { area, batchId } = await params;
  if (!isAvailableModule(area, "validador-pedidos")) notFound();

  return <BatchView batchId={batchId} basePath={`/${area}/validador-pedidos`} />;
}
