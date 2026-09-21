"use client";

import { LogOut } from "lucide-react";
import { toast } from "sonner";

import {
  PLACEHOLDER_USER,
  getInitials,
  type SessionUser,
} from "@/shared/config/session.mock";
import { useUiStore } from "@/shared/store/use-ui-store";
import { cn } from "@/shared/lib/utils";

/**
 * Identity card. The logout control explains that Entra must be connected
 * before a real session can be closed.
 */
export default function SidebarUserCard() {
  const isSidebarCollapsed = useUiStore((state) => state.isSidebarCollapsed);
  const user = PLACEHOLDER_USER;

  if (isSidebarCollapsed) {
    return (
      // Square with the same 8px frame as the collapsed area card, so the top
      // and bottom of the rail bookend each other.
      <div
        className="flex size-12 items-center justify-center rounded-md border border-sidebar-border"
        title={`${user.displayName} · ${user.email}`}
      >
        <UserAvatar user={user} />
        {/* The avatar is decorative, and `title` on a non-interactive element
            is not reliably announced, so the identity is spelled out here. */}
        <span className="sr-only">
          {user.displayName}, {user.email}
        </span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2.5 rounded-md border border-sidebar-border p-2">
      <UserAvatar user={user} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-sidebar-foreground">
          {user.displayName}
        </p>
        <p className="truncate text-[11px] text-sidebar-muted" title={user.email}>
          {user.email}
        </p>
      </div>
      <button
        type="button"
        onClick={() =>
          toast.info(
            "El cierre de sesión estará disponible cuando se conecte Microsoft Entra."
          )
        }
        className={cn(
          "flex size-8 shrink-0 items-center justify-center rounded-sm text-sidebar-muted",
          "transition-colors duration-150 hover:bg-sidebar-hover hover:text-sidebar-foreground",
          "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sidebar-foreground"
        )}
        aria-label="Cerrar sesión"
        title="Cerrar sesión"
      >
        <LogOut className="size-4" aria-hidden="true" />
      </button>
    </div>
  );
}

function UserAvatar({ user }: { user: SessionUser }) {
  if (user.photoUrl) {
    return (
      // The photo is streamed from our own Graph proxy, same origin and
      // already sized, so next/image would add a round trip and no benefit.
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={user.photoUrl}
        alt=""
        width={32}
        height={32}
        className="size-8 shrink-0 rounded-sm object-cover"
      />
    );
  }

  return (
    <span
      className={cn(
        "flex size-8 shrink-0 items-center justify-center rounded-sm",
        "bg-sidebar-active text-[11px] font-semibold text-sidebar-foreground"
      )}
      aria-hidden="true"
    >
      {getInitials(user.displayName)}
    </span>
  );
}
