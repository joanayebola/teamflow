"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api, ApiClientError } from "@/lib/api-client";
import { Button, Card, ErrorNote, Input, Label, Textarea } from "@/components/ui";

export interface ProjectSummary {
  id: string;
  name: string;
  key: string;
  description: string | null;
  archived: boolean;
  taskCount: number;
}

export function ProjectsClient({
  workspaceId,
  initialProjects,
  canCreate,
}: {
  workspaceId: string;
  initialProjects: ProjectSummary[];
  canCreate: boolean;
}) {
  const router = useRouter();
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [key, setKey] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const project = await api<{ id: string }>(`/api/workspaces/${workspaceId}/projects`, {
        method: "POST",
        json: { name, key, description: description || null },
      });
      router.push(`/app/workspaces/${workspaceId}/projects/${project.id}`);
      router.refresh();
    } catch (err) {
      setBusy(false);
      setError(
        err instanceof ApiClientError
          ? (err.fields ? Object.values(err.fields).flat()[0] : err.message)
          : "Could not create the project.",
      );
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Projects</h1>
          <p className="text-sm text-ink-400">Each project has its own Kanban board.</p>
        </div>
        {canCreate && (
          <Button onClick={() => setShowForm((v) => !v)}>
            {showForm ? "Close" : "New project"}
          </Button>
        )}
      </div>

      {showForm && canCreate && (
        <Card className="p-5">
          <form onSubmit={create} className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label>Project name</Label>
              <Input required value={name} onChange={(e) => setName(e.target.value)} placeholder="Website Redesign" />
            </div>
            <div>
              <Label>Key (2–10 chars)</Label>
              <Input
                required
                value={key}
                onChange={(e) => setKey(e.target.value.toUpperCase())}
                placeholder="WEB"
                maxLength={10}
              />
            </div>
            <div className="sm:col-span-2">
              <Label>Description</Label>
              <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />
            </div>
            <div className="sm:col-span-2">
              <ErrorNote message={error} />
            </div>
            <div>
              <Button type="submit" disabled={busy}>
                {busy ? "Creating…" : "Create project"}
              </Button>
            </div>
          </form>
        </Card>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {initialProjects.map((p) => (
          <Link key={p.id} href={`/app/workspaces/${workspaceId}/projects/${p.id}`}>
            <Card className="h-full p-5 transition-colors hover:border-indigo-500/50">
              <div className="flex items-center justify-between">
                <span className="rounded-md bg-ink-800 px-2 py-0.5 font-mono text-xs text-ink-300">
                  {p.key}
                </span>
                {p.archived && <span className="text-xs text-ink-400">Archived</span>}
              </div>
              <h2 className="mt-3 font-semibold">{p.name}</h2>
              {p.description && (
                <p className="mt-1 line-clamp-2 text-sm text-ink-400">{p.description}</p>
              )}
              <p className="mt-4 text-xs text-ink-400">{p.taskCount} tasks</p>
            </Card>
          </Link>
        ))}
        {initialProjects.length === 0 && (
          <p className="text-sm text-ink-400">No projects yet.</p>
        )}
      </div>
    </div>
  );
}
