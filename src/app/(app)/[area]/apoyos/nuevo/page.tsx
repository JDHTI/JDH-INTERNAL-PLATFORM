import { notFound } from "next/navigation";

import ManagerGate from "@/features/supports/components/manager-gate";
import SupportCreateForm from "@/features/supports/components/support-create-form";
import PageHeader from "@/shared/components/page-header";
import { isAvailableModule } from "@/shared/config/areas.config";

export default async function NuevoApoyoPage({ params }: { params: Promise<{ area: string }> }) {
  const { area } = await params;
  if (!isAvailableModule(area, "apoyos")) notFound();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Nuevo apoyo"
        description="Una regla de apoyo: a qué proveedor, cliente y referencia aplica, cuánto da y por cuánto tiempo."
      />
      <ManagerGate action="crear apoyos">
        <SupportCreateForm area={area} />
      </ManagerGate>
    </div>
  );
}
