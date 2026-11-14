"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Map as MapLibreMap } from "maplibre-gl";
import { Maximize, RefreshCw, X } from "lucide-react";
import { toast } from "sonner";

import { Alert } from "@/shared/components/ui/alert";
import { Button } from "@/shared/components/ui/button";
import { useDebouncedValue } from "@/shared/hooks/use-debounced-value";
import { errorMessage } from "@/shared/lib/api-client";
import { cn } from "@/shared/lib/utils";

import { useProspectFacets, useProspectMap, useProspects, useZones } from "../hooks/use-commercial-map";
import { useFan } from "../hooks/use-fan";
import {
  BESIDE_CARD_OFFSET,
  revealBesideCard,
  useCategoryColors,
  useProspectClicks,
  useProspectLayer,
  useZoneLayer,
} from "../hooks/use-map-layers";
import { formatCount } from "../lib/format";
import { CHIP_ZOOM, EMPTY, setSourceData, SOURCE } from "../lib/map-layers";
import { moveDuration } from "../lib/motion";
import { boundsOf, categoryColor, type PreparedFeature } from "../lib/prospect-features";
import type { ProspectFilters } from "../types/commercial-map.types";
import { hasSavedCamera } from "./map-canvas";
import MapDock from "./map-dock";
import ProspectCard from "./prospect-card";
import ProspectFilterPanel, { hasActiveFilters } from "./prospect-filters";
import ProspectList from "./prospect-list";
import { ProspectMark } from "./prospect-marks";
import ReferenceZones from "./reference-zones";
import RelocationBar, { type Relocation } from "./relocation-bar";

const PAGE_SIZE = 50;

/**
 * The Mapa tab: the prospects on the map, the filters that narrow them and
 * the same prospects as a list. Returns the panel; the card, the fan and the
 * pin live on the map it is given.
 */
