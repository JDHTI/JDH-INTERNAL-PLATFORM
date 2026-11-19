"use client";

import { createElement, useMemo, useState, type FormEvent } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Crown,
  KeyRound,
  Pencil,
  Plus,
  RefreshCw,
  Save,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { areaKeys } from "@/features/areas/hooks/use-areas";
import type { AreaDto } from "@/features/areas/types/area.types";
import {
  useActiveUsers,
  useAdminAreas,
  useAreaMembers,
  useAreaRoles,
  usePermissionCatalog,
  useRolePermissions,
  adminKeys,
} from "@/features/admin/hooks/use-admin-data";
import {
  addAreaMember,
  createAdminArea,
  createAreaRole,
  deleteAdminArea,
  deleteAreaMember,
  deleteAreaRole,
  setRolePermissions,
  updateAdminArea,
  updateAreaMember,
  updateAreaRole,
} from "@/features/admin/services/admin.service";
import type {
  AreaDraft,
  AreaMemberDto,
  AreaRoleDto,
  CatalogModuleDto,
  RoleGrantDto,
} from "@/features/admin/types/admin.types";
import { areaToDraft } from "@/features/admin/types/admin.types";
import DirectoryAdmin from "@/features/directory/components/admin/directory-admin";
import SitesAdmin from "@/features/directory/components/admin/sites-admin";
import PqrsfSitesAdmin from "@/features/pqrsf/components/pqrsf-sites-admin";
import JobsPanel from "@/features/jobs/components/jobs-panel";
import MastersBrowser from "@/features/masters/components/masters-browser";
import SalespeopleAdmin from "@/features/salespeople/components/salespeople-admin";
import PageHeader from "@/shared/components/page-header";
import { ADMIN_SECTIONS, type AdminSection } from "@/shared/config/areas.config";
import {
  AREA_ICON_OPTIONS,
  DEFAULT_AREA_ICON,
  resolveAreaIcon,
} from "@/features/areas/area-icons";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { Dialog, DialogError, DialogFooter } from "@/shared/components/ui/dialog";
import { Dropdown } from "@/shared/components/ui/dropdown";
import { Field } from "@/shared/components/ui/field";
import { Input } from "@/shared/components/ui/input";
import { ScrollCue } from "@/shared/components/ui/scroll-cue";
import { useScrollHints } from "@/shared/hooks/use-scroll-hints";
import { roleLabel } from "@/features/session/types/session.types";
import { ApiError, errorMessage } from "@/shared/lib/api-client";
import { cn } from "@/shared/lib/utils";

import { isReservedSlug, slugFromName } from "../lib/area-slug";
import { normalizeCompanyEmail } from "../lib/company-email";
import AreaModulesAdmin from "./area-modules-admin";
import EmployeeEmailField from "./employee-email-field";
import RolePermissionsDialog, { LEADER_ROLE_HELP, grantsSummary } from "./role-permissions-dialog";

const SECTION_COPY: Record<AdminSection, string> = {
  areas: "Las áreas de la organización, sus roles, qué permite cada rol y quién pertenece a cada una.",
  modulos: "Qué módulos tiene encendidos cada área. Cualquier módulo se puede encender en cualquier área.",
  usuarios: "Las personas que ya entraron a la plataforma o que la sincronización creó.",
  directorio:
    "Las personas del directorio, qué se muestra de cada una y la sincronización nocturna con Microsoft Entra.",
  sedes: "Las sedes físicas de la compañía, para el directorio y el perfil de cada persona.",
  vendedores:
    "Qué vendedor o supervisor de SIESA es cada persona. De esto depende qué clientes y cotizaciones ve en el cotizador.",
  maestros:
    "Los maestros que la plataforma lee del DWH, cuándo se actualizan y todos sus registros. Qué maestros ve cada área se elige en Módulos por área.",
};

const EMPTY_AREA: AreaDraft = {
  name: "",
  icon: DEFAULT_AREA_ICON,
  sort_order: "0",
  responsible_email: "",
};

