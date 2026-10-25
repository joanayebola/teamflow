"use client";

import { useCallback, useEffect, useState } from "react";
import { api, ApiClientError } from "@/lib/api-client";
import { Avatar, Button, ErrorNote, Input, Label, PriorityBadge, Select, Textarea } from "@/components/ui";
import type { MemberOption } from "./board-types";

interface TaskDetail {
  id: string;
  title: string;
  description: string | null;
  priority: string;
  dueDate: string | null;
  assigneeId: string | null;
  creator: { id: string; name: string };
  column: { id: string; name: string };
  comments: {
    id: string;
    body: string;
    createdAt: string;
    author: { id: string; name: string };
  }[];
}

export function TaskPanel({
  taskId,
  members,
  currentUserId,
  onClose,
  onChanged,
}: {
  taskId: string;
  members: MemberOption[];
  currentUserId: string;
  onClose: () => void;
  onChanged: () => void;
}) {
  const [task, setTask] = useState<TaskDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [comment, setComment] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      setTask(await api<TaskDetail>(`/api/tasks/${taskId}`));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load the task.");
    }
  }, [taskId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch-on-mount; state updates land after the await
    void load();
  }, [load]);

  async function patch(fields: Record<string, unknown>) {
    setSaving(true);
    setError(null);
    try {
      await api(`/api/tasks/${taskId}`, { method: "PATCH", json: fields });
      await load();
      onChanged();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Save failed.");
    } finally {
      setSaving(false);
    }
  }

  async function addComment(e: React.FormEvent) {
    e.preventDefault();
    if (!comment.trim()) return;
    try {
      await api(`/api/tasks/${taskId}/comments`, { method: "POST", json: { body: comment } });
      setComment("");
      await load();
      onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not post the comment.");
    }
  }

  async function remove() {
    if (!window.confirm("Delete this task? This cannot be undone.")) return;
    await api(`/api/tasks/${taskId}`, { method: "DELETE" });
    onChanged();
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/50" onClick={onClose}>
      <div
        className="scroll-slim h-full w-full max-w-md overflow-y-auto border-l border-ink-700 bg-ink-900 p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <span className="text-xs uppercase tracking-wide text-ink-400">
            {task ? `In ${task.column.name}` : "Task"}
          </span>
          <button onClick={onClose} className="rounded-lg px-2 py-1 text-ink-400 hover:bg-ink-800 hover:text-white" aria-label="Close panel">
            ✕
          </button>
        </div>

        <ErrorNote message={error} />
        {!task && !error && <p className="text-sm text-ink-400">Loading…</p>}

        {task && (
          <div className="space-y-5">
            <div>
              <Label>Title</Label>
              <Input
                value={task.title}
                onChange={(e) => setTask({ ...task, title: e.target.value })}
                onBlur={() => void patch({ title: task.title })}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Priority</Label>
                <Select
                  value={task.priority}
                  onChange={(e) => {
                    setTask({ ...task, priority: e.target.value });
                    void patch({ priority: e.target.value });
                  }}
                >
                  {["LOW", "MEDIUM", "HIGH", "URGENT"].map((p) => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </Select>
              </div>
              <div>
                <Label>Due date</Label>
                <Input
                  type="date"
                  value={task.dueDate ? task.dueDate.slice(0, 10) : ""}
                  onChange={(e) => {
                    const v = e.target.value || null;
                    setTask({ ...task, dueDate: v });
                    void patch({ dueDate: v });
                  }}
                />
              </div>
            </div>
            <div>
              <Label>Assignee</Label>
              <Select
                value={task.assigneeId ?? ""}
                onChange={(e) => {
                  const v = e.target.value || null;
                  setTask({ ...task, assigneeId: v });
                  void patch({ assigneeId: v });
                }}
              >
                <option value="">Unassigned</option>
                {members.map((m) => (
                  <option key={m.userId} value={m.userId}>
                    {m.name} ({m.role})
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label>Description</Label>
              <Textarea
                rows={4}
                value={task.description ?? ""}
                onChange={(e) => setTask({ ...task, description: e.target.value })}
                onBlur={() => void patch({ description: task.description || null })}
                placeholder="Add details…"
              />
            </div>
            <p className="flex items-center gap-2 text-xs text-ink-400">
              <PriorityBadge priority={task.priority} />
              Created by {task.creator.name}
              {saving && <span className="text-indigo-300">Saving…</span>}
            </p>

            <div className="border-t border-ink-800 pt-4">
              <h3 className="text-sm font-semibold">Comments</h3>
              <ul className="mt-3 space-y-3">
                {task.comments.map((c) => (
                  <li key={c.id} className="flex gap-3">
                    <Avatar name={c.author.name} size="sm" />
                    <div className="min-w-0">
                      <p className="text-xs text-ink-400">
                        <span className="font-medium text-ink-200">{c.author.name}</span>{" "}
                        {c.id && new Date(c.createdAt).toLocaleString()}
                      </p>
                      <p className="whitespace-pre-wrap text-sm text-ink-200">{c.body}</p>
                    </div>
                  </li>
                ))}
                {task.comments.length === 0 && (
                  <li className="text-sm text-ink-400">No comments yet.</li>
                )}
              </ul>
              <form onSubmit={addComment} className="mt-4 space-y-2">
                <Textarea
                  rows={2}
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder={currentUserId ? "Write a comment…" : ""}
                />
                <Button type="submit" variant="secondary">
                  Add comment
                </Button>
              </form>
            </div>

            <div className="border-t border-ink-800 pt-4">
              <Button variant="danger" onClick={() => void remove()}>
                Delete task
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
