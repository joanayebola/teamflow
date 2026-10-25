"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { useDroppable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { api } from "@/lib/api-client";
import { Avatar, Button, ErrorNote, Input, PriorityBadge, Select } from "@/components/ui";
import type { BoardColumnData, BoardTask, MemberOption } from "./board-types";
import { TaskPanel } from "./task-panel";

interface BoardResponse {
  board: {
    columns: {
      id: string;
      name: string;
      position: number;
      tasks: (Omit<BoardTask, "commentCount" | "dueDate"> & {
        dueDate: string | null;
        _count: { comments: number };
      })[];
    }[];
  };
}

function normalize(data: BoardResponse): BoardColumnData[] {
  return data.board.columns.map((c) => ({
    id: c.id,
    name: c.name,
    position: c.position,
    tasks: c.tasks.map((t) => ({
      id: t.id,
      columnId: t.columnId,
      title: t.title,
      description: t.description,
      priority: t.priority,
      dueDate: t.dueDate,
      position: t.position,
      assigneeId: t.assigneeId,
      assignee: t.assignee,
      commentCount: t._count.comments,
    })),
  }));
}

export function BoardClient({
  projectId,
  projectName,
  workspaceId,
  initialColumns,
  members,
  canManageColumns,
  currentUserId,
}: {
  projectId: string;
  projectName: string;
  workspaceId: string;
  initialColumns: BoardColumnData[];
  members: MemberOption[];
  canManageColumns: boolean;
  currentUserId: string;
}) {
  const [columns, setColumns] = useState<BoardColumnData[]>(initialColumns);
  const [activeTask, setActiveTask] = useState<BoardTask | null>(null);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [assigneeFilter, setAssigneeFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const snapshot = useRef<BoardColumnData[]>(initialColumns);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
  );

  const filtersActive = assigneeFilter !== "all" || priorityFilter !== "all";

  const refetch = useCallback(async () => {
    const data = await api<BoardResponse>(`/api/projects/${projectId}/board`);
    const cols = normalize(data);
    setColumns(cols);
    snapshot.current = cols;
  }, [projectId]);

  const visibleTasks = useCallback(
    (tasks: BoardTask[]) =>
      tasks.filter((t) => {
        if (assigneeFilter === "unassigned" && t.assigneeId) return false;
        if (
          assigneeFilter !== "all" &&
          assigneeFilter !== "unassigned" &&
          t.assigneeId !== assigneeFilter
        )
          return false;
        if (priorityFilter !== "all" && t.priority !== priorityFilter) return false;
        return true;
      }),
    [assigneeFilter, priorityFilter],
  );

  function columnOfTask(taskId: string): number {
    return columns.findIndex((c) => c.tasks.some((t) => t.id === taskId));
  }

  function onDragStart(e: DragStartEvent) {
    snapshot.current = columns;
    const col = columns.find((c) => c.tasks.some((t) => t.id === e.active.id));
    setActiveTask(col?.tasks.find((t) => t.id === e.active.id) ?? null);
  }

  function onDragOver(e: DragOverEvent) {
    const { active, over } = e;
    if (!over) return;
    const fromIdx = columnOfTask(String(active.id));
    if (fromIdx < 0) return;
    let toIdx = columns.findIndex((c) => c.id === over.id);
    let overTaskIdx = -1;
    if (toIdx < 0) {
      toIdx = columnOfTask(String(over.id));
      if (toIdx < 0) return;
      overTaskIdx = columns[toIdx].tasks.findIndex((t) => t.id === over.id);
    }
    if (fromIdx === toIdx) return;
    setColumns((prev) => {
      const next = prev.map((c) => ({ ...c, tasks: [...c.tasks] }));
      const fromCol = next[fromIdx];
      const taskIdx = fromCol.tasks.findIndex((t) => t.id === active.id);
      if (taskIdx < 0) return prev;
      const [task] = fromCol.tasks.splice(taskIdx, 1);
      const insertAt = overTaskIdx >= 0 ? overTaskIdx : next[toIdx].tasks.length;
      next[toIdx].tasks.splice(insertAt, 0, { ...task, columnId: next[toIdx].id });
      return next;
    });
  }

  async function persistMove(taskId: string) {
    const colIdx = columnOfTask(taskId);
    if (colIdx < 0) return;
    const index = columns[colIdx].tasks.findIndex((t) => t.id === taskId);
    try {
      await api(`/api/tasks/${taskId}/move`, {
        method: "POST",
        json: { targetColumnId: columns[colIdx].id, targetIndex: index },
      });
      snapshot.current = columns;
    } catch {
      setColumns(snapshot.current);
      setError("Could not save that move — the board was restored. Please try again.");
      void refetch();
    }
  }

  function onDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    setActiveTask(null);
    if (over && active.id !== over.id) {
      const colIdx = columnOfTask(String(active.id));
      if (colIdx >= 0) {
        const col = columns[colIdx];
        const oldIndex = col.tasks.findIndex((t) => t.id === active.id);
        const newIndex = col.tasks.findIndex((t) => t.id === over.id);
        if (oldIndex >= 0 && newIndex >= 0 && oldIndex !== newIndex) {
          const reordered = arrayMove(col.tasks, oldIndex, newIndex);
          const next = columns.map((c, i) =>
            i === colIdx ? { ...c, tasks: reordered } : c,
          );
          setColumns(next);
          // Persist using the post-reorder index.
          const idx = reordered.findIndex((t) => t.id === active.id);
          void (async () => {
            try {
              await api(`/api/tasks/${String(active.id)}/move`, {
                method: "POST",
                json: { targetColumnId: col.id, targetIndex: idx },
              });
              snapshot.current = next;
            } catch {
              setColumns(snapshot.current);
              setError("Could not save that move — the board was restored.");
              void refetch();
            }
          })();
          return;
        }
      }
    }
    void persistMove(String(active.id));
  }

  const memberOptions = useMemo(() => members, [members]);

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="mr-auto">
          <h1 className="text-2xl font-bold tracking-tight">{projectName}</h1>
          <p className="text-sm text-ink-400">
            Drag tasks to reorder or move them between columns.
            {filtersActive && " Dragging is paused while filters are on."}
          </p>
        </div>
        <Select
          value={assigneeFilter}
          onChange={(e) => setAssigneeFilter(e.target.value)}
          aria-label="Filter by assignee"
        >
          <option value="all">All assignees</option>
          <option value="unassigned">Unassigned</option>
          {memberOptions.map((m) => (
            <option key={m.userId} value={m.userId}>
              {m.name}
            </option>
          ))}
        </Select>
        <Select
          value={priorityFilter}
          onChange={(e) => setPriorityFilter(e.target.value)}
          aria-label="Filter by priority"
        >
          <option value="all">All priorities</option>
          {["LOW", "MEDIUM", "HIGH", "URGENT"].map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </Select>
      </div>

      <ErrorNote message={error} />

      <DndContext
        sensors={sensors}
        onDragStart={onDragStart}
        onDragOver={onDragOver}
        onDragEnd={onDragEnd}
        onDragCancel={() => {
          setColumns(snapshot.current);
          setActiveTask(null);
        }}
      >
        <div className="scroll-slim -mx-4 flex gap-4 overflow-x-auto px-4 pb-4 md:-mx-6 md:px-6">
          {columns.map((column) => (
            <BoardColumn
              key={column.id}
              column={column}
              tasks={visibleTasks(column.tasks)}
              dragDisabled={filtersActive}
              canManage={canManageColumns}
              projectId={projectId}
              onTaskClick={setSelectedTaskId}
              onChanged={refetch}
              onError={setError}
            />
          ))}
          {canManageColumns && (
            <AddColumn projectId={projectId} onChanged={refetch} onError={setError} />
          )}
        </div>
        <DragOverlay>
          {activeTask ? <TaskCardView task={activeTask} overlay /> : null}
        </DragOverlay>
      </DndContext>

      {selectedTaskId && (
        <TaskPanel
          taskId={selectedTaskId}
          members={memberOptions}
          currentUserId={currentUserId}
          onClose={() => setSelectedTaskId(null)}
          onChanged={() => void refetch()}
        />
      )}
      <span className="hidden" data-workspace={workspaceId} />
    </div>
  );
}

