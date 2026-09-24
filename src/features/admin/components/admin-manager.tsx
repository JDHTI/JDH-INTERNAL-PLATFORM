"use client";

import { createElement, useMemo, useState, type FormEvent } from "react";
import Link from "next/link";
import { useQueryClient } from "@tanstack/react-query";
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Pencil,
  Plus,
  RefreshCw,
  Save,
  Search,
  Trash2,
  Users,
  X,
} from "lucide-react";
import { toast } from "sonner";

import type { AreaDto } from "@/features/areas/types/area.types";
import {
  useActiveUsers,
  useAdminAreas,
  useAreaMembers,
  useAreaRoles,
  adminKeys,
} from "@/features/admin/hooks/use-admin-data";
import {
  addAreaMember,
  createAdminArea,
  createAreaRole,
  deleteAdminArea,
  deleteAreaMember,
  deleteAreaRole,
  updateAdminArea,
  updateAreaMember,
  updateAreaRole,
} from "@/features/admin/services/admin.service";
import type { AreaDraft } from "@/features/admin/types/admin.types";
import { areaToDraft } from "@/features/admin/types/admin.types";
import {
  AREA_ICON_OPTIONS,
  DEFAULT_AREA_ICON,
  resolveAreaIcon,
} from "@/features/areas/area-icons";
import { Button } from "@/shared/components/ui/button";
import { Dialog, DialogError, DialogFooter } from "@/shared/components/ui/dialog";
import { Field } from "@/shared/components/ui/field";
import { Input } from "@/shared/components/ui/input";
import { errorMessage } from "@/shared/lib/api-client";
import { cn } from "@/shared/lib/utils";

type AdminSection = "areas" | "usuarios";

const EMPTY_AREA: AreaDraft = {
  slug: "",
  name: "",
  icon: DEFAULT_AREA_ICON,
  sort_order: "0",
  responsible_email: "",
};

