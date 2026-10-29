import { notFound } from "next/navigation";

import SupportsBrowser from "@/features/supports/components/supports-browser";
import SupportsToolbar from "@/features/supports/components/supports-toolbar";
import PageHeader from "@/shared/components/page-header";
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
      <PageHeader
        title="Maestro de apoyos"
        description="Apoyos de proveedores por cliente y referencia, con su estado, sus novedades y los conflictos entre ellos."
        aside={<SupportsToolbar area={area} />}
      />
      <SupportsBrowser readOnly={area === "comercial"} key={caso ?? "all"} specialCase={caso ? { id: caso, code: codigo ?? "del caso" } : undefined} />
    </div>
  );
}
