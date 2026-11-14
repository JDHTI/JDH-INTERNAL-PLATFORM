"use client";

import { useMemo, useState } from "react";
import type { Map as MapLibreMap } from "maplibre-gl";
import { Combine, RefreshCw } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/shared/components/ui/button";
import { Dropdown } from "@/shared/components/ui/dropdown";
import { errorMessage } from "@/shared/lib/api-client";

import { useZones } from "../hooks/use-commercial-map";
import { mainRing, shortZoneName, useReferenceLayer } from "../hooks/use-map-layers";
import { formatCount } from "../lib/format";
import { moveDuration } from "../lib/motion";
import { boundsOf } from "../lib/prospect-features";
import type { ZoneCollection, ZoneFeature } from "../types/commercial-map.types";
import ZoneAdoptDialog from "./zone-adopt-dialog";

const TALL = "w-64 max-w-full max-md:w-full max-md:[&_[data-slot=dropdown-trigger]]:h-11";

function byName(zones: ZoneFeature[] | undefined): ZoneFeature[] {
  return [...(zones ?? [])].sort((a, b) =>
    shortZoneName(a.properties.name).localeCompare(shortZoneName(b.properties.name), "es")
  );
}

const asOptions = (zones: ZoneFeature[]) =>
  zones.map((zone) => ({
    value: zone.properties.id,
    label: `${zone.properties.name} (${formatCount(zone.properties.prospect_count)})`,
  }));

/**
 * The map's own filters, in the bar over it: one commune or one municipality
 * of the official layer. Picking one shows only the prospects that fall inside
 * and draws that perimeter alone, so the map says what it is showing. An
 * official zone assigns nothing; to segment with it, it is adopted as a
 * commercial zone.
 */
export default function ReferenceZones({
  map,
  canManage,
  zoneId,
  onZoneChange,
}: {
  map: MapLibreMap | null;
  canManage: boolean;
  /** The zone filtering the map; it may be a commercial one, which these filters ignore. */
  zoneId: string | undefined;
  onZoneChange: (zoneId: string | undefined) => void;
}) {
  const [adopting, setAdopting] = useState(false);
  const communeQuery = useZones("official", true, "commune");
  const municipalityQuery = useZones("official", true, "municipality");
  const communes = useMemo(() => byName(communeQuery.data?.features), [communeQuery.data]);
  const municipalities = useMemo(() => byName(municipalityQuery.data?.features), [municipalityQuery.data]);

  const selected = useMemo(
    () => [...communes, ...municipalities].find((zone) => zone.properties.id === zoneId) ?? null,
    [communes, municipalities, zoneId]
  );
  const outline = useMemo<ZoneCollection | undefined>(
    () => (selected ? { type: "FeatureCollection", features: [selected] } : undefined),
    [selected]
  );
  useReferenceLayer(map, outline, selected?.properties.id ?? null);

  // One zone filters at a time: picking a municipality replaces the commune, and the other way round.
  const pick = (zones: ZoneFeature[], id: string) => {
    const zone = zones.find((item) => item.properties.id === id) ?? null;
    onZoneChange(zone?.properties.id);
    const bounds = zone ? boundsOf(mainRing(zone.geometry)) : null;
    if (map && bounds) map.fitBounds(bounds, { padding: 48, maxZoom: 15, duration: moveDuration() });
  };

  const pending = communeQuery.isPending || municipalityQuery.isPending;
  const failed = communeQuery.isError ? communeQuery : municipalityQuery.isError ? municipalityQuery : null;
  const none = !pending && !failed && communes.length === 0 && municipalities.length === 0;

  return (
    <section
      aria-labelledby="map-filters-title"
      className="relative z-[3] flex flex-wrap items-center gap-x-3 gap-y-2 rounded-t-lg border border-b-0 border-border bg-surface px-3 py-2"
    >
      <h2 id="map-filters-title" className="text-[13px] font-medium">
        Filtros
      </h2>

      {pending && (
        <div className="h-8 w-64 max-w-full animate-pulse rounded-md bg-canvas-subtle" aria-busy="true">
          <span className="sr-only">Cargando las comunas y los municipios</span>
        </div>
      )}
      {failed && (
        <div role="alert" className="flex flex-wrap items-center gap-2 text-[13px] text-danger">
          <span>No se pudieron cargar las comunas y los municipios. {errorMessage(failed.error)}</span>
          <Button variant="outline" size="sm" className="max-md:h-11" onClick={() => void failed.refetch()}>
            <RefreshCw aria-hidden="true" /> Reintentar
          </Button>
        </div>
      )}
      {none && (
        <p className="text-[13px] text-text-secondary">
          Todavía no hay comunas ni municipios cargados para filtrar. TI los carga una vez.
        </p>
      )}

      {communes.length > 0 && (
        <Dropdown
          aria-label="Comuna o corregimiento"
          options={asOptions(communes)}
          value={communes.some((zone) => zone.properties.id === zoneId) ? (zoneId as string) : ""}
          onValueChange={(value) => pick(communes, value)}
          placeholder="Todas las comunas"
          size="sm"
          clearable
          clearLabel="Quitar el filtro de comuna"
          panelClassName="max-h-72"
          className={TALL}
        />
      )}
      {municipalities.length > 0 && (
        <Dropdown
          aria-label="Municipio"
          options={asOptions(municipalities)}
          value={municipalities.some((zone) => zone.properties.id === zoneId) ? (zoneId as string) : ""}
          onValueChange={(value) => pick(municipalities, value)}
          placeholder="Todos los municipios"
          size="sm"
          clearable
          clearLabel="Quitar el filtro de municipio"
          panelClassName="max-h-72"
          className={TALL}
        />
      )}

      {selected && canManage && (
        <Button variant="outline" size="sm" className="max-md:h-11" onClick={() => setAdopting(true)}>
          <Combine aria-hidden="true" /> Crear zona comercial
        </Button>
      )}

      {selected && (
        <ZoneAdoptDialog
          key={selected.properties.id}
          open={adopting}
          onOpenChange={setAdopting}
          preset={{ ids: [selected.properties.id], name: shortZoneName(selected.properties.name) }}
          onCreated={(zone) => {
            toast.success(`Zona comercial ${zone.properties.name} creada.`);
            // From here on the filter is the commercial zone, which does assign its prospects.
            onZoneChange(zone.properties.id);
          }}
        />
      )}
    </section>
  );
}
