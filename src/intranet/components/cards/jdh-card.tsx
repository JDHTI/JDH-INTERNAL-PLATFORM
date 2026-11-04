import * as React from "react"
import type { Route } from "next"
import Link from "next/link"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/intranet/lib/utils"

/**
 * The parametrizable JDH card (DESIGN.md §4.6). One component covers every card
 * shape in the design by composition:
 *
 *  - size:          `sm | md | lg`  → body padding + title scale + media height
 *  - mediaPosition: `top | bottom | start | end | none`  → where the media sits
 *  - variant:       `default | inverse | dashed | quick-link`
 *  - interactive:   hover lift + border-strong; `href` makes the whole card a link
 *
 * RSC-safe: no hooks/context — `size`/`variant` cascade to subcomponents via
 * `data-*` attributes + `group-data` variants, so cards can render on the
 * server. Compose with the attached subcomponents (Media, Body, Eyebrow, …).
 */
const cardVariants = cva(
  "group/card relative flex overflow-hidden rounded-[var(--jdh-radius-md)] outline-none",
  {
    variants: {
      variant: {
        default: "border border-border bg-card text-card-foreground",
        inverse:
          "border border-transparent bg-primary text-primary-foreground dark:border-[var(--color-ink-border)]",
        dashed:
          "border border-dashed border-[var(--color-border-strong)] bg-card text-card-foreground opacity-70",
        "quick-link": "border border-border bg-card text-card-foreground",
      },
      mediaPosition: {
        top: "flex-col [&_[data-slot=card-media]]:order-first",
        bottom: "flex-col [&_[data-slot=card-media]]:order-last",
        start: "flex-row [&_[data-slot=card-media]]:order-first",
        end: "flex-row [&_[data-slot=card-media]]:order-last",
        none: "flex-col",
      },
      interactive: {
        true: "transition-[border-color,transform] duration-200 focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 focus-within:ring-offset-background hover:-translate-y-0.5",
        false: "",
      },
    },
    compoundVariants: [
      {
        interactive: true,
        variant: "default",
        class: "hover:border-[var(--color-border-strong)]",
      },
      {
        interactive: true,
        variant: "quick-link",
        class: "hover:border-foreground",
      },
    ],
    defaultVariants: {
      variant: "default",
      mediaPosition: "none",
      interactive: false,
    },
  }
)

export interface JdhCardProps
  extends
    Omit<React.ComponentProps<"div">, "size">,
    VariantProps<typeof cardVariants> {
  size?: "sm" | "md" | "lg"
  /** Turns the whole card into a link (implies interactive). */
  href?: `/${string}`
}

function JdhCard({
  size = "md",
  variant = "default",
  mediaPosition = "none",
  interactive,
  href,
  className,
  children,
  ...props
}: JdhCardProps) {
  const classes = cn(
    cardVariants({
      variant,
      mediaPosition,
      interactive: interactive || !!href,
    }),
    className
  )

  if (href) {
    return (
      <Link
        href={href as Route}
        data-slot="jdh-card"
        data-size={size}
        data-variant={variant}
        data-media-position={mediaPosition}
        className={classes}
      >
        {children}
      </Link>
    )
  }

  return (
    <div
      data-slot="jdh-card"
      data-size={size}
      data-variant={variant}
      data-media-position={mediaPosition}
      className={classes}
      {...props}
    >
      {children}
    </div>
  )
}

/** Flush media block. In column layouts (top/bottom) it uses the explicit
 *  `height`; in row layouts (start/end) it stretches to the card's full height
 *  (fixed width). The image is absolutely positioned so it always fills the
 *  box — no "fixed corner" gap. Children render as overlays (badges). */
