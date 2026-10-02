"use client";

import { useState } from "react";
import { ArrowDown, ArrowUp, CalendarClock, ListPlus, MoreHorizontal, PanelRightOpen, Trash2 } from "lucide-react";

import { getInitials } from "@/features/session/types/session.types";
import { Menu, MenuItem, MenuLabel, MenuSeparator } from "@/shared/components/ui/menu";
import { cn } from "@/shared/lib/utils";

import { dateRange, isOverdue, labelOf, personName } from "../lib/format";
import type { CatalogOption, ProjectBlock, ProjectTask } from "../types/project.types";
import { ColorDot } from "./project-color";
import { useProjectsContext } from "./projects-context";

export interface TaskBoardActions {
  onOpen: (task: ProjectTask) => void;
  /** `toIndex` is where it lands in the target column, counted without it. */
  onMove: (task: ProjectTask, status: string, toIndex: number) => void;
  onAdd: (status: string) => void;
  onDelete: (task: ProjectTask) => void;
}

/**
 * The project's tasks by state. Cards drag across and within columns; the
 * card menu does the same for keyboard and touch, where drag and drop does
 * not reach.
 */
export default function TaskBoard({
  columns,
  tasksByStatus,
  blocks,
  ...actions
}: TaskBoardActions & {
  columns: CatalogOption[];
  /** Already sorted by position, and filtered when a block is picked. */
  tasksByStatus: Map<string, ProjectTask[]>;
  blocks: Map<string, ProjectBlock>;
}) {
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [drop, setDrop] = useState<{ status: string; index: number } | null>(null);

  const endDrag = () => {
    setDraggingId(null);
    setDrop(null);
  };

  const dragged = draggingId
    ? [...tasksByStatus.values()].flat().find((task) => task.id === draggingId)
    : undefined;

  return (
    <div className="grid gap-4 md:grid-cols-3">
      {columns.map((column) => {
        const tasks = tasksByStatus.get(column.value) ?? [];
        const headingId = `column-${column.value}`;
        return (
          <section
            key={column.value}
            aria-labelledby={headingId}
            className={cn(
              "flex min-w-0 flex-col rounded-lg bg-canvas-subtle p-2",
              drop?.status === column.value && "outline-2 -outline-offset-2 outline-dashed outline-primary"
            )}
            onDragOver={(event) => {
              if (!dragged) return;
              event.preventDefault();
              event.dataTransfer.dropEffect = "move";
              // Cards stop their own dragover, so reaching here means the
              // pointer is past them: the task lands last.
              const index = tasks.filter((task) => task.id !== dragged.id).length;
              if (drop?.status !== column.value || drop.index !== index) {
                setDrop({ status: column.value, index });
              }
            }}
            onDrop={(event) => {
              event.preventDefault();
              if (dragged && drop) actions.onMove(dragged, drop.status, drop.index);
              endDrag();
            }}
          >
            <h3 id={headingId} className="flex items-center justify-between px-2 pt-1 pb-2 text-sm font-semibold">
              {column.label}
              <span className="tabular text-[13px] font-normal text-text-secondary">
                {tasks.length}
                <span className="sr-only">{tasks.length === 1 ? " tarea" : " tareas"}</span>
              </span>
            </h3>

            <ul className="flex flex-col gap-2" aria-label={`Tareas: ${column.label}`}>
              {tasks.map((task, index) => {
                const others = tasks.filter((t) => t.id !== draggingId);
                // Index among the column's cards without the dragged one.
                const indexWithout = draggingId ? others.indexOf(task) : index;
                return (
                  <li
                    key={task.id}
                    draggable
                    onDragStart={(event) => {
                      event.dataTransfer.effectAllowed = "move";
                      event.dataTransfer.setData("text/plain", task.id);
                      setDraggingId(task.id);
                    }}
                    onDragEnd={endDrag}
                    onDragOver={(event) => {
                      if (!dragged || task.id === dragged.id) return;
                      event.preventDefault();
                      event.stopPropagation();
                      const box = event.currentTarget.getBoundingClientRect();
                      const after = event.clientY > box.top + box.height / 2;
                      const next = indexWithout + (after ? 1 : 0);
                      if (drop?.status !== column.value || drop.index !== next) {
                        setDrop({ status: column.value, index: next });
                      }
                    }}
                    className={cn(
                      draggingId === task.id && "opacity-50",
                      // The line shows where the card lands: it is the drop, not decoration.
                      drop?.status === column.value &&
                        draggingId !== task.id &&
                        drop.index === indexWithout &&
                        "shadow-[0_-3px_0_var(--primary)]"
                    )}
                  >
                    <TaskCard
                      task={task}
                      block={blocks.get(task.block_id)}
                      index={index}
                      total={tasks.length}
                      columns={columns}
                      {...actions}
                    />
                  </li>
                );
              })}
            </ul>

            <button
              type="button"
              onClick={() => actions.onAdd(column.value)}
              className="mt-2 flex min-h-9 items-center gap-2 rounded-md px-2 text-[13px] text-text-secondary hover:bg-primary-subtle hover:text-text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring max-md:min-h-11"
            >
              <ListPlus className="size-4" aria-hidden="true" />
              Agregar tarea
            </button>
          </section>
        );
      })}
    </div>
  );
}

