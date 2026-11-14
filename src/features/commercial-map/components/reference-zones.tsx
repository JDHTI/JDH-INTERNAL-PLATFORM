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
import { mainRing, shortZoneName, useReferenceLayer } from "../hooks/use-map-layers";
import { formatCount } from "../lib/format";
import { LAYER, PROSPECT_HIT_LAYERS } from "../lib/map-layers";
import { moveDuration } from "../lib/motion";
import { boundsOf } from "../lib/prospect-features";
import type { ZoneFeature, ZoneLevel } from "../types/commercial-map.types";
import ZoneAdoptDialog from "./zone-adopt-dialog";

type ReferenceLevel = Extract<ZoneLevel, "commune" | "municipality">;

const LEVELS: Array<{ level: ReferenceLevel; label: string; all: string; one: string }> = [
  { level: "commune", label: "Comunas", all: "Todas las comunas y corregimientos", one: "Comuna o corregimiento" },
  { level: "municipality", label: "Municipios", all: "Todos los municipios", one: "Municipio" },
];

/**
 * The official perimeters as a reference layer: communes or municipalities,
 * one level at a time. A click inside a perimeter, or picking it from the
 * list, shows only the prospects that fall in it. An official zone assigns
 * nothing; to segment with it, it is adopted as a commercial zone.
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
  /** The zone filtering the map; it may be a commercial one, which this layer ignores. */
  zoneId: string | undefined;
  onZoneChange: (zoneId: string | undefined) => void;
  /** False while the map is taking clicks for something else, such as placing a pin. */
  enabled: boolean;
}) {
  const [level, setLevel] = useState<ReferenceLevel | null>(null);
  const [adopting, setAdopting] = useState(false);
  const official = useZones("official", level !== null, level ?? undefined);
  const zones = useMemo(
    () =>
      level === null
        ? []
        : [...(official.data?.features ?? [])].sort((a, b) =>
            shortZoneName(a.properties.name).localeCompare(shortZoneName(b.properties.name), "es")
          ),
    [level, official.data]
  );
  const selected = zones.find((zone) => zone.properties.id === zoneId) ?? null;
  const copy = LEVELS.find((item) => item.level === level);

  useReferenceLayer(map, level === null ? undefined : official.data, selected?.properties.id ?? null);

  const pick = (zone: ZoneFeature | null) => {
    onZoneChange(zone?.properties.id);
    const bounds = zone ? boundsOf(mainRing(zone.geometry)) : null;
    if (map && bounds) map.fitBounds(bounds, { padding: 48, maxZoom: 15, duration: moveDuration() });
  };

  const latest = useRef({ zones, selected, pick });
  useEffect(() => {
    latest.current = { zones, selected, pick };
  });

  useEffect(() => {
    if (!map || !enabled || level === null) return;
    const onClick = (event: MapMouseEvent) => {
      // A prospect under the pointer wins: the click is for its card.
      const marks = PROSPECT_HIT_LAYERS.filter((id) => map.getLayer(id));
      if (map.queryRenderedFeatures(event.point, { layers: marks }).length > 0) return;
      const hit = map.queryRenderedFeatures(event.point, { layers: [LAYER.referenceFill] })[0];
      const zone = latest.current.zones.find((item) => item.properties.id === hit?.properties?.id);
      if (!zone) return;
      // A second click on the perimeter in use lets it go.
      latest.current.pick(zone.properties.id === latest.current.selected?.properties.id ? null : zone);
    };
    map.on("click", onClick);
    return () => {
      map.off("click", onClick);
    };
  }, [map, enabled, level]);

  const show = (next: ReferenceLevel) => {
    // The perimeter in use belongs to the level being left.
    if (selected) onZoneChange(undefined);
    setLevel(level === next ? null : next);
  };

  return (
    <section aria-labelledby="reference-title" className="space-y-2">
      <h2 id="reference-title" className="text-[13px] font-medium">
        Contornos de referencia
      </h2>
      <div className="flex flex-wrap gap-2" role="group" aria-labelledby="reference-title">
        {LEVELS.map((item) => (
          <ToggleChip key={item.level} active={level === item.level} onClick={() => show(item.level)}>
            {item.label}
          </ToggleChip>
        ))}
      </div>

      {level !== null && official.isPending && (
        <div className="h-9 animate-pulse rounded-md bg-canvas-subtle" aria-busy="true">
          <span className="sr-only">Cargando los contornos</span>
        </div>
      )}
      {level !== null && official.isError && (
        <div role="alert" className="space-y-2 rounded-md bg-danger-surface px-3 py-2 text-sm text-danger">
          <p>No se pudieron cargar los contornos. {errorMessage(official.error)}</p>
          <Button variant="outline" size="sm" className="max-md:h-11" onClick={() => void official.refetch()}>
            <RefreshCw aria-hidden="true" /> Reintentar
          </Button>
        </div>
      )}
      {level !== null && official.isSuccess && zones.length === 0 && (
        <p className="text-[13px] text-text-secondary">
          Todavía no hay contornos cargados para este nivel. TI los carga una vez.
        </p>
      )}

      {copy && zones.length > 0 && (
        <>
          <Dropdown
            aria-label={copy.one}
            options={zones.map((zone) => ({
              value: zone.properties.id,
              label: `${zone.properties.name} (${formatCount(zone.properties.prospect_count)})`,
            }))}
            value={selected?.properties.id ?? ""}
            onValueChange={(value) => pick(zones.find((zone) => zone.properties.id === value) ?? null)}
            placeholder={copy.all}
            clearable
            clearLabel="Quitar el filtro por contorno"
            className="max-md:[&_[data-slot=dropdown-trigger]]:h-11"
          />
          {selected ? (
            <p className="text-[13px] text-text-secondary">
              El mapa y la lista muestran solo los prospectos dentro de {shortZoneName(selected.properties.name)}. Un
              contorno es una referencia: no asigna prospectos a una zona comercial.
            </p>
          ) : (
            <p className="text-[13px] text-text-secondary">
              Haz clic dentro de un contorno, o elígelo en la lista, para ver solo sus prospectos.
            </p>
          )}
          {selected && canManage && (
            <Button variant="outline" size="sm" className="max-md:h-11" onClick={() => setAdopting(true)}>
              <Combine aria-hidden="true" /> Crear una zona comercial con este contorno
            </Button>
          )}
        </>
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