function BoardColumn({
  column,
  tasks,
  dragDisabled,
  canManage,
  projectId,
  onTaskClick,
  onChanged,
  onError,
}: {
  column: BoardColumnData;
  tasks: BoardTask[];
  dragDisabled: boolean;
  canManage: boolean;
  projectId: string;
  onTaskClick: (id: string) => void;
  onChanged: () => Promise<void>;
  onError: (m: string | null) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: column.id });
  const [adding, setAdding] = useState(false);
  const [title, setTitle] = useState("");
  const [renaming, setRenaming] = useState(false);
  const [name, setName] = useState(column.name);

  async function addTask(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    try {
      await api("/api/tasks", {
        method: "POST",
        json: { columnId: column.id, title: title.trim(), priority: "MEDIUM" },
      });
      setTitle("");
      setAdding(false);
      await onChanged();
    } catch {
      onError("Could not add the task.");
    }
  }

  async function rename(e: React.FormEvent) {
    e.preventDefault();
    try {
      await api(`/api/columns/${column.id}`, { method: "PATCH", json: { name } });
      setRenaming(false);
      await onChanged();
    } catch {
      onError("Could not rename the column.");
    }
  }

  async function remove() {
    if (!window.confirm(`Delete column "${column.name}" and all its tasks?`)) return;
    try {
      await api(`/api/columns/${column.id}`, { method: "DELETE" });
      await onChanged();
    } catch {
      onError("Could not delete the column.");
    }
  }

  return (
    <section
      className={`flex w-72 shrink-0 flex-col rounded-xl border bg-ink-900/70 ${
        isOver ? "border-indigo-500" : "border-ink-800"
      }`}
    >
      <header className="flex items-center gap-2 px-3.5 py-3">
        {renaming ? (
          <form onSubmit={rename} className="flex flex-1 gap-1">
            <Input value={name} onChange={(e) => setName(e.target.value)} autoFocus />
            <Button type="submit" variant="secondary">
              Save
            </Button>
          </form>
        ) : (
          <>
            <h2 className="flex-1 truncate text-sm font-semibold">{column.name}</h2>
            <span className="rounded-full bg-ink-800 px-2 py-0.5 text-xs text-ink-300">
              {tasks.length}
            </span>
            {canManage && (
              <>
                <button
                  onClick={() => {
                    setName(column.name);
                    setRenaming(true);
                  }}
                  className="text-xs text-ink-400 hover:text-white"
                  aria-label={`Rename ${column.name}`}
                >
                  Rename
                </button>
                <button
                  onClick={() => void remove()}
                  className="text-xs text-ink-400 hover:text-red-300"
                  aria-label={`Delete ${column.name}`}
                >
                  Delete
                </button>
              </>
            )}
          </>
        )}
      </header>

      <div ref={setNodeRef} className="scroll-slim min-h-16 flex-1 space-y-2.5 overflow-y-auto px-3 pb-2" style={{ maxHeight: "calc(100vh - 320px)" }}>
        <SortableContext items={tasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
          {tasks.map((task) => (
            <SortableTaskCard
              key={task.id}
              task={task}
              disabled={dragDisabled}
              onClick={() => onTaskClick(task.id)}
            />
          ))}
        </SortableContext>
        {tasks.length === 0 && (
          <p className="rounded-lg border border-dashed border-ink-700 px-3 py-4 text-center text-xs text-ink-400">
            Drop tasks here
          </p>
        )}
      </div>

      <div className="px-3 pb-3 pt-1">
        {adding ? (
          <form onSubmit={addTask} className="space-y-2">
            <Input
              autoFocus
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Task title"
            />
            <div className="flex gap-2">
              <Button type="submit" className="flex-1">
                Add task
              </Button>
              <Button type="button" variant="ghost" onClick={() => setAdding(false)}>
                Cancel
              </Button>
            </div>
          </form>
        ) : (
          <button
            onClick={() => setAdding(true)}
            className="w-full rounded-lg px-3 py-2 text-left text-sm text-ink-400 hover:bg-ink-800 hover:text-white"
          >
            + Add task
          </button>
        )}
      </div>
      <span className="hidden" data-project={projectId} />
    </section>
  );
}

