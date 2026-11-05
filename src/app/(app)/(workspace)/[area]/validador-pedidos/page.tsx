import BatchesBrowser from "@/features/order-validator/components/batches-browser";
import RulesLink from "@/features/order-validator/components/rules-link";
import PageHeader from "@/shared/components/page-header";
import { requireModule } from "@/features/areas/server/area-access";

const VALIDATOR_SEGMENT = "validador-pedidos";

export default async function ValidadorPedidosPage({ params }: { params: Promise<{ area: string }> }) {
  const { area } = await params;
  await requireModule(area, VALIDATOR_SEGMENT);
  const basePath = `/${area}/${VALIDATOR_SEGMENT}`;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Validador de pedidos"
        description="Pedidos retenidos de SIESA revisados contra el maestro de apoyos: cuáles quedan listos para liberación y cuáles esperan validación."
        aside={<RulesLink basePath={basePath} />}
      />
      <BatchesBrowser basePath={basePath} />
    </div>
  );
}
