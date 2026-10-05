"use client";

import { useState } from "react";
import { ArrowDown, ArrowUp, CalendarClock, ListPlus, MoreHorizontal, PanelRightOpen, Trash2 } from "lucide-react";

import { getInitials } from "@/features/session/types/session.types";
import { Menu, MenuItem, MenuLabel, MenuSeparator } from "@/shared/components/ui/menu";
import { cn } from "@/shared/lib/utils";

import { dateRange, isOverdue, labelOf, personName } from "../lib/format";
import type { CatalogOption, ProjectEpic, ProjectTask } from "../types/project.types";
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
 * A set of columns of tasks. The main board passes four and the backlog
 * passes one: same cards, same drag and drop. Cards drag across and within
 * columns; the card menu does the same for keyboard and touch, where drag and
 * drop does not reach, and it also reaches the statuses that live on the
 * other board.
 */
export default function TaskBoard({
  columns,
  targets,
  tasksByStatus,
  epics,
  className,
  addLabel = "Agregar tarea",
  variant = "card",
  reorderable = true,
  ...actions
}: TaskBoardActions & {
  columns: CatalogOption[];
  /** Every status a card can be sent to from its menu, other board included. */
  targets: CatalogOption[];
  /** Already sorted by position, and filtered when an epic is picked. */
  tasksByStatus: Map<string, ProjectTask[]>;
  epics: Map<string, ProjectEpic>;
  /** Grid columns for the board's width. */
  className?: string;
  addLabel?: string;
  /** `row` spreads a task across the full width: name on the left, details on the right. */
  variant?: "card" | "row";
  /**
   * False when the list shown is not the column itself (a search narrowed
   * it): an index in it would not be an index in the column.
   */
  reorderable?: boolean;
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
    <div className={cn("grid gap-4", className)}>
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
                    draggable={reorderable}
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
                      epic={task.epic_id ? epics.get(task.epic_id) : undefined}
                      index={index}
                      total={tasks.length}
                      targets={targets}
                      variant={variant}
                      reorderable={reorderable}
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
              {addLabel}
            </button>
          </section>
        );
      })}
    </div>
  );
}

function TaskCard({
  task,
  epic,
  index,
  total,
  targets,
  variant,
  reorderable,
  onOpen,
  onMove,
  onDelete,
}: TaskBoardActions & {
  task: ProjectTask;
  epic: ProjectEpic | undefined;
  index: number;
  total: number;
  targets: CatalogOption[];
  variant: "card" | "row";
  reorderable: boolean;
}) {
  const { priorities } = useProjectsContext();
  const overdue = isOverdue(task);
  const dates = dateRange(task.start_date, task.end_date);
  const isRow = variant === "row";

  const nameButton = (
    <button
      type="button"
      onClick={() => onOpen(task)}
      className={cn(
        "min-h-8 min-w-0 text-left text-sm font-medium break-words focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring max-md:min-h-11",
        !isRow && "flex-1",
        isRow && "order-1 md:order-none"
      )}
    >
      {task.name}
    </button>
  );

  const menu = (
    <Menu
      align="end"
      triggerLabel={`Acciones de la tarea ${task.name}`}
      triggerTitle="Acciones de la tarea"
      triggerClassName={cn(
        "flex size-8 shrink-0 items-center justify-center rounded-md text-text-secondary hover:bg-canvas-subtle hover:text-text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring max-md:size-11",
        isRow ? "order-2 md:order-none" : "-mt-0.5 -mr-1"
      )}
      trigger={<MoreHorizontal className="size-4" aria-hidden="true" />}
    >
      <MenuItem onClick={() => onOpen(task)}>
        <PanelRightOpen aria-hidden="true" />
        Abrir
      </MenuItem>
      <MenuItem
        onClick={() => onMove(task, task.status, index - 1)}
        disabled={!reorderable || index === 0}
      >
        <ArrowUp aria-hidden="true" />
        Subir
      </MenuItem>
      <MenuItem
        onClick={() => onMove(task, task.status, index + 1)}
        disabled={!reorderable || index === total - 1}
      >
        <ArrowDown aria-hidden="true" />
        Bajar
      </MenuItem>
      <MenuSeparator />
      <MenuLabel>Mover a</MenuLabel>
      {targets
        .filter((target) => target.value !== task.status)
        .map((target) => (
          <MenuItem key={target.value} onClick={() => onMove(task, target.value, Number.MAX_SAFE_INTEGER)}>
            {target.label}
          </MenuItem>
        ))}
      <MenuSeparator />
      <MenuItem onClick={() => onDelete(task)}>
        <Trash2 aria-hidden="true" />
        Borrar tarea
      </MenuItem>
    </Menu>
  );

  const blockedReason = task.status === "blocked" && task.blocked_reason && (
    <p className="mt-1.5 text-[13px] break-words text-text-primary">
      <span className="font-medium">Bloqueada:</span> {task.blocked_reason}
    </p>
  );

  const details = (
    <div
      className={cn(
        "flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[13px] text-text-secondary",
        isRow ? "order-3 col-span-2 md:order-none md:col-span-1 md:justify-end" : "mt-2"
      )}
    >
      {epic && (
        <span className="flex min-w-0 items-center gap-1.5">
          <ColorDot color={epic.color} />
          <span className="truncate">{epic.name}</span>
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
          className={cn(
            "flex size-6 shrink-0 items-center justify-center rounded-full bg-canvas-subtle text-[11px] font-medium text-text-primary",
            !isRow && "ml-auto"
          )}
        >
          <span aria-hidden="true">{getInitials(personName(task.owner))}</span>
          <span className="sr-only">Responsable: {personName(task.owner)}</span>
        </span>
      )}
    </div>
  );

  if (isRow) {
    // Name and menu share the first line on a phone; from md the details
    // sit between them, so every row reads left to right in one line.
    return (
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-x-1 gap-y-1 rounded-md border border-border bg-surface p-2.5 md:grid-cols-[minmax(0,1fr)_auto_auto] md:items-center md:gap-x-4">
        {nameButton}
        {details}
        {menu}
      </div>
    );
  }

  return (
    <div className="rounded-md border border-border bg-surface p-2.5">
      <div className="flex items-start gap-1">
        {nameButton}
        {menu}
      </div>
      {blockedReason}
      {details}
    </div>
  );
}
