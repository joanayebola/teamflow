"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import { api } from "@/lib/api-client";
import { Avatar, Button, Input } from "@/components/ui";

export interface WorkspaceSummary {
  id: string;
  name: string;
  slug: string;
  role: string;
}

function currentWorkspaceId(pathname: string): string | null {
  const m = pathname.match(/^\/app\/workspaces\/([^/]+)/);
  return m ? m[1] : null;
}

export function AppShell({
  user,
  workspaces,
  children,
}: {
  user: { name: string; email: string };
  workspaces: WorkspaceSummary[];
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const activeId = currentWorkspaceId(pathname);
  const active = workspaces.find((w) => w.id === activeId) ?? null;
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");

  async function createWorkspace(e: React.FormEvent) {
    e.preventDefault();
    const ws = await api<{ id: string }>("/api/workspaces", {
      method: "POST",
      json: { name: newName },
    });
    setCreating(false);
    setNewName("");
    router.push(`/app/workspaces/${ws.id}`);
    router.refresh();
  }

  const navLink = (href: string, label: string) => {
    const isActive = pathname === href;
    return (
      <Link
        href={href}
        className={`block rounded-lg px-3 py-2 text-sm font-medium ${
          isActive ? "bg-ink-800 text-white" : "text-ink-300 hover:bg-ink-800/60 hover:text-white"
        }`}
      >
        {label}
      </Link>
    );
  };

  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-ink-800 bg-ink-900/60 md:flex">
        <div className="border-b border-ink-800 px-5 py-4">
          <Link href="/app" className="text-lg font-bold tracking-tight">
            Team<span className="text-indigo-400">flow</span>
          </Link>
        </div>
        <div className="flex-1 overflow-y-auto px-3 py-4">
          <p className="px-2 pb-2 text-[11px] font-semibold uppercase tracking-wider text-ink-400">
            Workspaces
          </p>
          <div className="space-y-1">
            {workspaces.map((w) => (
              <Link
                key={w.id}
                href={`/app/workspaces/${w.id}`}
                className={`flex items-center justify-between rounded-lg px-3 py-2 text-sm font-medium ${
                  w.id === activeId
                    ? "bg-indigo-600/15 text-indigo-200"
                    : "text-ink-300 hover:bg-ink-800/60 hover:text-white"
                }`}
              >
                <span className="truncate">{w.name}</span>
                <span className="ml-2 text-[10px] uppercase text-ink-400">{w.role}</span>
              </Link>
            ))}
          </div>
          {creating ? (
            <form onSubmit={createWorkspace} className="mt-3 space-y-2 px-1">
              <Input
                autoFocus
                required
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Workspace name"
              />
              <div className="flex gap-2">
                <Button type="submit" className="flex-1">
                  Create
                </Button>
                <Button type="button" variant="ghost" onClick={() => setCreating(false)}>
                  Cancel
                </Button>
              </div>
            </form>
          ) : (
            <button
              onClick={() => setCreating(true)}
              className="mt-3 w-full rounded-lg border border-dashed border-ink-700 px-3 py-2 text-sm text-ink-400 hover:border-indigo-500 hover:text-indigo-300"
            >
              + New workspace
            </button>
          )}

          {active && (
            <>
              <p className="px-2 pb-2 pt-6 text-[11px] font-semibold uppercase tracking-wider text-ink-400">
                {active.name}
              </p>
              <nav className="space-y-1">
                {navLink(`/app/workspaces/${active.id}`, "Dashboard")}
                {navLink(`/app/workspaces/${active.id}/projects`, "Projects")}
                {navLink(`/app/workspaces/${active.id}/activity`, "Activity")}
                {navLink(`/app/workspaces/${active.id}/settings`, "Settings & members")}
              </nav>
            </>
          )}
        </div>
        <div className="border-t border-ink-800 px-4 py-3">
          <div className="flex items-center gap-3">
            <Avatar name={user.name || user.email} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{user.name}</p>
              <p className="truncate text-xs text-ink-400">{user.email}</p>
            </div>
            <button
              onClick={() => signOut({ callbackUrl: "/" })}
              className="rounded-lg px-2 py-1.5 text-xs font-medium text-ink-400 hover:bg-ink-800 hover:text-white"
            >
              Sign out
            </button>
          </div>
        </div>
      </aside>

      {/* Main column */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-ink-800 bg-ink-950/90 px-4 py-3 backdrop-blur md:px-6">
          <Link href="/app" className="text-base font-bold tracking-tight md:hidden">
            Team<span className="text-indigo-400">flow</span>
          </Link>
          {active && <SearchBox workspaceId={active.id} />}
          <div className="ml-auto flex items-center gap-2">
            <NotificationBell />
          </div>
        </header>
        <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 md:px-6">{children}</main>
      </div>
    </div>
  );
}

function SearchBox({ workspaceId }: { workspaceId: string }) {
  const router = useRouter();
  const [q, setQ] = useState("");
  return (
    <form
      className="hidden w-full max-w-sm sm:block"
      onSubmit={(e) => {
        e.preventDefault();
        if (q.trim()) {
          router.push(
            `/app/workspaces/${workspaceId}/search?q=${encodeURIComponent(q.trim())}`,
          );
        }
      }}
    >
      <Input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search tasks in this workspace…"
        aria-label="Search tasks"
      />
    </form>
  );
}

interface NotificationItem {
  id: string;
  title: string;
  body: string | null;
  read: boolean;
  createdAt: string;
}

function NotificationBell() {
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [unread, setUnread] = useState(0);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const router = useRouter();

  async function load() {
    try {
      const data = await api<{ items: NotificationItem[]; unread: number }>(
        "/api/notifications?pageSize=8",
      );
      setItems(data.items);
      setUnread(data.unread);
    } catch {
      // Non-fatal: bell just stays empty.
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch-on-mount + 30s polling; state updates land after the await
    void load();
    const t = setInterval(() => void load(), 30_000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  async function markAll() {
    await api("/api/notifications/read-all", { method: "POST" });
    await load();
  }

  async function markOne(id: string) {
    await api(`/api/notifications/${id}/read`, { method: "POST" });
    await load();
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="relative rounded-lg border border-ink-800 bg-ink-900 px-3 py-2 text-sm text-ink-300 hover:text-white"
        aria-label="Notifications"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
          <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
          <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
        </svg>
        {unread > 0 && (
          <span className="absolute -right-1.5 -top-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-indigo-600 px-1 text-[10px] font-bold text-white">
            {unread > 99 ? "99+" : unread}
          </span>
        )}
      </button>
      {open && (
        <div className="absolute right-0 z-40 mt-2 w-80 rounded-xl border border-ink-700 bg-ink-900 shadow-2xl">
          <div className="flex items-center justify-between border-b border-ink-800 px-4 py-2.5">
            <span className="text-sm font-semibold">Notifications</span>
            {unread > 0 && (
              <button onClick={markAll} className="text-xs text-indigo-300 hover:text-indigo-200">
                Mark all read
              </button>
            )}
          </div>
          <div className="max-h-80 overflow-y-auto">
            {items.length === 0 && (
              <p className="px-4 py-6 text-center text-sm text-ink-400">No notifications yet.</p>
            )}
            {items.map((n) => (
              <button
                key={n.id}
                onClick={() => void markOne(n.id)}
                className={`block w-full px-4 py-3 text-left hover:bg-ink-800/60 ${
                  n.read ? "opacity-60" : ""
                }`}
              >
                <p className="text-sm font-medium text-ink-100">{n.title}</p>
                {n.body && <p className="mt-0.5 line-clamp-2 text-xs text-ink-400">{n.body}</p>}
                <p className="mt-1 text-[11px] text-ink-400">
                  {new Date(n.createdAt).toLocaleString()}
                </p>
              </button>
            ))}
          </div>
          <button
            onClick={() => {
              setOpen(false);
              router.push("/app/notifications");
            }}
            className="block w-full border-t border-ink-800 px-4 py-2.5 text-center text-xs font-medium text-indigo-300 hover:bg-ink-800/60"
          >
            View all notifications
          </button>
        </div>
      )}
    </div>
  );
}
