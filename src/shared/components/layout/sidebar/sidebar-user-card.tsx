"use client";

import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { LogOut } from "lucide-react";
import { toast } from "sonner";

import SessionAvatar from "@/features/directory/components/session-avatar";
import { useSession } from "@/features/session/hooks/use-session";
import { roleLabel, type SessionUser } from "@/features/session/types/session.types";
import { LOGIN_URL, logoutSession } from "@/shared/lib/api-client";
import { useUiStore } from "@/shared/store/use-ui-store";
import { cn } from "@/shared/lib/utils";

/** The identity card is backed by the API session and owns the logout action. */
export default function SidebarUserCard() {
  const isSidebarCollapsed = useUiStore((state) => state.isSidebarCollapsed);
  const { data: user, isPending } = useSession();
  const router = useRouter();
  const queryClient = useQueryClient();

  const handleLogout = async () => {
    try {
      await logoutSession();
      queryClient.clear();
      router.replace("/login");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo cerrar la sesión.");
    }
  };

  if (isPending) {
    return <div className="h-12 animate-pulse rounded-md bg-sidebar-subtle" />;
  }

  if (!user) {
    return (
      <a
        href={LOGIN_URL}
        className="block rounded-md border border-sidebar-border p-2 text-center text-xs text-sidebar-muted hover:bg-sidebar-hover hover:text-sidebar-foreground"
      >
        Iniciar sesión
      </a>
    );
  }

  if (isSidebarCollapsed) {
    return (
      <div
        className="flex size-12 items-center justify-center rounded-md border border-sidebar-border"
        title={`${user.displayName} · ${user.email}`}
      >
        <UserAvatar user={user} />
        <span className="sr-only">
          {user.displayName}, {user.email}, {roleLabel(user.role)}
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
        {user.role !== "user" && (
          <p className="truncate text-[10px] font-medium text-sidebar-muted">{roleLabel(user.role)}</p>
        )}
        <p className="truncate text-[11px] text-sidebar-muted" title={user.email}>
          {user.email}
        </p>
      </div>
      <button
        type="button"
        onClick={handleLogout}
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
  return <SessionAvatar user={user} />;
}
