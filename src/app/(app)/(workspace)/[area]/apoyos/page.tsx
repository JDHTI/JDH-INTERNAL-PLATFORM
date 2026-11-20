import SupportsBrowser, { type SupportsView } from "@/features/supports/components/supports-browser";
import SupportsToolbar from "@/features/supports/components/supports-toolbar";
import PageHeader from "@/shared/components/page-header";
import { requireModule } from "@/features/areas/server/area-access";

/** `?vista=` as the page reads it; anything else is the general master. */
function supportsView(value: string | undefined): SupportsView {
  return value === "temporales" ? "temporales" : "general";
}

export default async function ApoyosPage({
  params,
  searchParams,
}: {
  params: Promise<{ area: string }>;
  searchParams: Promise<{ nuevo?: string; vista?: string }>;
}) {
  const { area } = await params;
  await requireModule(area, "apoyos");

  // `nuevo=1` opens the new-support modal.
  const { nuevo, vista } = await searchParams;
  const view = supportsView(vista);
  const path = `/${area}/apoyos`;

  // The temporary activities apart, like the products master's views: same rules, same access.
  return (
    <div className="space-y-6">
      <PageHeader
        views={[
          {
            key: "general",
            label: "Maestro de apoyos",
            href: path,
            description: "Apoyos tácticos y excepciones de margen por cliente y referencia, con su estado, sus novedades y los conflictos entre ellos.",
          },
          {
            key: "temporales",
            label: "Actividades temporales",
            href: `${path}?vista=temporales`,
            description: "Los descuentos temporales de los proveedores: actividades con vigencia corta, por cliente y referencia.",
          },
        ]}
        current={view}
        viewsLabel="Vistas de apoyos"
        aside={<SupportsToolbar area={area} openNew={nuevo === "1"} />}
      />
      {/* Keyed so the filters and the page start over when the view changes. */}
      <SupportsBrowser key={view} view={view} />
    </div>
  );
}