function CardMedia({
  src,
  alt,
  height = "md",
  className,
  children,
}: {
  src: string
  alt: string
  height?: "sm" | "md" | "lg"
  className?: string
  children?: React.ReactNode
}) {
  const heights = {
    sm: "h-[132px]",
    md: "h-[140px]",
    lg: "h-[210px]",
  } as const

  return (
    <div
      data-slot="card-media"
      className={cn(
        "relative w-full shrink-0 overflow-hidden bg-muted",
        heights[height],
        "group-data-[media-position=start]/card:h-auto group-data-[media-position=start]/card:w-52 group-data-[media-position=start]/card:self-stretch",
        "group-data-[media-position=end]/card:h-auto group-data-[media-position=end]/card:w-52 group-data-[media-position=end]/card:self-stretch",
        className
      )}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={alt}
        className="absolute inset-0 h-full w-full object-cover"
      />
      {children}
    </div>
  )
}

/** Padded content region. Padding + title scale follow the card `size`. */
function CardBody({
  className,
  children,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-body"
      className={cn(
        "flex min-w-0 flex-1 flex-col gap-2 p-6 group-data-[size=lg]/card:p-8 group-data-[size=sm]/card:p-4",
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}

/** Mono uppercase overline; `withDot` adds a leading status dot (hero cards). */
function CardEyebrow({
  withDot,
  className,
  children,
  ...props
}: React.ComponentProps<"p"> & { withDot?: boolean }) {
  return (
    <p
      data-slot="card-eyebrow"
      className={cn(
        "inline-flex items-center gap-2 font-mono text-xs tracking-[0.08em] text-muted-foreground uppercase group-data-[variant=inverse]/card:text-[var(--color-on-ink-muted)]",
        className
      )}
      {...props}
    >
      {withDot ? (
        <span aria-hidden className="size-1.5 rounded-full bg-current" />
      ) : null}
      {children}
    </p>
  )
}

function CardTitle({
  as: Comp = "h3",
  className,
  ...props
}: React.ComponentProps<"h3"> & { as?: React.ElementType }) {
  return (
    <Comp
      data-slot="card-title"
      className={cn(
        "text-lg leading-snug font-medium group-data-[size=lg]/card:text-xl group-data-[size=sm]/card:text-sm",
        className
      )}
      {...props}
    />
  )
}

function CardDescription({ className, ...props }: React.ComponentProps<"p">) {
  return (
    <p
      data-slot="card-description"
      className={cn(
        "text-sm text-muted-foreground group-data-[variant=inverse]/card:text-[var(--color-on-ink-muted)]",
        className
      )}
      {...props}
    />
  )
}

function CardMeta({ className, ...props }: React.ComponentProps<"p">) {
  return (
    <p
      data-slot="card-meta"
      className={cn(
        "text-xs text-muted-foreground group-data-[variant=inverse]/card:text-[var(--color-on-ink-muted)]",
        className
      )}
      {...props}
    />
  )
}

/** Card footer row. `separated` adds a top divider (SLA + action, "Leer más"). */
function CardFooter({
  separated,
  className,
  children,
  ...props
}: React.ComponentProps<"div"> & { separated?: boolean }) {
  return (
    <div
      data-slot="card-footer"
      className={cn(
        "mt-auto flex items-center gap-3 pt-2",
        separated &&
          "mt-4 border-t border-border pt-4 group-data-[variant=inverse]/card:border-[var(--color-ink-border)]",
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}

/** 44px icon box (request cards, quick links). */
function CardIconBox({
  className,
  children,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-icon-box"
      className={cn(
        "inline-flex size-11 shrink-0 items-center justify-center rounded-[var(--jdh-radius-sm)] bg-muted text-foreground group-data-[variant=inverse]/card:bg-[var(--overlay-on-dark-08)] group-data-[variant=inverse]/card:text-[var(--color-on-ink)] [&_svg]:size-5",
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}

const JdhCardNamespace = Object.assign(JdhCard, {
  Media: CardMedia,
  Body: CardBody,
  Eyebrow: CardEyebrow,
  Title: CardTitle,
  Description: CardDescription,
  Meta: CardMeta,
  Footer: CardFooter,
  IconBox: CardIconBox,
})

export { JdhCardNamespace as JdhCard, cardVariants }
