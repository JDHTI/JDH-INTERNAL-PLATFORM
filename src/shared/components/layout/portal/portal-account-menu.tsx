"use client";

import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { ChevronDown, LogOut, Moon, ShieldCheck, Sun } from "lucide-react";
import { toast } from "sonner";

import SessionAvatar from "@/features/directory/components/session-avatar";
import { useSession } from "@/features/session/hooks/use-session";
import { Menu, MenuItem, MenuSeparator } from "@/shared/components/ui/menu";
import { ADMIN_PATH } from "@/shared/config/areas.config";
import { ACCOUNT_LINKS } from "@/shared/config/general.config";
import { LOGIN_URL, logoutSession } from "@/shared/lib/api-client";
import { cn } from "@/shared/lib/utils";
import { useUiStore } from "@/shared/store/use-ui-store";

/** Who is signed in, their own pages, the theme and the way out. */
export default function PortalAccountMenu() {
  const { data: user, isPending } = useSession();
  const { theme, setTheme } = useUiStore();
  const router = useRouter();
  const queryClient = useQueryClient();

  if (isPending) {
    return <div className="size-9 animate-pulse rounded-md bg-sidebar-subtle" aria-busy="true" />;
  }

  if (!user) {
    return (
      <a
        href={LOGIN_URL}
        className="inline-flex h-9 items-center rounded-md border border-sidebar-border px-3 text-sm font-medium text-sidebar-foreground hover:bg-sidebar-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sidebar-foreground"
      >
        Iniciar sesión
      </a>
    );
  }

  const logout = async () => {
    try {
      await logoutSession();
      queryClient.clear();
      router.replace("/login");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo cerrar la sesión.");
    }
  };

  const isDark = theme === "dark";

  return (
    <Menu
      align="end"
      triggerLabel={`Cuenta de ${user.displayName}`}
      triggerClassName={cn(
        "flex h-11 items-center gap-2 rounded-md px-1.5 text-sidebar-foreground transition-colors duration-150 md:h-9",
        "hover:bg-sidebar-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sidebar-foreground"
      )}
      trigger={
        <>
          <SessionAvatar user={user} />
          <span className="hidden max-w-40 truncate text-sm font-medium lg:block">{user.displayName}</span>
          <ChevronDown className="size-4 text-sidebar-muted" aria-hidden="true" />
        </>
      }
    >
      <div className="px-2 py-1.5">
        <p className="truncate text-sm font-medium">{user.displayName}</p>
        <p className="truncate text-xs text-text-secondary">{user.email}</p>
      </div>
      <MenuSeparator />
      {ACCOUNT_LINKS.map((link) => (
        <MenuItem key={link.id} onClick={() => router.push(link.path)}>
          <link.icon aria-hidden="true" />
          {link.name}
        </MenuItem>
      ))}
      {user.role === "admin" && (
        <MenuItem onClick={() => router.push(`${ADMIN_PATH}/areas`)}>
          <ShieldCheck aria-hidden="true" />
          Panel administrador
        </MenuItem>
      )}
      <MenuItem onClick={() => setTheme(isDark ? "light" : "dark")}>
        {isDark ? <Sun aria-hidden="true" /> : <Moon aria-hidden="true" />}
        {isDark ? "Tema claro" : "Tema oscuro"}
      </MenuItem>
      <MenuSeparator />
      <MenuItem onClick={logout}>
        <LogOut aria-hidden="true" />
        Cerrar sesión
      </MenuItem>
    </Menu>
  );
}
