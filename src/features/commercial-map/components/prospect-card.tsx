"use client";

import { useEffect, useRef, useState } from "react";
import { ExternalLink, Globe, History, Mail, MapPin, MapPinned, MessageCircle, Phone, RefreshCw, X } from "lucide-react";

import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { Dropdown } from "@/shared/components/ui/dropdown";
import { Textarea } from "@/shared/components/ui/field";
import { errorMessage } from "@/shared/lib/api-client";
import { cn } from "@/shared/lib/utils";

import { usePatchProspect, useProspect } from "../hooks/use-commercial-map";
import {
  AREA_STATUS_LABEL,
  formatMonth,
  LOCATION_QUALITY_LABEL,
  VISIT_STATUS_LABEL,
  VISIT_STATUS_TONE,
  VISIT_STATUSES,
} from "../lib/format";
import { pointLink } from "../lib/google-maps";
import type { PaletteKey, ProspectDetail, VisitStatus } from "../types/commercial-map.types";
import { ProspectMark, ZoneTag } from "./prospect-marks";

const LINK =
  "inline-flex min-h-8 items-center gap-1.5 rounded-sm font-medium underline underline-offset-2 hover:no-underline " +
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring max-md:min-h-11";

const STATUS_OPTIONS = VISIT_STATUSES.map((status) => ({ value: status, label: VISIT_STATUS_LABEL[status] }));

function hostname(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

/**
 * What the team needs to reach a prospect: the trade name, where it is and how
 * to contact it. Opens from the prospect's chip on the map or from the list.
 */
export default function ProspectCard({
  prospectId,
  color,
  canManage,
  onClose,
  onRelocate,
  focusOnOpen = false,
  action,
  className,
}: {
  prospectId: string;
  color: PaletteKey;
  canManage: boolean;
  onClose: () => void;
  /** Starts moving the pin; absent where the map cannot be edited. */
  onRelocate?: (prospect: ProspectDetail) => void;
  /** True when the card was opened from the keyboard path (the list). */
  focusOnOpen?: boolean;
  /** An action of the view the card is open in, such as adding the prospect to a route. */
  action?: React.ReactNode;
  className?: string;
}) {
  const prospect = useProspect(prospectId);
  const root = useRef<HTMLElement>(null);

  useEffect(() => {
    if (focusOnOpen) root.current?.focus();
  }, [focusOnOpen, prospectId]);

  return (
    <article
      ref={root}
      tabIndex={-1}
      aria-label={prospect.data ? `Prospecto ${prospect.data.name}` : "Prospecto"}
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          event.stopPropagation();
          onClose();
        }
      }}
      className={cn(
        "flex max-h-full w-full flex-col overflow-hidden rounded-xl border border-border-control bg-surface-raised text-sm text-text-primary shadow-sm",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
        className
      )}
    >
      {prospect.isPending ? (
        <div className="space-y-3 p-4" aria-busy="true">
          <span className="sr-only">Cargando los datos del prospecto</span>
          <div className="h-5 w-2/3 animate-pulse rounded-sm bg-canvas-subtle" />
          <div className="h-4 w-1/2 animate-pulse rounded-sm bg-canvas-subtle" />
          <div className="h-16 animate-pulse rounded-md bg-canvas-subtle" />
          <div className="h-4 w-3/4 animate-pulse rounded-sm bg-canvas-subtle" />
        </div>
      ) : prospect.isError ? (
        <div className="space-y-3 p-4" role="alert">
          <p className="font-semibold">No se pudieron cargar los datos de este prospecto</p>
          <p className="text-text-secondary">{errorMessage(prospect.error)}</p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => void prospect.refetch()}>
              <RefreshCw aria-hidden="true" /> Reintentar
            </Button>
            <Button variant="ghost" size="sm" onClick={onClose}>
              Cerrar
            </Button>
          </div>
        </div>
      ) : (
        <CardBody
          key={`${prospect.data.id}-${prospect.data.updated_at}`}
          prospect={prospect.data}
          color={color}
          canManage={canManage}
          onClose={onClose}
          onRelocate={onRelocate}
          action={action}
        />
      )}
    </article>
  );
}