export default function ProspectsView({
  map,
  overlay,
  docked,
  canManage,
  relocation,
  onRelocationChange,
  onOpenUnlocated,
}: {
  map: MapLibreMap | null;
  /** The layer over the map, and whether the map is wide enough to dock the card on it. */
  overlay: HTMLElement | null;
  docked: boolean;
  canManage: boolean;
  relocation: Relocation | null;
  onRelocationChange: (relocation: Relocation | null) => void;
  onOpenUnlocated: () => void;
}) {
  const [filters, setFilters] = useState<ProspectFilters>({});
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<{ id: string; fromList: boolean } | null>(null);
  const { fan, open: openFan, close: closeFan } = useFan(map);

  const q = useDebouncedValue(search.trim());
  const active = useMemo<ProspectFilters>(() => ({ ...filters, q: q || undefined }), [filters, q]);
  const filtered = hasActiveFilters(filters, search);

  const colors = useCategoryColors();
  const facets = useProspectFacets();
  const zones = useZones("commercial");
  const mapData = useProspectMap(active);
  const list = useProspects({ ...active, located: true, page, size: PAGE_SIZE });

  const prepared = useProspectLayer(map, mapData.data, colors);
  useZoneLayer(map, zones.data);

  const index = useMemo(
    () => new Map((prepared?.features ?? []).map((feature) => [feature.properties.id, feature])),
    [prepared]
  );
  // A selection the filters took off the map is no selection.
  const selection = selected && index.has(selected.id) ? selected : null;
  const selectedFeature = selection ? index.get(selection.id) : undefined;
  const selectedPosition =
    (selection && fan?.positions.get(selection.id)) ??
    (selectedFeature?.geometry.coordinates as [number, number] | undefined) ??
    null;

  const closeAll = useCallback(() => {
    setSelected(null);
    closeFan();
  }, [closeFan]);

  const changeFilters = (patch: Partial<ProspectFilters>) => {
    setFilters((current) => ({ ...current, ...patch }));
    setPage(1);
    closeAll();
  };
  const clearFilters = () => {
    setFilters({});
    setSearch("");
    setPage(1);
    closeAll();
  };

  useProspectClicks(
    map,
    prepared,
    {
      onPick: (feature) => {
        setSelected({ id: feature.properties.id, fromList: false });
        const position = fan?.positions.get(feature.properties.id) ?? feature.geometry.coordinates;
        if (map && docked) revealBesideCard(map, position as [number, number]);
      },
      onStack: (leaves) => {
        if (!map) return;
        setSelected(null);
        openFan(leaves);
        if (docked) revealBesideCard(map, leaves[0].geometry.coordinates as [number, number]);
      },
      onMiss: closeAll,
    },
    relocation === null
  );

  // The first load frames every prospect; after that the camera is the user's.
  const framed = useRef(hasSavedCamera());
  const frame = useCallback(
    (animate: boolean) => {
      const bounds = boundsOf((prepared?.features ?? []).map((feature) => feature.geometry.coordinates));
      if (!map || !bounds) return;
      map.fitBounds(bounds, { padding: 56, maxZoom: 15, duration: animate ? moveDuration() : 0 });
    },
    [map, prepared]
  );
  useEffect(() => {
    if (framed.current || !map || !prepared || prepared.features.length === 0) return;
    framed.current = true;
    frame(false);
  }, [map, prepared, frame]);

  useEffect(() => {
    if (!map) return;
    setSourceData(
      map,
      SOURCE.selection,
      selectedPosition
        ? { type: "Feature", properties: {}, geometry: { type: "Point", coordinates: selectedPosition } }
        : EMPTY
    );
  }, [map, selectedPosition]);

  useEffect(() => {
    if (!map) return;
    return () => {
      setSourceData(map, SOURCE.selection, EMPTY);
    };
  }, [map]);

  /** From the list: goes to the prospect and opens its card, fanning its point out when it is shared. */
  const focusProspect = (id: string) => {
    const feature = index.get(id);
    if (!feature) return;
    setSelected({ id, fromList: true });
    if (!map) return;
    const stack = (prepared?.features ?? []).filter(
      (candidate) => candidate.properties.stack_key === feature.properties.stack_key
    );
    map.once("moveend", () => (stack.length > 1 ? openFan(stack) : closeFan()));
    map.easeTo({
      center: feature.geometry.coordinates as [number, number],
      zoom: Math.max(map.getZoom(), CHIP_ZOOM + 1),
      offset: docked ? BESIDE_CARD_OFFSET : [0, 0],
      duration: moveDuration(),
    });
  };

  const card = selection ? (
    <ProspectCard
      prospectId={selection.id}
      color={categoryColor(colors, selectedFeature?.properties.category ?? null)}
      canManage={canManage}
      focusOnOpen={selection.fromList}
      onClose={() => {
        setSelected(null);
        // Opened from the list with the keyboard: focus goes back to the row it came from.
        if (!selection.fromList) return;
        const row = document.querySelector<HTMLElement>(`[data-prospect="${selection.id}"]`);
        requestAnimationFrame(() => row?.focus());
      }}
      onRelocate={(prospect) => {
        closeAll();
        onRelocationChange({
          id: prospect.id,
          name: prospect.name,
          start:
            prospect.latitude !== null && prospect.longitude !== null
              ? { latitude: prospect.latitude, longitude: prospect.longitude }
              : null,
        });
      }}
    />
  ) : fan ? (
    <StackCard
      leaves={fan.leaves}
      colorOf={(leaf) => categoryColor(colors, leaf.properties.category)}
      onPick={(leaf) => setSelected({ id: leaf.properties.id, fromList: true })}
      onClose={closeFan}
    />
  ) : null;

  const relocationBar = relocation && (
    <RelocationBar
      key={relocation.id}
      map={map}
      relocation={relocation}
      onCancel={() => onRelocationChange(null)}
      onSaved={(prospect) => {
        toast.success(`Ubicación de ${prospect.name} guardada.`);
        onRelocationChange(null);
        setSelected({ id: prospect.id, fromList: true });
      }}
    />
  );

  const total = prepared?.features.length ?? 0;
  const unlocated = facets.data?.unlocated ?? 0;

  return (
    <div className="space-y-4">
      <MapDock overlay={overlay} docked={docked}>
        {relocationBar || card}
      </MapDock>

      <ProspectFilterPanel
        filters={filters}
        onChange={changeFilters}
        search={search}
        onSearchChange={(text) => {
          setSearch(text);
          setPage(1);
        }}
        facets={facets.data}
        zones={zones.data}
        colors={colors}
        onClear={clearFilters}
      />

      <ReferenceZones
        map={map}
        canManage={canManage}
        zoneId={filters.zone_id}
        onZoneChange={(zoneId) => changeFilters({ zone_id: zoneId })}
        enabled={relocation === null}
      />

      {mapData.isError ? (
        <Alert severity="danger">
          <p className="font-medium">No se pudieron traer los prospectos al mapa</p>
          <p>{errorMessage(mapData.error)}</p>
          <Button variant="outline" size="sm" className="mt-2 max-md:h-11" onClick={() => void mapData.refetch()}>
            <RefreshCw aria-hidden="true" /> Reintentar
          </Button>
        </Alert>
      ) : (
        <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
          <p className="text-[13px] text-text-secondary" aria-live="polite">
            {mapData.isPending ? (
              "Cargando los prospectos…"
            ) : (
              <>
                <span className="tabular font-medium text-text-primary">{formatCount(total)}</span>{" "}
                {total === 1 ? "prospecto en el mapa" : "prospectos en el mapa"}
              </>
            )}
          </p>
          {total > 0 && (
            <Button variant="ghost" size="sm" className="max-md:h-11" onClick={() => frame(true)}>
              <Maximize aria-hidden="true" /> Encuadrar todos
            </Button>
          )}
        </div>
      )}

      {!filtered && unlocated > 0 && (
        <p className="text-[13px] text-text-secondary">
          {unlocated === 1
            ? "1 prospecto no tiene ubicación y no aparece en el mapa."
            : `${formatCount(unlocated)} prospectos no tienen ubicación y no aparecen en el mapa.`}{" "}
          <button
            type="button"
            onClick={onOpenUnlocated}
            className="rounded-sm font-medium text-text-primary underline underline-offset-2 hover:no-underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring max-md:inline-flex max-md:min-h-11 max-md:items-center"
          >
            Ver los que faltan por ubicar
          </button>
        </p>
      )}

      <section aria-label="Lista de prospectos">
        <ProspectList
          query={list}
          colors={colors}
          selectedId={selection?.id ?? null}
          onSelect={(prospect) => focusProspect(prospect.id)}
          onPageChange={setPage}
          filtered={filtered}
          onClear={clearFilters}
          emptyHint={
            canManage
              ? "Carga el archivo mensual en la pestaña Importar para verlos aquí."
              : "Quien gestiona el módulo carga el archivo mensual de prospectos. Cuando lo haga, aparecerán aquí."
          }
        />
      </section>
    </div>
  );
}

