import SupportsBrowser from "@/features/supports/components/supports-browser";
import SupportsToolbar from "@/features/supports/components/supports-toolbar";
import PageHeader from "@/shared/components/page-header";
import { requireModule } from "@/features/areas/server/area-access";
export default async function ApoyosPage({
  params,
  searchParams,
}: {
  params: Promise<{ area: string }>;
  searchParams: Promise<{ nuevo?: string }>;
}) {
  const { area } = await params;
  await requireModule(area, "apoyos");

  // `nuevo=1` opens the new-support modal.
  const { nuevo } = await searchParams;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Maestro de apoyos"
        description="Apoyos de proveedores por cliente y referencia, con su estado, sus novedades y los conflictos entre ellos."
        aside={<SupportsToolbar area={area} openNew={nuevo === "1"} />}
      />
      <SupportsBrowser />
    </div>
  );
}
