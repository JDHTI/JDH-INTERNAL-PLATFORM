"use client";

import { useEffect, useState } from "react";
import type { Map as MapLibreMap, MapMouseEvent } from "maplibre-gl";
import { CloudOff, Combine, PenLine, Pencil, Plus, RefreshCw, Shapes, Trash2 } from "lucide-react";
import { toast } from "sonner";

import StatePanel from "@/shared/components/state-panel";
import TableSkeleton from "@/shared/components/table-skeleton";
import { Alert } from "@/shared/components/ui/alert";
import { Button } from "@/shared/components/ui/button";
import ConfirmDeleteDialog from "@/shared/components/ui/confirm-delete-dialog";
import { Field } from "@/shared/components/ui/field";
import { Input } from "@/shared/components/ui/input";
import { errorMessage } from "@/shared/lib/api-client";
import { cn } from "@/shared/lib/utils";

import {
  useCreateZone,
  useDeleteZone,
  useProspectMap,
  useUpdateZone,
  useZone,
  useZones,
} from "../hooks/use-commercial-map";
import { useCategoryColors, useProspectLayer, useZoneLayer } from "../hooks/use-map-layers";
import { useZoneDraw } from "../hooks/use-zone-draw";
import { formatCount } from "../lib/format";
import { LAYER } from "../lib/map-layers";
import { moveDuration } from "../lib/motion";
import { boundsOf } from "../lib/prospect-features";
import { mainRing } from "../lib/zone-geometry";
import type { PaletteKey, ZoneFeature } from "../types/commercial-map.types";
import ColorSwatches from "./color-swatches";
import { ColorDot } from "./prospect-marks";
import ZoneAdoptDialog from "./zone-adopt-dialog";

const ALL_PROSPECTS = {};

type Editing = { kind: "new" } | { kind: "existing"; id: string };

/**
 * The Zonas tab: the commercial zones JDH draws to segment its prospects.
 * Saving, moving or deleting one reassigns the prospects on the server.
 */
