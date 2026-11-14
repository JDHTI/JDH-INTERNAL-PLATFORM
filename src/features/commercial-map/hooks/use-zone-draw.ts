"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Polygon, Position } from "geojson";
import type { Map as MapLibreMap } from "maplibre-gl";
import { TerraDraw, TerraDrawPolygonMode, TerraDrawSelectMode } from "terra-draw";
import { TerraDrawMapLibreGLAdapter } from "terra-draw-maplibre-gl-adapter";

import { readMapPalette, toHex } from "../lib/map-tokens";
import type { PaletteKey, ZoneGeometry } from "../types/commercial-map.types";

/** About 10 cm: finer than a zone's edge needs, and within what Terra Draw accepts. */
const round = ([lng, lat]: Position): Position => [Number(lng.toFixed(6)), Number(lat.toFixed(6))];

function parts(geometry: ZoneGeometry): Polygon[] {
  const polygons = geometry.type === "Polygon" ? [geometry.coordinates] : geometry.coordinates;
  return polygons.map((rings) => ({ type: "Polygon", coordinates: rings.map((ring) => ring.map(round)) }));
}

/** The draft in the zone's color, outlined in the label tone like every mark on the map. */
function styles(color: PaletteKey) {
  const palette = readMapPalette();
  const fill = toHex(palette.project[color]);
  const ink = toHex(palette.labelStrong);
  const paper = toHex(palette.chip);
  return {
    polygon: {
      fillColor: fill,
      fillOpacity: palette.zoneTint,
      outlineColor: ink,
      outlineWidth: 2,
      closingPointColor: paper,
      closingPointOutlineColor: ink,
      closingPointOutlineWidth: 2,
      closingPointWidth: 5,
    },
    select: {
      selectedPolygonColor: fill,
      selectedPolygonFillOpacity: palette.zoneTint,
      selectedPolygonOutlineColor: ink,
      selectedPolygonOutlineWidth: 2,
      selectionPointColor: paper,
      selectionPointOutlineColor: ink,
      selectionPointOutlineWidth: 2,
      selectionPointWidth: 5,
      midPointColor: ink,
      midPointOutlineColor: paper,
      midPointOutlineWidth: 1,
      midPointWidth: 3,
    },
  };
}

export interface ZoneDraw {
  /** How many closed shapes the draft has. */
  shapes: number;
  /** True while a shape has corners but is not closed yet. */
  drawing: boolean;
  /** True when the zone's stored shape could not be loaded into the editor. */
  failed: boolean;
  /** The draft as the API takes it; null with nothing drawn. */
  geometry: () => ZoneGeometry | null;
  /** Starts another shape: a zone can be made of several pieces. */
  addShape: () => void;
  clear: () => void;
}

/**
 * Draws or reshapes a zone on the map with Terra Draw. With `initial` the
 * editor opens on that shape; without it, ready to draw. `initial` is read
 * once, when the editor starts.
 */
export function useZoneDraw(map: MapLibreMap | null, initial: ZoneGeometry | null, color: PaletteKey): ZoneDraw {
  const draw = useRef<TerraDraw | null>(null);
  const start = useRef({ initial, color });
  const [shapes, setShapes] = useState(0);
  const [drawing, setDrawing] = useState(false);
  const [failed, setFailed] = useState(false);

  const polygons = useCallback(
    () =>
      // A shape still being drawn is in the store too; it counts once it is closed.
      (draw.current?.getSnapshot() ?? []).filter(
        (feature) =>
          feature.geometry.type === "Polygon" &&
          feature.properties.mode === "polygon" &&
          feature.properties.currentlyDrawing !== true
      ),
    []
  );

  useEffect(() => {
    if (!map) return;
    const look = styles(start.current.color);
    const instance = new TerraDraw({
      adapter: new TerraDrawMapLibreGLAdapter({ map, prefixId: "zone-draw" }),
      modes: [
        new TerraDrawPolygonMode({ styles: look.polygon }),
        new TerraDrawSelectMode({
          flags: {
            polygon: {
              feature: {
                draggable: true,
                coordinates: { midpoints: true, draggable: true, deletable: true },
              },
            },
          },
          styles: look.select,
        }),
      ],
    });
    instance.start();
    draw.current = instance;

    const count = () => {
      setShapes(polygons().length);
      setDrawing(instance.getSnapshot().some((feature) => feature.properties.currentlyDrawing === true));
    };
    let loaded = true;
    if (start.current.initial) {
      const results = instance.addFeatures(
        parts(start.current.initial).map((geometry) => ({
          type: "Feature",
          geometry,
          properties: { mode: "polygon" },
        }))
      );
      loaded = results.every((result) => result.valid);
      instance.setMode("select");
      const first = results.find((result) => result.valid)?.id;
      if (first !== undefined) instance.selectFeature(first);
    } else {
      instance.setMode("polygon");
    }
    setFailed(!loaded);
    count();

    instance.on("finish", (id, context) => {
      // A closed shape turns into one that can be reshaped.
      if (context.action === "draw") {
        instance.setMode("select");
        instance.selectFeature(id);
      }
      count();
    });
    instance.on("change", count);

    return () => {
      instance.stop();
      draw.current = null;
    };
  }, [map, polygons]);

  // Another color repaints the draft; restarting the editor would lose it.
  useEffect(() => {
    const instance = draw.current;
    if (!instance) return;
    const look = styles(color);
    instance.updateModeOptions<typeof TerraDrawPolygonMode>("polygon", { styles: look.polygon });
    instance.updateModeOptions<typeof TerraDrawSelectMode>("select", { styles: look.select });
  }, [color]);

  const geometry = useCallback((): ZoneGeometry | null => {
    const rings = polygons().map((feature) => (feature.geometry as Polygon).coordinates);
    if (rings.length === 0) return null;
    return rings.length === 1 ? { type: "Polygon", coordinates: rings[0] } : { type: "MultiPolygon", coordinates: rings };
  }, [polygons]);

  const addShape = useCallback(() => draw.current?.setMode("polygon"), []);
  const clear = useCallback(() => {
    draw.current?.clear();
    draw.current?.setMode("polygon");
    setShapes(0);
    setDrawing(false);
  }, []);

  return { shapes, drawing, failed, geometry, addShape, clear };
}
