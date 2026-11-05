import FeedbackDetailScreen from "@/features/pqrsf/components/feedback-detail";
import { requireModule } from "@/features/areas/server/area-access";

export default async function PqrsfFeedbackDetailPage({
  params,
}: {
  params: Promise<{ area: string; feedbackId: string }>;
}) {
  const { area, feedbackId } = await params;
  await requireModule(area, "pqrsf");

  return <FeedbackDetailScreen area={area} feedbackId={feedbackId} />;
}
