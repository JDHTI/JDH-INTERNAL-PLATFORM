import { Hourglass, type LucideIcon } from "lucide-react"

import { EmptyState } from "@/intranet/components/common/empty-state"

/**
 * A screen whose data the platform API does not serve yet. Says so instead of
 * showing an error or an empty form that would look like "you have no data".
 */
export function PendingBackend({
  title,
  description,
  icon = Hourglass,
}: {
  title: string
  description: string
  icon?: LucideIcon
}) {
  return <EmptyState icon={icon} title={title} description={description} />
}
