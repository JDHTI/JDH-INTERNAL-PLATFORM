import { notFound } from "next/navigation";
import PageHeader from "@/shared/components/page-header";
import RequestsBrowser from "@/features/supports/components/requests-browser";

export default async function Page({ params }: { params: Promise<{ area: string }> }) {
  if ((await params).area !== "bi") notFound();
  return <div className="space-y-6"><PageHeader title="Solicitudes de apoyo JDH" description="Revisa propuestas individuales, decide y consulta su historial." /><RequestsBrowser review /></div>;
}
