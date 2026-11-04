"use client";

import {
  getInitials,
  type SessionUser,
} from "@/features/session/types/session.types";
import { cn } from "@/shared/lib/utils";

import { useMyEmployee } from "../hooks/use-directory";
import { employeePhotoUrl } from "../types/directory.types";

/**
 * Directory photo first (the nightly sync keeps it current), then the one from
 * sign-in, then initials. `/me` is 404 for the dev user and before the first sync.
 */
export default function SessionAvatar({
  user,
  className,
}: {
  user: SessionUser;
  className?: string;
}) {
  const { data: me } = useMyEmployee();
  const src = (me && employeePhotoUrl(me, 96)) ?? user.photoUrl;
  const box = cn("size-8 shrink-0 rounded-sm", className);

  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={src} alt="" width={32} height={32} className={cn(box, "object-cover")} />
    );
  }

  return (
    <span
      aria-hidden="true"
      className={cn(
        box,
        "flex items-center justify-center bg-sidebar-active text-[11px] font-semibold text-sidebar-foreground"
      )}
    >
      {getInitials(user.displayName)}
    </span>
  );
}
