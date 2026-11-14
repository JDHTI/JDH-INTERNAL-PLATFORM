"use client";

import { useEffect, useMemo, useState } from "react";
import type { Map as MapLibreMap, MapMouseEvent } from "maplibre-gl";
import { ArrowDown, ArrowUp, Crosshair, X } from "lucide-react";

import { Alert } from "@/shared/components/ui/alert";
import { Button } from "@/shared/components/ui/button";
import { DatePicker } from "@/shared/components/ui/date-picker";
import { Dropdown } from "@/shared/components/ui/dropdown";
import { Field } from "@/shared/components/ui/field";
import { Input } from "@/shared/components/ui/input";
import { errorMessage } from "@/shared/lib/api-client";

import {
  useCreateRoute,
  useProspectFacets,
  useProspectMap,
  useUpdateRoute,
  useZones,
} from "../hooks/use-commercial-map";
import { useFan } from "../hooks/use-fan";
import { useCategoryColors, useProspectClicks, useProspectLayer } from "../hooks/use-map-layers";
import { formatCoordinates, parseCoordinates, type Coordinates } from "../lib/coordinates";
import { PROSPECT_LAYERS, setLayersVisible, setSourceData, SOURCE } from "../lib/map-layers";
import { moveDuration } from "../lib/motion";
import { boundsOf, type PreparedFeature } from "../lib/prospect-features";
import { MAX_STOPS, routeMapData } from "../lib/route-features";
import type { RouteDetail, RouteOrigin, RouteUpdateInput } from "../types/commercial-map.types";

const ALL_PROSPECTS = {};
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface DraftStop {
  /** Prospect id. */
  id: string;
  name: string;
  detail: string | null;
  latitude: number;
  longitude: number;
}

const fromFeature = (feature: PreparedFeature): DraftStop => ({
  id: feature.properties.id,
  name: feature.properties.name,
  detail: feature.properties.sector ?? feature.properties.source_zone,
  longitude: feature.geometry.coordinates[0],
  latitude: feature.geometry.coordinates[1],
});

/**
 * Puts a route together: its stops, picked on the map or taken from a zone,
 * in the order they will be visited. Creating it computes the way by streets
 * once; after that, opening the route costs nothing.
 */
