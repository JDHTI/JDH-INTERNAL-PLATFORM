"use client";

import { useId, useState } from "react";
import { CloudOff, Loader2, Plus, RefreshCw, Search, Users } from "lucide-react";
import { toast } from "sonner";

import StatePanel from "@/shared/components/state-panel";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { Dialog, DialogError, DialogFooter } from "@/shared/components/ui/dialog";
import { Field } from "@/shared/components/ui/field";
import { Input } from "@/shared/components/ui/input";
import { Switch } from "@/shared/components/ui/switch";
import { ApiError, errorMessage } from "@/shared/lib/api-client";
import { cn } from "@/shared/lib/utils";

import { useSaveVendorTeam, useVendorTeams } from "../hooks/use-commercial-budget";
import { formatCount } from "../lib/format";
import type { VendorTeam } from "../types/commercial-budget.types";

const SAVED_IN_DWH = "Se guarda en el maestro de equipos del DWH. Los vendedores y reportes lo ven después de la siguiente actualización del DWH.";
const WAITS_FOR_UPLOAD = "Queda disponible en la plantilla de inmediato, y llega al DWH con la siguiente carga del maestro.";
const HIDE_HELP = "Solo lo quita de la plantilla; el equipo no se borra del DWH.";

/**
 * A team write's failure in words: 409 is a team someone (or an upload) already created; 503,
 * with `writesTeams`, is the DWH not answering, and then nothing was saved (API #146).
 */
function teamError(failure: unknown): string {
  if (failure instanceof ApiError && failure.status === 409) return "Ese equipo ya está en el maestro.";
  if (failure instanceof ApiError && failure.status === 503) {
    return "No se pudo guardar en el DWH; intenta de nuevo en un momento. No se guardó ningún cambio.";
  }
  return errorMessage(failure);
}

/**
 * The team master the template offers (API #145): the warehouse's teams and the ones created
 * here, each with its class, how many active reps it has today and whether the template offers
 * it. Whoever manages creates teams, changes a class in place and turns a team off. With
 * `writesTeams` (API #146) a new team or class goes to the DWH's `externo.equipo` at once;
 * without it, it waits for the next upload. Hiding only takes it off the template either way.
 */
