import { notFound } from "next/navigation";

import SupportsBrowser from "@/features/supports/components/supports-browser";
import { isAvailableModule } from "@/shared/config/areas.config";

export default async function ApoyosPage({
  params,
}: {
  params: Promise<{ area: string }>;
}) {
  const { area } = await params;
  if (!isAvailableModule(area, "apoyos")) notFound();

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Maestro de apoyos</h1>
        <p className="text-sm text-text-secondary">
          Apoyos de proveedores por cliente y producto, con su vigencia, sus novedades y los conflictos
          entre ellos. Solo consulta.
        </p>
      </div>
      <SupportsBrowser />
    </div>
  );
}
