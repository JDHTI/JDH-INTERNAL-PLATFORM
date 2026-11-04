"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { CloudOff, Search, UserRoundSearch } from "lucide-react";

import SessionRequired from "@/features/areas/components/session-required";
import Pager from "@/shared/components/pager";
import StatePanel from "@/shared/components/state-panel";
import TableSkeleton from "@/shared/components/table-skeleton";
import { Button } from "@/shared/components/ui/button";
import { Dropdown } from "@/shared/components/ui/dropdown";
import { Input } from "@/shared/components/ui/input";
import { useDebouncedValue } from "@/shared/hooks/use-debounced-value";
import { ApiError, errorMessage } from "@/shared/lib/api-client";
import { cn } from "@/shared/lib/utils";

import { useEmployees, useSites } from "../hooks/use-directory";
import { DIRECTORY_PAGE_SIZE, employeePosition, hasPosition } from "../types/directory.types";
import EmployeeAvatar from "./employee-avatar";

/**
 * The public directory. Search, site and page live in the URL, so a filtered
 * list can be linked and the back button returns to it.
 */
export default function DirectoryBrowser() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const q = params.get("q") ?? "";
  const siteId = params.get("sede") ?? "";
  const page = Math.max(1, Number.parseInt(params.get("pagina") ?? "1", 10) || 1);

  const [draft, setDraft] = useState(q);
  const debounced = useDebouncedValue(draft.trim());

  const setParams = (next: { q?: string; sede?: string; pagina?: number }) => {
    const search = new URLSearchParams(params.toString());
    for (const [key, value] of Object.entries(next)) {
      if (value === undefined || value === "" || value === 1) search.delete(key);
      else search.set(key, String(value));
    }
    const query = search.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  };

  // A new search starts on page 1; the URL check keeps the same text from resetting it.
  useEffect(() => {
    if (debounced !== q) setParams({ q: debounced, pagina: 1 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debounced]);

  const employees = useEmployees(q, siteId, page);
  const sites = useSites();

  const siteOptions = [
    { value: "", label: "Todas las sedes" },
    ...(sites.data?.items ?? [])
      .filter((site) => site.employee_count > 0)
      .map((site) => ({ value: site.id, label: `${site.name} (${site.employee_count})` })),
  ];

  if (employees.error instanceof ApiError && employees.error.status === 401) {
    return <SessionRequired message={employees.error.detail} />;
  }

  const items = employees.data?.items ?? [];

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row">
        <div className="relative min-w-0 flex-1">
          <Search
            className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-text-secondary"
            aria-hidden="true"
          />
          <Input
            type="search"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder="Nombre, cargo o correo"
            aria-label="Buscar en el directorio"
            className="h-11 pl-9 sm:h-9"
          />
        </div>
        <Dropdown
          className="sm:w-64"
          value={siteId}
          onValueChange={(value) => setParams({ sede: value, pagina: 1 })}
          options={siteOptions}
          aria-label="Sede"
          disabled={sites.isPending || siteOptions.length === 1}
        />
      </div>

      {employees.isPending ? (
        <TableSkeleton rows={8} label="Cargando el directorio" />
      ) : employees.isError ? (
        <StatePanel
          icon={CloudOff}
          title="No se pudo cargar el directorio"
          tone="danger"
          action={
            <Button variant="outline" onClick={() => employees.refetch()}>
              Reintentar
            </Button>
          }
        >
          {errorMessage(employees.error)}
        </StatePanel>
      ) : items.length === 0 ? (
        <StatePanel icon={UserRoundSearch} title={q || siteId ? "Nadie coincide con la búsqueda" : "El directorio está vacío"}>
          {q || siteId
            ? "Prueba con el inicio del nombre o del apellido, o quita el filtro de sede."
            : "Las personas aparecen después de la primera sincronización con Microsoft Entra."}
        </StatePanel>
      ) : (
        <>
          <div
            className={cn(
              "overflow-x-auto rounded-lg border border-border",
              employees.isPlaceholderData && "opacity-60"
            )}
            aria-busy={employees.isPlaceholderData}
          >
            <table className="w-full min-w-[40rem] text-left text-sm">
              <thead className="bg-canvas-subtle text-xs text-text-secondary">
                <tr>
                  <th scope="col" className="px-3 py-2 font-medium">Persona</th>
                  <th scope="col" className="px-3 py-2 font-medium">Cargo</th>
                  <th scope="col" className="px-3 py-2 font-medium">Departamento</th>
                  <th scope="col" className="px-3 py-2 font-medium">Sede</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {items.map((employee) => (
                  <tr key={employee.id} className="hover:bg-canvas-subtle">
                    <td className="px-3 py-2">
                      <Link
                        href={`/directorio/${employee.id}`}
                        className="flex min-h-11 items-center gap-3 rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                      >
                        <EmployeeAvatar employee={employee} />
                        <span className="min-w-0">
                          <span className="block truncate font-medium">{employee.full_name}</span>
                          <span className="block truncate text-xs text-text-secondary">
                            {employee.email ?? "Sin correo"}
                          </span>
                        </span>
                      </Link>
                    </td>
                    <td className={cn("px-3 py-2", !hasPosition(employee) && "text-text-secondary")}>
                      {employeePosition(employee)}
                    </td>
                    <td className="px-3 py-2 text-text-secondary">{employee.department ?? "Sin departamento"}</td>
                    <td className="px-3 py-2 text-text-secondary">{employee.site?.name ?? "Sin sede"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pager
            page={page}
            size={DIRECTORY_PAGE_SIZE}
            total={employees.data?.total ?? 0}
            count={items.length}
            onPageChange={(next) => setParams({ pagina: next })}
          />
        </>
      )}
    </div>
  );
}
