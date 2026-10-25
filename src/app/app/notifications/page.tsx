"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api-client";
import { Button, Card } from "@/components/ui";

interface NotificationItem {
  id: string;
  title: string;
  body: string | null;
  type: string;
  read: boolean;
  createdAt: string;
}

interface Page {
  items: NotificationItem[];
  total: number;
  unread: number;
  page: number;
  totalPages: number;
}

export default function NotificationsPage() {
  const [data, setData] = useState<Page | null>(null);
  const [page, setPage] = useState(1);

  async function load(p: number) {
    const res = await api<Page>(`/api/notifications?page=${p}&pageSize=20`);
    setData(res);
    setPage(res.page);
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch-on-mount; state updates land after the await
    void load(1);
  }, []);

  async function markAll() {
    await api("/api/notifications/read-all", { method: "POST" });
    await load(page);
  }

  async function markOne(id: string) {
    await api(`/api/notifications/${id}/read`, { method: "POST" });
    await load(page);
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Notifications</h1>
          <p className="text-sm text-ink-400">
            {data ? `${data.unread} unread of ${data.total}` : "Loading…"}
          </p>
        </div>
        {data && data.unread > 0 && (
          <Button variant="secondary" onClick={() => void markAll()}>
            Mark all read
          </Button>
        )}
      </div>
      <Card className="p-2">
        <ul className="divide-y divide-ink-800">
          {data?.items.map((n) => (
            <li key={n.id}>
              <button
                onClick={() => void markOne(n.id)}
                className={`block w-full px-3 py-3 text-left hover:bg-ink-800/50 ${n.read ? "opacity-60" : ""}`}
              >
                <p className="text-sm font-medium">{n.title}</p>
                {n.body && <p className="mt-0.5 text-sm text-ink-400">{n.body}</p>}
                <p className="mt-1 text-xs text-ink-400">
                  {new Date(n.createdAt).toLocaleString()}
                </p>
              </button>
            </li>
          ))}
          {data && data.items.length === 0 && (
            <li className="px-3 py-8 text-center text-sm text-ink-400">
              No notifications.
            </li>
          )}
        </ul>
      </Card>
      {data && data.totalPages > 1 && (
        <div className="flex items-center justify-center gap-3 text-sm">
          <Button variant="secondary" disabled={page <= 1} onClick={() => void load(page - 1)}>
            Previous
          </Button>
          <span className="text-ink-400">
            Page {page} of {data.totalPages}
          </span>
          <Button
            variant="secondary"
            disabled={page >= data.totalPages}
            onClick={() => void load(page + 1)}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
}
