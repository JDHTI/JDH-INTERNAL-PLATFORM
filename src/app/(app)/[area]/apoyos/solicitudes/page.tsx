import { notFound } from "next/navigation";
import PageHeader from "@/shared/components/page-header";
import RequestsBrowser from "@/features/supports/components/requests-browser";

export default async function Page({ params }: { params: Promise<{ area: string }> }) {
  if ((await params).area !== "comercial") notFound();
  return <div className="space-y-6"><PageHeader title="Mis solicitudes JDH" description="Consulta el estado y las decisiones de tus solicitudes de apoyo." /><RequestsBrowser /></div>;
}