/** The prospects that share one point, by name: what the fan shows, in a list a keyboard can walk. */
function StackCard({
  leaves,
  colorOf,
  onPick,
  onClose,
  className,
}: {
  leaves: PreparedFeature[];
  colorOf: (leaf: PreparedFeature) => ReturnType<typeof categoryColor>;
  onPick: (leaf: PreparedFeature) => void;
  onClose: () => void;
  className?: string;
}) {
  return (
    <section
      aria-label={`${leaves.length} prospectos en este punto`}
      onKeyDown={(event) => {
        if (event.key === "Escape") onClose();
      }}
      className={cn(
        "flex max-h-full w-full flex-col overflow-hidden rounded-xl border border-border-control bg-surface-raised text-sm shadow-sm",
        className
      )}
    >
      <header className="flex items-start gap-2 border-b border-border px-4 py-3">
        <div className="min-w-0 flex-1">
          <h2 className="text-base font-semibold">{formatCount(leaves.length)} prospectos en este punto</h2>
          <p className="text-[13px] text-text-secondary">
            El archivo los ubica en el mismo sitio, así que la dirección de cada uno es la referencia. Elige uno para
            ver sus datos.
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Cerrar la lista de prospectos de este punto"
          className="-mt-1 -mr-2 flex size-8 shrink-0 items-center justify-center rounded-md text-text-secondary transition-colors duration-150 hover:bg-canvas-subtle hover:text-text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring max-md:size-11"
        >
          <X className="size-4" aria-hidden="true" />
        </button>
      </header>
      <ul className="min-h-0 divide-y divide-border overflow-y-auto overscroll-contain [scrollbar-width:thin]">
        {leaves.map((leaf) => (
          <li key={leaf.properties.id}>
            <button
              type="button"
              onClick={() => onPick(leaf)}
              className="flex min-h-11 w-full items-center gap-2 px-4 py-2 text-left transition-colors duration-150 hover:bg-primary-subtle focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-ring"
            >
              <ProspectMark color={colorOf(leaf)} former={leaf.properties.is_former_customer} approximate />
              <span className="min-w-0 flex-1 truncate font-medium">{leaf.properties.name}</span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