export default function RouteBuilder({
  map,
  route,
  onDone,
}: {
  map: MapLibreMap | null;
  /** The route being edited; null for a new one. */
  route: RouteDetail | null;
  onDone: (route: RouteDetail | null) => void;
}) {
  const create = useCreateRoute();
  const update = useUpdateRoute();
  const colors = useCategoryColors();
  const prospects = useProspectMap(ALL_PROSPECTS);
  const zones = useZones("commercial");
  const facets = useProspectFacets();
  const prepared = useProspectLayer(map, prospects.data, colors);
  const { open: openFan, close: closeFan } = useFan(map);

  const [name, setName] = useState(route?.name ?? "");
  const [plannedFor, setPlannedFor] = useState(route?.planned_for ?? "");
  const [email, setEmail] = useState(route?.assignee?.email ?? "");
  const [origin, setOrigin] = useState<Coordinates | null>(
    route?.origin ? { latitude: route.origin.latitude, longitude: route.origin.longitude } : null
  );
  const [originLabel, setOriginLabel] = useState(route?.origin?.label ?? "");
  const [originText, setOriginText] = useState(route?.origin ? formatCoordinates(route.origin) : "");
  const [pickingOrigin, setPickingOrigin] = useState(false);
  const [optimize, setOptimize] = useState(true);
  const [stops, setStops] = useState<DraftStop[]>(() =>
    (route?.stops ?? [])
      .filter((stop) => stop.prospect_id !== null)
      .map((stop) => ({
        id: stop.prospect_id as string,
        name: stop.name,
        detail: stop.address,
        latitude: stop.latitude,
        longitude: stop.longitude,
      }))
  );
  const [errors, setErrors] = useState<{ name?: string; email?: string; origin?: string; stops?: string }>({});
  const [notice, setNotice] = useState<string | null>(null);

  const toggle = (feature: PreparedFeature) => {
    if (stops.some((stop) => stop.id === feature.properties.id)) {
      setStops(stops.filter((stop) => stop.id !== feature.properties.id));
      setNotice(null);
    } else if (stops.length >= MAX_STOPS) {
      setNotice(`Una ruta admite ${MAX_STOPS} paradas. Quita una para agregar otra.`);
    } else {
      setStops([...stops, fromFeature(feature)]);
      setNotice(null);
    }
  };

  useProspectClicks(map, prepared, { onPick: toggle, onStack: openFan, onMiss: closeFan }, !pickingOrigin);

  // While a route is being put together the prospects are what you pick from.
  useEffect(() => {
    if (!map) return;
    setLayersVisible(map, PROSPECT_LAYERS, true);
    return () => setLayersVisible(map, PROSPECT_LAYERS, false);
  }, [map]);

  useEffect(() => {
    if (!map || !pickingOrigin) return;
    const onClick = (event: MapMouseEvent) => {
      const next = { latitude: event.lngLat.lat, longitude: event.lngLat.lng };
      setOrigin(next);
      setOriginText(formatCoordinates(next));
      setPickingOrigin(false);
      setErrors((current) => ({ ...current, origin: undefined }));
    };
    const canvas = map.getCanvas();
    canvas.style.cursor = "crosshair";
    map.on("click", onClick);
    return () => {
      map.off("click", onClick);
      canvas.style.cursor = "";
    };
  }, [map, pickingOrigin]);

  const draftOrigin = useMemo<RouteOrigin | null>(
    () => (origin ? { ...origin, label: originLabel.trim() || null } : null),
    [origin, originLabel]
  );

  useEffect(() => {
    if (!map) return;
    const data = routeMapData(
      stops.map((stop) => ({ ...stop, done: false })),
      draftOrigin,
      null,
      "pending"
    );
    setSourceData(map, SOURCE.routeLine, data.line);
    setSourceData(map, SOURCE.routeStops, data.points);
  }, [map, stops, draftOrigin]);

  const zoneOptions = [
    ...(zones.data?.features ?? []).map((zone) => ({
      value: `c:${zone.properties.id}`,
      label: `Zona comercial: ${zone.properties.name}`,
    })),
    ...(facets.data?.source_zones ?? []).map((zone) => ({
      value: `f:${zone.value}`,
      label: `Zona del archivo: ${zone.value}`,
    })),
  ];

  const addZone = (value: string) => {
    if (!value || !prepared) return;
    const key = value.slice(2);
    const inZone = prepared.features.filter((feature) =>
      value.startsWith("c:") ? feature.properties.commercial_zone_id === key : feature.properties.source_zone === key
    );
    const fresh = inZone.filter((feature) => !stops.some((stop) => stop.id === feature.properties.id));
    const room = MAX_STOPS - stops.length;
    const added = fresh.slice(0, Math.max(room, 0));
    setStops((current) => [...current, ...added.map(fromFeature)]);
    // Brings what was added into view: a zone can be far from where the map was.
    const bounds = boundsOf(added.map((feature) => feature.geometry.coordinates));
    if (map && bounds) map.fitBounds(bounds, { padding: 64, maxZoom: 16, duration: moveDuration() });
    setNotice(
      fresh.length === 0
        ? "Todos los prospectos de esa zona ya están en la ruta."
        : added.length < fresh.length
          ? `Se agregaron ${added.length} de ${fresh.length}: una ruta admite ${MAX_STOPS} paradas. Arma otra ruta con el resto.`
          : added.length === 1
            ? "Se agregó 1 parada."
            : `Se agregaron ${added.length} paradas.`
    );
  };

  const move = (index: number, step: 1 | -1) =>
    setStops((current) => {
      const next = [...current];
      const target = index + step;
      if (target < 0 || target >= next.length) return current;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });

  const commitOrigin = () => {
    if (originText.trim() === "") {
      setOrigin(null);
      setErrors((current) => ({ ...current, origin: undefined }));
      return;
    }
    const parsed = parseCoordinates(originText);
    setErrors((current) => ({
      ...current,
      origin: parsed ? undefined : "No es un punto dentro de Colombia. Escribe latitud, coma y longitud: 6.2518, -75.5636",
    }));
    if (parsed) setOrigin(parsed);
  };

  const save = () => {
    const trimmedName = name.trim();
    const trimmedEmail = email.trim();
    const next = {
      name: trimmedName === "" ? "Ponle un nombre a la ruta, por ejemplo Belén martes." : undefined,
      email:
        trimmedEmail !== "" && !EMAIL.test(trimmedEmail)
          ? "Escribe el correo completo, como nombre@jdh.com.co."
          : undefined,
      origin: errors.origin,
      stops: stops.length < 2 ? "Una ruta necesita al menos 2 paradas. Haz clic en los prospectos del mapa." : undefined,
    };
    setErrors(next);
    if (next.name || next.email || next.origin || next.stops) return;

    const prospectIds = stops.map((stop) => stop.id);
    if (!route) {
      create.mutate(
        {
          name: trimmedName,
          planned_for: plannedFor || null,
          assignee_email: trimmedEmail || null,
          origin: draftOrigin,
          prospect_ids: prospectIds,
          optimize,
        },
        { onSuccess: onDone }
      );
      return;
    }
    // Only what changed travels: new stops or a new origin leave the route to be computed again.
    const input: RouteUpdateInput = {
      name: trimmedName,
      planned_for: plannedFor || null,
      assignee_email: trimmedEmail || null,
    };
    const before = route.stops.map((stop) => stop.prospect_id);
    if (before.length !== prospectIds.length || before.some((id, index) => id !== prospectIds[index])) {
      input.prospect_ids = prospectIds;
    }
    if (JSON.stringify(draftOrigin) !== JSON.stringify(route.origin)) input.origin = draftOrigin;
    update.mutate({ id: route.id, input }, { onSuccess: onDone });
  };

  const failure = create.error ?? update.error;
  const saving = create.isPending || update.isPending;

  return (
    <form
      aria-label={route ? `Editar la ruta ${route.name}` : "Nueva ruta de visita"}
      className="space-y-4"
      onSubmit={(event) => {
        event.preventDefault();
        save();
      }}
    >
      <h2 className="text-base font-semibold">{route ? `Editar la ruta ${route.name}` : "Nueva ruta de visita"}</h2>

      <Field label="Nombre de la ruta" htmlFor="route-name" error={errors.name}>
        <Input
          id="route-name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          aria-invalid={errors.name ? true : undefined}
          aria-describedby={errors.name ? "route-name-error" : undefined}
          maxLength={120}
          className="max-md:h-11"
        />
      </Field>

      {/* The stops are the route: they come before the optional details. */}
      <section aria-labelledby="route-stops-title" className="space-y-3">
        <div className="flex items-baseline justify-between gap-2">
          <h3 id="route-stops-title" className="text-[13px] font-medium">
            Paradas
          </h3>
          <span className="tabular text-[13px] text-text-secondary">
            {stops.length} de {MAX_STOPS}
          </span>
        </div>
        <p className="text-[13px] text-text-secondary">
          Haz clic en un prospecto del mapa para agregarlo o quitarlo, o trae todos los de una zona.
        </p>
        <Dropdown
          aria-label="Agregar los prospectos de una zona"
          options={zoneOptions}
          value=""
          onValueChange={addZone}
          placeholder="Agregar los prospectos de una zona"
          disabled={!prepared || zoneOptions.length === 0}
          className="max-md:[&_[data-slot=dropdown-trigger]]:h-11"
        />
        {notice && (
          <Alert severity="info" onDismiss={() => setNotice(null)}>
            {notice}
          </Alert>
        )}
        {errors.stops && stops.length < 2 && (
          <p role="alert" className="text-[13px] text-danger">
            {errors.stops}
          </p>
        )}
        {stops.length > 0 && (
          <ol className="divide-y divide-border rounded-lg border border-border">
            {stops.map((stop, index) => (
              <li key={stop.id} className="flex items-center gap-2 px-2 py-1.5">
                <span
                  className="tabular flex size-6 shrink-0 items-center justify-center rounded-full border border-text-primary text-[11px] font-semibold"
                  aria-hidden="true"
                >
                  {index + 1}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">
                    <span className="sr-only">Parada {index + 1}: </span>
                    {stop.name}
                  </span>
                  {stop.detail && <span className="block truncate text-[13px] text-text-secondary">{stop.detail}</span>}
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  className="max-md:size-11"
                  disabled={index === 0}
                  onClick={() => move(index, -1)}
                  aria-label={`Subir ${stop.name} una posición`}
                >
                  <ArrowUp aria-hidden="true" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  className="max-md:size-11"
                  disabled={index === stops.length - 1}
                  onClick={() => move(index, 1)}
                  aria-label={`Bajar ${stop.name} una posición`}
                >
                  <ArrowDown aria-hidden="true" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  className="max-md:size-11"
                  onClick={() => setStops((current) => current.filter((item) => item.id !== stop.id))}
                  aria-label={`Quitar ${stop.name} de la ruta`}
                >
                  <X aria-hidden="true" />
                </Button>
              </li>
            ))}
          </ol>
        )}
      </section>

      <div className="grid gap-4 sm:grid-cols-2 @4xl:grid-cols-1">
        <Field label="Fecha de la visita" htmlFor="route-date" optional>
          <DatePicker id="route-date" value={plannedFor} onChange={setPlannedFor} clearable className="max-md:h-11" />
        </Field>
        <Field
          label="Correo de quien la recorre"
          htmlFor="route-email"
          optional
          hint="Esa persona podrá registrar el resultado de cada parada."
          error={errors.email}
        >
          <Input
            id="route-email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            autoComplete="off"
            aria-invalid={errors.email ? true : undefined}
            aria-describedby={errors.email ? "route-email-error" : "route-email-hint"}
            className="max-md:h-11"
          />
        </Field>
      </div>

      <fieldset className="space-y-3 rounded-lg border border-border p-3">
        <legend className="px-1 text-[13px] font-medium">
          Punto de partida <span className="font-normal text-text-secondary">(opcional)</span>
        </legend>
        <p className="text-[13px] text-text-secondary">Sin punto de partida, la ruta empieza en la primera parada.</p>
        <Field
          label="Coordenadas"
          htmlFor="route-origin"
          hint="Latitud y longitud separadas por coma, como las copia Google Maps."
          error={errors.origin}
        >
          <Input
            id="route-origin"
            value={originText}
            onChange={(event) => setOriginText(event.target.value)}
            onBlur={commitOrigin}
            autoComplete="off"
            aria-invalid={errors.origin ? true : undefined}
            aria-describedby={errors.origin ? "route-origin-error" : "route-origin-hint"}
            className="tabular max-md:h-11"
          />
        </Field>
        <Button
          type="button"
          variant="outline"
          size="sm"
          aria-pressed={pickingOrigin}
          onClick={() => setPickingOrigin((current) => !current)}
          className="max-md:h-11"
        >
          <Crosshair aria-hidden="true" /> {pickingOrigin ? "Haz clic en el mapa…" : "Marcar en el mapa"}
        </Button>
        {origin && (
          <Field label="Nombre del punto" htmlFor="route-origin-label" optional>
            <Input
              id="route-origin-label"
              value={originLabel}
              onChange={(event) => setOriginLabel(event.target.value)}
              maxLength={60}
              className="max-md:h-11"
            />
          </Field>
        )}
      </fieldset>

      {!route && (
        <label className="flex min-h-9 cursor-pointer items-start gap-2 text-sm max-md:min-h-11">
          <input
            type="checkbox"
            checked={optimize}
            onChange={(event) => setOptimize(event.target.checked)}
            className="mt-0.5 size-4 accent-[var(--primary)]"
          />
          <span>
            Ordenar las paradas para el menor tiempo de recorrido
            <span className="block text-[13px] text-text-secondary">
              Sin marcar, la ruta respeta el orden de la lista.
            </span>
          </span>
        </label>
      )}

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
          {route ? "Guardar los cambios" : "Crear la ruta"}
        </Button>
      </div>
    </form>
  );
}
