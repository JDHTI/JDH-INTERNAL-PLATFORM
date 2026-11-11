import PageHeader from "@/shared/components/page-header";
import SpecialCasesBrowser from "@/features/supports/components/special-cases-browser";
import { requireModule } from "@/features/areas/server/area-access";

export default async function CasosEspecialesPage({
  params,
}: {
  params: Promise<{ area: string }>;
}) {
  const { area } = await params;
  await requireModule(area, "apoyos/casos-especiales");

  return (
    <div className="space-y-6">
      <PageHeader
        title="Casos especiales"
        description="Peticiones sobre clientes puntuales que el libro de apoyos no alcanza a describir: se les hace seguimiento y se programa su regla en código."
      />
      <SpecialCasesBrowser area={area} />
    </div>
  );
}
