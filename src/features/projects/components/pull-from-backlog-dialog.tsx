"use client";

import { useState } from "react";
import { Inbox } from "lucide-react";

import StatePanel from "@/shared/components/state-panel";
import { Button } from "@/shared/components/ui/button";
import { Dialog, DialogFooter } from "@/shared/components/ui/dialog";
import { cn } from "@/shared/lib/utils";

import { dateRange, labelOf, personName } from "../lib/format";
import type { CatalogOption, ProjectEpic, ProjectTask } from "../types/project.types";
import { ColorDot } from "./project-color";
import { useProjectsContext } from "./projects-context";

/**
 * Picks tasks out of the backlog and sends them to the board's first
 * column. The tasks are the same records: choosing them only changes their
 * status, and they stop appearing in the backlog.
 */
export default function PullFromBacklogDialog({
  open,
  onOpenChange,
  tasks,
  epics,
  target,
  onPull,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** The backlog, in its own order and already filtered by the picked epic. */
  tasks: ProjectTask[];
  epics: Map<string, ProjectEpic>;
  /** The column they land in. */
  target: CatalogOption;
  onPull: (tasks: ProjectTask[]) => void;
}) {
  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      isForm
      title="Traer del backlog"
      description={`Las tareas que elijas pasan a «${target.label}» y salen del backlog.`}
    >
      {open && (
        <PullForm
          tasks={tasks}
          epics={epics}
          target={target}
          onCancel={() => onOpenChange(false)}
          onPull={(picked) => {
            onPull(picked);
            onOpenChange(false);
          }}
        />
      )}
    </Dialog>
  );
}

function PullForm({
  tasks,
  epics,
  target,
  onCancel,
  onPull,
}: {
  tasks: ProjectTask[];
  epics: Map<string, ProjectEpic>;
  target: CatalogOption;
  onCancel: () => void;
  onPull: (tasks: ProjectTask[]) => void;
}) {
  const { priorities } = useProjectsContext();
  const [picked, setPicked] = useState<Set<string>>(new Set());

  if (tasks.length === 0) {
    return (
      <StatePanel
        icon={Inbox}
        title="El backlog está vacío"
        action={
          <Button variant="outline" onClick={onCancel}>
            Cerrar
          </Button>
        }
      >
        Agrega tareas desde la pestaña Backlog y vuelve aquí cuando quieras empezar alguna.
      </StatePanel>
    );
  }

  const toggle = (id: string) =>
    setPicked((current) => {
      const next = new Set(current);
      if (!next.delete(id)) next.add(id);
      return next;
    });

  const chosen = tasks.filter((task) => picked.has(task.id));

  return (
    <form
      noValidate
      className="space-y-4"
      onSubmit={(event) => {
        event.preventDefault();
        if (chosen.length > 0) onPull(chosen);
      }}
    >
      <fieldset className="min-w-0">
        <legend className="sr-only">Tareas del backlog</legend>
        <ul className="max-h-[50dvh] divide-y divide-border overflow-y-auto rounded-md border border-border">
          {tasks.map((task) => {
            const epic = task.epic_id ? epics.get(task.epic_id) : undefined;
            const dates = dateRange(task.start_date, task.end_date);
            return (
              <li key={task.id}>
                <label
                  className={cn(
                    "flex min-h-11 cursor-pointer items-start gap-3 px-3 py-2.5 hover:bg-canvas-subtle",
                    "has-[:focus-visible]:outline-2 has-[:focus-visible]:-outline-offset-2 has-[:focus-visible]:outline-ring"
                  )}
                >
                  <input
                    type="checkbox"
                    className="mt-0.5 size-4 shrink-0 accent-[var(--primary)]"
                    checked={picked.has(task.id)}
                    onChange={() => toggle(task.id)}
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-medium break-words">{task.name}</span>
                    <span className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] text-text-secondary">
                      {epic && (
                        <span className="flex min-w-0 items-center gap-1.5">
                          <ColorDot color={epic.color} />
                          <span className="truncate">{epic.name}</span>
                        </span>
                      )}
                      <span>Prioridad {labelOf(priorities, task.priority).toLowerCase()}</span>
                      {dates && <span className="tabular">{dates}</span>}
                      {task.owner && <span>{personName(task.owner)}</span>}
                    </span>
                  </span>
                </label>
              </li>
            );
          })}
        </ul>
      </fieldset>

      <DialogFooter>
        <Button variant="outline" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit" disabled={chosen.length === 0}>
          {chosen.length === 0
            ? `Pasar a ${target.label}`
            : `Pasar ${chosen.length} ${chosen.length === 1 ? "tarea" : "tareas"} a ${target.label}`}
        </Button>
      </DialogFooter>
    </form>
  );
}
