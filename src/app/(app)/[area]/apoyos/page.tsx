import { notFound } from "next/navigation";

import SupportsBrowser from "@/features/supports/components/supports-browser";
import { isAvailableModule } from "@/shared/config/areas.config";

export default async function ApoyosPage({
  params,
  searchParams,
}: {
  params: Promise<{ area: string }>;
  searchParams: Promise<{ caso?: string; codigo?: string }>;
}) {
  const { area } = await params;
  if (!isAvailableModule(area, "apoyos")) notFound();

  // A special case links here to list the supports that came from it.
  const { caso, codigo } = await searchParams;

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Maestro de apoyos</h1>
        <p className="text-sm text-text-secondary">
          Apoyos de proveedores por cliente y referencia, con su estado, sus novedades y los conflictos
          entre ellos.
        </p>
      </div>
      <SupportsBrowser key={caso ?? "all"} specialCase={caso ? { id: caso, code: codigo ?? "del caso" } : undefined} />
    </div>
  );
}
