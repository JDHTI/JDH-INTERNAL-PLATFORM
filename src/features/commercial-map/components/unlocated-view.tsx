"use client";

import { useState } from "react";
import { CloudOff, MapPinCheck, MapPinned, RefreshCw, Search, SearchX } from "lucide-react";

import Pager from "@/shared/components/pager";
import StatePanel from "@/shared/components/state-panel";
import TableSkeleton from "@/shared/components/table-skeleton";
import { Button } from "@/shared/components/ui/button";
import { Dropdown } from "@/shared/components/ui/dropdown";
import { Input } from "@/shared/components/ui/input";
import { useDebouncedValue } from "@/shared/hooks/use-debounced-value";
import { errorMessage } from "@/shared/lib/api-client";
import { cn } from "@/shared/lib/utils";

import { useProspectFacets, useProspects } from "../hooks/use-commercial-map";
import { formatCount } from "../lib/format";
import type { ProspectSummary } from "../types/commercial-map.types";
import type { Relocation } from "./relocation-bar";

const PAGE_SIZE = 50;
const HEAD = "px-3 py-2 text-left text-[11px] font-semibold tracking-[0.06em] text-text-secondary uppercase";

/**
 * Prospects the monthly file brought without a point. They cannot be on the
 * map or in a route until someone places them.
 */
