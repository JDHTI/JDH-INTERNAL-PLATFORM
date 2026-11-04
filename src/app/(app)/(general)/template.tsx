import { PageTransition } from "@/intranet/components/motion/page-transition"

/**
 * Remounted on every navigation within the intranet shell — that's what
 * replays the page enter animation without re-rendering the chrome (which
 * lives in the layout above this).
 */
export default function IntranetTemplate({
  children,
}: {
  children: React.ReactNode
}) {
  return <PageTransition>{children}</PageTransition>
}