/**
 * Platform administration, one section per route under TI. The sidebar lists
 * the sections, so this screen carries no navigation of its own.
 */
export default function AdminManager({ section }: { section: AdminSection }) {
  const queryClient = useQueryClient();
  const sectionName = ADMIN_SECTIONS.find((item) => item.key === section)!.name;
  const [selectedSlug, setSelectedSlug] = useState<string>();
  const [areaDraft, setAreaDraft] = useState<AreaDraft>(EMPTY_AREA);
  const [editingAreaSlug, setEditingAreaSlug] = useState<string | null>(null);
  const [areaFormOpen, setAreaFormOpen] = useState(false);
  const [userOffset, setUserOffset] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  // The areas list hides its scrollbar; the faded edge and chevron say there is more.
  const { attach: attachAreas, hints: areaHints, style: areaFade, scrollPage: scrollAreas } = useScrollHints<HTMLUListElement>();

  // Each section loads only what it shows.
  const areasQuery = useAdminAreas(section === "areas");
  const usersQuery = useActiveUsers(userOffset, section === "usuarios");
  const catalogQuery = usePermissionCatalog(section === "areas");
  const areas = areasQuery.data ?? [];
  const activeArea = areas.find((area) => area.slug === selectedSlug) ?? areas[0];
  const rolesQuery = useAreaRoles(activeArea?.slug);
  const membersQuery = useAreaMembers(activeArea?.slug);

  const roles = rolesQuery.data ?? [];
  const members = membersQuery.data;
  const users = usersQuery.data?.items;
  const catalogModules =
    catalogQuery.data?.areas.find((area) => area.slug === activeArea?.slug)?.modules ?? [];

  // The admin's own menu and area selector read ["areas"]: a role or member change shows there too.
  const invalidateAdmin = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: adminKeys.all }),
      queryClient.invalidateQueries({ queryKey: areaKeys.all }),
    ]);
  };

  async function runMutation<T>(label: string, action: () => Promise<T>): Promise<T | undefined> {
    setBusy(label);
    setError(null);
    try {
      const result = await action();
      await invalidateAdmin();
      return result;
    } catch (cause) {
      const message = errorMessage(cause);
      setError(message);
      toast.error(message);
      return undefined;
    } finally {
      setBusy(null);
    }
  }

  const openCreateArea = () => {
    setEditingAreaSlug(null);
    setAreaDraft(EMPTY_AREA);
    setAreaFormOpen(true);
    setError(null);
  };

  const openEditArea = (area: AreaDto) => {
    setEditingAreaSlug(area.slug);
    setAreaDraft(areaToDraft(area));
    setAreaFormOpen(true);
    setError(null);
  };

  const saveArea = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const name = areaDraft.name.trim();
    if (!name) {
      setError("El nombre del área es obligatorio.");
      return;
    }
    let responsibleEmail: string | null = null;
    if (areaDraft.responsible_email.trim()) {
      const parsed = normalizeCompanyEmail(areaDraft.responsible_email);
      if (!parsed.ok) {
        setError(parsed.error);
        return;
      }
      responsibleEmail = parsed.email;
    }
    const sortOrder = Number.parseInt(areaDraft.sort_order, 10);
    const payload = {
      name,
      icon: areaDraft.icon.trim() || DEFAULT_AREA_ICON,
      sort_order: Number.isFinite(sortOrder) ? sortOrder : 0,
      responsible_email: responsibleEmail,
    };

    if (editingAreaSlug) {
      const updated = await runMutation("area", () =>
        updateAdminArea(editingAreaSlug, payload)
      );
      if (updated) {
        setSelectedSlug(updated.slug);
        setAreaFormOpen(false);
      }
      return;
    }

    // The URL segment comes from the name; the person never sees it.
    const slug = slugFromName(name);
    if (!slug || isReservedSlug(slug)) {
      setError("Ese nombre no se puede usar para un área. Elige otro.");
      return;
    }
    const created = await runMutation("area", () =>
      createAdminArea({ ...payload, slug }).catch((cause: unknown) => {
        // The API talks about the slug; the panel does not.
        if (cause instanceof ApiError && cause.status === 409 && cause.detail.includes("identificador")) {
          throw new ApiError(409, "Ya existe un área con un nombre parecido. Elige otro nombre.");
        }
        throw cause;
      })
    );
    if (created) {
      setSelectedSlug(created.slug);
      setAreaFormOpen(false);
    }
  };

  const removeArea = async (area: AreaDto) => {
    if (!window.confirm(`¿Eliminar el área “${area.name}”? Esta acción no se puede deshacer.`)) {
      return;
    }
    const deleted = await runMutation("area-delete", () => deleteAdminArea(area.slug));
    if (deleted && selectedSlug === area.slug) setSelectedSlug(undefined);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={sectionName}
        description={SECTION_COPY[section]}
        aside={
          section === "areas" && (
            <Button onClick={openCreateArea}>
              <Plus aria-hidden="true" />
              Nueva área
            </Button>
          )
        }
      />

      {!areaFormOpen && error && <DialogError message={error} />}

      <Dialog
        open={areaFormOpen}
        onOpenChange={(open) => {
          setAreaFormOpen(open);
          if (!open) setError(null);
        }}
        title={editingAreaSlug ? "Editar área" : "Nueva área"}
        description="El nombre, quién responde por el área, su icono y su orden en la lista."
        isForm
      >
        {error && <DialogError message={error} />}
        <AreaForm
          draft={areaDraft}
          busy={busy === "area"}
          onChange={setAreaDraft}
          onSubmit={saveArea}
          onCancel={() => setAreaFormOpen(false)}
        />
      </Dialog>

      {section === "areas" ? (
        <div className="space-y-4">
          {areasQuery.isPending ? (
            <LoadingBlock label="Cargando áreas" />
          ) : areasQuery.isError ? (
            <ErrorBlock onRetry={() => areasQuery.refetch()} />
          ) : areas.length === 0 ? (
            <EmptyBlock onCreate={openCreateArea} />
          ) : (
            <div className="grid gap-4 xl:grid-cols-[minmax(18rem,0.8fr)_minmax(0,1.6fr)]">
              <section className="rounded-lg border border-border bg-surface">
                <div className="border-b border-border px-4 py-3">
                  <h2 className="font-semibold">Áreas ({areas.length})</h2>
                  <p className="text-xs text-text-secondary">Selecciona un área para administrar su equipo.</p>
                </div>
                {/* The list shows exactly six 64px rows. Separators go on top of
                    each row: a bottom border on the sixth would sit against the
                    card edge whenever the list scrolls. */}
                <div className="relative">
                <ul ref={attachAreas} style={areaFade} className="max-h-96 snap-y snap-mandatory overflow-y-auto overscroll-contain no-scrollbar">
                  {areas.map((area) => (
                      <li
                        key={area.id}
                        className="h-16 snap-start border-t border-border first:border-t-0"
                      >
                        <button
                          type="button"
                          onClick={() => setSelectedSlug(area.slug)}
                          className={cn(
                            "flex h-full w-full items-center gap-3 px-4 text-left transition-colors hover:bg-canvas-subtle",
                            activeArea?.slug === area.slug && "bg-canvas-subtle"
                          )}
                        >
                          <span className="flex min-w-0 items-center gap-3">
                            <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-primary-subtle text-primary">
                              {createElement(resolveAreaIcon(area.icon), {
                                className: "size-4",
                                "aria-hidden": true,
                              })}
                            </span>
                            <span className="min-w-0">
                              <span className="block truncate font-medium">{area.name}</span>
                              <span className="block truncate text-xs text-text-secondary">
                                {responsibleLine(area)}
                              </span>
                            </span>
                          </span>
                        </button>
                      </li>
                  ))}
                </ul>
                <ScrollCue hints={areaHints} onScroll={scrollAreas} />
                </div>
              </section>

              {activeArea && (
                <AreaDetails
                  area={activeArea}
                  roles={roles}
                  members={members ?? []}
                  catalogModules={catalogModules}
                  busy={busy}
                  error={error}
                  rolesPending={rolesQuery.isPending}
                  membersPending={membersQuery.isPending}
                  onEdit={() => openEditArea(activeArea)}
                  onDelete={() => removeArea(activeArea)}
                  onRun={runMutation}
                  onError={setError}
                />
              )}
            </div>
          )}
        </div>
      ) : section === "modulos" ? (
        <AreaModulesAdmin />
      ) : section === "maestros" ? (
        <div className="space-y-6">
          <JobsPanel />
          <MastersBrowser />
        </div>
      ) : section === "directorio" ? (
        <DirectoryAdmin />
      ) : section === "sedes" ? (
        <div className="space-y-10">
          <section aria-labelledby="sites-company-heading" className="space-y-3">
            <h2 id="sites-company-heading" className="text-base font-semibold">
              Sedes de la empresa
            </h2>
            <SitesAdmin />
          </section>
          <section aria-labelledby="sites-pqrsf-heading" className="space-y-3">
            <h2 id="sites-pqrsf-heading" className="text-base font-semibold">
              Sedes de PQRSF
            </h2>
            <PqrsfSitesAdmin />
          </section>
        </div>
      ) : section === "vendedores" ? (
        <SalespeopleAdmin />
      ) : (
        <UsersDirectory
          users={users ?? []}
          total={usersQuery.data?.total ?? 0}
          offset={userOffset}
          pending={usersQuery.isPending}
          onPrevious={() => setUserOffset((value) => Math.max(0, value - 100))}
          onNext={() => setUserOffset((value) => value + 100)}
          canNext={userOffset + (users?.length ?? 0) < (usersQuery.data?.total ?? 0)}
          onRetry={() => usersQuery.refetch()}
        />
      )}
    </div>
  );
}