export default function ZonesView({ map, canManage }: { map: MapLibreMap | null; canManage: boolean }) {
  const zones = useZones("commercial");
  const prospects = useProspectMap(ALL_PROSPECTS);
  const colors = useCategoryColors();
  const remove = useDeleteZone();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editing, setEditing] = useState<Editing | null>(null);
  const [deleting, setDeleting] = useState<ZoneFeature | null>(null);
  const [adopting, setAdopting] = useState(false);

  useProspectLayer(map, prospects.data, colors);
  // The zone being reshaped leaves the painted layer: its draft takes its place.
  useZoneLayer(map, zones.data, editing ? null : selectedId, editing?.kind === "existing" ? editing.id : null);

  const frame = (zone: ZoneFeature) => {
    const bounds = boundsOf(mainRing(zone.geometry));
    if (map && bounds) map.fitBounds(bounds, { padding: 64, maxZoom: 15, duration: moveDuration() });
  };

  useEffect(() => {
    if (!map || editing) return;
    const onClick = (event: MapMouseEvent) => {
      const hit = map.queryRenderedFeatures(event.point, { layers: [LAYER.zonesFill] })[0];
      setSelectedId((hit?.properties?.id as string | undefined) ?? null);
    };
    map.on("click", onClick);
    return () => {
      map.off("click", onClick);
    };
  }, [map, editing]);

  if (editing) {
    return (
      <ZoneEditorLoader
        key={editing.kind === "existing" ? editing.id : "new"}
        map={map}
        zoneId={editing.kind === "existing" ? editing.id : null}
        onDone={(zone) => {
          setEditing(null);
          if (zone) setSelectedId(zone.properties.id);
        }}
      />
    );
  }

  const list = zones.data?.features ?? [];

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <p className="text-sm text-text-secondary">
          Cada prospecto pertenece a la zona comercial que lo contiene. Si dos zonas se cruzan, gana la más pequeña.
        </p>
        {canManage && (
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => setEditing({ kind: "new" })} className="max-md:h-11">
              <PenLine aria-hidden="true" /> Dibujar una zona
            </Button>
            <Button variant="outline" onClick={() => setAdopting(true)} className="max-md:h-11">
              <Combine aria-hidden="true" /> Unir zonas oficiales
            </Button>
          </div>
        )}
      </div>

      {zones.isPending ? (
        <TableSkeleton rows={4} label="Cargando las zonas comerciales" />
      ) : zones.isError ? (
        <StatePanel
          icon={CloudOff}
          tone="danger"
          title="No se pudieron cargar las zonas comerciales"
          action={
            <Button variant="outline" onClick={() => void zones.refetch()}>
              <RefreshCw aria-hidden="true" /> Reintentar
            </Button>
          }
        >
          {errorMessage(zones.error)}
        </StatePanel>
      ) : list.length === 0 ? (
        <StatePanel
          icon={Shapes}
          title="Todavía no hay zonas comerciales"
          action={
            canManage ? (
              <Button variant="outline" onClick={() => setEditing({ kind: "new" })}>
                <Plus aria-hidden="true" /> Dibujar la primera zona
              </Button>
            ) : undefined
          }
        >
          {canManage
            ? "Dibuja sobre el mapa las zonas en que el equipo reparte las visitas (Laureles, Poblado, Envigado). Los prospectos se asignan solos a la zona que los contiene."
            : "Quien gestiona el módulo dibuja las zonas en que el equipo reparte las visitas. Cuando existan, aparecerán aquí y en los filtros del mapa."}
        </StatePanel>
      ) : (
        <ul className="divide-y divide-border rounded-lg border border-border" aria-label="Zonas comerciales">
          {list.map((zone) => {
            const selected = zone.properties.id === selectedId;
            return (
              <li key={zone.properties.id} className={cn(selected && "bg-primary-subtle")}>
                <button
                  type="button"
                  aria-current={selected ? "true" : undefined}
                  onClick={() => {
                    setSelectedId(zone.properties.id);
                    frame(zone);
                  }}
                  className="flex min-h-11 w-full items-center gap-2 px-3 py-2 text-left transition-colors duration-150 hover:bg-primary-subtle focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-ring"
                >
                  <ColorDot color={zone.properties.color ?? "gray"} className="size-2.5" />
                  <span className="min-w-0 flex-1 truncate text-sm font-medium">{zone.properties.name}</span>
                  <span className="tabular text-[13px] text-text-secondary">
                    {zone.properties.prospect_count === 1
                      ? "1 prospecto"
                      : `${formatCount(zone.properties.prospect_count)} prospectos`}
                  </span>
                </button>
                {selected && canManage && (
                  <div className="flex flex-wrap gap-2 px-3 pb-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="max-md:h-11"
                      onClick={() => setEditing({ kind: "existing", id: zone.properties.id })}
                    >
                      <Pencil aria-hidden="true" /> Editar
                    </Button>
                    <Button variant="danger" size="sm" className="max-md:h-11" onClick={() => setDeleting(zone)}>
                      <Trash2 aria-hidden="true" /> Eliminar
                    </Button>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}

      <ZoneAdoptDialog
        open={adopting}
        onOpenChange={setAdopting}
        onCreated={(zone) => {
          toast.success(`Zona ${zone.properties.name} creada.`);
          setSelectedId(zone.properties.id);
        }}
      />

      <ConfirmDeleteDialog
        open={deleting !== null}
        onOpenChange={(open) => {
          if (!open) {
            setDeleting(null);
            remove.reset();
          }
        }}
        title={`Eliminar la zona ${deleting?.properties.name ?? ""}`}
        confirmLabel="Eliminar la zona"
        isPending={remove.isPending}
        error={remove.isError ? errorMessage(remove.error) : null}
        onConfirm={() => {
          if (!deleting) return;
          remove.mutate(deleting.properties.id, {
            onSuccess: () => {
              toast.success(`Zona ${deleting.properties.name} eliminada.`);
              setDeleting(null);
              setSelectedId(null);
            },
          });
        }}
      >
        {deleting && deleting.properties.prospect_count > 0
          ? `Sus ${formatCount(deleting.properties.prospect_count)} prospectos pasan a la zona que los contenga, o quedan sin zona comercial. Los prospectos y las rutas no se borran.`
          : "La zona no tiene prospectos. Los prospectos y las rutas no cambian."}
      </ConfirmDeleteDialog>
    </div>
  );
}

/** Editing needs the zone's full shape: the list brings it simplified for painting. */
function ZoneEditorLoader({
  map,
  zoneId,
  onDone,
}: {
  map: MapLibreMap | null;
  zoneId: string | null;
  onDone: (zone: ZoneFeature | null) => void;
}) {
  const zone = useZone(zoneId);

  if (zoneId === null) return <ZoneEditor map={map} zone={null} onDone={onDone} />;
  if (zone.isPending) return <TableSkeleton rows={4} label="Cargando la zona" />;
  if (zone.isError) {
    return (
      <StatePanel
        icon={CloudOff}
        tone="danger"
        title="No se pudo abrir la zona para editarla"
        action={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => void zone.refetch()}>
              <RefreshCw aria-hidden="true" /> Reintentar
            </Button>
            <Button variant="ghost" onClick={() => onDone(null)}>
              Volver a las zonas
            </Button>
          </div>
        }
      >
        {errorMessage(zone.error)}
      </StatePanel>
    );
  }
  return <ZoneEditor map={map} zone={zone.data} onDone={onDone} />;
}

function ZoneEditor({
  map,
  zone,
  onDone,
}: {
  map: MapLibreMap | null;
  zone: ZoneFeature | null;
  onDone: (zone: ZoneFeature | null) => void;
}) {
  const create = useCreateZone();
  const update = useUpdateZone();
  // What the editor opened on: a refetch must not restart a half-edited shape.
  const [initial] = useState(zone?.geometry ?? null);
  const [name, setName] = useState(zone?.properties.name ?? "");
  const [nameError, setNameError] = useState<string | null>(null);
  const [shapeError, setShapeError] = useState<string | null>(null);
  const [color, setColor] = useState<PaletteKey>(zone?.properties.color ?? "blue");
  const draw = useZoneDraw(map, initial, color);

  const saving = create.isPending || update.isPending;
  const failure = create.error ?? update.error;
  const missingName = "Escribe el nombre de la zona, por ejemplo Laureles.";

  const save = () => {
    const geometry = draw.drawing ? null : draw.geometry();
    const trimmed = name.trim();
    setNameError(trimmed === "" ? missingName : null);
    setShapeError(
      draw.drawing
        ? "La zona está abierta. Ciérrala con un clic en la primera esquina o en la última, y guarda de nuevo."
        : geometry
          ? null
          : "Dibuja la zona en el mapa antes de guardar."
    );
    if (trimmed === "" || !geometry) return;
    const done = (saved: ZoneFeature) => {
      toast.success(`Zona ${saved.properties.name} guardada.`);
      onDone(saved);
    };
    if (zone) update.mutate({ id: zone.properties.id, input: { name: trimmed, color, geometry } }, { onSuccess: done });
    else create.mutate({ name: trimmed, color, geometry }, { onSuccess: done });
  };

  return (
    <form
      aria-label={zone ? `Editar la zona ${zone.properties.name}` : "Nueva zona comercial"}
      className="space-y-4"
      onSubmit={(event) => {
        event.preventDefault();
        save();
      }}
    >
      <h2 className="text-base font-semibold">{zone ? `Editar la zona ${zone.properties.name}` : "Nueva zona comercial"}</h2>

      <Field label="Nombre de la zona" htmlFor="zone-name" error={nameError}>
        <Input
          id="zone-name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          onBlur={() => setNameError(name.trim() === "" ? missingName : null)}
          aria-invalid={nameError ? true : undefined}
          aria-describedby={nameError ? "zone-name-error" : undefined}
          maxLength={80}
          className="max-md:h-11"
        />
      </Field>

      <div className="space-y-1.5">
        <span id="zone-color" className="block text-[13px] font-medium">
          Color
        </span>
        <ColorSwatches value={color} onChange={setColor} labelledBy="zone-color" />
      </div>

      <section aria-label="Forma de la zona" className="space-y-2 rounded-lg border border-border p-3">
        <h3 className="text-[13px] font-medium">Forma en el mapa</h3>
        {draw.failed && (
          <Alert severity="warning">
            La forma guardada no se pudo abrir para editarla. Puedes cambiar el nombre y el color, o borrar el trazado
            y dibujarla de nuevo.
          </Alert>
        )}
        <p className="text-sm text-text-secondary" aria-live="polite">
          {draw.drawing
            ? "Sigue marcando esquinas. Para cerrar la zona, haz clic otra vez en la primera esquina o en la última."
            : draw.shapes === 0
              ? "Haz clic en el mapa para marcar cada esquina de la zona."
              : "Arrastra una esquina para moverla, o un punto intermedio para agregar una. Clic derecho sobre una esquina la quita."}
        </p>
        {draw.shapes > 0 && !draw.drawing && (
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" size="sm" className="max-md:h-11" onClick={draw.addShape}>
              <Plus aria-hidden="true" /> Agregar otra parte
            </Button>
            <Button type="button" variant="ghost" size="sm" className="max-md:h-11" onClick={draw.clear}>
              Borrar el trazado
            </Button>
          </div>
        )}
        {shapeError && (draw.shapes === 0 || draw.drawing) && (
          <p role="alert" className="text-[13px] text-danger">
            {shapeError}
          </p>
        )}
        <p className="text-[13px] text-text-secondary">
          Trazar la forma necesita mouse o pantalla táctil. Con solo teclado, usa «Unir zonas oficiales».
        </p>
      </section>

      {failure && (
        <p role="alert" className="rounded-md bg-danger-surface px-3 py-2 text-sm text-danger">
          {errorMessage(failure)}
        </p>
      )}

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button type="button" variant="outline" onClick={() => onDone(null)} className="max-md:h-11">
          Cancelar
        </Button>
        <Button type="submit" disabled={saving} className="max-md:h-11">
          Guardar la zona
        </Button>
      </div>
    </form>
  );
}
