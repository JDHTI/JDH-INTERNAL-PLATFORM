import SupportsBrowser from "@/features/supports/components/supports-browser";
import SupportsToolbar from "@/features/supports/components/supports-toolbar";
import PageHeader from "@/shared/components/page-header";
import { requireModule } from "@/features/areas/server/area-access";
export default async function ApoyosPage({
  params,
  searchParams,
}: {
  params: Promise<{ area: string }>;
  searchParams: Promise<{ caso?: string; codigo?: string; nuevo?: string }>;
}) {
  const { area } = await params;
  await requireModule(area, "apoyos");

  // A special case links here to list the supports that came from it; `nuevo=1` opens the new-support modal.
  const { caso, codigo, nuevo } = await searchParams;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Maestro de apoyos"
        description="Apoyos de proveedores por cliente y referencia, con su estado, sus novedades y los conflictos entre ellos."
        aside={<SupportsToolbar area={area} openNew={nuevo === "1"} />}
      />
      <SupportsBrowser key={caso ?? "all"} specialCase={caso ? { id: caso, code: codigo ?? "del caso" } : undefined} />
    </div>
  );
}
