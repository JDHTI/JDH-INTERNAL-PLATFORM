import { notFound } from "next/navigation";

import SpecialCasesBrowser from "@/features/supports/components/special-cases-browser";
import { isAvailableModule } from "@/shared/config/areas.config";

export default async function CasosEspecialesPage({
  params,
}: {
  params: Promise<{ area: string }>;
}) {
  const { area } = await params;
  if (!isAvailableModule(area, "apoyos/casos-especiales")) notFound();

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Casos especiales</h1>
        <p className="text-sm text-text-secondary">
          Peticiones sobre clientes puntuales que el libro de apoyos no alcanza a describir: se les hace
          seguimiento y se programa su regla en código.
        </p>
      </div>
      <SpecialCasesBrowser area={area} />
    </div>
  );
}
