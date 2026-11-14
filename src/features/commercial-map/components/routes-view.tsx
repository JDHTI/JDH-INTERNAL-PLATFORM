"use client";

import { useEffect, useMemo, useState } from "react";
import type { Map as MapLibreMap } from "maplibre-gl";
import {
  ArrowLeft,
  CloudOff,
  ExternalLink,
  ListOrdered,
  Pencil,
  Plus,
  RefreshCw,
  Route as RouteIcon,
  StickyNote,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

import { useSession } from "@/features/session/hooks/use-session";
import Pager from "@/shared/components/pager";
import StatePanel from "@/shared/components/state-panel";
import TableSkeleton from "@/shared/components/table-skeleton";
import { Alert } from "@/shared/components/ui/alert";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import ConfirmDeleteDialog from "@/shared/components/ui/confirm-delete-dialog";
import { Dropdown } from "@/shared/components/ui/dropdown";
import { Textarea } from "@/shared/components/ui/field";
import { ToggleChip } from "@/shared/components/ui/toggle-chip";
import { errorMessage } from "@/shared/lib/api-client";
import { formatIso } from "@/shared/lib/iso-date";
import { cn } from "@/shared/lib/utils";

import {
  useComputeRoute,
  useDeleteRoute,
  usePatchStop,
  useRoute,
  useRoutes,
  useZones,
} from "../hooks/use-commercial-map";
import { useZoneLayer } from "../hooks/use-map-layers";
import {
  formatCount,
  formatDistance,
  formatDuration,
  GEOMETRY_STATUS_LABEL,
  GEOMETRY_STATUS_TONE,
  personName,
  VISIT_STATUS_LABEL,
  VISIT_STATUS_TONE,
  VISIT_STATUSES,
} from "../lib/format";
import { directionsLegs } from "../lib/google-maps";
import { EMPTY, PROSPECT_LAYERS, setLayersVisible, setSourceData, SOURCE } from "../lib/map-layers";
import { moveDuration } from "../lib/motion";
import { boundsOf } from "../lib/prospect-features";
import { routeMapData } from "../lib/route-features";
import type { RouteDetail, RouteStop, RouteSummary, VisitStatus } from "../types/commercial-map.types";
import RouteBuilder from "./route-builder";

const PAGE_SIZE = 20;
const STATUS_OPTIONS = VISIT_STATUSES.map((status) => ({ value: status, label: VISIT_STATUS_LABEL[status] }));

const LINK =
  "inline-flex min-h-8 items-center gap-1.5 rounded-sm text-sm font-medium underline underline-offset-2 hover:no-underline " +
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring max-md:min-h-11";

/** The API's reason, closed with a period so the next sentence does not run into it. */
function sentence(text: string): string {
  const trimmed = text.trim();
  return /[.!?]$/.test(trimmed) ? trimmed : `${trimmed}.`;
}

type Screen = { kind: "list" } | { kind: "detail"; id: string } | { kind: "build"; route: RouteDetail | null };

/**
 * The Rutas tab: the visit routes, one open at a time on the map. A route is
 * computed once and stored; opening it never calls the routing service.
 */
export default function RoutesView({ map, canManage }: { map: MapLibreMap | null; canManage: boolean }) {
  const [screen, setScreen] = useState<Screen>({ kind: "list" });
  const zones = useZones("commercial");
  useZoneLayer(map, zones.data);

  // Outside the builder the map shows the route alone: two thousand prospects would bury it.
  useEffect(() => {
    if (!map) return;
    setLayersVisible(map, PROSPECT_LAYERS, false);
    return () => {
      setLayersVisible(map, PROSPECT_LAYERS, true);
      setSourceData(map, SOURCE.routeLine, EMPTY);
      setSourceData(map, SOURCE.routeStops, EMPTY);
    };
  }, [map]);

  useEffect(() => {
    if (!map || screen.kind !== "list") return;
    setSourceData(map, SOURCE.routeLine, EMPTY);
    setSourceData(map, SOURCE.routeStops, EMPTY);
  }, [map, screen.kind]);

  if (screen.kind === "build") {
    return (
      <RouteBuilder
        key={screen.route?.id ?? "new"}
        map={map}
        route={screen.route}
        onDone={(route) => {
          if (route) {
            toast.success(screen.route ? `Ruta ${route.name} guardada.` : `Ruta ${route.name} creada.`);
            setScreen({ kind: "detail", id: route.id });
          } else {
            setScreen(screen.route ? { kind: "detail", id: screen.route.id } : { kind: "list" });
          }
        }}
      />
    );
  }

  if (screen.kind === "detail") {
    return (
      <RouteDetailPanel
        key={screen.id}
        map={map}
        routeId={screen.id}
        canManage={canManage}
        onBack={() => setScreen({ kind: "list" })}
        onEdit={(route) => setScreen({ kind: "build", route })}
      />
    );
  }

  return (
    <RouteList
      canManage={canManage}
      onOpen={(route) => setScreen({ kind: "detail", id: route.id })}
      onNew={() => setScreen({ kind: "build", route: null })}
    />
  );
}

function RouteList({
  canManage,
  onOpen,
  onNew,
}: {
  canManage: boolean;
  onOpen: (route: RouteSummary) => void;
  onNew: () => void;
}) {
  const [mine, setMine] = useState(false);
  const [page, setPage] = useState(1);
  const routes = useRoutes({ page, size: PAGE_SIZE, mine });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        {canManage && (
          <Button onClick={onNew} className="max-md:h-11">
            <Plus aria-hidden="true" /> Nueva ruta
          </Button>
        )}
        <ToggleChip
          active={mine}
          onClick={() => {
            setMine((current) => !current);
            setPage(1);
          }}
        >
          Solo las mías
        </ToggleChip>
      </div>

      {routes.isPending ? (
        <TableSkeleton rows={5} label="Cargando las rutas" />
      ) : routes.isError ? (
        <StatePanel
          icon={CloudOff}
          tone="danger"
          title="No se pudieron cargar las rutas"
          action={
            <Button variant="outline" onClick={() => void routes.refetch()}>
              <RefreshCw aria-hidden="true" /> Reintentar
            </Button>
          }
        >
          {errorMessage(routes.error)}
        </StatePanel>
      ) : routes.data.items.length === 0 ? (
        mine ? (
          <StatePanel
            icon={RouteIcon}
            title="No tienes rutas a tu nombre"
            action={
              <Button variant="outline" onClick={() => setMine(false)}>
                Ver todas las rutas
              </Button>
            }
          >
            Aquí aparecen las rutas que creaste y las que te asignaron para recorrer.
          </StatePanel>
        ) : (
          <StatePanel
            icon={RouteIcon}
            title="Todavía no hay rutas de visita"
            action={
              canManage ? (
                <Button variant="outline" onClick={onNew}>
                  <Plus aria-hidden="true" /> Armar la primera ruta
                </Button>
              ) : undefined
            }
          >
            {canManage
              ? "Elige los prospectos que se van a visitar y la plataforma traza el recorrido por las calles."
              : "Quien gestiona el módulo arma las rutas. Cuando te asignen una, aparecerá aquí."}
          </StatePanel>
        )
      ) : (
        <div className={cn("space-y-2", routes.isPlaceholderData && "opacity-60")}>
          <ul className="divide-y divide-border rounded-lg border border-border" aria-label="Rutas de visita">
            {routes.data.items.map((route) => (
              <li key={route.id}>
                <button
                  type="button"
                  onClick={() => onOpen(route)}
                  className="flex w-full flex-col gap-1 px-3 py-2.5 text-left transition-colors duration-150 first:rounded-t-lg last:rounded-b-lg hover:bg-primary-subtle focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-ring"
                >
                  <span className="flex items-start justify-between gap-2">
                    <span className="min-w-0 text-sm font-medium [overflow-wrap:anywhere]">{route.name}</span>
                    <Badge tone={GEOMETRY_STATUS_TONE[route.geometry_status]} className="shrink-0">
                      {GEOMETRY_STATUS_LABEL[route.geometry_status]}
                    </Badge>
                  </span>
                  <span className="text-[13px] text-text-secondary">
                    {[
                      route.planned_for ? formatIso(route.planned_for) : "Sin fecha",
                      personName(route.assignee) ?? "Sin responsable",
                    ].join(" · ")}
                  </span>
                  <span className="tabular text-[13px] text-text-secondary">
                    {route.stop_count} paradas, {route.visited_count} visitadas · {formatDistance(route.distance_m)}
                  </span>
                </button>
              </li>
            ))}
          </ul>
          <Pager
            page={routes.data.page}
            size={routes.data.size}
            total={routes.data.total}
            count={routes.data.items.length}
            onPageChange={setPage}
          />
        </div>
      )}
    </div>
  );
}

