"use client";

import { useState } from "react";
import type { Map as MapLibreMap } from "maplibre-gl";

import { ViewTab } from "@/shared/components/ui/view-tab";
import { cn } from "@/shared/lib/utils";

import { useProspectFacets } from "../hooks/use-commercial-map";
import { useCanDock, useCategoryColors } from "../hooks/use-map-layers";
import { formatCount } from "../lib/format";
import { MAP_VIEWS, VIEW_LABEL, VIEWS_ON_MAP, type MapView } from "../lib/views";
import type { TerritoryPermissions } from "../types/commercial-map.types";
import CommercialMapGate from "./commercial-map-gate";
import ImportView from "./import-view";
import MapCanvas from "./map-canvas";
import MapLegend from "./map-legend";
import ProspectsView from "./prospects-view";
import type { Relocation } from "./relocation-bar";
import RoutesView from "./routes-view";
import UnlocatedView from "./unlocated-view";
import ZonesView from "./zones-view";

const PANEL_ID = "commercial-map-panel";

export default function CommercialMapWorkspace({ initialView }: { initialView: MapView }) {
  return (
    <CommercialMapGate>
      {(permissions) => <Workspace initialView={initialView} permissions={permissions} />}
    </CommercialMapGate>
  );
}

function Workspace({ initialView, permissions }: { initialView: MapView; permissions: TerritoryPermissions }) {
  const canManage = permissions.can_manage;
  const views = MAP_VIEWS.filter((view) => view !== "importar" || canManage);
  const [view, setView] = useState<MapView>(views.includes(initialView) ? initialView : "mapa");
  const [map, setMap] = useState<MapLibreMap | null>(null);
  const [overlay, setOverlay] = useState<HTMLDivElement | null>(null);
  const [toolbar, setToolbar] = useState<HTMLDivElement | null>(null);
  const [relocation, setRelocation] = useState<Relocation | null>(null);
  const docked = useCanDock(overlay);
  const facets = useProspectFacets();
  const colors = useCategoryColors();

  const open = (next: MapView) => {
    setView(next);
    if (next !== "mapa") setRelocation(null);
    // Each view keeps its own address, so a link or a reload lands on it.
    const url = new URL(window.location.href);
    if (next === "mapa") url.searchParams.delete("vista");
    else url.searchParams.set("vista", next);
    window.history.replaceState(null, "", url);
  };

  const unlocated = facets.data?.unlocated ?? 0;
  const onMap = VIEWS_ON_MAP.includes(view);

  return (
    // The layout follows the width this module really has (the sidebar may be
    // open or collapsed), so it is a container query and not a screen one.
    <div className="@container h-full">
      <div className="flex flex-col gap-4 @4xl:h-full @4xl:min-h-0">
        <header className="space-y-3">
          <h1 className="text-2xl font-semibold tracking-tight max-md:text-xl">Mapa comercial</h1>
          <div
            role="tablist"
            aria-label="Vistas del mapa comercial"
            className="no-scrollbar flex gap-1 overflow-x-auto border-b border-border [&>button]:-mb-px [&>button]:shrink-0 max-md:[&>button]:min-h-11"
          >
            {views.map((item) => (
              <ViewTab key={item} selected={item === view} onSelect={() => open(item)} controls={PANEL_ID}>
                {VIEW_LABEL[item]}
                {item === "por-ubicar" && unlocated > 0 && (
                  <span className="tabular ml-1.5 font-normal text-text-secondary">{formatCount(unlocated)}</span>
                )}
              </ViewTab>
            ))}
          </div>
        </header>

        {onMap ? (
          // Stacked until the map and the panel fit side by side with a map worth using.
          <div className="grid grid-cols-[minmax(0,1fr)] gap-4 @4xl:min-h-0 @4xl:flex-1 @4xl:grid-cols-[minmax(0,1fr)_21rem] @6xl:grid-cols-[minmax(0,1fr)_24rem]">
            <div className="flex flex-col @4xl:min-h-0">
              {/* What the map itself can do (its reference outlines) sits over it, filled by the view.
                  It stays outside the clipped frame so its list can open over the map. */}
              <div ref={setToolbar} />
              <div
                className={cn(
                  "flex h-[58dvh] min-h-80 flex-col overflow-hidden border border-border @4xl:h-auto @4xl:min-h-0 @4xl:flex-1",
                  view === "mapa" ? "rounded-b-lg" : "rounded-lg"
                )}
              >
                <div className="relative min-h-0 flex-1">
                  <MapCanvas onReady={setMap} className="absolute inset-0" />
                  <div ref={setOverlay} className="pointer-events-none absolute inset-0 z-[2] flex items-start p-3" />
                </div>
                {view !== "rutas" && (
                  <MapLegend
                    categories={(facets.data?.categories ?? []).map((category) => category.value)}
                    colors={colors}
                  />
                )}
              </div>
            </div>
            <div
              id={PANEL_ID}
              role="tabpanel"
              aria-label={VIEW_LABEL[view]}
              className="[scrollbar-width:thin] @4xl:min-h-0 @4xl:overflow-y-auto @4xl:pr-1"
            >
              {view === "mapa" && (
                <ProspectsView
                  map={map}
                  overlay={overlay}
                  docked={docked}
                  toolbar={toolbar}
                  canManage={canManage}
                  relocation={relocation}
                  onRelocationChange={setRelocation}
                  onOpenUnlocated={() => open("por-ubicar")}
                />
              )}
              {view === "zonas" && <ZonesView map={map} canManage={canManage} />}
              {view === "rutas" && <RoutesView map={map} canManage={canManage} />}
            </div>
          </div>
        ) : (
          <div id={PANEL_ID} role="tabpanel" aria-label={VIEW_LABEL[view]}>
            {view === "por-ubicar" && (
              <UnlocatedView
                canManage={canManage}
                onLocate={(next) => {
                  setRelocation(next);
                  open("mapa");
                }}
              />
            )}
            {view === "importar" && <ImportView />}
          </div>
        )}
      </div>
    </div>
  );
}