function CardBody({
  prospect,
  color,
  canManage,
  onClose,
  onRelocate,
  action,
}: {
  prospect: ProspectDetail;
  color: PaletteKey;
  canManage: boolean;
  onClose: () => void;
  onRelocate?: (prospect: ProspectDetail) => void;
  action?: React.ReactNode;
}) {
  const located = prospect.latitude !== null && prospect.longitude !== null;
  const hasContact = prospect.phones.length > 0 || prospect.emails.length > 0 || prospect.website !== null;
  const raw = [prospect.contact_raw?.phone, prospect.contact_raw?.email].filter(Boolean).join(" · ");

  return (
    <>
      <header className="flex items-start gap-2 border-b border-border px-4 py-3">
        <ProspectMark
          color={color}
          former={prospect.is_former_customer}
          approximate={prospect.location_quality === "approximate"}
          className="mt-0.5"
        />
        <div className="min-w-0 flex-1">
          <h2 className="text-base leading-snug font-semibold [overflow-wrap:anywhere]">{prospect.name}</h2>
          <p className="text-[13px] text-text-secondary">
            {prospect.category ?? "Sin categoría"} · <span className="font-mono">{prospect.external_id}</span>
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Cerrar la tarjeta del prospecto"
          className="-mt-1 -mr-2 flex size-8 shrink-0 items-center justify-center rounded-md text-text-secondary transition-colors duration-150 hover:bg-canvas-subtle hover:text-text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring max-md:size-11"
        >
          <X className="size-4" aria-hidden="true" />
        </button>
      </header>

      <div className="min-h-0 space-y-4 overflow-y-auto overscroll-contain px-4 py-3 [scrollbar-width:thin]">
        {(prospect.is_former_customer || prospect.location_quality !== "exact") && (
          <div className="flex flex-wrap gap-1.5">
            {prospect.is_former_customer && (
              <Badge>
                <History aria-hidden="true" />
                {prospect.last_purchase_month
                  ? `Ex-cliente, última compra en ${formatMonth(prospect.last_purchase_month)}`
                  : "Ex-cliente"}
              </Badge>
            )}
            {prospect.location_quality !== "exact" && (
              <Badge tone={prospect.location_quality === "manual" ? "neutral" : "warning"}>
                {LOCATION_QUALITY_LABEL[prospect.location_quality]}
              </Badge>
            )}
          </div>
        )}

        <section aria-label="Ubicación" className="space-y-1.5">
          <p className="flex gap-2">
            <MapPin className="mt-0.5 size-4 shrink-0 text-text-secondary" aria-hidden="true" />
            <span className="min-w-0 [overflow-wrap:anywhere]">
              {prospect.address ?? "El archivo no trae dirección"}
              {prospect.sector && <span className="block text-[13px] text-text-secondary">{prospect.sector}</span>}
            </span>
          </p>
          <div className="flex flex-wrap items-center gap-1.5 pl-6">
            {prospect.commercial_zone ? (
              <ZoneTag name={prospect.commercial_zone.name} color={prospect.commercial_zone.color} />
            ) : (
              <span className="text-[13px] text-text-secondary">Fuera de las zonas comerciales</span>
            )}
            <span className="text-[13px] text-text-secondary">
              Hoja {prospect.source_zone}
              {prospect.area_status ? ` · ${AREA_STATUS_LABEL[prospect.area_status]}` : ""}
            </span>
          </div>
          {prospect.location_quality === "approximate" && (
            <p className="pl-6 text-[13px] text-text-secondary">
              El archivo ubica varios prospectos en este mismo punto: confirma la dirección antes de visitar.
            </p>
          )}
        </section>

        <section aria-label="Contacto" className="space-y-1">
          {prospect.phones.map((phone) => (
            <div key={phone.number} className="flex flex-wrap items-center gap-x-3">
              <a href={`tel:${phone.number}`} className={LINK}>
                <Phone className="size-4" aria-hidden="true" />
                <span className="tabular">{phone.display}</span>
              </a>
              {phone.is_mobile && (
                <a
                  href={`https://wa.me/57${phone.number}`}
                  target="_blank"
                  rel="noreferrer"
                  className={LINK}
                  aria-label={`Escribir por WhatsApp al ${phone.display}`}
                >
                  <MessageCircle className="size-4" aria-hidden="true" />
                  WhatsApp
                </a>
              )}
              {phone.label && <span className="text-[13px] text-text-secondary">{phone.label}</span>}
            </div>
          ))}
          {prospect.emails.map((email) => (
            <a key={email} href={`mailto:${email}`} className={cn(LINK, "max-w-full")}>
              <Mail className="size-4 shrink-0" aria-hidden="true" />
              <span className="truncate">{email}</span>
            </a>
          ))}
          {prospect.website && (
            <div>
              <a href={prospect.website} target="_blank" rel="noreferrer" className={cn(LINK, "max-w-full")}>
                <Globe className="size-4 shrink-0" aria-hidden="true" />
                <span className="truncate">{hostname(prospect.website)}</span>
              </a>
            </div>
          )}
          {!hasContact && (
            <p className="text-text-secondary">
              {raw
                ? `El archivo trae este contacto, que no se pudo leer como teléfono ni correo: ${raw}`
                : "El archivo no trae teléfono, correo ni página web."}
            </p>
          )}
        </section>

        {prospect.observation && (
          <section aria-label="Observación">
            <p className="text-[13px] text-text-secondary [overflow-wrap:anywhere]">{prospect.observation}</p>
          </section>
        )}

        <VisitTracking prospect={prospect} canManage={canManage} />
      </div>

      {(located || action || (canManage && onRelocate)) && (
        <footer className="flex flex-wrap items-center gap-2 border-t border-border px-4 py-2.5">
          {action}
          {canManage && onRelocate && (
            <Button variant="outline" size="sm" className="max-md:h-11" onClick={() => onRelocate(prospect)}>
              <MapPinned aria-hidden="true" /> {located ? "Corregir ubicación" : "Ubicar en el mapa"}
            </Button>
          )}
          {located && (
            <a
              href={pointLink({ latitude: prospect.latitude as number, longitude: prospect.longitude as number })}
              target="_blank"
              rel="noreferrer"
              className={cn(LINK, "text-[13px]")}
            >
              <ExternalLink className="size-3.5" aria-hidden="true" /> Ver en Google Maps
            </a>
          )}
        </footer>
      )}
    </>
  );
}

