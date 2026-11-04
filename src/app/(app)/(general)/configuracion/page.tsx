"use client";

import { Moon, Sun } from "lucide-react";

import { useUiStore } from "@/shared/store/use-ui-store";
import { cn } from "@/shared/lib/utils";

export default function ConfiguracionPage() {
  const { theme, setTheme } = useUiStore();

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Configuración</h1>
        <p className="text-sm text-text-secondary">
          Preferencias de la plataforma para tu cuenta.
        </p>
      </div>

      <section className="max-w-prose space-y-3 rounded-lg border border-border p-4">
        <div className="space-y-1">
          <h2 className="text-base font-semibold">Apariencia</h2>
          <p className="text-sm text-text-secondary">
            La preferencia se guarda en este navegador. En otro equipo vuelve a
            seguir la configuración del sistema operativo.
          </p>
        </div>

        <div
          role="radiogroup"
          aria-label="Tema de la interfaz"
          className="flex w-full max-w-xs items-center gap-1 rounded-md border border-border p-1"
        >
          <ThemeOption
            label="Claro"
            icon={<Sun className="size-4" aria-hidden="true" />}
            isSelected={theme === "light"}
            onSelect={() => setTheme("light")}
          />
          <ThemeOption
            label="Oscuro"
            icon={<Moon className="size-4" aria-hidden="true" />}
            isSelected={theme === "dark"}
            onSelect={() => setTheme("dark")}
          />
        </div>
      </section>

      <section className="max-w-prose space-y-1 rounded-lg border border-border p-4">
        <h2 className="text-base font-semibold">Cuenta</h2>
        <p className="text-sm text-text-secondary">
          Nombre, correo, cargo y foto vienen de Microsoft Entra y se cambian
          allí, no aquí. La plataforma los vuelve a leer cada noche y cada vez
          que inicias sesión.
        </p>
      </section>
    </div>
  );
}

function ThemeOption({
  label,
  icon,
  isSelected,
  onSelect,
}: {
  label: string;
  icon: React.ReactNode;
  isSelected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={isSelected}
      onClick={onSelect}
      className={cn(
        "flex h-9 flex-1 items-center justify-center gap-2 rounded-sm text-sm font-medium",
        "transition-colors duration-150",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
        isSelected
          ? "bg-primary text-text-on-primary"
          : "text-text-secondary hover:text-text-primary"
      )}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}
