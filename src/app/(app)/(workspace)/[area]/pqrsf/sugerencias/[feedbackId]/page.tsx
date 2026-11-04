import { notFound } from "next/navigation";

import FeedbackDetailScreen from "@/features/pqrsf/components/feedback-detail";
import { isAvailableModule } from "@/shared/config/areas.config";

export default async function PqrsfFeedbackDetailPage({
  params,
}: {
  params: Promise<{ area: string; feedbackId: string }>;
}) {
  const { area, feedbackId } = await params;
  if (!isAvailableModule(area, "pqrsf")) notFound();

  return <FeedbackDetailScreen area={area} feedbackId={feedbackId} />;
}
