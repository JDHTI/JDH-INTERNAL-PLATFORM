"use client";

import { useState, type FormEvent } from "react";
import { CloudOff, Link2, Link2Off, Loader2, MailCheck, Search, UserSearch, Users } from "lucide-react";
import { toast } from "sonner";

import EmployeeEmailField from "@/features/admin/components/employee-email-field";
import { normalizeCompanyEmail } from "@/features/admin/lib/company-email";
import { useSession } from "@/features/session/hooks/use-session";
import { isPlatformAdmin } from "@/features/session/types/session.types";
import Pager from "@/shared/components/pager";
import StatePanel from "@/shared/components/state-panel";
import TableSkeleton from "@/shared/components/table-skeleton";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import ConfirmDeleteDialog from "@/shared/components/ui/confirm-delete-dialog";
import { Dialog, DialogError, DialogFooter } from "@/shared/components/ui/dialog";
import { Dropdown } from "@/shared/components/ui/dropdown";
import { Field } from "@/shared/components/ui/field";
import { Input } from "@/shared/components/ui/input";
import { useDebouncedValue } from "@/shared/hooks/use-debounced-value";
import { ApiError, errorMessage } from "@/shared/lib/api-client";
import { cn } from "@/shared/lib/utils";

import { useCreateLink, useDeleteLink, useRoster, useSyncLinks, useUserLinks } from "../hooks/use-salespeople";
import {
  KIND_LABELS,
  ROSTER_PAGE_SIZE,
  SOURCE_LABELS,
  activeLink,
  type RosterEntry,
  type SalespersonKind,
  type SalespersonLink,
} from "../types/salespeople.types";

const numberFormat = new Intl.NumberFormat("es-CO");

type LinkedFilter = "all" | "unlinked";

/**
 * Who works as each SIESA salesperson and each coordinator. Coordinators come
 * from the consumo.supervisores master, by NIT and with its e-mail (API #121).
 * The quoter and every commercial list follow these links: a salesperson sees
 * their portfolio, a coordinator their team's, and a member of Comercial without
 * a link sees nothing. Linking by hand wins over the e-mail match; unlinking
 * keeps the e-mail from linking the code again.
 */
