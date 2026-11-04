import { Suspense } from "react";
import type { Metadata } from "next";

import DirectoryBrowser from "@/features/directory/components/directory-browser";
import PageHeader from "@/shared/components/page-header";
import TableSkeleton from "@/shared/components/table-skeleton";

export const metadata: Metadata = { title: "Directorio · Plataforma Interna JDH" };

export default function DirectoryPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Directorio"
        description="Las personas de la compañía, con su cargo, sede y correo. Se actualiza cada noche desde Microsoft Entra."
      />
      {/* The browser reads the search from the URL, which needs a Suspense boundary. */}
      <Suspense fallback={<TableSkeleton rows={8} label="Cargando el directorio" />}>
        <DirectoryBrowser />
      </Suspense>
    </div>
  );
}