/** The result of the visit: whoever manages the module records it; the rest read it. */
function VisitTracking({ prospect, canManage }: { prospect: ProspectDetail; canManage: boolean }) {
  const patch = usePatchProspect();
  const [status, setStatus] = useState<VisitStatus>(prospect.visit_status);
  const [note, setNote] = useState(prospect.visit_note ?? "");
  const changed = status !== prospect.visit_status || note.trim() !== (prospect.visit_note ?? "");
  const noteId = `visit-note-${prospect.id}`;
  const statusId = `visit-status-${prospect.id}`;

  if (!canManage) {
    return (
      <section aria-label="Seguimiento de la visita" className="space-y-1.5 border-t border-border pt-3">
        <Badge tone={VISIT_STATUS_TONE[prospect.visit_status]}>{VISIT_STATUS_LABEL[prospect.visit_status]}</Badge>
        {prospect.visit_note && <p className="[overflow-wrap:anywhere]">{prospect.visit_note}</p>}
      </section>
    );
  }

  return (
    <section aria-label="Seguimiento de la visita" className="space-y-2 border-t border-border pt-3">
      <div className="space-y-1.5">
        <label htmlFor={statusId} className="block text-[13px] font-medium">
          Resultado de la visita
        </label>
        <Dropdown
          id={statusId}
          options={STATUS_OPTIONS}
          value={status}
          onValueChange={(next) => setStatus(next as VisitStatus)}
          className="max-md:[&_[data-slot=dropdown-trigger]]:h-11"
        />
      </div>
      <div className="space-y-1.5">
        <label htmlFor={noteId} className="block text-[13px] font-medium">
          Nota <span className="font-normal text-text-secondary">(opcional)</span>
        </label>
        <Textarea
          id={noteId}
          value={note}
          onChange={(event) => setNote(event.target.value)}
          maxLength={1000}
          className="min-h-16"
        />
      </div>
      {patch.isError && (
        <p role="alert" className="text-[13px] text-danger">
          {errorMessage(patch.error)}
        </p>
      )}
      {changed && (
        <Button
          variant="secondary"
          size="sm"
          className="max-md:h-11"
          disabled={patch.isPending}
          onClick={() =>
            patch.mutate({ id: prospect.id, patch: { visit_status: status, visit_note: note.trim() || null } })
          }
        >
          Guardar el seguimiento
        </Button>
      )}
    </section>
  );
}
