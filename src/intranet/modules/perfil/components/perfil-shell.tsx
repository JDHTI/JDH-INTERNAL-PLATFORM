import { Breadcrumbs } from "@/intranet/components/navigation/breadcrumbs"

import { PerfilRail } from "./perfil-rail"

/**
 * Shell de `/perfil`: breadcrumbs + rail permanente + panel de contenido.
 * Montado por `src/app/(intranet)/perfil/layout.tsx`, que se mantiene delgado.
 */
export function PerfilShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="space-y-6">
      <Breadcrumbs
        items={[{ label: "Intranet", href: "/" }, { label: "Mi perfil" }]}
      />
      <div className="flex flex-col gap-8 lg:flex-row lg:items-start">
        <PerfilRail />
        <div className="min-w-0 flex-1">{children}</div>
      </div>
    </div>
  )
}
