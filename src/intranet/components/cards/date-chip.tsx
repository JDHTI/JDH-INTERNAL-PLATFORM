import { cn } from "@/intranet/lib/utils"

/**
 * Calendar date chip (52px): mono uppercase month over the day number. Used in
 * event lists and the (future) calendar. `selected` fills ink.
 *
 * `tone="on-ink"`: for use when the chip itself sits on a black chrome
 * surface (`ProximosEventos` in `tone="inverse"`, see that component) — a
 * plain `bg-card`/`border-border` chip would be near-invisible on black, and
 * `selected`'s `bg-primary` (ink) would blend into an already-ink background.
 * Same `--overlay-on-dark-*`/`--color-on-ink*` tokens `JdhButton`'s
 * `outline-on-ink` variant already uses for "control on black chrome".
 */
export function DateChip({
  date,
  selected,
  tone = "default",
  className,
}: {
  date: Date
  selected?: boolean
  tone?: "default" | "on-ink"
  className?: string
}) {
  const month = date
    .toLocaleDateString("es-CO", { month: "short" })
    .replace(".", "")
    .toUpperCase()
  const day = date.getDate()

  return (
    <div
      className={cn(
        "flex size-[52px] shrink-0 flex-col items-center justify-center gap-0.5 rounded-[var(--jdh-radius-md)] border",
        tone === "on-ink"
          ? "border-transparent bg-[var(--overlay-on-dark-08)] text-[var(--color-on-ink)]"
          : selected
            ? "border-transparent bg-primary text-primary-foreground dark:border-[var(--color-ink-border)]"
            : "border-border bg-card text-foreground",
        className
      )}
    >
      <span className="font-mono text-[0.625rem] tracking-wide uppercase">
        {month}
      </span>
      <span className="text-lg leading-none font-medium">{day}</span>
    </div>
  )
}
