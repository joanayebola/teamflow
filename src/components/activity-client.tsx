"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api-client";
import { Button, Card, EmptyState } from "@/components/ui";

interface ActivityItem {
  id: string;
  action: string;
  entityType: string;
  createdAt: string;
  actor: { id: string; name: string };
  project: { id: string; name: string } | null;
  metadata: Record<string, unknown> | null;
}

interface Page {
  items: ActivityItem[];
  total: number;
  page: number;
  totalPages: number;
}

export function ActivityClient({
  workspaceId,
  initial,
}: {
  workspaceId: string;
  initial: Page;
}) {
  const [items, setItems] = useState<ActivityItem[]>(initial.items);
  const [page, setPage] = useState(initial.page);
  const [totalPages, setTotalPages] = useState(initial.totalPages);
  const [busy, setBusy] = useState(false);

  const loadMore = useCallback(async () => {
    if (page >= totalPages) return;
    setBusy(true);
    const next = await api<Page>(
      `/api/workspaces/${workspaceId}/activity?page=${page + 1}&pageSize=20`,
    );
    setItems((prev) => [...prev, ...next.items]);
    setPage(next.page);
    setTotalPages(next.totalPages);
    setBusy(false);
  }, [page, totalPages, workspaceId]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Activity</h1>
        <p className="text-sm text-ink-400">
          Everything that happened in this workspace, newest first.
        </p>
      </div>
      <Card className="p-2">
        <ul className="divide-y divide-ink-800">
          {items.map((a) => (
            <li key={a.id} className="flex items-baseline justify-between gap-4 px-3 py-3 text-sm">
              <span className="text-ink-300">
                <span className="font-medium text-ink-100">{a.actor.name}</span>{" "}
                <span className="text-ink-400">{describe(a)}</span>
                {a.project && <span className="text-ink-400"> · {a.project.name}</span>}
              </span>
              <span className="shrink-0 text-xs text-ink-400">
                {new Date(a.createdAt).toLocaleString()}
              </span>
            </li>
          ))}
          {items.length === 0 && (
            <li className="px-3 py-6">
              <EmptyState title="No activity yet" body="Actions across the workspace will show up here." />
            </li>
          )}
        </ul>
      </Card>
      {page < totalPages && (
        <div className="text-center">
          <Button variant="secondary" onClick={() => void loadMore()} disabled={busy}>
            {busy ? "Loading…" : "Load more"}
          </Button>
        </div>
      )}
    </div>
  );
}

function describe(a: ActivityItem): string {
  const title =
    typeof a.metadata?.title === "string" ? `: "${a.metadata.title}"` : "";
  switch (a.action) {
    case "task.created":
      return `created a task${title}`;
    case "task.moved":
      return `moved a task${title}`;
    case "task.assigned":
      return `assigned a task${title}`;
    case "task.updated":
      return `updated a task${title}`;
    case "task.deleted":
      return "deleted a task";
    case "task.commented":
      return `commented on a task${title}`;
    case "project.created":
      return "created the project";
    case "project.updated":
      return "updated the project";
    case "project.deleted":
      return "deleted a project";
    case "member.invited":
      return "invited a member";
    case "member.joined":
      return "joined the workspace";
    case "member.removed":
      return "removed a member";
    case "member.roleUpdated":
      return "changed a member's role";
    case "workspace.created":
      return "created the workspace";
    case "workspace.ownershipTransferred":
      return "transferred workspace ownership";
    default:
      return a.action.replaceAll(".", " ");
  }
}

export function useDebounced<T>(value: T, delay: number): T {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return v;
}