function SortableTaskCard({
  task,
  disabled,
  onClick,
}: {
  task: BoardTask;
  disabled: boolean;
  onClick: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: task.id, disabled });
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={isDragging ? "opacity-40" : ""}
    >
      <TaskCardView task={task} onClick={onClick} dragProps={{ ...attributes, ...listeners }} />
    </div>
  );
}

function TaskCardView({
  task,
  onClick,
  overlay,
  dragProps,
}: {
  task: BoardTask;
  onClick?: () => void;
  overlay?: boolean;
  dragProps?: React.HTMLAttributes<HTMLDivElement>;
}) {
  const overdue =
    task.dueDate && new Date(task.dueDate) < new Date() ? true : false;
  return (
    <div
      {...dragProps}
      onClick={onClick}
      className={`cursor-grab rounded-lg border border-ink-700/80 bg-ink-850 p-3 shadow-sm transition-colors hover:border-indigo-500/50 active:cursor-grabbing ${
        overlay ? "rotate-2 shadow-2xl" : ""
      }`}
    >
      <p className="text-sm font-medium leading-snug text-ink-100">{task.title}</p>
      <div className="mt-2.5 flex flex-wrap items-center gap-2">
        <PriorityBadge priority={task.priority} />
        {task.dueDate && (
          <span className={`text-[11px] ${overdue ? "font-semibold text-red-300" : "text-ink-400"}`}>
            {new Date(task.dueDate).toLocaleDateString(undefined, {
              month: "short",
              day: "numeric",
            })}
          </span>
        )}
        {task.commentCount > 0 && (
          <span className="text-[11px] text-ink-400">💬 {task.commentCount}</span>
        )}
        <span className="ml-auto">
          {task.assignee ? <Avatar name={task.assignee.name} size="sm" /> : null}
        </span>
      </div>
    </div>
  );
}

function AddColumn({
  projectId,
  onChanged,
  onError,
}: {
  projectId: string;
  onChanged: () => Promise<void>;
  onError: (m: string | null) => void;
}) {
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  async function create(e: React.FormEvent) {
    e.preventDefault();
    try {
      await api(`/api/projects/${projectId}/columns`, {
        method: "POST",
        json: { name },
      });
      setName("");
      setAdding(false);
      await onChanged();
    } catch {
      onError("Could not add the column.");
    }
  }
  if (!adding) {
    return (
      <button
        onClick={() => setAdding(true)}
        className="h-fit w-72 shrink-0 rounded-xl border border-dashed border-ink-700 px-4 py-3 text-left text-sm text-ink-400 hover:border-indigo-500 hover:text-indigo-300"
      >
        + Add column
      </button>
    );
  }
  return (
    <form onSubmit={create} className="h-fit w-72 shrink-0 space-y-2 rounded-xl border border-ink-800 bg-ink-900 p-3">
      <Input autoFocus required value={name} onChange={(e) => setName(e.target.value)} placeholder="Column name" />
      <div className="flex gap-2">
        <Button type="submit" className="flex-1">
          Add
        </Button>
        <Button type="button" variant="ghost" onClick={() => setAdding(false)}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
