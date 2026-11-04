import { Info, TriangleAlert } from "lucide-react"

import { cn } from "@/intranet/lib/utils"

import { Section } from "./section"

const bars = [
  {
    variant: "info" as const,
    icon: Info,
    className:
      "border border-border bg-[var(--color-bg-subtle)] text-foreground",
    text: "Mantenimiento programado del portal el sábado 26 de julio.",
  },
  {
    variant: "warning" as const,
    icon: TriangleAlert,
    className:
      "border border-border border-b-2 border-b-foreground bg-[var(--color-bg-subtle)] text-foreground",
    text: "Actualiza tu contraseña antes del 31 de julio.",
  },
  {
    variant: "critical" as const,
    icon: TriangleAlert,
    className:
      "border border-[var(--color-ink-border)] bg-[var(--color-ink)] text-[var(--color-on-ink)]",
    text: "Incidente de servicio en curso — algunos módulos no están disponibles.",
  },
]

export function AnnouncementSection() {
  return (
    <Section
      title="Announcement bar"
      description="Barra de aviso configurable (config/announcement.config.ts). La activa vive sobre el header; abajo, las tres variantes."
    >
      <div className="space-y-3">
        {bars.map((bar) => {
          const Icon = bar.icon
          return (
            <div
              key={bar.variant}
              className={cn(
                "flex h-10 items-center gap-3 rounded-[var(--jdh-radius-md)] px-4 text-sm",
                bar.className
              )}
            >
              <Icon className="size-4 shrink-0" aria-hidden />
              <span className="min-w-0 flex-1 truncate">{bar.text}</span>
              <span className="font-mono text-xs uppercase opacity-70">
                {bar.variant}
              </span>
            </div>
          )
        })}
      </div>
    </Section>
  )
}
