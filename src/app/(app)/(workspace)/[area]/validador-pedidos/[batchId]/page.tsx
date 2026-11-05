import BatchView from "@/features/order-validator/components/batch-view";
import { requireModule } from "@/features/areas/server/area-access";

export default async function ValidadorPedidosArchivoPage({
  params,
}: {
  params: Promise<{ area: string; batchId: string }>;
}) {
  const { area, batchId } = await params;
  await requireModule(area, "validador-pedidos");

  return <BatchView batchId={batchId} basePath={`/${area}/validador-pedidos`} />;
}
