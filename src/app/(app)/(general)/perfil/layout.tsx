import { PerfilShell } from "@/intranet/modules/perfil"

export const metadata = {
  title: {
    default: "Mi perfil",
    template: "%s · Mi perfil · JDH",
  },
}

export default function PerfilLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <PerfilShell>{children}</PerfilShell>
}
