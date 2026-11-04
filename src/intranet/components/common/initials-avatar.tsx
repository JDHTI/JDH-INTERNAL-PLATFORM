import { Avatar, AvatarFallback, AvatarImage } from "@/intranet/components/ui/avatar"
import { cn } from "@/intranet/lib/utils"

import { BirthdayFrame } from "./birthday-frame"

const sizeClasses = {
  sm: "size-8 text-xs", // 32px — list/table rows
  md: "size-9 text-sm", // 36px — header, contacts
  lg: "size-12 text-base", // 48px
  xl: "size-24 text-2xl", // 96px — profile
} as const

function initialsFrom(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return "?"
  const first = parts[0][0] ?? ""
  const last = parts.length > 1 ? (parts[parts.length - 1][0] ?? "") : ""
  return (first + last).toUpperCase()
}

export interface InitialsAvatarProps {
  name: string
  size?: keyof typeof sizeClasses
  /** Optional photo; falls back to initials while loading or if absent. */
  src?: string
  /** `muted` = subtle surface (lists); `ink` = black chrome (header/profile). */
  tone?: "muted" | "ink"
  /** Hoy cumple años: envuelve el avatar en `BirthdayFrame` (aro + globos). */
  birthday?: boolean
  /** Superficie sobre la que va el avatar, para el color del marco: `ink` en el header. */
  surface?: "surface" | "ink"
  className?: string
}

/**
 * Circular avatar showing a person's initials (or photo). Sizes map to the
 * design's 32/36/48/96px avatars. `className` styles the avatar itself, not
 * the birthday frame around it.
 */
export function InitialsAvatar({
  name,
  size = "md",
  src,
  tone = "muted",
  birthday = false,
  surface = "surface",
  className,
}: InitialsAvatarProps) {
  const avatar = (
    <Avatar className={cn(sizeClasses[size], className)}>
      {src ? <AvatarImage src={src} alt={name} /> : null}
      <AvatarFallback
        className={cn(
          "font-medium",
          tone === "ink"
            ? "bg-primary text-primary-foreground"
            : "bg-muted text-muted-foreground"
        )}
      >
        {initialsFrom(name)}
      </AvatarFallback>
    </Avatar>
  )

  if (!birthday) return avatar
  return (
    <BirthdayFrame size={size} tone={surface}>
      {avatar}
    </BirthdayFrame>
  )
}
