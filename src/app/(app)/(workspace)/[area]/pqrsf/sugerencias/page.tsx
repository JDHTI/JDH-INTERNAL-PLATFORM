import FeedbackList from "@/features/pqrsf/components/feedback-list";
import { requireModule } from "@/features/areas/server/area-access";

export default async function PqrsfFeedbackPage({
  params,
}: {
  params: Promise<{ area: string }>;
}) {
  const { area } = await params;
  await requireModule(area, "pqrsf");

  return <FeedbackList area={area} />;
}
