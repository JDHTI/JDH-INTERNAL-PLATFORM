/** The module's views, in tab order. Each has its address: `?vista=<key>`, none for the map. */
export const MAP_VIEWS = ["mapa", "por-ubicar", "importar", "zonas", "rutas"] as const;
export type MapView = (typeof MAP_VIEWS)[number];

export const VIEW_LABEL: Record<MapView, string> = {
  mapa: "Mapa",
  "por-ubicar": "Por ubicar",
  importar: "Importar",
  zonas: "Zonas",
  rutas: "Rutas",
};

/** Views drawn on the map; the others are a table and a form. */
export const VIEWS_ON_MAP: MapView[] = ["mapa", "zonas", "rutas"];

export function parseMapView(value: string | undefined): MapView {
  return MAP_VIEWS.find((view) => view === value) ?? "mapa";
}
