import { DesignSystemTabs } from "@/intranet/modules/marca"

/** Sub-navegación del Design system: Fundamentos ↔ Componentes. */
export default function DesignSystemLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="space-y-8">
      <DesignSystemTabs />
      {children}
    </div>
  )
}