export default function VendorTeams({ canManage, writesTeams }: { canManage: boolean; writesTeams: boolean }) {
  const teams = useVendorTeams(true);
  const [creating, setCreating] = useState(false);
  const [query, setQuery] = useState("");

  if (teams.isPending) {
    return <div className="h-64 animate-pulse rounded-lg bg-canvas-subtle" aria-busy="true" aria-label="Cargando los equipos" />;
  }
  if (teams.isError) {
    return (
      <StatePanel
        icon={CloudOff}
        tone="danger"
        title="No se pudieron cargar los equipos"
        action={
          <Button variant="outline" onClick={() => teams.refetch()}>
            <RefreshCw aria-hidden="true" /> Reintentar
          </Button>
        }
      >
        {errorMessage(teams.error)}
      </StatePanel>
    );
  }

  const q = query.trim().toLowerCase();
  const shown = q === "" ? teams.data : teams.data.filter((team) => `${team.name} ${team.team_class ?? ""}`.toLowerCase().includes(q));

  return (
    <section aria-labelledby="vendor-teams-title" className="space-y-3">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div className="space-y-0.5">
          <h2 id="vendor-teams-title" className="text-base font-semibold">
            Maestro de equipos
          </h2>
          <p className="text-[13px] text-text-secondary">
            La plantilla solo deja escoger estos equipos, y su clase sale de aquí. {writesTeams ? SAVED_IN_DWH : WAITS_FOR_UPLOAD} Apagar un
            equipo solo lo quita de la plantilla; no se borra del DWH.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-text-secondary" aria-hidden="true" />
            <Input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Buscar equipo o clase"
              aria-label="Buscar equipo o clase"
              className="w-56 pl-8 max-md:h-11"
            />
          </div>
          {canManage && (
            <Button onClick={() => setCreating(true)} className="max-md:h-11">
              <Plus aria-hidden="true" /> Nuevo equipo
            </Button>
          )}
        </div>
      </div>

      {teams.data.length === 0 ? (
        <StatePanel icon={Users} title="El maestro no tiene equipos">
          {canManage ? "Crea el primero con «Nuevo equipo»." : "Cuando BI cree los equipos, aparecerán aquí."}
        </StatePanel>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border bg-surface">
          <table className="w-full min-w-[44rem] text-left text-[13px]">
            <caption className="sr-only">Equipos del maestro de vendedores</caption>
            <thead className="bg-canvas-subtle text-[11px] font-semibold uppercase tracking-[0.06em] text-text-secondary">
              <tr>
                <th scope="col" className="px-3 py-1.5">Equipo</th>
                <th scope="col" className="w-52 px-3 py-1.5">Clase</th>
                <th scope="col" className="px-3 py-1.5">Origen</th>
                <th scope="col" className="px-3 py-1.5 text-right">Vendedores</th>
                <th scope="col" className="px-3 py-1.5">En la plantilla</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {shown.map((team) => (
                <TeamRow key={team.name} team={team} canManage={canManage} writesTeams={writesTeams} />
              ))}
              {shown.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-3 py-3 text-text-secondary">
                    Ningún equipo coincide con «{query.trim()}».
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      <NewTeamDialog open={creating} onClose={() => setCreating(false)} writesTeams={writesTeams} />
    </section>
  );
}

function TeamRow({ team, canManage, writesTeams }: { team: VendorTeam; canManage: boolean; writesTeams: boolean }) {
  const save = useSaveVendorTeam();
  const hideHelpId = useId();
  const stored = team.team_class ?? "";
  const [text, setText] = useState(stored);
  const [synced, setSynced] = useState(stored);
  const [error, setError] = useState<string | null>(null);
  if (stored !== synced) {
    setSynced(stored);
    setText(stored);
  }

  const commitClass = () => {
    const clean = text.trim();
    if (clean === stored) {
      setError(null);
      return;
    }
    if (clean.length < 2) {
      setError("La clase lleva al menos 2 caracteres.");
      return;
    }
    setError(null);
    save.mutate(
      { create: false, name: team.name, team_class: clean },
      {
        onSuccess: () =>
          toast.success(
            writesTeams
              ? `${team.name}: clase ${clean}, guardada en el DWH. Los vendedores y reportes la ven después de la siguiente actualización del DWH.`
              : `${team.name}: clase ${clean}. Llega al DWH con la siguiente carga del maestro.`
          ),
        onError: (failure) => setError(teamError(failure)),
      }
    );
  };

  return (
    <tr className={cn("align-top", !team.is_active && "text-text-secondary")}>
      <th scope="row" className="px-3 py-1.5 text-left font-medium">
        {team.name}
        {team.note && <span className="block text-xs font-normal text-text-secondary">{team.note}</span>}
      </th>
      <td className="px-3 py-1">
        {canManage ? (
          <div className="space-y-0.5">
            <Input
              value={text}
              maxLength={40}
              onChange={(event) => setText(event.target.value)}
              onBlur={commitClass}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  commitClass();
                } else if (event.key === "Escape") {
                  setText(stored);
                  setError(null);
                }
              }}
              disabled={save.isPending}
              placeholder="Sin clase"
              aria-label={`Clase de ${team.name}`}
              title={writesTeams ? SAVED_IN_DWH : WAITS_FOR_UPLOAD}
              aria-invalid={error ? true : undefined}
              className={cn("h-8 text-[13px] max-md:h-11", error && "border-danger")}
            />
            {error && (
              <span role="alert" className="block text-xs text-danger">
                {error}
              </span>
            )}
          </div>
        ) : (
          (team.team_class ?? "—")
        )}
      </td>
      <td className="px-3 py-1.5">
        {team.source === "dwh" ? (
          <Badge tone="neutral" className="px-1.5 py-0 text-xs" title="Publicado por el DWH">
            DWH
          </Badge>
        ) : (
          // Created here before API #146, or without the DWH role: it reaches the DWH with an upload.
          <Badge tone="info" className="px-1.5 py-0 text-xs" title="Creado en la plataforma; entra al DWH con la siguiente carga del maestro">
            Plataforma
          </Badge>
        )}
      </td>
      <td className="px-3 py-1.5 text-right tabular-nums">{formatCount(team.reps)}</td>
      <td className="px-3 py-1.5">
        {canManage ? (
          <span className="inline-flex items-center gap-2">
            <Switch
              checked={team.is_active}
              disabled={save.isPending}
              onCheckedChange={(next) =>
                save.mutate(
                  { create: false, name: team.name, is_active: next },
                  {
                    onSuccess: () => {
                      if (!next) toast.success(`${team.name} ya no se ofrece en la plantilla. El equipo no se borra del DWH.`);
                    },
                    onError: (failure) => toast.error(teamError(failure), { duration: Infinity }),
                  }
                )
              }
              aria-label={`${team.name} se ofrece en la plantilla`}
              aria-describedby={hideHelpId}
            />
            <span id={hideHelpId} className="sr-only">
              {HIDE_HELP}
            </span>
            <span className="text-xs">{team.is_active ? "Se ofrece" : "Apagado"}</span>
            {save.isPending && <Loader2 className="size-3.5 animate-spin text-text-secondary" aria-hidden="true" />}
          </span>
        ) : team.is_active ? (
          "Se ofrece"
        ) : (
          "Apagado"
        )}
      </td>
    </tr>
  );
}

