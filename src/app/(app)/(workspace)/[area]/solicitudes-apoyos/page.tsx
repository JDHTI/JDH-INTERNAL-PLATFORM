import { requireModule } from "@/features/areas/server/area-access";
import RequestsBrowser from "@/features/supports/components/requests-browser";
import PageHeader from "@/shared/components/page-header";
import { SUPPORTS_MANAGER_AREA_SLUG, SUPPORT_REQUESTS_SEGMENT } from "@/shared/config/areas.config";

/** The supports' owner reviews the requests; any other area with the module asks and follows its own. */
export default async function Page({ params }: { params: Promise<{ area: string }> }) {
  const { area } = await params;
  await requireModule(area, SUPPORT_REQUESTS_SEGMENT);
  const review = area === SUPPORTS_MANAGER_AREA_SLUG;

  return (
    <div className="space-y-6">
      {review ? (
        <PageHeader title="Solicitudes de apoyo JDH" description="Revisa propuestas individuales, decide y consulta su historial." />
      ) : (
        <PageHeader title="Mis solicitudes JDH" description="Consulta el estado y las decisiones de tus solicitudes de apoyo." />
      )}
      <RequestsBrowser review={review} />
    </div>
  );
}
