"use client";

import { useId, useMemo } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { SearchableDropdown } from "@/shared/components/ui/searchable-dropdown";

import type { IncreaseFilterOptions, IncreaseScope } from "../types/price-increases.types";

/**
 * The C.O. and installation of the history and the analysis, kept in the URL
 * (`co`, `instalacion`) next to the view's other parameters, so the detail of
 * a reference and a shared link read the same scope.
 */
export function useIncreaseScope(): [IncreaseScope, (next: IncreaseScope) => void] {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const scope = { co: searchParams.get("co") ?? "", installation: searchParams.get("instalacion") ?? "" };
  const setScope = (next: IncreaseScope) => {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, value] of [
      ["co", next.co],
      ["instalacion", next.installation],
    ] as const) {
      if (value) params.set(key, value);
      else params.delete(key);
    }
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  };
  return [scope, setScope];
}

/**
 * Two searchable dropdowns: the C.O. as "003 · CENTRO", the installation by
 * name. A C.O. narrows the installations to its own, and drops one that is not.
 * Without the DWH the options come empty and both stay off.
 */
export function IncreaseScopeFilters({
  options,
  scope,
  onChange,
}: {
  options: IncreaseFilterOptions | undefined;
  scope: IncreaseScope;
  onChange: (next: IncreaseScope) => void;
}) {
  const coId = useId();
  const installationId = useId();
  const loading = options === undefined;
  const unavailable = !loading && options.cos.length === 0;
  const cos = useMemo(
    () => (options?.cos ?? []).map((item) => ({ value: item.code, label: item.name ? `${item.code} · ${item.name}` : item.code })),
    [options]
  );
  const installations = useMemo(
    () =>
      (options?.installations ?? [])
        .filter((item) => !scope.co || item.cos.includes(scope.co))
        .map((item) => ({ value: item.code, label: item.name ?? item.code })),
    [options, scope.co]
  );
  const placeholder = (ready: string) => (loading ? "Cargando…" : unavailable ? "No disponible" : ready);
  const title = unavailable ? "El DWH no respondió: no hay lista de C.O. ni de instalaciones." : undefined;

  return (
    <>
      <div title={title}>
        <label htmlFor={coId} className="sr-only">
          C.O.
        </label>
        <SearchableDropdown
          id={coId}
          options={cos}
          value={scope.co}
          onValueChange={(co) => {
            const installation = options?.installations.find((item) => item.code === scope.installation);
            // An installation outside the new C.O. would cross to nothing.
            const keep = !co || !installation || installation.cos.includes(co);
            onChange({ co, installation: keep ? scope.installation : "" });
          }}
          placeholder={placeholder("Todos los C.O.")}
          emptyMessage="Ningún C.O. con ese código o nombre."
          clearLabel="Quitar el C.O."
          disabled={loading || (unavailable && !scope.co)}
        />
      </div>
      <div title={title}>
        <label htmlFor={installationId} className="sr-only">
          Instalación
        </label>
        <SearchableDropdown
          id={installationId}
          options={installations}
          value={scope.installation}
          onValueChange={(installation) => onChange({ ...scope, installation })}
          placeholder={placeholder("Todas las instalaciones")}
          emptyMessage="Ninguna instalación con ese nombre."
          clearLabel="Quitar la instalación"
          disabled={loading || (unavailable && !scope.installation)}
        />
      </div>
    </>
  );
}

/** What a C.O. or installation does to the figures, said under the filters. */
export function ScopeNote({ scope }: { scope: IncreaseScope }) {
  if (!scope.co && !scope.installation) return null;
  const place = scope.co && scope.installation ? "ese C.O. e instalación" : scope.co ? "ese C.O." : "esa instalación";
  return (
    <p className="text-xs text-text-secondary">
      Solo referencias activas en {place}; cuentan las alzas nacionales y las de su regional.
    </p>
  );
}