function RouteDetailPanel({
  map,
  routeId,
  canManage,
  onBack,
  onEdit,
}: {
  map: MapLibreMap | null;
  routeId: string;
  canManage: boolean;
  onBack: () => void;
  onEdit: (route: RouteDetail) => void;
}) {
  const route = useRoute(routeId);
  const session = useSession();
  const compute = useComputeRoute();
  const remove = useDeleteRoute();
  const [confirming, setConfirming] = useState(false);

  const data = route.data;
  const mapData = useMemo(
    () =>
      data
        ? routeMapData(
            data.stops.map((stop) => ({ ...stop, done: stop.visit_status !== "pending" })),
            data.origin,
            data.geometry,
            data.geometry_status
          )
        : null,
    [data]
  );

  useEffect(() => {
    if (!map || !mapData) return;
    setSourceData(map, SOURCE.routeLine, mapData.line);
    setSourceData(map, SOURCE.routeStops, mapData.points);
  }, [map, mapData]);

  // Frames the route when it opens, not on every visit that gets recorded.
  const [framedId, setFramedId] = useState<string | null>(null);
  useEffect(() => {
    if (!map || !mapData || framedId === routeId) return;
    const bounds = boundsOf(mapData.coordinates);
    if (bounds) map.fitBounds(bounds, { padding: 64, maxZoom: 16, duration: moveDuration() });
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setFramedId(routeId);
  }, [map, mapData, framedId, routeId]);

  const back = (
    <Button variant="ghost" size="sm" onClick={onBack} className="-ml-2 max-md:h-11">
      <ArrowLeft aria-hidden="true" /> Todas las rutas
    </Button>
  );

  if (route.isPending) {
    return (
      <div className="space-y-3">
        {back}
        <TableSkeleton rows={6} label="Cargando la ruta" />
      </div>
    );
  }
  if (route.isError || !data) {
    return (
      <div className="space-y-3">
        {back}
        <StatePanel
          icon={CloudOff}
          tone="danger"
          title="No se pudo abrir la ruta"
          action={
            <Button variant="outline" onClick={() => void route.refetch()}>
              <RefreshCw aria-hidden="true" /> Reintentar
            </Button>
          }
        >
          {route.error ? errorMessage(route.error) : "La ruta no respondió."}
        </StatePanel>
      </div>
    );
  }

  const email = session.data?.email?.toLowerCase();
  const isAssignee = Boolean(email && data.assignee?.email?.toLowerCase() === email);
  const canRecord = canManage || isAssignee;
  const legs = directionsLegs([...(data.origin ? [data.origin] : []), ...data.stops]);
  const offset = data.origin ? 0 : 1;

  return (
    <div className="space-y-4">
      {back}

      <header className="space-y-1.5">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <h2 className="min-w-0 text-base font-semibold [overflow-wrap:anywhere]">{data.name}</h2>
          <Badge tone={GEOMETRY_STATUS_TONE[data.geometry_status]}>{GEOMETRY_STATUS_LABEL[data.geometry_status]}</Badge>
        </div>
        <p className="text-[13px] text-text-secondary">
          {[
            data.planned_for ? `Para el ${formatIso(data.planned_for)}` : "Sin fecha",
            personName(data.assignee) ? `la recorre ${personName(data.assignee)}` : "sin responsable",
          ].join(", ")}
          {personName(data.created_by) ? `. La armó ${personName(data.created_by)}.` : "."}
        </p>
      </header>

      {data.geometry_status === "straight" && (
        <Alert severity="warning">
          <p className="font-medium">Esta ruta va en línea recta, no por las calles</p>
          <p>
            {sentence(data.routing_note ?? "El servicio de ruteo no respondió")} La distancia es en línea recta y no
            hay tiempo de recorrido.
            {canManage ? " Puedes recalcularla cuando el ruteo esté disponible." : ""}
          </p>
        </Alert>
      )}
      {data.geometry_status === "pending" && (
        <Alert severity="info">
          La ruta cambió y falta calcular su recorrido.
          {canManage ? " Usa «Calcular el recorrido»." : " Quien gestiona el módulo puede calcularlo."}
        </Alert>
      )}

      <dl className="grid grid-cols-2 gap-2">
        <Stat label="Paradas" value={formatCount(data.stop_count)} />
        <Stat label="Visitadas" value={formatCount(data.visited_count)} />
        <Stat label="Distancia" value={formatDistance(data.distance_m)} />
        <Stat label="Tiempo de recorrido" value={formatDuration(data.duration_s)} />
      </dl>

      <section aria-label="Abrir la ruta en Google Maps" className="space-y-1">
        {legs.length === 1 ? (
          <a href={legs[0].href} target="_blank" rel="noreferrer" className={LINK}>
            <ExternalLink className="size-4" aria-hidden="true" /> Abrir en Google Maps
          </a>
        ) : (
          <>
            <p className="text-[13px] text-text-secondary">
              Google Maps admite pocas paradas por enlace, así que la ruta se abre por tramos.
            </p>
            <ul className="space-y-0.5">
              {legs.map((leg, index) => (
                <li key={leg.href}>
                  <a href={leg.href} target="_blank" rel="noreferrer" className={LINK}>
                    <ExternalLink className="size-4" aria-hidden="true" />
                    Tramo {index + 1}: {leg.from === 0 && data.origin ? "partida" : `parada ${leg.from + offset}`} a
                    parada {leg.to + offset}
                  </a>
                </li>
              ))}
            </ul>
          </>
        )}
      </section>

      {canManage && (
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            className="max-md:h-11"
            disabled={compute.isPending}
            onClick={() => compute.mutate({ id: data.id, optimize: false })}
          >
            <RefreshCw aria-hidden="true" />
            {data.geometry_status === "pending" ? "Calcular el recorrido" : "Recalcular el recorrido"}
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="max-md:h-11"
            disabled={compute.isPending}
            onClick={() => compute.mutate({ id: data.id, optimize: true })}
          >
            <ListOrdered aria-hidden="true" /> Optimizar el orden
          </Button>
          <Button variant="outline" size="sm" className="max-md:h-11" onClick={() => onEdit(data)}>
            <Pencil aria-hidden="true" /> Editar
          </Button>
          <Button variant="danger" size="sm" className="max-md:h-11" onClick={() => setConfirming(true)}>
            <Trash2 aria-hidden="true" /> Eliminar
          </Button>
        </div>
      )}
      {compute.isPending && (
        <p role="status" className="text-sm text-text-secondary">
          Calculando el recorrido por las calles…
        </p>
      )}
      {compute.isError && (
        <p role="alert" className="rounded-md bg-danger-surface px-3 py-2 text-sm text-danger">
          {errorMessage(compute.error)}
        </p>
      )}

      <section aria-labelledby="route-stops" className="space-y-2">
        <h3 id="route-stops" className="text-[13px] font-medium">
          Paradas en orden de visita
        </h3>
        <ol className="divide-y divide-border rounded-lg border border-border">
          {data.stops.map((stop) => (
            <StopRow
              key={stop.id}
              routeId={data.id}
              stop={stop}
              straight={data.geometry_status !== "road"}
              canRecord={canRecord}
              onShow={() =>
                map?.easeTo({
                  center: [stop.longitude, stop.latitude],
                  zoom: Math.max(map.getZoom(), 16),
                  duration: moveDuration(),
                })
              }
            />
          ))}
        </ol>
      </section>

      <ConfirmDeleteDialog
        open={confirming}
        onOpenChange={(open) => {
          setConfirming(open);
          if (!open) remove.reset();
        }}
        title={`Eliminar la ruta ${data.name}`}
        confirmLabel="Eliminar la ruta"
        isPending={remove.isPending}
        error={remove.isError ? errorMessage(remove.error) : null}
        onConfirm={() =>
          remove.mutate(data.id, {
            onSuccess: () => {
              toast.success(`Ruta ${data.name} eliminada.`);
              onBack();
            },
          })
        }
      >
        Se borra la ruta con sus paradas. Los prospectos y el resultado de sus visitas se conservan.
      </ConfirmDeleteDialog>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border px-3 py-2">
      <dt className="text-[13px] text-text-secondary">{label}</dt>
      <dd className="tabular text-base font-semibold">{value}</dd>
    </div>
  );
}