export default function AdminManager({
  initialSection,
}: {
  initialSection: AdminSection;
}) {
  const queryClient = useQueryClient();
  const [section, setSection] = useState(initialSection);
  const [selectedSlug, setSelectedSlug] = useState<string>();
  const [areaDraft, setAreaDraft] = useState<AreaDraft>(EMPTY_AREA);
  const [editingAreaSlug, setEditingAreaSlug] = useState<string | null>(null);
  const [areaFormOpen, setAreaFormOpen] = useState(false);
  const [userOffset, setUserOffset] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const areasQuery = useAdminAreas();
  const usersQuery = useActiveUsers(userOffset);
  const areas = areasQuery.data ?? [];
  const activeArea = areas.find((area) => area.slug === selectedSlug) ?? areas[0];
  const rolesQuery = useAreaRoles(activeArea?.slug);
  const membersQuery = useAreaMembers(activeArea?.slug);

  const roles = rolesQuery.data ?? [];
  const members = membersQuery.data;
  const users = usersQuery.data?.items;
  const availableUsers = useMemo(() => {
    const assigned = new Set((members ?? []).map((member) => member.user.email).filter(Boolean));
    return (users ?? []).filter((user) => user.email && !assigned.has(user.email));
  }, [members, users]);

  const invalidateAdmin = async () => {
    await queryClient.invalidateQueries({ queryKey: adminKeys.all });
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
    if (!areaDraft.name.trim() || (!editingAreaSlug && !areaDraft.slug.trim())) {
      setError("El nombre y el identificador del área son obligatorios.");
      return;
    }
    const sortOrder = Number.parseInt(areaDraft.sort_order, 10);
    const payload = {
      name: areaDraft.name.trim(),
      icon: areaDraft.icon.trim() || DEFAULT_AREA_ICON,
      sort_order: Number.isFinite(sortOrder) ? sortOrder : 0,
      responsible_email: areaDraft.responsible_email.trim() || null,
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

    const created = await runMutation("area", () =>
      createAdminArea({ ...payload, slug: areaDraft.slug.trim().toLowerCase() })
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
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-1">
          <p className="text-xs font-medium uppercase tracking-[0.12em] text-text-secondary">
            Administración global
          </p>
          <h1 className="text-2xl font-semibold tracking-tight">Panel administrador</h1>
          <p className="max-w-2xl text-sm text-text-secondary">
            Gestiona las áreas de la organización, sus roles y las personas que tienen acceso.
          </p>
        </div>
        {section === "areas" && (
          <Button onClick={openCreateArea}>
            <Plus aria-hidden="true" />
            Nueva área
          </Button>
        )}
      </header>

      <nav aria-label="Secciones de administración" className="flex gap-1 border-b border-border">
        <Link
          href="/administracion/areas"
          onClick={() => setSection("areas")}
          className={tabClass(section === "areas")}
        >
          <Users aria-hidden="true" /> Áreas y equipos
        </Link>
        <Link
          href="/administracion/usuarios"
          onClick={() => setSection("usuarios")}
          className={tabClass(section === "usuarios")}
        >
          Directorio de usuarios
        </Link>
      </nav>

      {!areaFormOpen && error && <DialogError message={error} />}

      <Dialog
        open={areaFormOpen}
        onOpenChange={(open) => {
          setAreaFormOpen(open);
          if (!open) setError(null);
        }}
        title={editingAreaSlug ? "Editar área" : "Nueva área"}
        description="Define el acceso, la identidad visual y el orden de esta área."
        isForm
      >
        {error && <DialogError message={error} />}
        <AreaForm
          draft={areaDraft}
          users={users ?? []}
          editing={Boolean(editingAreaSlug)}
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
                <ul className="max-h-96 divide-y divide-border overflow-y-auto overscroll-contain">
                  {areas.map((area) => (
                      <li key={area.id}>
                        <button
                          type="button"
                          onClick={() => setSelectedSlug(area.slug)}
                          className={cn(
                            "flex w-full items-start justify-between gap-3 px-4 py-3 text-left transition-colors hover:bg-canvas-subtle",
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
                              <span className="block truncate text-xs text-text-secondary">/{area.slug}</span>
                            </span>
                          </span>
                          <span className="shrink-0 text-xs tabular text-text-secondary">#{area.sort_order}</span>
                        </button>
                      </li>
                  ))}
                </ul>
              </section>

              {activeArea && (
                <AreaDetails
                  area={activeArea}
                  roles={roles}
                  members={members ?? []}
                  users={availableUsers}
                  busy={busy}
                  rolesPending={rolesQuery.isPending}
                  membersPending={membersQuery.isPending}
                  onEdit={() => openEditArea(activeArea)}
                  onDelete={() => removeArea(activeArea)}
                  onRun={runMutation}
                />
              )}
            </div>
          )}
        </div>
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

function tabClass(active: boolean) {
  return cn(
    "inline-flex items-center gap-2 border-b-2 px-3 py-2 text-sm font-medium transition-colors",
    "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
    active
      ? "border-primary text-text-primary"
      : "border-transparent text-text-secondary hover:text-text-primary"
  );
}

function AreaForm({
  draft,
  users,
  editing,
  busy,
  onChange,
  onSubmit,
  onCancel,
}: {
  draft: AreaDraft;
  users: { id: string; name: string; email: string | null }[];
  editing: boolean;
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
        <Field label="Identificador" htmlFor="area-slug" hint={editing ? "No se puede modificar." : "Minúsculas, números y guiones."}>
          <Input id="area-slug" value={draft.slug} onChange={(event) => update("slug", event.target.value)} disabled={editing} required />
        </Field>
        <Field label="Responsable" htmlFor="area-responsible" optional hint="Solo aparecen usuarios habilitados.">
          <select id="area-responsible" className="h-9 w-full rounded-md border border-border-control bg-transparent px-2.5 text-sm" value={draft.responsible_email} onChange={(event) => update("responsible_email", event.target.value)}>
            <option value="">Sin responsable</option>
            {users.map((user) => user.email && <option key={user.id} value={user.email}>{user.name} · {user.email}</option>)}
          </select>
        </Field>
        <Field label="Orden" htmlFor="area-order" optional>
          <Input id="area-order" type="number" value={draft.sort_order} onChange={(event) => update("sort_order", event.target.value)} />
        </Field>
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
          <Save aria-hidden="true" /> {busy ? "Guardando…" : editing ? "Guardar cambios" : "Crear área"}
        </Button>
      </DialogFooter>
    </form>
  );
}

function AreaDetails({
  area,
  roles,
  members,
  users,
  busy,
  rolesPending,
  membersPending,
  onEdit,
  onDelete,
  onRun,
}: {
  area: AreaDto;
  roles: Awaited<ReturnType<typeof import("../services/admin.service").listAreaRoles>>;
  members: Awaited<ReturnType<typeof import("../services/admin.service").listAreaMembers>>;
  users: { id: string; name: string; email: string | null }[];
  busy: string | null;
  rolesPending: boolean;
  membersPending: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onRun: <T>(label: string, action: () => Promise<T>) => Promise<T | undefined>;
}) {
  const [roleName, setRoleName] = useState("");
  const [editingRoleId, setEditingRoleId] = useState<string | null>(null);
  const [memberEmail, setMemberEmail] = useState("");
  const [memberRoleId, setMemberRoleId] = useState("");
  const effectiveMemberRoleId = memberRoleId || roles[0]?.id || "";

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
      if (result) setRoleName("");
    }
  };

  const removeRole = async (roleId: string, name: string) => {
    if (!window.confirm(`¿Eliminar el rol “${name}”?`)) return;
    await onRun("role-delete", () => deleteAreaRole(area.slug, roleId));
  };

  const addMember = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!memberEmail || !effectiveMemberRoleId) return;
    const result = await onRun("member", () => addAreaMember(area.slug, memberEmail, effectiveMemberRoleId));
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
            <p className="text-sm text-text-secondary">/{area.slug}</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={onEdit}><Pencil aria-hidden="true" /> Editar</Button>
            <Button variant="danger" size="sm" onClick={onDelete} disabled={busy === "area-delete"}><Trash2 aria-hidden="true" /> Eliminar</Button>
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="space-y-3 rounded-lg border border-border bg-surface p-4">
          <div>
            <h3 className="font-semibold">Roles del área</h3>
            <p className="text-sm text-text-secondary">Etiquetas organizativas para cada miembro.</p>
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
                  <span>{role.name}</span>
                  <span className="flex gap-1">
                    <Button variant="ghost" size="icon-sm" onClick={() => { setEditingRoleId(role.id); setRoleName(role.name); }} aria-label={`Editar ${role.name}`}><Pencil aria-hidden="true" /></Button>
                    <Button variant="ghost" size="icon-sm" onClick={() => removeRole(role.id, role.name)} aria-label={`Eliminar ${role.name}`}><Trash2 aria-hidden="true" /></Button>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="space-y-3 rounded-lg border border-border bg-surface p-4">
          <div>
            <h3 className="font-semibold">Miembros</h3>
            <p className="text-sm text-text-secondary">Asigna usuarios habilitados a esta área.</p>
          </div>
          <form onSubmit={addMember} className="grid gap-2 sm:grid-cols-[1fr_0.8fr_auto]">
            <select className="h-9 min-w-0 rounded-md border border-border-control bg-transparent px-2.5 text-sm" value={memberEmail} onChange={(event) => setMemberEmail(event.target.value)} aria-label="Usuario">
              <option value="">Selecciona un usuario</option>
              {users.map((user) => <option key={user.id} value={user.email ?? ""}>{user.name} · {user.email}</option>)}
            </select>
            <select className="h-9 min-w-0 rounded-md border border-border-control bg-transparent px-2.5 text-sm" value={effectiveMemberRoleId} onChange={(event) => setMemberRoleId(event.target.value)} aria-label="Rol">
              <option value="">Selecciona un rol</option>
              {roles.map((role) => <option key={role.id} value={role.id}>{role.name}</option>)}
            </select>
            <Button type="submit" size="icon-sm" disabled={busy === "member" || !memberEmail || !effectiveMemberRoleId} aria-label="Agregar miembro"><Plus aria-hidden="true" /></Button>
          </form>
          {membersPending ? <LoadingBlock label="Cargando miembros" compact /> : members.length === 0 ? <p className="text-sm text-text-secondary">Aún no hay miembros asignados.</p> : (
            <ul className="divide-y divide-border rounded-md border border-border">
              {members.map((member) => (
                <li key={member.id} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
                  <span className="min-w-0"><span className="block truncate font-medium">{member.user.display_name ?? "Sin nombre"}</span><span className="block truncate text-xs text-text-secondary">{member.user.email ?? "Sin correo"}</span></span>
                  <span className="flex shrink-0 items-center gap-1">
                    <select className="h-8 max-w-32 rounded-md border border-border-control bg-transparent px-2 text-xs" value={member.role.id} onChange={(event) => onRun("member-role", () => updateAreaMember(area.slug, member.id, event.target.value))} aria-label={`Rol de ${member.user.display_name ?? "miembro"}`}>
                      {roles.map((role) => <option key={role.id} value={role.id}>{role.name}</option>)}
                    </select>
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
            {users.map((user) => <tr key={user.id}><td className="px-3 py-2"><span className="block font-medium">{user.name}</span><span className="block text-xs text-text-secondary">{user.email ?? "Sin correo"}</span></td><td className="px-3 py-2 text-text-secondary">{user.job_title ?? "—"}</td><td className="px-3 py-2">{user.role === "admin" ? "Administrador" : "Usuario"}</td><td className="px-3 py-2 text-text-secondary">{user.area_name ?? "Sin área principal"}</td><td className="px-3 py-2"><span className="rounded-full bg-success-surface px-2 py-1 text-xs text-success">Activo</span></td></tr>)}
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
