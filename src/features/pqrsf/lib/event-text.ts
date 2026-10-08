import { formatDate, personName } from "./format";
import type { CaseEvent, Person, TrackingCatalog } from "../types/pqrsf.types";

function text(data: Record<string, unknown>, key: string): string | null {
  const value = data[key];
  return typeof value === "string" && value.trim() ? value : null;
}

/** Access records say who looked, not what changed; the history can hide them. */
export const ACCESS_EVENT_TYPES = ["viewed", "inbox_opened"] as const;

export function isAccessEvent(event: Pick<CaseEvent, "event_type">): boolean {
  return (ACCESS_EVENT_TYPES as readonly string[]).includes(event.event_type);
}

/**
 * One sentence per event, in the words a coordinator would use, starting with
 * the verb so it reads after the person's name. `currentAssignee` names old
 * assignment events that only stored an id.
 */
export function describeEvent(
  event: CaseEvent,
  catalog: TrackingCatalog,
  currentAssignee?: Person | null
): string {
  const status = (id: string | null) =>
    catalog.statuses.find((entry) => entry.id === id)?.name ?? "otro estado";
  const document = text(event.data, "document") ?? "un documento";

  switch (event.event_type) {
    case "created": {
      if (event.data.origin === "email") {
        const related = text(event.data, "related_case");
        return related
          ? `abrió el caso desde un correo (continúa el caso ${related}, que ya estaba finalizado)`
          : "abrió el caso desde un correo";
      }
      return event.data.origin === "import"
        ? "importó el caso desde el Excel P.13.F.01"
        : event.data.origin === "public_form"
          ? "recibió la solicitud del formulario público"
          : "creó el caso";
    }
    case "email_received": {
      const rejected = Array.isArray(event.data.rejected_files)
        ? (event.data.rejected_files as { name?: string; reason?: string }[])
        : [];
      if (rejected.length > 0 && !text(event.data, "from")) {
        return `no pudo guardar ${rejected.length === 1 ? "un adjunto" : `${rejected.length} adjuntos`}: ${rejected
          .map((file) => `${file.name ?? "archivo"} (${file.reason ?? "rechazado"})`)
          .join(", ")}`;
      }
      const from = text(event.data, "from");
      return from ? `recibió un correo de ${from}` : "recibió un correo";
    }
    case "assigned": {
      const to = text(event.data, "to_user_id");
      const fromName = text(event.data, "from_name");
      if (!to) return fromName ? `quitó a ${fromName} como responsable` : "quitó el responsable";
      const toName = text(event.data, "to_name");
      if (toName) return fromName ? `reasignó de ${fromName} a ${toName}` : `asignó a ${toName}`;
      return currentAssignee?.id === to
        ? `asignó a ${personName(currentAssignee)}`
        : "cambió el responsable";
    }
    case "status_changed":
      return `cambió el estado de ${status(event.from_status_id)} a ${status(event.to_status_id)}`;
    case "read":
      return event.to_status_id
        ? `leyó el caso por primera vez y quedó en ${status(event.to_status_id)}`
        : "leyó el caso por primera vez";
    case "viewed":
      return "abrió el caso";
    case "comment": {
      const reply = event.data.client_reply;
      const to =
        reply && typeof reply === "object" ? text(reply as Record<string, unknown>, "to") : null;
      return to ? `respondió al cliente (${to})` : "comentó";
    }
    case "item_added":
      return `agregó el documento «${document}»`;
    case "item_updated": {
      const responded = text(event.data, "responded_on");
      return responded
        ? `registró la respuesta de «${document}» con fecha ${formatDate(responded)}`
        : `editó el documento «${document}»`;
    }
    case "item_removed":
      return `quitó el documento «${document}»`;
    case "updated":
      return "editó los datos del caso";
    case "deleted":
      return "eliminó el caso";
    case "inbox_opened":
      return "entró a la bandeja de PQRSF";
    default:
      return "registró un cambio";
  }
}

export function actorName(event: Pick<CaseEvent, "actor">): string {
  return event.actor ? personName(event.actor) : "Sistema";
}
