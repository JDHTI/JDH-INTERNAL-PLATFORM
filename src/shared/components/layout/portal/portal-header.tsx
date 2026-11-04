"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";

import { GENERAL_LINKS, isGeneralLinkActive } from "@/shared/config/general.config";
import { cn } from "@/shared/lib/utils";

import PortalAccountMenu from "./portal-account-menu";
import WorkspaceLink from "./workspace-link";

const navLinkClass = (active: boolean) =>
  cn(
    "inline-flex h-11 items-center gap-2 rounded-md px-3 text-sm font-medium transition-colors duration-150 md:h-9",
    "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sidebar-foreground",
    active
      ? "bg-sidebar-active text-sidebar-foreground"
      : "text-sidebar-muted hover:bg-sidebar-hover hover:text-sidebar-foreground"
  );

/** On the sidebar surface, like the workspace header, so both shells read as one product. */
export default function PortalHeader() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open]);

  const close = () => setOpen(false);

  return (
    <header className="sticky top-0 z-40 border-b border-sidebar-border bg-sidebar text-sidebar-foreground">
      <div className="mx-auto flex h-16 max-w-300 items-center gap-2 px-4 md:gap-4 md:px-6">
        <Link
          href="/"
          onClick={close}
          aria-label="Inicio"
          className="flex h-11 shrink-0 items-center rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sidebar-foreground"
        >
          {/* Sized at what it renders, so the srcset does not ship the 1024px source. */}
          <Image src="/logos/mark-white.png" alt="" width={28} height={28} priority className="size-7" />
        </Link>

        <nav aria-label="Vista general" className="hidden md:block">
          <ul className="flex items-center gap-1">
            {GENERAL_LINKS.map((link) => {
              const active = isGeneralLinkActive(link, pathname);
              return (
                <li key={link.id}>
                  <Link href={link.path} aria-current={active ? "page" : undefined} className={navLinkClass(active)}>
                    {link.name}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <WorkspaceLink className="hidden md:inline-flex" />
          <PortalAccountMenu />
          <button
            type="button"
            onClick={() => setOpen((value) => !value)}
            aria-expanded={open}
            aria-controls="portal-menu"
            className="inline-flex h-11 items-center gap-1.5 rounded-md px-2 text-sm font-medium text-sidebar-foreground hover:bg-sidebar-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sidebar-foreground md:hidden"
          >
            {open ? <X className="size-4" aria-hidden="true" /> : <Menu className="size-4" aria-hidden="true" />}
            Menú
          </button>
        </div>
      </div>

      {open && (
        <nav
          id="portal-menu"
          aria-label="Vista general"
          className="border-t border-sidebar-border px-4 pt-2 pb-4 md:hidden"
        >
          <ul className="space-y-1">
            {GENERAL_LINKS.map((link) => {
              const active = isGeneralLinkActive(link, pathname);
              return (
                <li key={link.id}>
                  <Link
                    href={link.path}
                    onClick={close}
                    aria-current={active ? "page" : undefined}
                    className={cn(navLinkClass(active), "w-full")}
                  >
                    <link.icon className="size-4" aria-hidden="true" />
                    {link.name}
                  </Link>
                </li>
              );
            })}
          </ul>
          <WorkspaceLink className="mt-3 h-11 w-full justify-center" onNavigate={close} />
        </nav>
      )}
    </header>
  );
}
