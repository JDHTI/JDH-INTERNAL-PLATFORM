import RulesView from "@/features/order-validator/components/rules-view";
import { requireModule } from "@/features/areas/server/area-access";

/** A static segment: Next resolves it before the `[batchId]` next to it. */
export default async function ReglasValidadorPage({ params }: { params: Promise<{ area: string }> }) {
  const { area } = await params;
  await requireModule(area, "validador-pedidos");

  return <RulesView basePath={`/${area}/validador-pedidos`} />;
}
