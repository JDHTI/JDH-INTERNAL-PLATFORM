"use client";

import {
  PLACEHOLDER_USER,
  getInitials,
  type SessionUser,
} from "@/shared/config/session.mock";
import { useUiStore } from "@/shared/store/use-ui-store";
import { cn } from "@/shared/lib/utils";

/**
 * Identity card.
 *
 * Information only, with no menu behind it: there is no session to sign out
 * of and no profile page to open yet, and a card that looks pressable but
 * does nothing is worse than a card that plainly does not.
 */
export default function SidebarUserCard() {
  const isSidebarCollapsed = useUiStore((state) => state.isSidebarCollapsed);
  const user = PLACEHOLDER_USER;

  if (isSidebarCollapsed) {
    return (
      <div className="flex justify-center">
        <UserAvatar user={user} />
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