function responsibleLine(area: AreaDto): string {
  if (!area.responsible) return "Sin responsable";
  return `Responsable: ${area.responsible.display_name ?? area.responsible.email}`;
}

function AreaForm({
  draft,
  busy,
  onChange,
  onSubmit,
  onCancel,
}: {
  draft: AreaDraft;
  busy: boolean;
  onChange: (draft: AreaDraft) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onCancel: () => void;
}) {
  const update = (field: keyof AreaDraft, value: string) => onChange({ ...draft, [field]: value });
  const [iconQuery, setIconQuery] = useState("");
  const selectedIconName = draft.icon || DEFAULT_AREA_ICON;
  const filteredIcons = useMemo(() => {
    const query = iconQuery.trim().toLowerCase();
    if (!query) return AREA_ICON_OPTIONS;
    return AREA_ICON_OPTIONS.filter(({ name }) => name.toLowerCase().includes(query));
  }, [iconQuery]);

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Nombre" htmlFor="area-name">
          <Input id="area-name" value={draft.name} onChange={(event) => update("name", event.target.value)} required />
        </Field>
        <Field label="Orden" htmlFor="area-order" optional>
          <Input id="area-order" type="number" value={draft.sort_order} onChange={(event) => update("sort_order", event.target.value)} />
        </Field>
        <div className="md:col-span-2">
          <Field
            label="Responsable"
            htmlFor="area-responsible"
            optional
            hint="Correo corporativo. Escribe el nombre para buscarlo en el directorio. El responsable gestiona toda el área."
          >
            <EmployeeEmailField
              id="area-responsible"
              value={draft.responsible_email}
              onChange={(value) => update("responsible_email", value)}
              describedBy="area-responsible-hint"
            />
          </Field>
        </div>
        <div className="md:col-span-2">
          <Field
            label="Icono del área"
            htmlFor="area-icon-search"
            hint="Busca y selecciona una opción; se mostrará en el selector y en la navegación."
          >
            <div className="space-y-2">
              <div className="relative">
                <Search
                  className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-text-secondary"
                  aria-hidden="true"
                />
                <Input
                  id="area-icon-search"
                  value={iconQuery}
                  onChange={(event) => setIconQuery(event.target.value)}
                  placeholder="Buscar icono por nombre…"
                  className="pl-9"
                />
              </div>
              <div
                role="group"
                aria-label="Iconos disponibles"
                className="grid max-h-56 grid-cols-4 gap-2 overflow-y-auto rounded-md border border-border-control p-2 sm:grid-cols-6"
              >
                {filteredIcons.length > 0 ? (
                  filteredIcons.map(({ name, icon: Icon }) => {
                    const isSelected = selectedIconName === name;
                    return (
                      <button
                        key={name}
                        type="button"
                        aria-pressed={isSelected}
                        title={`Usar icono ${name}`}
                        onClick={() => update("icon", name)}
                        className={cn(
                          "relative flex min-w-0 flex-col items-center gap-1 rounded-md border px-1.5 py-2 text-text-secondary transition-colors",
                          "hover:border-primary hover:bg-primary-subtle hover:text-primary",
                          "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
                          isSelected
                            ? "border-primary bg-primary-subtle text-primary"
                            : "border-transparent"
                        )}
                      >
                        <Icon className="size-5" aria-hidden="true" />
                        <span className="w-full truncate text-center text-[10px] leading-tight">{name}</span>
                        {isSelected && (
                          <Check className="absolute right-1 top-1 size-3" aria-hidden="true" />
                        )}
                      </button>
                    );
                  })
                ) : (
                  <p className="col-span-full px-2 py-4 text-center text-sm text-text-secondary">
                    No encontramos iconos con ese nombre.
                  </p>
                )}
              </div>
              <div className="flex items-center gap-2 text-xs text-text-secondary">
                <span className="flex size-7 items-center justify-center rounded-md bg-primary-subtle text-primary">
                  {createElement(resolveAreaIcon(selectedIconName), {
                    className: "size-4",
                    "aria-hidden": true,
                  })}
                </span>
                <span>
                  Seleccionado: <strong className="font-medium text-text-primary">{selectedIconName}</strong>
                </span>
              </div>
            </div>
          </Field>
        </div>
      </div>

      <DialogFooter>
        <Button variant="outline" type="button" onClick={onCancel}>Cancelar</Button>
        <Button type="submit" disabled={busy}>
          <Save aria-hidden="true" /> {busy ? "Guardando…" : "Guardar"}
        </Button>
      </DialogFooter>
    </form>
  );
}