function NewTeamDialog({ open, onClose, writesTeams }: { open: boolean; onClose: () => void; writesTeams: boolean }) {
  return (
    <Dialog
      open={open}
      onOpenChange={(next) => !next && onClose()}
      isForm
      narrow
      title="Nuevo equipo"
      description={writesTeams ? SAVED_IN_DWH : WAITS_FOR_UPLOAD}
    >
      {open && <NewTeamForm onClose={onClose} />}
    </Dialog>
  );
}

function NewTeamForm({ onClose }: { onClose: () => void }) {
  const save = useSaveVendorTeam();
  const nameId = useId();
  const classId = useId();
  const noteId = useId();
  const [name, setName] = useState("");
  const [teamClass, setTeamClass] = useState("");
  const [note, setNote] = useState("");
  const [tried, setTried] = useState(false);
  const nameError = tried && name.trim().length < 2 ? "Escribe el nombre del equipo." : null;
  const classError = tried && teamClass.trim().length < 2 ? "Escribe la clase del equipo." : null;

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    setTried(true);
    if (name.trim().length < 2 || teamClass.trim().length < 2) return;
    save.mutate(
      { create: true, name: name.trim(), team_class: teamClass.trim(), note: note.trim() || undefined },
      {
        onSuccess: (team) => {
          toast.success(`Equipo ${team.name} creado.`);
          onClose();
        },
      }
    );
  };

  return (
    <form onSubmit={submit} noValidate className="space-y-4">
      <Field label="Nombre" htmlFor={nameId} error={nameError}>
        <Input id={nameId} value={name} maxLength={60} onChange={(event) => setName(event.target.value)} aria-invalid={nameError ? true : undefined} />
      </Field>
      <Field label="Clase" htmlFor={classId} error={classError}>
        <Input id={classId} value={teamClass} maxLength={40} onChange={(event) => setTeamClass(event.target.value)} aria-invalid={classError ? true : undefined} />
      </Field>
      <Field label="Nota" htmlFor={noteId} optional>
        <Input id={noteId} value={note} maxLength={500} onChange={(event) => setNote(event.target.value)} />
      </Field>
      {/* The dialog stays open with what was typed: a 409 or a 503 (nothing saved) can be retried. */}
      <DialogError message={save.isError ? teamError(save.error) : null} />
      <DialogFooter>
        <Button variant="outline" onClick={onClose} disabled={save.isPending}>
          Cancelar
        </Button>
        <Button type="submit" disabled={save.isPending}>
          {save.isPending ? <Loader2 className="animate-spin" aria-hidden="true" /> : <Plus aria-hidden="true" />} Crear equipo
        </Button>
      </DialogFooter>
    </form>
  );
}