export default function SalespeopleAdmin() {
  const { data: user } = useSession();
  const canEdit = isPlatformAdmin(user?.role);
  const [kind, setKind] = useState<SalespersonKind>("seller");
  const [text, setText] = useState("");
  const [linked, setLinked] = useState<LinkedFilter>("unlinked");
  const [page, setPage] = useState(1);
  const q = useDebouncedValue(text.trim());
  const roster = useRoster({ kind, q, linked: linked === "unlinked" ? false : undefined, page });
  const sync = useSyncLinks();
  const [linking, setLinking] = useState<RosterEntry | null>(null);
  const [unlinking, setUnlinking] = useState<{ link: SalespersonLink; label: string } | null>(null);

  const chooseKind = (next: SalespersonKind) => {
    setKind(next);
    setPage(1);
  };

  const runSync = () =>
    sync.mutate(undefined, {
      onSuccess: (result) =>
        toast.success(
          `${numberFormat.format(result.created)} vinculados nuevos por correo, ${numberFormat.format(result.matched)} ya lo estaban. ` +
            `${numberFormat.format(result.without_user)} con correo no tienen usuario en la plataforma.`
        ),
      onError: (failure) => toast.error(errorMessage(failure), { duration: Infinity }),
    });

  const items = roster.data?.items ?? [];

  return (
    <div className="space-y-6">
      <section className="space-y-4 rounded-lg border border-border bg-surface p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-1">
            <h2 className="font-semibold">Vendedores y coordinadores</h2>
            <p className="max-w-prose text-sm text-text-secondary">
              Un vendedor vinculado ve su cartera en el cotizador; un coordinador, la de su equipo. Los vendedores salen de
              SIESA. Los coordinadores salen del maestro de supervisores, por su NIT, y se vinculan solos con el correo que
              tiene el maestro.
            </p>
          </div>
          {canEdit && (
            <Button variant="outline" onClick={runSync} disabled={sync.isPending} className="shrink-0 max-md:h-11">
              {sync.isPending ? <Loader2 className="animate-spin" aria-hidden="true" /> : <MailCheck aria-hidden="true" />}
              Vincular por correo
            </Button>
          )}
        </div>

        <div className="flex flex-col gap-2 md:flex-row md:items-center">
          <div role="group" aria-label="Tipo de código" className="flex shrink-0 gap-1 rounded-md border border-border-control p-1">
            {(["seller", "supervisor"] as const).map((option) => (
              <button
                key={option}
                type="button"
                aria-pressed={kind === option}
                onClick={() => chooseKind(option)}
                className={cn(
                  "h-7 rounded-sm px-3 text-sm font-medium transition-colors duration-150 max-md:h-10",
                  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
                  kind === option ? "bg-primary-subtle text-primary" : "text-text-secondary hover:text-text-primary"
                )}
              >
                {option === "seller" ? "Vendedores" : "Coordinadores"}
              </button>
            ))}
          </div>
          <div className="relative w-full md:max-w-sm">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-text-secondary" aria-hidden="true" />
            <Input
              type="search"
              value={text}
              onChange={(event) => {
                setText(event.target.value);
                setPage(1);
              }}
              placeholder={kind === "seller" ? "Código o nombre" : "NIT o nombre"}
              aria-label="Buscar códigos"
              className="pl-9 max-md:h-11"
            />
          </div>
          <Dropdown
            className="md:w-48"
            value={linked}
            onValueChange={(value) => {
              setLinked(value as LinkedFilter);
              setPage(1);
            }}
            options={[
              { value: "unlinked", label: "Sin vincular" },
              { value: "all", label: "Todos" },
            ]}
            aria-label="Filtrar por vínculo"
          />
        </div>

        {roster.isPending ? (
          <TableSkeleton rows={6} label="Cargando códigos" />
        ) : roster.isError ? (
          <StatePanel
            icon={CloudOff}
            title="No se pudieron cargar los códigos"
            tone="danger"
            action={
              <Button variant="outline" onClick={() => void roster.refetch()}>
                Reintentar
              </Button>
            }
          >
            {errorMessage(roster.error)}
          </StatePanel>
        ) : items.length === 0 ? (
          <StatePanel
            icon={Users}
            title={q ? `Ningún código coincide con «${q}»` : linked === "unlinked" ? "Todos los códigos están vinculados" : "No hay códigos activos"}
            action={
              q || linked === "unlinked" ? (
                <Button
                  variant="outline"
                  onClick={() => {
                    setText("");
                    setLinked("all");
                    setPage(1);
                  }}
                >
                  Ver todos
                </Button>
              ) : undefined
            }
          />
        ) : (
          <div className="space-y-3">
            <div className="overflow-x-auto rounded-md border border-border">
              <table className="w-full min-w-[54rem] text-left text-sm">
                <thead className="bg-canvas-subtle text-xs text-text-secondary">
                  <tr>
                    <th scope="col" className="px-3 py-2 font-medium">{kind === "seller" ? "Código" : "NIT"}</th>
                    <th scope="col" className="px-3 py-2 font-medium">{kind === "seller" ? "Vendedor en SIESA" : "Coordinador"}</th>
                    <th scope="col" className="px-3 py-2 font-medium">Equipo</th>
                    <th scope="col" className="px-3 py-2 font-medium">Persona en la plataforma</th>
                    {canEdit && <th scope="col" className="px-3 py-2 text-right font-medium">Acción</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {items.map((entry) => (
                    <RosterRow
                      key={`${entry.kind}-${entry.code}`}
                      entry={entry}
                      canEdit={canEdit}
                      onLink={() => setLinking(entry)}
                      onUnlink={(link) => setUnlinking({ link, label: `${entry.code} · ${entry.name ?? ""}` })}
                    />
                  ))}
                </tbody>
              </table>
            </div>
            <Pager page={page} size={ROSTER_PAGE_SIZE} total={roster.data.total} count={items.length} onPageChange={setPage} />
          </div>
        )}
      </section>

      <PersonLinks canEdit={canEdit} onUnlink={(link) => setUnlinking({ link, label: link.code })} />

      <LinkDialog entry={linking} onClose={() => setLinking(null)} />
      <UnlinkDialog target={unlinking} onClose={() => setUnlinking(null)} />
    </div>
  );
}

function RosterRow({
  entry,
  canEdit,
  onLink,
  onUnlink,
}: {
  entry: RosterEntry;
  canEdit: boolean;
  onLink: () => void;
  onUnlink: (link: SalespersonLink) => void;
}) {
  const link = activeLink(entry);
  return (
    <tr>
      <td className="px-3 py-2 font-mono text-[13px]">{entry.code}</td>
      <td className="px-3 py-2">
        <span className="block font-medium">{entry.name ?? "Sin nombre"}</span>
        <span className="block text-xs text-text-secondary">
          {[entry.email?.toLowerCase(), entry.supervisor_code ? `Coordinador ${entry.supervisor_code}` : null]
            .filter(Boolean)
            .join(" · ") || (entry.kind === "seller" ? "Sin correo en SIESA" : "Sin correo en el maestro")}
        </span>
      </td>
      <td className="px-3 py-2">
        {entry.team ? (
          <span className="block">{entry.team}</span>
        ) : (
          <span className="text-text-secondary">—</span>
        )}
        {/* A coordinator with nobody under them in the master: linked, they would see no customers. */}
        {entry.kind === "supervisor" && !entry.is_active && <Badge tone="warning" className="mt-0.5">Sin equipo</Badge>}
      </td>
      <td className="px-3 py-2">
        {entry.holder_email ? (
          <span className="flex items-center gap-2">
            <span className="min-w-0">
              <span className="block truncate font-medium">{entry.holder_name ?? entry.holder_email}</span>
              <span className="block truncate text-xs text-text-secondary">{entry.holder_email}</span>
            </span>
            {link && <Badge tone={link.source === "manual" ? "info" : "neutral"}>{SOURCE_LABELS[link.source]}</Badge>}
          </span>
        ) : (
          <span className="flex items-center gap-2 text-text-secondary">
            Sin vincular
            {entry.link?.source === "excluded" && <Badge tone="warning">Desvinculado a mano</Badge>}
          </span>
        )}
      </td>
      {canEdit && (
        <td className="px-3 py-2 text-right">
          <span className="inline-flex gap-1">
            <Button variant="outline" size="sm" onClick={onLink} className="max-md:h-11">
              <Link2 aria-hidden="true" /> {link ? "Cambiar" : "Vincular"}
            </Button>
            {link && (
              <Button variant="ghost" size="icon-sm" onClick={() => onUnlink(link)} aria-label={`Desvincular ${entry.code}`} title="Desvincular" className="max-md:size-11">
                <Link2Off aria-hidden="true" />
              </Button>
            )}
          </span>
        </td>
      )}
    </tr>
  );
}

/** A code given to a corporate e-mail. Replaces an e-mail match; someone else's manual link must go first. */
function LinkDialog({ entry, onClose }: { entry: RosterEntry | null; onClose: () => void }) {
  const create = useCreateLink();
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);

  const close = () => {
    setEmail("");
    setError(null);
    onClose();
  };

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!entry) return;
    const parsed = normalizeCompanyEmail(email);
    if (!parsed.ok) {
      setError(parsed.error);
      return;
    }
    create.mutate(
      { email: parsed.email, kind: entry.kind, code: entry.code },
      {
        onSuccess: () => {
          toast.success(`${entry.code} quedó vinculado a ${parsed.email}.`);
          close();
        },
        onError: (failure) =>
          setError(
            failure instanceof ApiError && failure.status === 409 && entry.holder_email
              ? `${failure.detail} Hoy lo tiene ${entry.holder_email}.`
              : errorMessage(failure)
          ),
      }
    );
  };

  return (
    <Dialog
      open={entry !== null}
      onOpenChange={(open) => !open && close()}
      title={entry ? `Vincular ${KIND_LABELS[entry.kind].toLowerCase()} ${entry.code}` : "Vincular"}
      description={entry ? `${entry.name ?? "Sin nombre"}. Quien quede vinculado ve ${entry.kind === "seller" ? "su cartera" : "la cartera de su equipo"} en el cotizador.` : undefined}
      isForm
    >
      <form onSubmit={submit} className="space-y-4" noValidate>
        <Field label="Persona" htmlFor="salesperson-email" hint="Correo corporativo. Escribe el nombre para buscarla en el directorio.">
          <EmployeeEmailField id="salesperson-email" value={email} onChange={(value) => { setEmail(value); setError(null); }} describedBy="salesperson-email-hint" />
        </Field>
        <DialogError message={error} />
        <DialogFooter>
          <Button variant="outline" type="button" onClick={close}>
            Cancelar
          </Button>
          <Button type="submit" disabled={create.isPending || !email.trim()}>
            {create.isPending ? <Loader2 className="animate-spin" aria-hidden="true" /> : <Link2 aria-hidden="true" />}
            Vincular
          </Button>
        </DialogFooter>
      </form>
    </Dialog>
  );
}

