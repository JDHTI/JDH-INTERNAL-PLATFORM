"use client";

import { Popover } from "@base-ui/react/popover";
import { Settings2 } from "lucide-react";

import { Button, buttonVariants } from "@/shared/components/ui/button";
import { cn } from "@/shared/lib/utils";

export type FilterOption<K extends string> = { key: K; label: string };

/**
 * Which filters each person keeps in the toolbar; the rest wait in «Más filtros».
 * It lives in this browser only (`useStoredPreference`), so nobody changes
 * anyone else's toolbar.
 */
export default function CustomizeFilters<K extends string>({
  options,
  shown,
  onChange,
  defaults,
}: {
  options: FilterOption<K>[];
  shown: ReadonlySet<K>;
  onChange: (next: K[]) => void;
  defaults: readonly K[];
}) {
  const toggle = (key: K) => {
    const next = new Set(shown);
    if (!next.delete(key)) next.add(key);
    onChange(options.map((option) => option.key).filter((candidate) => next.has(candidate)));
  };
  const isDefault = defaults.length === shown.size && defaults.every((key) => shown.has(key));

  return (
    <Popover.Root>
      <Popover.Trigger className={cn(buttonVariants({ variant: "outline" }), "max-md:h-11")}>
        <Settings2 aria-hidden="true" /> Personalizar filtros
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Positioner side="bottom" align="end" sideOffset={6} className="z-50">
          <Popover.Popup className="w-72 max-w-[calc(100vw-2rem)] space-y-3 rounded-lg border border-border bg-surface-raised p-3 text-sm text-text-primary shadow-modal outline-none">
            <div className="space-y-0.5">
              <Popover.Title className="text-sm font-semibold">Filtros en la barra</Popover.Title>
              <Popover.Description className="text-[13px] text-text-secondary">
                Los que no marques quedan en «Más filtros». Se guarda en este navegador.
              </Popover.Description>
            </div>
            <fieldset className="grid gap-0.5">
              <legend className="sr-only">Filtros visibles en la barra</legend>
              {options.map((option) => (
                <label
                  key={option.key}
                  className="flex min-h-8 cursor-pointer items-center gap-2 rounded-md px-1.5 hover:bg-canvas-subtle max-md:min-h-11"
                >
                  <input
                    type="checkbox"
                    checked={shown.has(option.key)}
                    onChange={() => toggle(option.key)}
                    className="size-4 accent-[var(--primary)]"
                  />
                  {option.label}
                </label>
              ))}
            </fieldset>
            <Button variant="ghost" size="sm" onClick={() => onChange([...defaults])} disabled={isDefault} className="max-md:h-11">
              Restablecer
            </Button>
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  );
}
