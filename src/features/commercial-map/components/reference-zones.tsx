"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { Map as MapLibreMap, MapMouseEvent } from "maplibre-gl";
import { Combine, RefreshCw } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/shared/components/ui/button";
import { Dropdown } from "@/shared/components/ui/dropdown";
import { ToggleChip } from "@/shared/components/ui/toggle-chip";
import { errorMessage } from "@/shared/lib/api-client";

import { useZones } from "../hooks/use-commercial-map";
import { shortZoneName, useReferenceLayer } from "../hooks/use-map-layers";
import { formatCount } from "../lib/format";
import { LAYER, PROSPECT_HIT_LAYERS } from "../lib/map-layers";
import { moveDuration } from "../lib/motion";
import { boundsOf } from "../lib/prospect-features";
import { holds, mainRing, segmentColors } from "../lib/zone-geometry";
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
  enabled,
}: {
  map: MapLibreMap | null;
  canManage: boolean;
  /** The zone filtering the map; it may be a commercial one, which these filters ignore. */
  zoneId: string | undefined;
  onZoneChange: (zoneId: string | undefined) => void;
  /** False while the map is taking clicks for something else, such as placing a pin. */
  enabled: boolean;
}) {
  const [adopting, setAdopting] = useState(false);
  const [segmented, setSegmented] = useState(false);
  const [communeNames, setCommuneNames] = useState(true);
  const [municipalityNames, setMunicipalityNames] = useState(true);
  const communeQuery = useZones("official", true, "commune");
  const municipalityQuery = useZones("official", true, "municipality");
  const communes = useMemo(() => byName(communeQuery.data?.features), [communeQuery.data]);
  const municipalities = useMemo(() => byName(municipalityQuery.data?.features), [municipalityQuery.data]);

  const selected = useMemo(
    () => [...communes, ...municipalities].find((zone) => zone.properties.id === zoneId) ?? null,
    [communes, municipalities, zoneId]
  );
  // With the segmentation on, every perimeter; without it, only the one that is filtering.
  const outline = useMemo<ZoneCollection | undefined>(() => {
    const features = segmented ? [...municipalities, ...communes] : selected ? [selected] : [];
    return features.length > 0 ? { type: "FeatureCollection", features } : undefined;
  }, [segmented, municipalities, communes, selected]);
  // Each commune gets a hue of its own. A municipality is one gray, unless it
  // is the one split into communes: theirs already cover it.
  const tints = useMemo(() => {
    if (!segmented) return null;
    const colors = segmentColors(communes);
    for (const municipality of municipalities) {
      if (!communes.some((commune) => holds(municipality, commune))) colors.set(municipality.properties.id, "gray");
    }
    return colors;
  }, [segmented, communes, municipalities]);
  useReferenceLayer(map, outline, selected?.properties.id ?? null, {
    tints,
    communeNames: segmented && communeNames,
    municipalityNames: segmented && municipalityNames,
  });

  // One zone filters at a time: picking a municipality replaces the commune, and the other way round.
  const choose = (zone: ZoneFeature | null) => {
    onZoneChange(zone?.properties.id);
    const bounds = zone ? boundsOf(mainRing(zone.geometry)) : null;
    if (map && bounds) map.fitBounds(bounds, { padding: 48, maxZoom: 15, duration: moveDuration() });
  };
  const pick = (zones: ZoneFeature[], id: string) => choose(zones.find((item) => item.properties.id === id) ?? null);

  const latest = useRef({ communes, municipalities, selected, choose });
  useEffect(() => {
    latest.current = { communes, municipalities, selected, choose };
  });

  // With the segmentation on, a click inside a segment filters by it.
  useEffect(() => {
    if (!map || !enabled || !segmented) return;
    const onClick = (event: MapMouseEvent) => {
      // A prospect under the pointer wins: the click is for its card.
      const marks = PROSPECT_HIT_LAYERS.filter((id) => map.getLayer(id));
      if (map.queryRenderedFeatures(event.point, { layers: marks }).length > 0) return;
      const ids = map
        .queryRenderedFeatures(event.point, { layers: [LAYER.referenceFill] })
        .map((feature) => feature.properties?.id as string);
      // Inside Medellín the point is in a commune and in the municipality: the smaller one is meant.
      const zone =
        latest.current.communes.find((item) => ids.includes(item.properties.id)) ??
        latest.current.municipalities.find((item) => ids.includes(item.properties.id));
      if (!zone) return;
      // A second click on the segment in use lets it go.
      latest.current.choose(zone.properties.id === latest.current.selected?.properties.id ? null : zone);
    };
    map.on("click", onClick);
    return () => {
      map.off("click", onClick);
    };
  }, [map, enabled, segmented]);

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

      {!none && !pending && !failed && (
        <ToggleChip
          active={segmented}
          onClick={() => setSegmented((current) => !current)}
          title="Muestra cómo se divide el territorio en municipios y comunas, con los prospectos de cada parte. El color solo distingue una comuna de la vecina."
        >
          Ver segmentación
        </ToggleChip>
      )}

      {segmented && (
        <div role="group" aria-labelledby="segment-names-title" className="flex flex-wrap items-center gap-2">
          <span id="segment-names-title" className="text-[13px] text-text-secondary">
            Nombres
          </span>
          {communes.length > 0 && (
            <ToggleChip active={communeNames} onClick={() => setCommuneNames((current) => !current)}>
              Comunas
            </ToggleChip>
          )}
          {municipalities.length > 0 && (
            <ToggleChip active={municipalityNames} onClick={() => setMunicipalityNames((current) => !current)}>
              Municipios
            </ToggleChip>
          )}
        </div>
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
