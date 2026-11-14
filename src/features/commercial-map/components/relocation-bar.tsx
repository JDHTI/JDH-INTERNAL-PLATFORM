"use client";

import { useEffect, useState } from "react";
import { Marker, type Map as MapLibreMap, type MapMouseEvent } from "maplibre-gl";

import { Button } from "@/shared/components/ui/button";
import { Field } from "@/shared/components/ui/field";
import { Input } from "@/shared/components/ui/input";
import { errorMessage } from "@/shared/lib/api-client";
import { cn } from "@/shared/lib/utils";

import { usePatchProspect } from "../hooks/use-commercial-map";
import { formatCoordinates, parseCoordinates, type Coordinates } from "../lib/coordinates";
import { moveDuration } from "../lib/motion";
import type { ProspectDetail } from "../types/commercial-map.types";

export interface Relocation {
  id: string;
  name: string;
  /** Where the prospect is today; null when it has no location yet. */
  start: Coordinates | null;
}

const FORMAT_HINT = "Latitud y longitud separadas por coma, como las copia Google Maps: 6.2518, -75.5636";

/**
 * Puts or moves a prospect's pin. The pin follows a click on the map and can
 * be dragged; the coordinates field does the same without a mouse.
 */
export default function RelocationBar({
  map,
  relocation,
  onSaved,
  onCancel,
  className,
}: {
  map: MapLibreMap | null;
  relocation: Relocation;
  onSaved: (prospect: ProspectDetail) => void;
  onCancel: () => void;
  className?: string;
}) {
  const patch = usePatchProspect();
  const [point, setPoint] = useState<Coordinates | null>(relocation.start);
  const [text, setText] = useState(relocation.start ? formatCoordinates(relocation.start) : "");
  const [textError, setTextError] = useState<string | null>(null);

  const place = (next: Coordinates) => {
    setPoint(next);
    setText(formatCoordinates(next));
    setTextError(null);
  };

  useEffect(() => {
    if (!map) return;
    const onClick = (event: MapMouseEvent) => {
      const next = { latitude: event.lngLat.lat, longitude: event.lngLat.lng };
      setPoint(next);
      setText(formatCoordinates(next));
      setTextError(null);
    };
    const canvas = map.getCanvas();
    canvas.style.cursor = "crosshair";
    map.on("click", onClick);
    return () => {
      map.off("click", onClick);
      canvas.style.cursor = "";
    };
  }, [map]);

  useEffect(() => {
    if (!map || !point) return;
    const element = document.createElement("div");
    element.className = "jdh-map-pin";
    const marker = new Marker({ element, draggable: true })
      .setLngLat([point.longitude, point.latitude])
      .addTo(map);
    marker.on("dragend", () => {
      const { lat, lng } = marker.getLngLat();
      setPoint({ latitude: lat, longitude: lng });
      setText(formatCoordinates({ latitude: lat, longitude: lng }));
      setTextError(null);
    });
    return () => {
      marker.remove();
    };
  }, [map, point]);

  const commitText = () => {
    if (text.trim() === "") return;
    const parsed = parseCoordinates(text);
    if (!parsed) {
      setTextError("No es un punto dentro de Colombia. Escribe la latitud, una coma y la longitud: 6.2518, -75.5636");
      return;
    }
    place(parsed);
    map?.easeTo({
      center: [parsed.longitude, parsed.latitude],
      zoom: Math.max(map.getZoom(), 16),
      duration: moveDuration(),
    });
  };

  const fieldId = `relocation-${relocation.id}`;

  return (
    <form
      aria-label={`Ubicación de ${relocation.name}`}
      onSubmit={(event) => {
        event.preventDefault();
        if (!point) return;
        patch.mutate(
          { id: relocation.id, patch: { latitude: point.latitude, longitude: point.longitude } },
          { onSuccess: onSaved }
        );
      }}
      className={cn(
        "max-h-full w-full space-y-3 overflow-y-auto rounded-xl border border-border-control bg-surface-raised p-4 text-sm shadow-sm",
        className
      )}
    >
      <div className="space-y-1">
        <h2 className="text-base font-semibold [overflow-wrap:anywhere]">
          {relocation.start ? "Corregir la ubicación de" : "Ubicar a"} {relocation.name}
        </h2>
        <p className="text-text-secondary">
          Haz clic en el mapa para poner el pin y arrástralo hasta la puerta del negocio. Si tienes las coordenadas,
          pégalas abajo.
        </p>
      </div>
      <Field label="Coordenadas" htmlFor={fieldId} hint={FORMAT_HINT} error={textError}>
        <Input
          id={fieldId}
          value={text}
          onChange={(event) => setText(event.target.value)}
          onBlur={commitText}
          onKeyDown={(event) => {
            if (event.key !== "Enter") return;
            event.preventDefault();
            commitText();
          }}
          inputMode="text"
          autoComplete="off"
          aria-invalid={textError ? true : undefined}
          aria-describedby={textError ? `${fieldId}-error` : `${fieldId}-hint`}
          className="tabular max-md:h-11"
        />
      </Field>
      {patch.isError && (
        <p role="alert" className="rounded-md bg-danger-surface px-3 py-2 text-danger">
          {errorMessage(patch.error)}
        </p>
      )}
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button type="button" variant="outline" onClick={onCancel} className="max-md:h-11">
          Cancelar
        </Button>
        <Button type="submit" disabled={!point || patch.isPending} className="max-md:h-11">
          Guardar la ubicación
        </Button>
      </div>
    </form>
  );
}