export default function UnlocatedView({
  canManage,
  onLocate,
}: {
  canManage: boolean;
  onLocate: (relocation: Relocation) => void;
}) {
  const [search, setSearch] = useState("");
  const [sheet, setSheet] = useState("");
  const [page, setPage] = useState(1);
  const q = useDebouncedValue(search.trim());
  const facets = useProspectFacets();
  const prospects = useProspects({
    q: q || undefined,
    source_zone: sheet || undefined,
    located: false,
    page,
    size: PAGE_SIZE,
  });
  const filtered = search.trim() !== "" || sheet !== "";
  const clear = () => {
    setSearch("");
    setSheet("");
    setPage(1);
  };
  const locate = (prospect: ProspectSummary) => onLocate({ id: prospect.id, name: prospect.name, start: null });

  return (
    <div className="space-y-4">
      <p className="max-w-prose text-sm text-text-secondary">
        El archivo mensual trajo estos prospectos sin punto en el mapa.{" "}
        {canManage
          ? "Ubica cada uno con su dirección: después aparece en el mapa y se puede agregar a una ruta."
          : "Quien gestiona el módulo puede ubicarlos; mientras tanto no aparecen en el mapa."}
      </p>

      <section aria-label="Filtros de prospectos por ubicar" className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_16rem]">
        <div className="relative">
          <Search
            className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-text-secondary"
            aria-hidden="true"
          />
          <Input
            type="search"
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(1);
            }}
            placeholder="Nombre, dirección o ID"
            aria-label="Buscar prospectos por ubicar por nombre, dirección o ID"
            className="pl-8 max-md:h-11"
          />
        </div>
        <Dropdown
          aria-label="Zona del archivo"
          options={(facets.data?.source_zones ?? []).map((zone) => ({ value: zone.value, label: zone.value }))}
          value={sheet}
          onValueChange={(value) => {
            setSheet(value);
            setPage(1);
          }}
          placeholder="Todas las zonas del archivo"
          clearable
          clearLabel="Quitar el filtro de zona del archivo"
          className="max-md:[&_[data-slot=dropdown-trigger]]:h-11"
        />
      </section>

      {prospects.isPending ? (
        <TableSkeleton rows={8} label="Cargando los prospectos por ubicar" />
      ) : prospects.isError ? (
        <StatePanel
          icon={CloudOff}
          tone="danger"
          title="No se pudieron cargar los prospectos por ubicar"
          action={
            <Button variant="outline" onClick={() => void prospects.refetch()}>
              <RefreshCw aria-hidden="true" /> Reintentar
            </Button>
          }
        >
          {errorMessage(prospects.error)}
        </StatePanel>
      ) : prospects.data.items.length === 0 ? (
        filtered ? (
          <StatePanel
            icon={SearchX}
            title="Ningún prospecto por ubicar coincide con la búsqueda"
            action={
              <Button variant="outline" onClick={clear}>
                Limpiar filtros
              </Button>
            }
          >
            Prueba con otra zona o con menos palabras.
          </StatePanel>
        ) : (
          <StatePanel icon={MapPinCheck} title="Todos los prospectos tienen ubicación">
            No queda ninguno por ubicar. Si la próxima carga trae prospectos sin punto, aparecerán aquí.
          </StatePanel>
        )
      ) : (
        <div className={cn("space-y-3", prospects.isPlaceholderData && "opacity-60")}>
          <p className="text-[13px] text-text-secondary" aria-live="polite">
            <span className="tabular font-medium text-text-primary">{formatCount(prospects.data.total)}</span>{" "}
            {prospects.data.total === 1 ? "prospecto por ubicar" : "prospectos por ubicar"}
          </p>

          {/* From md up, a table; on a phone, one card per prospect with what places it. */}
          <div className="hidden overflow-hidden rounded-lg border border-border md:block">
            <table className="w-full text-sm">
              <thead className="bg-canvas-subtle">
                <tr>
                  <th scope="col" className={HEAD}>ID</th>
                  <th scope="col" className={HEAD}>Establecimiento</th>
                  <th scope="col" className={HEAD}>Zona del archivo</th>
                  <th scope="col" className={HEAD}>Dirección</th>
                  {canManage && <th scope="col" className={cn(HEAD, "w-44")}><span className="sr-only">Acciones</span></th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {prospects.data.items.map((prospect) => (
                  <tr key={prospect.id} className="hover:bg-primary-subtle">
                    <td className="px-3 py-2 font-mono text-[13px] whitespace-nowrap">{prospect.external_id}</td>
                    <td className="px-3 py-2">
                      <span className="font-medium">{prospect.name}</span>
                      {prospect.category && (
                        <span className="block text-[13px] text-text-secondary">{prospect.category}</span>
                      )}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap">{prospect.source_zone}</td>
                    <td className="px-3 py-2">
                      {prospect.address ?? <span className="text-text-secondary">Sin dirección en el archivo</span>}
                      {prospect.sector && (
                        <span className="block text-[13px] text-text-secondary">{prospect.sector}</span>
                      )}
                    </td>
                    {canManage && (
                      <td className="px-3 py-2 text-right">
                        <Button variant="outline" size="sm" onClick={() => locate(prospect)}>
                          <MapPinned aria-hidden="true" /> Ubicar en el mapa
                        </Button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <ul className="space-y-2 md:hidden">
            {prospects.data.items.map((prospect) => (
              <li key={prospect.id} className="space-y-2 rounded-lg border border-border p-3">
                <div>
                  <p className="font-medium [overflow-wrap:anywhere]">{prospect.name}</p>
                  <p className="text-[13px] text-text-secondary">
                    <span className="font-mono">{prospect.external_id}</span> · {prospect.source_zone}
                  </p>
                </div>
                <p className="text-sm [overflow-wrap:anywhere]">
                  {prospect.address ?? <span className="text-text-secondary">Sin dirección en el archivo</span>}
                  {prospect.sector && <span className="block text-[13px] text-text-secondary">{prospect.sector}</span>}
                </p>
                {canManage && (
                  <Button variant="outline" className="h-11 w-full" onClick={() => locate(prospect)}>
                    <MapPinned aria-hidden="true" /> Ubicar en el mapa
                  </Button>
                )}
              </li>
            ))}
          </ul>

          <Pager
            page={prospects.data.page}
            size={prospects.data.size}
            total={prospects.data.total}
            count={prospects.data.items.length}
            onPageChange={setPage}
          />
        </div>
      )}
    </div>
  );
}