/** One stop: where it is, how far from the previous one and what came of the visit. */
function StopRow({
  routeId,
  stop,
  straight,
  canRecord,
  onShow,
}: {
  routeId: string;
  stop: RouteStop;
  straight: boolean;
  canRecord: boolean;
  onShow: () => void;
}) {
  const patch = usePatchStop(routeId);
  const [noteOpen, setNoteOpen] = useState(false);
  const [note, setNote] = useState(stop.visit_note ?? "");
  const noteId = `stop-note-${stop.id}`;

  const leg =
    stop.leg_distance_m === null
      ? null
      : [
          `a ${formatDistance(stop.leg_distance_m)}`,
          stop.leg_duration_s !== null ? formatDuration(stop.leg_duration_s) : null,
          straight ? "en línea recta" : null,
        ]
          .filter(Boolean)
          .join(" · ");

  const record = (change: { visit_status?: VisitStatus; visit_note?: string | null }, done?: () => void) =>
    patch.mutate(
      { stopId: stop.id, patch: change },
      { onSuccess: done, onError: (error) => toast.error(errorMessage(error)) }
    );

  return (
    <li className="space-y-2 px-3 py-2.5">
      <div className="flex items-start gap-2">
        <span
          className={cn(
            "tabular mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full border border-text-primary text-[11px] font-semibold",
            stop.visit_status !== "pending" && "bg-primary text-text-on-primary"
          )}
          aria-hidden="true"
        >
          {stop.position}
        </span>
        <div className="min-w-0 flex-1">
          <button
            type="button"
            onClick={onShow}
            className="block max-w-full rounded-sm text-left text-sm font-medium underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring max-md:min-h-11"
          >
            <span className="sr-only">Parada {stop.position}: </span>
            <span className="[overflow-wrap:anywhere]">{stop.name}</span>
            <span className="sr-only">. Ver en el mapa</span>
          </button>
          {stop.address && <p className="text-[13px] text-text-secondary [overflow-wrap:anywhere]">{stop.address}</p>}
          {leg && <p className="tabular text-[13px] text-text-secondary">{leg}</p>}
        </div>
        {!canRecord && <Badge tone={VISIT_STATUS_TONE[stop.visit_status]}>{VISIT_STATUS_LABEL[stop.visit_status]}</Badge>}
      </div>

      {canRecord ? (
        <div className="flex items-center gap-2 pl-8">
          <Dropdown
            aria-label={`Resultado de la visita a ${stop.name}`}
            options={STATUS_OPTIONS}
            value={stop.visit_status}
            onValueChange={(value) => record({ visit_status: value as VisitStatus })}
            disabled={patch.isPending}
            size="sm"
            className="w-36 shrink-0 max-md:[&_[data-slot=dropdown-trigger]]:h-11"
          />
          <Button
            variant="ghost"
            size="sm"
            className="max-md:h-11"
            aria-expanded={noteOpen}
            aria-controls={noteId}
            onClick={() => setNoteOpen((current) => !current)}
          >
            <StickyNote aria-hidden="true" /> {stop.visit_note ? "Ver la nota" : "Agregar nota"}
          </Button>
        </div>
      ) : (
        stop.visit_note && <p className="pl-8 text-sm [overflow-wrap:anywhere]">{stop.visit_note}</p>
      )}

      {canRecord && noteOpen && (
        <div id={noteId} className="space-y-2 pl-8">
          <label htmlFor={`${noteId}-field`} className="block text-[13px] font-medium">
            Nota de la visita
          </label>
          <Textarea
            id={`${noteId}-field`}
            value={note}
            onChange={(event) => setNote(event.target.value)}
            maxLength={1000}
            className="min-h-16"
          />
          <Button
            variant="secondary"
            size="sm"
            className="max-md:h-11"
            disabled={patch.isPending || note.trim() === (stop.visit_note ?? "")}
            onClick={() => record({ visit_note: note.trim() || null }, () => setNoteOpen(false))}
          >
            Guardar la nota
          </Button>
        </div>
      )}
    </li>
  );
}