function TaskCard({
  task,
  block,
  index,
  total,
  columns,
  onOpen,
  onMove,
  onDelete,
}: TaskBoardActions & {
  task: ProjectTask;
  block: ProjectBlock | undefined;
  index: number;
  total: number;
  columns: CatalogOption[];
}) {
  const { priorities } = useProjectsContext();
  const overdue = isOverdue(task);
  const dates = dateRange(task.start_date, task.end_date);

  return (
    <div className="rounded-md border border-border bg-surface p-2.5">
      <div className="flex items-start gap-1">
        <button
          type="button"
          onClick={() => onOpen(task)}
          className="min-h-8 min-w-0 flex-1 text-left text-sm font-medium break-words focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring max-md:min-h-11"
        >
          {task.name}
        </button>
        <Menu
          align="end"
          triggerLabel={`Acciones de la tarea ${task.name}`}
          triggerTitle="Acciones de la tarea"
          triggerClassName="-mt-0.5 -mr-1 flex size-8 shrink-0 items-center justify-center rounded-md text-text-secondary hover:bg-canvas-subtle hover:text-text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring max-md:size-11"
          trigger={<MoreHorizontal className="size-4" aria-hidden="true" />}
        >
          <MenuItem onClick={() => onOpen(task)}>
            <PanelRightOpen aria-hidden="true" />
            Abrir
          </MenuItem>
          <MenuItem onClick={() => onMove(task, task.status, index - 1)} disabled={index === 0}>
            <ArrowUp aria-hidden="true" />
            Subir
          </MenuItem>
          <MenuItem onClick={() => onMove(task, task.status, index + 1)} disabled={index === total - 1}>
            <ArrowDown aria-hidden="true" />
            Bajar
          </MenuItem>
          <MenuSeparator />
          <MenuLabel>Mover a</MenuLabel>
          {columns
            .filter((column) => column.value !== task.status)
            .map((column) => (
              <MenuItem key={column.value} onClick={() => onMove(task, column.value, Number.MAX_SAFE_INTEGER)}>
                {column.label}
              </MenuItem>
            ))}
          <MenuSeparator />
          <MenuItem onClick={() => onDelete(task)}>
            <Trash2 aria-hidden="true" />
            Borrar tarea
          </MenuItem>
        </Menu>
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[13px] text-text-secondary">
        {block && (
          <span className="flex min-w-0 items-center gap-1.5">
            <ColorDot color={block.color} />
            <span className="truncate">{block.name}</span>
          </span>
        )}
        {task.priority === "high" && (
          <span className="font-medium text-text-primary">Prioridad {labelOf(priorities, task.priority).toLowerCase()}</span>
        )}
        {dates && (
          <span className={cn("tabular flex items-center gap-1", overdue && "font-medium text-danger")}>
            <CalendarClock className="size-3.5" aria-hidden="true" />
            {overdue ? `Vencida · ${dates}` : dates}
          </span>
        )}
        {task.owner && (
          <span
            title={personName(task.owner)}
            className="ml-auto flex size-6 shrink-0 items-center justify-center rounded-full bg-canvas-subtle text-[11px] font-medium text-text-primary"
          >
            <span aria-hidden="true">{getInitials(personName(task.owner))}</span>
            <span className="sr-only">Responsable: {personName(task.owner)}</span>
          </span>
        )}
      </div>
    </div>
  );
}
