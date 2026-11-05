"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { CloudOff, Loader2, Settings2 } from "lucide-react";
import { toast } from "sonner";

import { areaKeys } from "@/features/areas/hooks/use-areas";
import { masterKeys, useMasters } from "@/features/masters/hooks/use-masters";
import { useSession } from "@/features/session/hooks/use-session";
import { isPlatformAdmin } from "@/features/session/types/session.types";
import StatePanel from "@/shared/components/state-panel";
import TableSkeleton from "@/shared/components/table-skeleton";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { Dialog, DialogError, DialogFooter } from "@/shared/components/ui/dialog";
import { Dropdown } from "@/shared/components/ui/dropdown";
import { Switch } from "@/shared/components/ui/switch";
import { errorMessage } from "@/shared/lib/api-client";
import { cn } from "@/shared/lib/utils";

import { adminKeys, useModuleMatrix } from "../hooks/use-admin-data";
import { setAreaModule } from "../services/admin.service";
import type { AreaModuleConfig, AreaModuleStateDto, ModuleMatrixDto, PlatformModuleDto } from "../types/admin.types";

type MatrixArea = ModuleMatrixDto["areas"][number];

interface Toggle {
  area: MatrixArea;
  module: PlatformModuleDto;
  state: AreaModuleStateDto;
}

const OFF: AreaModuleStateDto = { enabled: false, config: {}, is_default: true };

const stateOf = (area: MatrixArea, key: string) => area.modules[key] ?? OFF;

/** The stored masters list, or null for "every master". */
const mastersOf = (config: AreaModuleConfig) => (config.masters && config.masters.length > 0 ? config.masters : null);

/** A switch keeps the module's settings: maestros comes back on with the masters it had. */
const keptConfig = ({ module, state }: Toggle): AreaModuleConfig | null => {
  const masters = module.configurable ? mastersOf(state.config) : null;
  return masters ? { masters } : null;
};

/**
 * Which modules each area has switched on. Switching one on shows it in the
 * area's menu and lets its roles grant it; switching it off takes it away from
 * everyone in the area, leader included, while the roles keep their grants for
 * when it comes back. Only administrators switch; a moderator reads.
 */
