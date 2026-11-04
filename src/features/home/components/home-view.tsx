"use client";

import { useSyncExternalStore } from "react";
import Link from "next/link";
import { Contact, LayoutGrid, ShieldCheck, type LucideIcon } from "lucide-react";

import { useAreas } from "@/features/areas/hooks/use-areas";
import BirthdaysPanel from "@/features/directory/components/birthdays-panel";
import NewHires from "@/features/directory/components/new-hires";
import { useSession } from "@/features/session/hooks/use-session";
import { ADMIN_PATH } from "@/shared/config/areas.config";
import { LAST_AREA_STORAGE_KEY } from "@/shared/config/general.config";

const longDate = new Intl.DateTimeFormat("es-CO", {
  weekday: "long",
  day: "numeric",
  month: "long",
});

function greeting(hour: number): string {
  if (hour < 12) return "Buenos días";
  if (hour < 19) return "Buenas tardes";
  return "Buenas noches";
}

// Read after hydration: the greeting depends on the visitor's clock.
const noSubscription = () => () => {};
const readNow = () => Math.floor(Date.now() / 60_000);

function readLastArea(): string | null {
  try {
    return window.localStorage.getItem(LAST_AREA_STORAGE_KEY);
  } catch {
    return null;
  }
}

interface Shortcut {
  href: string;
  title: string;
  detail: string;
  icon: LucideIcon;
}

/** The front page. Strapi news and events take its top once the API serves them. */
export default function HomeView() {
  const { data: user } = useSession();
  const { data: areas = [] } = useAreas();
  const minute = useSyncExternalStore(noSubscription, readNow, () => null);
  const lastSlug = useSyncExternalStore(noSubscription, readLastArea, () => null);

  const firstName = user?.displayName.trim().split(/\s+/)[0];
  const now = minute === null ? null : new Date(minute * 60_000);
  const hour = now?.getHours() ?? null;

  const workspace = areas.find((area) => area.slug === lastSlug) ?? areas[0];
  const shortcuts: Shortcut[] = [
    { href: "/directorio", title: "Directorio", detail: "Busca a cualquier persona por nombre, cargo o correo.", icon: Contact },
    ...(workspace
      ? [{ href: workspace.path, title: "Espacio de trabajo", detail: `Tus módulos, empezando por ${workspace.name}.`, icon: LayoutGrid }]
      : []),
    ...(user?.role === "admin"
      ? [{ href: `${ADMIN_PATH}/areas`, title: "Panel administrador", detail: "Áreas, usuarios, directorio, sedes y maestros.", icon: ShieldCheck }]
      : []),
  ];

  return (
    <div className="space-y-10">
      <header className="space-y-1">
        <p className="text-sm text-text-secondary first-letter:uppercase">
          {now ? longDate.format(now) : " "}
        </p>
        <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">
          {hour !== null && firstName ? `${greeting(hour)}, ${firstName}` : "Inicio"}
        </h1>
      </header>

      <nav aria-label="Accesos" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {shortcuts.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="group flex min-h-20 items-start gap-3 rounded-lg border border-border p-4 transition-colors duration-150 hover:bg-canvas-subtle focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            <item.icon className="mt-0.5 size-5 shrink-0 text-text-secondary group-hover:text-text-primary" aria-hidden="true" />
            <span className="min-w-0 space-y-0.5">
              <span className="block font-semibold">{item.title}</span>
              <span className="block text-sm text-text-secondary">{item.detail}</span>
            </span>
          </Link>
        ))}
      </nav>

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <BirthdaysPanel />
        <NewHires />
      </div>
    </div>
  );
}