function AreaDetails({
  area,
  roles,
  members,
  catalogModules,
  busy,
  error,
  rolesPending,
  membersPending,
  onEdit,
  onDelete,
  onRun,
  onError,
}: {
  area: AreaDto;
  roles: AreaRoleDto[];
  members: AreaMemberDto[];
  catalogModules: CatalogModuleDto[];
  busy: string | null;
  error: string | null;
  rolesPending: boolean;
  membersPending: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onRun: <T>(label: string, action: () => Promise<T>) => Promise<T | undefined>;
  onError: (message: string | null) => void;
}) {
  const [roleName, setRoleName] = useState("");
  const [editingRoleId, setEditingRoleId] = useState<string | null>(null);
  const [permissionsRole, setPermissionsRole] = useState<AreaRoleDto | null>(null);
  const [memberEmail, setMemberEmail] = useState("");
  const [memberRoleId, setMemberRoleId] = useState("");
  // A new member starts on a regular role: the leader role gives the whole
  // area, so it has to be chosen on purpose. Without other roles, the leader.
  const defaultRoleId = (roles.find((role) => !role.is_leader) ?? roles[0])?.id ?? "";
  const effectiveMemberRoleId = memberRoleId || defaultRoleId;
  const roleOptions = roles.map((role) => ({
    value: role.id,
    label: role.is_leader ? `${role.name} (líder)` : role.name,
  }));
  const permissions = useRolePermissions(area.slug, roles.map((role) => role.id));
  const memberEmails = useMemo(() => members.map((member) => member.user.email), [members]);

  const saveRole = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const cleaned = roleName.trim();
    if (!cleaned) return;
    if (editingRoleId) {
      const result = await onRun("role", () => updateAreaRole(area.slug, editingRoleId, cleaned));
      if (result) {
        setEditingRoleId(null);
        setRoleName("");
      }
    } else {
      const result = await onRun("role", () => createAreaRole(area.slug, cleaned));
      if (result) {
        setRoleName("");
        // A new role grants nothing until it gets permissions: ask for them now.
        setPermissionsRole(result);
      }
    }
  };

  const removeRole = async (roleId: string, name: string) => {
    if (!window.confirm(`¿Eliminar el rol “${name}”?`)) return;
    await onRun("role-delete", () => deleteAreaRole(area.slug, roleId));
  };

  const savePermissions = async (grants: RoleGrantDto[]) => {
    if (!permissionsRole) return;
    const result = await onRun("permissions", () =>
      setRolePermissions(area.slug, permissionsRole.id, grants)
    );
    if (result) {
      setPermissionsRole(null);
      toast.success(`Permisos de ${permissionsRole.name} guardados.`);
    }
  };

  const addMember = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const parsed = normalizeCompanyEmail(memberEmail);
    if (!parsed.ok) {
      onError(parsed.error);
      return;
    }
    if (!effectiveMemberRoleId) return;
    const result = await onRun("member", () =>
      addAreaMember(area.slug, parsed.email, effectiveMemberRoleId)
    );
    if (result) setMemberEmail("");
  };

  const removeMember = async (memberId: string, name: string) => {
    if (!window.confirm(`¿Retirar a “${name}” del área?`)) return;
    await onRun("member-delete", () => deleteAreaMember(area.slug, memberId));
  };

  return (
    <section className="space-y-4">
      <div className="rounded-lg border border-border bg-surface p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 space-y-1">
            <p className="text-xs font-medium uppercase tracking-[0.1em] text-text-secondary">Área seleccionada</p>
            <h2 className="truncate text-xl font-semibold">{area.name}</h2>
            <p className="text-sm text-text-secondary">{responsibleLine(area)}</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={onEdit}><Pencil aria-hidden="true" /> Editar</Button>
            <Button variant="danger" size="sm" onClick={onDelete} disabled={busy === "area-delete"}><Trash2 aria-hidden="true" /> Eliminar</Button>
          </div>
        </div>
      </div>

      <RolePermissionsDialog
        open={permissionsRole !== null}
        onOpenChange={(open) => {
          if (!open) {
            setPermissionsRole(null);
            onError(null);
          }
        }}
        roleName={permissionsRole?.name ?? ""}
        isLeader={permissionsRole?.is_leader ?? false}
        modules={catalogModules}
        grants={permissionsRole ? (permissions[permissionsRole.id] ?? []) : []}
        busy={busy === "permissions"}
        error={permissionsRole ? error : null}
        onSave={savePermissions}
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="space-y-3 rounded-lg border border-border bg-surface p-4">
          <div>
            <h3 className="font-semibold">Roles del área</h3>
            <p className="text-sm text-text-secondary">Cada rol decide qué módulos abren sus miembros y qué pueden hacer en ellos.</p>
          </div>
          <form onSubmit={saveRole} className="flex gap-2">
            <Input value={roleName} onChange={(event) => setRoleName(event.target.value)} placeholder="Ej. Líder de área" aria-label="Nombre del rol" />
            <Button type="submit" size="icon-sm" disabled={busy === "role"} aria-label={editingRoleId ? "Guardar rol" : "Crear rol"}>
              {editingRoleId ? <Save aria-hidden="true" /> : <Plus aria-hidden="true" />}
            </Button>
            {editingRoleId && <Button variant="ghost" size="icon-sm" onClick={() => { setEditingRoleId(null); setRoleName(""); }} aria-label="Cancelar edición"><X aria-hidden="true" /></Button>}
          </form>
          {rolesPending ? <LoadingBlock label="Cargando roles" compact /> : roles.length === 0 ? <p className="text-sm text-text-secondary">Aún no hay roles definidos.</p> : (
            <ul className="divide-y divide-border rounded-md border border-border">
              {roles.map((role) => (
                <li key={role.id} className="flex items-center justify-between gap-2 px-3 py-2 text-sm">
                  <span className="min-w-0">
                    <span className="flex min-w-0 items-center gap-1.5">
                      <span className="truncate font-medium">{role.name}</span>
                      {role.is_leader && (
                        <Badge tone="info" className="py-0" title={LEADER_ROLE_HELP}>
                          <Crown aria-hidden="true" /> Líder
                        </Badge>
                      )}
                    </span>
                    <span className="block truncate text-xs text-text-secondary">
                      {role.is_leader ? "Todos los permisos del área" : grantsSummary(
                            permissions[role.id],
                            // While the catalog loads, every grant counts rather than none.
                            catalogModules.length > 0 ? new Set(catalogModules.map((module) => module.key)) : undefined
                          )}
                    </span>
                  </span>
                  <span className="flex shrink-0 gap-1">
                    <Button variant="outline" size="sm" onClick={() => setPermissionsRole(role)} aria-label={`Permisos de ${role.name}`}><KeyRound aria-hidden="true" /> Permisos</Button>
                    <Button variant="ghost" size="icon-sm" onClick={() => { setEditingRoleId(role.id); setRoleName(role.name); }} aria-label={`Renombrar ${role.name}`}><Pencil aria-hidden="true" /></Button>
                    {/* The leader role is the one every area keeps: the API answers 409 to deleting it. */}
                    {!role.is_leader && (
                      <Button variant="ghost" size="icon-sm" onClick={() => removeRole(role.id, role.name)} aria-label={`Eliminar ${role.name}`}><Trash2 aria-hidden="true" /></Button>
                    )}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="space-y-3 rounded-lg border border-border bg-surface p-4">
          <div>
            <h3 className="font-semibold">Miembros</h3>
            <p className="text-sm text-text-secondary">Escribe el nombre o el correo corporativo de la persona y elige su rol.</p>
          </div>
          <form onSubmit={addMember} className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,0.8fr)_auto]">
            <EmployeeEmailField
              id="member-email"
              value={memberEmail}
              onChange={setMemberEmail}
              excludeEmails={memberEmails}
              placeholder="Nombre o correo"
              disabled={roles.length === 0}
            />
            <Dropdown
              value={effectiveMemberRoleId}
              onValueChange={setMemberRoleId}
              options={roleOptions}
              placeholder="Selecciona un rol"
              aria-label="Rol"
              disabled={roles.length === 0}
            />
            <Button type="submit" size="icon-sm" disabled={busy === "member" || !memberEmail.trim() || !effectiveMemberRoleId} aria-label="Agregar miembro"><Plus aria-hidden="true" /></Button>
          </form>
          {roles.length === 0 && !rolesPending && (
            <p className="text-sm text-text-secondary">Crea un rol antes de agregar miembros.</p>
          )}
          {membersPending ? <LoadingBlock label="Cargando miembros" compact /> : members.length === 0 ? <p className="text-sm text-text-secondary">Aún no hay miembros asignados.</p> : (
            <ul className="divide-y divide-border rounded-md border border-border">
              {members.map((member) => (
                <li key={member.id} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
                  <span className="min-w-0"><span className="block truncate font-medium">{member.user.display_name ?? "Sin nombre"}</span><span className="block truncate text-xs text-text-secondary">{member.user.email ?? "Sin correo"}</span></span>
                  <span className="flex shrink-0 items-center gap-1">
                    <Dropdown
                      className="w-32"
                      size="sm"
                      value={member.role.id}
                      onValueChange={(value) => onRun("member-role", () => updateAreaMember(area.slug, member.id, value))}
                      options={roleOptions}
                      aria-label={`Rol de ${member.user.display_name ?? "miembro"}`}
                    />
                    <Button variant="ghost" size="icon-sm" onClick={() => removeMember(member.id, member.user.display_name ?? member.user.email ?? "miembro")} aria-label={`Retirar ${member.user.display_name ?? "miembro"}`}><Trash2 aria-hidden="true" /></Button>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </section>
  );
}

function UsersDirectory({
  users,
  total,
  offset,
  pending,
  onPrevious,
  onNext,
  canNext,
  onRetry,
}: {
  users: { id: string; name: string; email: string | null; job_title: string | null; role: string; area_name: string | null; is_active?: boolean }[];
  total: number;
  offset: number;
  pending: boolean;
  onPrevious: () => void;
  onNext: () => void;
  canNext: boolean;
  onRetry: () => void;
}) {
  if (pending) return <LoadingBlock label="Cargando usuarios habilitados" />;
  if (users.length === 0) return <EmptyBlock showAction={false} onCreate={() => undefined} title="No hay usuarios habilitados" description="Los usuarios registrados aparecerán aquí cuando estén disponibles." />;
  return (
    <section className="space-y-3 rounded-lg border border-border bg-surface p-4">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div><h2 className="font-semibold">Usuarios habilitados</h2><p className="text-sm text-text-secondary">Directorio general de personas con acceso a la plataforma.</p></div>
        <Button variant="outline" size="sm" onClick={onRetry}><RefreshCw aria-hidden="true" /> Actualizar</Button>
      </div>
      <div className="overflow-x-auto rounded-md border border-border">
        <table className="w-full min-w-[42rem] text-left text-sm">
          <thead className="bg-canvas-subtle text-xs text-text-secondary"><tr><th className="px-3 py-2 font-medium">Usuario</th><th className="px-3 py-2 font-medium">Cargo</th><th className="px-3 py-2 font-medium">Rol global</th><th className="px-3 py-2 font-medium">Área principal</th><th className="px-3 py-2 font-medium">Estado</th></tr></thead>
          <tbody className="divide-y divide-border">
            {users.map((user) => <tr key={user.id}><td className="px-3 py-2"><span className="block font-medium">{user.name}</span><span className="block text-xs text-text-secondary">{user.email ?? "Sin correo"}</span></td><td className="px-3 py-2 text-text-secondary">{user.job_title ?? "—"}</td><td className="px-3 py-2">{roleLabel(user.role)}</td><td className="px-3 py-2 text-text-secondary">{user.area_name ?? "Sin área principal"}</td><td className="px-3 py-2"><span className="rounded-full bg-success-surface px-2 py-1 text-xs text-success">Activo</span></td></tr>)}
          </tbody>
        </table>
      </div>
      <div className="flex items-center justify-between text-xs text-text-secondary"><span>{offset + 1}–{Math.min(offset + users.length, total)} de {total}</span><span className="flex gap-1"><Button variant="outline" size="icon-sm" onClick={onPrevious} disabled={offset === 0} aria-label="Página anterior"><ChevronLeft aria-hidden="true" /></Button><Button variant="outline" size="icon-sm" onClick={onNext} disabled={!canNext} aria-label="Página siguiente"><ChevronRight aria-hidden="true" /></Button></span></div>
    </section>
  );
}

function LoadingBlock({ label, compact = false }: { label: string; compact?: boolean }) {
  return <div className={cn("animate-pulse rounded-lg bg-canvas-subtle", compact ? "h-16" : "h-40")} aria-busy="true" aria-label={label} />;
}

function ErrorBlock({ onRetry }: { onRetry: () => void }) {
  return <div className="space-y-3 rounded-lg border border-danger p-4" role="alert"><p className="font-medium">No se pudieron cargar las áreas.</p><Button variant="outline" onClick={onRetry}>Reintentar</Button></div>;
}

function EmptyBlock({ onCreate, title = "No hay áreas creadas", description = "Crea la primera área para comenzar a organizar la plataforma.", showAction = true }: { onCreate: () => void; title?: string; description?: string; showAction?: boolean }) {
  return <div className="space-y-3 rounded-lg border border-border p-6"><h2 className="font-semibold">{title}</h2><p className="text-sm text-text-secondary">{description}</p>{showAction && <Button onClick={onCreate}><Plus aria-hidden="true" /> Nueva área</Button>}</div>;
}
