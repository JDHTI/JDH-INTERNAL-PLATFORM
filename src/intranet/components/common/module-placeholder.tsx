import type { ModuleDefinition } from "@/intranet/lib/modules"

import { EmptyState } from "./empty-state"
import { PageHeader } from "./page-header"

/**
 * Default view for a module whose structure exists but whose UI is not built
 * yet. Each module's view component renders this until real UI replaces it.
 */
export function ModulePlaceholder({ module }: { module: ModuleDefinition }) {
  return (
    <div className="space-y-6">
      <PageHeader title={module.title} description={module.description} />
      <EmptyState
        icon={module.icon}
        title="Módulo en construcción"
        description={`La estructura de "${module.title}" está lista. La implementación llega en una próxima iteración.`}
      />
    </div>
  )
}
