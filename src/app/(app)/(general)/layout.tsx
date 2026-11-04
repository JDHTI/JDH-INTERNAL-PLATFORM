import { AnnouncementBar } from "@/intranet/components/layout/announcement-bar"
import { AppFooter } from "@/intranet/components/layout/app-footer"
import { AppHeader } from "@/intranet/components/layout/app-header"
import { MainNav } from "@/intranet/components/layout/main-nav"
import { MobileBottomNav } from "@/intranet/components/layout/mobile-bottom-nav"
import { IntranetProviders } from "@/intranet/components/providers/intranet-providers"
import { requireUser } from "@/intranet/lib/auth"

/**
 * The general view: the intranet, as it was. A sticky black header +
 * horizontal main nav, routed content in <main>, and the black footer. On
 * mobile the nav collapses to the "Explorar todo" panel plus a fixed bottom
 * nav. `.intranet-shell` switches the design tokens to the intranet's
 * (src/intranet/styles/intranet.css).
 *
 * A page that renders an element with `data-fill-viewport` makes chrome +
 * <main> span exactly one viewport, so the footer starts right below the fold
 * instead of peeking in under short content.
 *
 * Every page here needs a session: without one, the person goes to /login
 * (the intranet did this in its proxy).
 */
export default async function GeneralLayout({ children }: { children: React.ReactNode }) {
  await requireUser()

  return (
    <IntranetProviders>
      <div className="intranet-shell flex min-h-svh flex-col bg-background text-foreground antialiased">
        <div className="flex flex-1 flex-col has-[[data-fill-viewport]]:min-h-svh">
          <div className="sticky top-0 z-[var(--z-sticky)]">
            <AnnouncementBar />
            <AppHeader />
            <MainNav className="hidden md:block" />
          </div>

          <main className="mx-auto w-full max-w-[var(--container-wide)] flex-1 px-6 py-8 pb-24 has-[[data-fill-viewport]]:flex has-[[data-fill-viewport]]:flex-col has-[[data-fill-viewport]]:*:flex has-[[data-fill-viewport]]:*:flex-1 has-[[data-fill-viewport]]:*:flex-col md:pb-8">
            {children}
          </main>
        </div>

        <AppFooter />
        <MobileBottomNav />
      </div>
    </IntranetProviders>
  )
}
