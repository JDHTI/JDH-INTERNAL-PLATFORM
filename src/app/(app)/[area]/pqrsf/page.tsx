import { Suspense } from "react";
import { notFound } from "next/navigation";

import CaseInbox, { InboxSkeleton } from "@/features/pqrsf/components/case-inbox";
import { isAvailableModule } from "@/shared/config/areas.config";

export default async function PqrsfPage({
  params,
}: {
  params: Promise<{ area: string }>;
}) {
  const { area } = await params;
  if (!isAvailableModule(area, "pqrsf")) notFound();

  // The inbox reads its filters from the URL, which only exists in the
  // browser request: the boundary keeps the build from prerendering it.
  return (
    <Suspense fallback={<InboxSkeleton />}>
      <CaseInbox area={area} />
    </Suspense>
  );
}
