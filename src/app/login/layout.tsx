import Link from "next/link"

import { AuthShowcase } from "@/intranet/components/auth/auth-showcase"
import { Logo } from "@/intranet/components/common/logo"

/**
 * The intranet's sign-in screen, for the whole platform. Split screen: the
 * showcase panel (JDH's own operation, ink) takes 60% on the left, the form
 * column 40% on the right. No app chrome. Accounts come from the Entra ID
 * tenant, so there is no sign-up.
 *
 * Below `lg` the grid collapses to plain column flow: the showcase becomes a
 * short banner on top and the form column takes the rest of the viewport.
 */
export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="intranet-shell flex min-h-svh flex-col bg-background text-foreground antialiased lg:grid lg:grid-cols-[3fr_2fr]">
      <AuthShowcase />

      <div className="flex flex-1 flex-col items-center justify-center bg-background px-6 py-12">
        <div className="flex w-full max-w-sm flex-col gap-10">
          {/* Only from `lg` up: below that the showcase banner already carries the lockup. */}
          <Link href="/" className="hidden self-start lg:block">
            <Logo variant="lockup" tone="auto" height={40} priority />
          </Link>
          {children}
        </div>
      </div>
    </div>
  )
}
