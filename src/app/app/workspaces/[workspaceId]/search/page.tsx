"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { api } from "@/lib/api-client";
import { Card, EmptyState, Input, PriorityBadge } from "@/components/ui";

interface SearchResult {
  id: string;
  title: string;
  priority: string;
  assignee: { id: string; name: string } | null;
  column: {
    name: string;
    board: { project: { id: string; name: string; key: string } };
  };
}

export default function SearchPage() {
  const searchParams = useSearchParams();
  // Remount the inner search UI whenever the URL query changes.
  return <SearchInner key={searchParams.get("q") ?? ""} />;
}

function SearchInner() {
  const params = useParams<{ workspaceId: string }>();
  const searchParams = useSearchParams();
  const initialQ = searchParams.get("q") ?? "";
  const [q, setQ] = useState(initialQ);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!q.trim()) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- clearing results for an empty query is intentional
      setResults([]);
      return;
    }
    setLoading(true);
    const t = setTimeout(async () => {
      try {
        const data = await api<SearchResult[]>(
          `/api/workspaces/${params.workspaceId}/search?q=${encodeURIComponent(q.trim())}`,
        );
        setResults(data);
      } finally {
        setLoading(false);
      }
    }, 250);
    return () => clearTimeout(t);
  }, [q, params.workspaceId]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Search tasks</h1>
        <p className="text-sm text-ink-400">Search by title across every project in this workspace.</p>
      </div>
      <Input
        autoFocus
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Type to search…"
        aria-label="Search tasks"
      />
      {loading && <p className="text-sm text-ink-400">Searching…</p>}
      <div className="space-y-2">
        {results.map((t) => (
          <Link
            key={t.id}
            href={`/app/workspaces/${params.workspaceId}/projects/${t.column.board.project.id}`}
          >
            <Card className="flex items-center gap-3 p-4 transition-colors hover:border-indigo-500/50">
              <PriorityBadge priority={t.priority} />
              <span className="flex-1 font-medium">{t.title}</span>
              <span className="text-xs text-ink-400">
                {t.column.board.project.key} · {t.column.name}
                {t.assignee ? ` · ${t.assignee.name}` : ""}
              </span>
            </Card>
          </Link>
        ))}
        {!loading && q.trim() && results.length === 0 && (
          <EmptyState title="No matching tasks" body="Try a different search term." />
        )}
      </div>
    </div>
  );
}