function UnlinkDialog({ target, onClose }: { target: { link: SalespersonLink; label: string } | null; onClose: () => void }) {
  const remove = useDeleteLink();
  const [error, setError] = useState<string | null>(null);
  return (
    <ConfirmDeleteDialog
      open={target !== null}
      onOpenChange={(open) => {
        if (!open) {
          setError(null);
          onClose();
        }
      }}
      title={`¿Desvincular ${target?.label ?? ""}?`}
      confirmLabel="Desvincular"
      isPending={remove.isPending}
      error={error}
      onConfirm={() =>
        target &&
        remove.mutate(target.link.id, {
          onSuccess: () => {
            toast.success(`${target.link.code} quedó sin vincular.`);
            onClose();
          },
          onError: (failure) => setError(errorMessage(failure)),
        })
      }
    >
      La persona deja de ver esa cartera en el cotizador. «Vincular por correo» no lo vuelve a vincular; solo un vínculo
      manual.
    </ConfirmDeleteDialog>
  );
}

/** One person's codes, looked up by e-mail: the way to check who sees what. */
function PersonLinks({ canEdit, onUnlink }: { canEdit: boolean; onUnlink: (link: SalespersonLink) => void }) {
  const [typed, setTyped] = useState("");
  const [email, setEmail] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const links = useUserLinks(email);

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const parsed = normalizeCompanyEmail(typed);
    if (!parsed.ok) {
      setError(parsed.error);
      return;
    }
    setError(null);
    setEmail(parsed.email);
  };

  const active = (links.data?.links ?? []).filter((link) => link.source !== "excluded");

  return (
    <section className="space-y-3 rounded-lg border border-border bg-surface p-4">
      <div className="space-y-1">
        <h2 className="font-semibold">Consultar una persona</h2>
        <p className="text-sm text-text-secondary">Los códigos con los que trabaja una persona, por su correo corporativo.</p>
      </div>
      <form onSubmit={submit} className="flex flex-col gap-2 sm:flex-row sm:items-start" noValidate>
        <div className="w-full sm:max-w-md">
          <EmployeeEmailField id="salesperson-lookup" value={typed} onChange={(value) => { setTyped(value); setError(null); }} placeholder="Nombre o correo" />
        </div>
        <Button type="submit" variant="outline" disabled={!typed.trim()} className="max-md:h-11">
          <UserSearch aria-hidden="true" /> Consultar
        </Button>
      </form>
      {error && <p role="alert" className="text-[13px] text-danger">{error}</p>}
      {email && (
        links.isPending ? (
          <TableSkeleton rows={2} label="Cargando los códigos de la persona" />
        ) : links.isError ? (
          <p role="alert" className="text-sm text-danger">{errorMessage(links.error)}</p>
        ) : (
          <div className="space-y-2">
            <p className="text-sm">
              <span className="font-medium">{links.data.user.display_name ?? links.data.user.email}</span>{" "}
              <span className="text-text-secondary">{links.data.user.email}</span>
              {!links.data.user.is_active && <Badge tone="danger" className="ml-2">Inactiva</Badge>}
            </p>
            {active.length === 0 ? (
              <p className="text-sm text-text-secondary">
                No tiene códigos. Si es de Comercial, no ve ningún cliente en el cotizador hasta que la vincules.
              </p>
            ) : (
              <ul className="divide-y divide-border rounded-md border border-border">
                {active.map((link) => (
                  <li key={link.id} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
                    <span className="flex items-center gap-2">
                      <span className="font-mono text-[13px]">{link.code}</span>
                      <span className="text-text-secondary">{KIND_LABELS[link.kind]}</span>
                      <Badge tone={link.source === "manual" ? "info" : "neutral"}>{SOURCE_LABELS[link.source]}</Badge>
                    </span>
                    {canEdit && (
                      <Button variant="ghost" size="icon-sm" onClick={() => onUnlink(link)} aria-label={`Desvincular ${link.code}`} title="Desvincular" className="max-md:size-11">
                        <Link2Off aria-hidden="true" />
                      </Button>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )
      )}
    </section>
  );
}
