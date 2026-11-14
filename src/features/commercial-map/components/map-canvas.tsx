"use client";

import "maplibre-gl/dist/maplibre-gl.css";
import "./commercial-map.css";

import { useEffect, useRef, useState } from "react";
import { AttributionControl, Map as MapLibreMap, NavigationControl, addProtocol, setWorkerUrl } from "maplibre-gl";
import { MapPinOff } from "lucide-react";
import { Protocol } from "pmtiles";

import StatePanel from "@/shared/components/state-panel";
import { Alert } from "@/shared/components/ui/alert";
import { useUiStore } from "@/shared/store/use-ui-store";
import { cn } from "@/shared/lib/utils";

import { applyPalette, installDataLayers } from "../lib/map-layers";
import { BASEMAP_SOURCE, basemapStyle, COLOMBIA_BOUNDS, DEFAULT_CENTER, DEFAULT_ZOOM } from "../lib/map-style";
import { readMapPalette } from "../lib/map-tokens";
import { prefersReducedMotion } from "../lib/motion";

let libraryReady = false;

/**
 * Two things MapLibre needs once per page. Its worker: the library looks for
 * the worker file beside its own module, which a bundler has moved, so the
 * bundler is asked for the file's real address. And the protocol it reads
 * colombia.pmtiles through, by HTTP range.
 */
function prepareLibrary() {
  if (libraryReady) return;
  setWorkerUrl(new URL("maplibre-gl/dist/maplibre-gl-worker.mjs", import.meta.url).href);
  addProtocol("pmtiles", new Protocol({ metadata: true }).tile);
  libraryReady = true;
}

/** Where the map was left, so coming back from another tab does not reset it. */
let lastCamera: { center: [number, number]; zoom: number } | null = null;

export function hasSavedCamera(): boolean {
  return lastCamera !== null;
}

const LOCALE = {
  "Map.Title": "Mapa comercial",
  "NavigationControl.ZoomIn": "Acercar",
  "NavigationControl.ZoomOut": "Alejar",
  "AttributionControl.ToggleAttribution": "Mostrar u ocultar los créditos del mapa",
  "AttributionControl.MapFeedback": "Comentarios sobre el mapa",
  "CooperativeGesturesHandler.WindowsHelpText": "Usa Ctrl y la rueda del mouse para acercar el mapa",
  "CooperativeGesturesHandler.MacHelpText": "Usa ⌘ y la rueda del mouse para acercar el mapa",
  "CooperativeGesturesHandler.MobileHelpText": "Usa dos dedos para mover el mapa",
};

/**
 * The map itself: the basemap in the theme on screen and the module's empty
 * layers. Each view receives the instance through `onReady` and fills its own
 * sources. Rotation and tilt are off: north stays up, as on the printed maps
 * the team already reads.
 */
export default function MapCanvas({
  onReady,
  className,
}: {
  onReady: (map: MapLibreMap | null) => void;
  className?: string;
}) {
  const container = useRef<HTMLDivElement>(null);
  const instance = useRef<MapLibreMap | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "unsupported">("loading");
  const [basemapFailed, setBasemapFailed] = useState(false);
  const theme = useUiStore((state) => state.theme);

  useEffect(() => {
    const element = container.current;
    if (!element) return;
    prepareLibrary();

    let map: MapLibreMap;
    try {
      map = new MapLibreMap({
        container: element,
        style: basemapStyle(readMapPalette()),
        center: lastCamera?.center ?? DEFAULT_CENTER,
        zoom: lastCamera?.zoom ?? DEFAULT_ZOOM,
        minZoom: 4,
        maxZoom: 19,
        maxBounds: COLOMBIA_BOUNDS,
        attributionControl: false,
        dragRotate: false,
        pitchWithRotate: false,
        touchPitch: false,
        // On a phone the map sits inside a page that scrolls: one finger
        // moves the page, two move the map.
        cooperativeGestures: window.matchMedia("(max-width: 767px)").matches,
        fadeDuration: prefersReducedMotion() ? 0 : 150,
        locale: LOCALE,
      });
    } catch (error) {
      console.error("No se pudo iniciar el mapa", error);
      // The effect cannot go on without WebGL; the panel below says so.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setStatus("unsupported");
      return;
    }

    instance.current = map;
    map.touchZoomRotate.disableRotation();
    map.keyboard.disableRotation();
    map.addControl(new NavigationControl({ showCompass: false }), "top-right");
    map.addControl(new AttributionControl({ compact: true }), "bottom-right");

    map.on("load", () => {
      installDataLayers(map, readMapPalette());
      setStatus("ready");
      onReady(map);
    });
    map.on("error", (event) => {
      console.error("Error del mapa", event.error);
      if ("sourceId" in event && event.sourceId === BASEMAP_SOURCE) setBasemapFailed(true);
    });

    return () => {
      const center = map.getCenter();
      lastCamera = { center: [center.lng, center.lat], zoom: map.getZoom() };
      instance.current = null;
      onReady(null);
      map.remove();
    };
    // The map is created once; `onReady` is a state setter.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const map = instance.current;
    if (!map || status !== "ready") return;
    applyPalette(map, readMapPalette());
  }, [theme, status]);

  if (status === "unsupported") {
    return (
      <StatePanel icon={MapPinOff} tone="danger" title="Este navegador no puede mostrar el mapa" className={className}>
        El mapa necesita aceleración gráfica (WebGL), que está apagada o no existe en este equipo. La lista de
        prospectos y la pestaña Por ubicar funcionan igual. Si el problema sigue en otro navegador, avisa a TI.
      </StatePanel>
    );
  }

  return (
    <div className={cn("jdh-map relative isolate overflow-hidden bg-[var(--map-land)]", className)}>
      {/* Sized by height, not by `absolute`: MapLibre's stylesheet makes its container `relative`. */}
      <div ref={container} className="h-full w-full" />
      {status === "loading" && (
        <div className="absolute inset-0 animate-pulse bg-[var(--map-land)]" aria-busy="true">
          <span className="sr-only">Cargando el mapa</span>
        </div>
      )}
      {basemapFailed && (
        <Alert severity="warning" className="absolute inset-x-3 top-3 z-10 max-w-md bg-warning-badge">
          El mapa de calles no cargó. Los prospectos se ven sobre un fondo vacío; recarga la página y, si sigue igual,
          avisa a TI.
        </Alert>
      )}
    </div>
  );
}
