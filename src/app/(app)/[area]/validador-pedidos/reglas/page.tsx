import { notFound } from "next/navigation";

import RulesView from "@/features/order-validator/components/rules-view";
import { isAvailableModule } from "@/shared/config/areas.config";

/** A static segment: Next resolves it before the `[batchId]` next to it. */
export default async function ReglasValidadorPage({ params }: { params: Promise<{ area: string }> }) {
  const { area } = await params;
  if (!isAvailableModule(area, "validador-pedidos")) notFound();

  return <RulesView basePath={`/${area}/validador-pedidos`} />;
}
