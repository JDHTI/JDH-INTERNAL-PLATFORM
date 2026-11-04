import PortalFrame from "@/shared/components/layout/portal/portal-frame";

/** The general view, for everyone signed in. See docs/DESIGN.md §5.4. */
export default function GeneralLayout({ children }: { children: React.ReactNode }) {
  return <PortalFrame>{children}</PortalFrame>;
}