export default function AreaModulesAdmin() {
  const queryClient = useQueryClient();
  const { data: user } = useSession();
  const canEdit = isPlatformAdmin(user?.role);
  const matrix = useModuleMatrix();
  const [mobileSlug, setMobileSlug] = useState<string>();
  const [busy, setBusy] = useState<string | null>(null);
  const [turningOff, setTurningOff] = useState<Toggle | null>(null);
  const [configuring, setConfiguring] = useState<Toggle | null>(null);
  const [dialogError, setDialogError] = useState<string | null>(null);

  const save = async (toggle: Toggle, enabled: boolean, config: AreaModuleConfig | null) => {
    const key = `${toggle.area.slug}:${toggle.module.key}`;
    setBusy(key);
    setDialogError(null);
    try {
      await setAreaModule(toggle.area.slug, toggle.module.key, enabled, config);
      // The menu, the role editor's catalog and the masters list all follow the switch.
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: adminKeys.all }),
        queryClient.invalidateQueries({ queryKey: areaKeys.all }),
        queryClient.invalidateQueries({ queryKey: masterKeys.all }),
      ]);
      toast.success(
        enabled === toggle.state.enabled
          ? `Maestros de ${toggle.area.name} actualizados`
          : `${toggle.module.label} ${enabled ? "encendido" : "apagado"} en ${toggle.area.name}`
      );
      return true;
    } catch (failure) {
      const message = errorMessage(failure);
      if (turningOff || configuring) setDialogError(message);
      else toast.error(message);
      return false;
    } finally {
      setBusy(null);
    }
  };

  const onSwitch = (toggle: Toggle, next: boolean) => {
    if (next) {
      void save(toggle, true, keptConfig(toggle));
    } else {
      setDialogError(null);
      setTurningOff(toggle);
    }
  };

  if (matrix.isPending) return <TableSkeleton rows={8} label="Cargando módulos por área" />;
  if (matrix.isError) {
    return (
      <StatePanel
        icon={CloudOff}
        title="No se pudieron cargar los módulos"
        tone="danger"
        action={<Button variant="outline" onClick={() => void matrix.refetch()}>Reintentar</Button>}
      >
        {errorMessage(matrix.error)}
      </StatePanel>
    );
  }

  const { modules, areas } = matrix.data;
  const mobileArea = areas.find((area) => area.slug === mobileSlug) ?? areas[0];

  const cell = (area: MatrixArea, module: PlatformModuleDto) => {
    const state = stateOf(area, module.key);
    const toggle = { area, module, state };
    const pending = busy === `${area.slug}:${module.key}`;
    return (
      <ModuleCell
        toggle={toggle}
        canEdit={canEdit}
        pending={pending}
        onSwitch={(next) => onSwitch(toggle, next)}
        onConfigure={() => {
          setDialogError(null);
          setConfiguring(toggle);
        }}
      />
    );
  };

  return (
    <div className="space-y-4">
      <p className="max-w-prose text-sm text-text-secondary">
        Encender un módulo lo muestra en el menú del área y deja que sus roles lo concedan; el líder y el responsable lo
        tienen de una vez. Apagarlo lo quita a todos los miembros del área, también al líder. Los permisos de los roles se
        conservan y vuelven a valer al encenderlo.
        {!canEdit && " Solo un administrador puede cambiarlos."}
      </p>

      {/* Phones: one area at a time. */}
      <div className="space-y-3 md:hidden">
        <Dropdown
          aria-label="Área"
          options={areas.map((area) => ({ value: area.slug, label: area.name }))}
          value={mobileArea?.slug ?? ""}
          onValueChange={setMobileSlug}
          className="w-full"
        />
        {mobileArea && (
          <ul className="divide-y divide-border rounded-lg border border-border bg-surface">
            {modules.map((module) => (
              <li key={module.key} className="flex items-start justify-between gap-4 px-3 py-3">
                <span className="min-w-0">
                  <span className="block text-sm font-medium">{module.label}</span>
                  <span className="block text-[13px] text-text-secondary">{module.description}</span>
                </span>
                {cell(mobileArea, module)}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="hidden overflow-x-auto rounded-lg border border-border bg-surface md:block">
        <table className="w-full min-w-max text-left text-sm">
          <caption className="sr-only">Módulos encendidos en cada área</caption>
          <thead className="bg-canvas-subtle text-[11px] font-semibold uppercase tracking-[0.06em] text-text-secondary">
            <tr>
              <th scope="col" className="sticky left-0 z-10 w-72 border-r border-border bg-canvas-subtle px-3 py-2">
                Módulo
              </th>
              {areas.map((area) => (
                <th key={area.slug} scope="col" className="px-3 py-2 text-center normal-case tracking-normal text-[13px]">
                  {area.name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {modules.map((module) => (
              <tr key={module.key}>
                <th scope="row" className="sticky left-0 z-10 w-72 max-w-72 border-r border-border bg-surface px-3 py-2 font-normal">
                  <span className="block font-medium">{module.label}</span>
                  <span className="block whitespace-normal text-[13px] text-text-secondary">{module.description}</span>
                </th>
                {areas.map((area) => (
                  <td key={area.slug} className="px-3 py-2 text-center align-middle">
                    <div className="flex justify-center">{cell(area, module)}</div>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Dialog
        open={turningOff !== null}
        onOpenChange={(open) => {
          if (!open && busy === null) setTurningOff(null);
        }}
        title={turningOff ? `¿Apagar ${turningOff.module.label} en ${turningOff.area.name}?` : "Apagar módulo"}
        description="Sale del menú de todos los miembros del área, también del líder, y sus pantallas dejan de abrir. Los permisos de los roles se conservan y vuelven a valer si lo enciendes de nuevo."
      >
        <DialogError message={dialogError} />
        <DialogFooter>
          <Button variant="outline" onClick={() => setTurningOff(null)} disabled={busy !== null}>
            Cancelar
          </Button>
          <Button
            onClick={async () => {
              if (!turningOff) return;
              if (await save(turningOff, false, keptConfig(turningOff))) setTurningOff(null);
            }}
            disabled={busy !== null}
          >
            {busy !== null && <Loader2 className="animate-spin" aria-hidden="true" />}
            Apagar
          </Button>
        </DialogFooter>
      </Dialog>

      <MastersConfigDialog
        toggle={configuring}
        busy={busy !== null}
        error={dialogError}
        onClose={() => setConfiguring(null)}
        onSave={async (masters) => {
          if (!configuring) return;
          if (await save(configuring, true, masters ? { masters } : null)) setConfiguring(null);
        }}
      />
    </div>
  );
}

function ModuleCell({
  toggle,
  canEdit,
  pending,
  onSwitch,
  onConfigure,
}: {
  toggle: Toggle;
  canEdit: boolean;
  pending: boolean;
  onSwitch: (next: boolean) => void;
  onConfigure: () => void;
}) {
  const { area, module, state } = toggle;
  const masters = mastersOf(state.config);
  const scope = masters ? `${masters.length} ${masters.length === 1 ? "maestro" : "maestros"}` : "Todos los maestros";
  const origin = state.is_default ? "Valor por defecto" : "Cambiado desde este panel";

  return (
    <span className="flex flex-col items-end gap-1.5 md:items-center" title={origin}>
      {canEdit ? (
        <Switch
          checked={state.enabled}
          onCheckedChange={onSwitch}
          disabled={pending}
          aria-label={`${module.label} en ${area.name}`}
        />
      ) : (
        <Badge tone={state.enabled ? "success" : "neutral"}>{state.enabled ? "Encendido" : "Apagado"}</Badge>
      )}
      {module.configurable && state.enabled &&
        (canEdit ? (
          <button
            type="button"
            onClick={onConfigure}
            className={cn(
              "inline-flex min-h-6 items-center gap-1 rounded-sm text-[13px] text-text-secondary underline-offset-2 hover:text-text-primary hover:underline",
              "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            )}
            aria-label={`Elegir los maestros de ${area.name}: ${scope}`}
          >
            <Settings2 className="size-3.5" aria-hidden="true" /> {scope}
          </button>
        ) : (
          <span className="text-[13px] text-text-secondary">{scope}</span>
        ))}
    </span>
  );
}

/** Which masters an area sees: all of them, or a list. An empty list is not "none", so it asks for one. */
function MastersConfigDialog({
  toggle,
  busy,
  error,
  onClose,
  onSave,
}: {
  toggle: Toggle | null;
  busy: boolean;
  error: string | null;
  onClose: () => void;
  onSave: (masters: string[] | null) => void;
}) {
  return (
    <Dialog
      open={toggle !== null}
      onOpenChange={(open) => {
        if (!open && !busy) onClose();
      }}
      isForm
      title={toggle ? `Maestros de ${toggle.area.name}` : "Maestros"}
      description="Lo que vean sus miembros depende además de que su rol incluya Maestros. Los datos personales solo los ve quien gestiona el módulo."
    >
      {toggle && (
        <MastersConfigForm
          key={`${toggle.area.slug}`}
          initial={mastersOf(toggle.state.config)}
          busy={busy}
          error={error}
          onCancel={onClose}
          onSave={onSave}
        />
      )}
    </Dialog>
  );
}

function MastersConfigForm({
  initial,
  busy,
  error,
  onCancel,
  onSave,
}: {
  initial: string[] | null;
  busy: boolean;
  error: string | null;
  onCancel: () => void;
  onSave: (masters: string[] | null) => void;
}) {
  const masters = useMasters();
  const [everything, setEverything] = useState(initial === null);
  const [chosen, setChosen] = useState<Set<string>>(new Set(initial ?? []));
  const [localError, setLocalError] = useState<string | null>(null);

  const toggleMaster = (slug: string) =>
    setChosen((current) => {
      const next = new Set(current);
      if (next.has(slug)) next.delete(slug);
      else next.add(slug);
      return next;
    });

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!everything && chosen.size === 0) {
      setLocalError("Elige al menos un maestro, o deja «Todos los maestros».");
      return;
    }
    setLocalError(null);
    onSave(everything ? null : [...chosen].sort());
  };

  const radioClass = "mt-0.5 size-4 accent-[var(--primary)]";

  return (
    <form onSubmit={submit} className="space-y-4" noValidate>
      <fieldset disabled={busy} className="min-w-0 space-y-2">
        <legend className="sr-only">Alcance</legend>
        <label className="flex cursor-pointer gap-3 text-sm">
          <input type="radio" name="scope" checked={everything} onChange={() => setEverything(true)} className={radioClass} />
          <span>
            <span className="block font-medium">Todos los maestros</span>
            <span className="block text-[13px] text-text-secondary">Incluye los que se agreguen después.</span>
          </span>
        </label>
        <label className="flex cursor-pointer gap-3 text-sm">
          <input type="radio" name="scope" checked={!everything} onChange={() => setEverything(false)} className={radioClass} />
          <span className="block font-medium">Solo estos</span>
        </label>
      </fieldset>

      {!everything &&
        (masters.isPending ? (
          <TableSkeleton rows={4} label="Cargando maestros" />
        ) : masters.isError ? (
          <p role="alert" className="text-sm text-danger">{errorMessage(masters.error)}</p>
        ) : (
          <fieldset disabled={busy} className="min-w-0">
            <legend className="sr-only">Maestros del área</legend>
            <ul className="max-h-72 divide-y divide-border overflow-y-auto overscroll-contain rounded-md border border-border">
              {masters.data.map((master) => (
                <li key={master.slug}>
                  <label className="flex min-h-11 cursor-pointer items-center gap-3 px-3 py-2 text-sm hover:bg-canvas-subtle">
                    <input
                      type="checkbox"
                      checked={chosen.has(master.slug)}
                      onChange={() => toggleMaster(master.slug)}
                      className="size-4 accent-[var(--primary)]"
                    />
                    <span className="min-w-0 flex-1 truncate">{master.name}</span>
                    <span className="shrink-0 text-xs tabular-nums text-text-secondary">
                      {new Intl.NumberFormat("es-CO").format(master.record_count)}
                    </span>
                  </label>
                </li>
              ))}
            </ul>
          </fieldset>
        ))}

      <DialogError message={localError ?? error} />
      <DialogFooter>
        <Button variant="outline" onClick={onCancel} disabled={busy}>
          Cancelar
        </Button>
        <Button type="submit" disabled={busy}>
          {busy && <Loader2 className="animate-spin" aria-hidden="true" />}
          Guardar
        </Button>
      </DialogFooter>
    </form>
  );
}
