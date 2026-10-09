import { notFound } from "next/navigation";

import FeedbackList from "@/features/pqrsf/components/feedback-list";
import { isAvailableModule } from "@/shared/config/areas.config";

export default async function PqrsfFeedbackPage({
  params,
}: {
  params: Promise<{ area: string }>;
}) {
  const { area } = await params;
  if (!isAvailableModule(area, "pqrsf")) notFound();

  return <FeedbackList area={area} />;
}
