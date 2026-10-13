import { notFound } from "next/navigation";

import BatchesBrowser from "@/features/order-validator/components/batches-browser";
import { isAvailableModule } from "@/shared/config/areas.config";

const VALIDATOR_SEGMENT = "validador-pedidos";

export default async function ValidadorPedidosPage({ params }: { params: Promise<{ area: string }> }) {
  const { area } = await params;
  if (!isAvailableModule(area, VALIDATOR_SEGMENT)) notFound();

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Validador de pedidos</h1>
        <p className="text-sm text-text-secondary">
          Pedidos retenidos de SIESA revisados contra el maestro de apoyos: cuáles quedan listos para liberación y cuáles
          esperan validación.
        </p>
      </div>
      <BatchesBrowser basePath={`/${area}/${VALIDATOR_SEGMENT}`} />
    </div>
  );
}
