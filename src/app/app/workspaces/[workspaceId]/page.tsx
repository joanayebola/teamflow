import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/auth";
import { getAnalytics, listActivity } from "@/server/services/insights";
import { listProjects } from "@/server/services/projects";
import { getWorkspace } from "@/server/services/workspaces";
import { AppError } from "@/lib/errors";
import { Card, PriorityBadge } from "@/components/ui";

type Ctx = { params: Promise<{ workspaceId: string }> };

export default async function WorkspaceDashboardPage({ params }: Ctx) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const userId = session.user.id;
  const { workspaceId } = await params;

  let workspaceName = "";
  let role = "";
  try {
    const res = await getWorkspace(userId, workspaceId);
    workspaceName = res.workspace.name;
    role = res.role;
  } catch (e) {
    if (e instanceof AppError && e.status === 404) notFound();
    throw e;
  }

  const [analytics, projects, activity] = await Promise.all([
    getAnalytics(userId, workspaceId),
    listProjects(userId, workspaceId),
    listActivity(userId, workspaceId, 1, 6),
  ]);

  const maxColumn = Math.max(1, ...analytics.tasksByColumn.map((c) => c.count));
  const maxCompleted = Math.max(1, ...analytics.completedLast14Days.map((d) => d.count));
  const maxWorkload = Math.max(1, ...analytics.openByMember.map((m) => m.open));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{workspaceName}</h1>
          <p className="text-sm text-ink-400">
            Workspace overview · your role: <span className="text-ink-200">{role}</span>
          </p>
        </div>
        <Link
          href={`/app/workspaces/${workspaceId}/projects`}
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500"
        >
          View projects
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[
          { label: "Total tasks", value: analytics.totalTasks },
          { label: "Projects", value: projects.length },
          { label: "Overdue open tasks", value: analytics.overdue },
          {
            label: "Completed",
            value: analytics.tasksByColumn
              .filter((c) => c.name.trim().toLowerCase() === "done")
              .reduce((s, c) => s + c.count, 0),
          },
        ].map((s) => (
          <Card key={s.label} className="p-5">
            <p className="text-3xl font-bold">{s.value}</p>
            <p className="mt-1 text-xs uppercase tracking-wide text-ink-400">{s.label}</p>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="p-5">
          <h2 className="text-sm font-semibold">Tasks by column</h2>
          <div className="mt-4 space-y-3">
            {analytics.tasksByColumn.map((c) => (
              <div key={c.columnId}>
                <div className="mb-1 flex justify-between text-xs text-ink-400">
                  <span>{c.name}</span>
                  <span className="text-ink-200">{c.count}</span>
                </div>
                <div className="h-2 rounded-full bg-ink-800">
                  <div
                    className="h-2 rounded-full bg-indigo-500"
                    style={{ width: `${(c.count / maxColumn) * 100}%` }}
                  />
                </div>
              </div>
            ))}
            {analytics.tasksByColumn.length === 0 && (
              <p className="text-sm text-ink-400">No projects yet — create one to see data here.</p>
            )}
          </div>
          <h2 className="mt-6 text-sm font-semibold">Tasks by priority</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {Object.entries(analytics.tasksByPriority).map(([p, count]) => (
              <span key={p} className="inline-flex items-center gap-2">
                <PriorityBadge priority={p} />
                <span className="text-sm text-ink-300">{count}</span>
              </span>
            ))}
          </div>
        </Card>

        <Card className="p-5">
          <h2 className="text-sm font-semibold">Open workload by member</h2>
          <div className="mt-4 space-y-3">
            {analytics.openByMember.map((m) => (
              <div key={m.userId || m.name}>
                <div className="mb-1 flex justify-between text-xs text-ink-400">
                  <span>{m.name}</span>
                  <span className="text-ink-200">{m.open} open</span>
                </div>
                <div className="h-2 rounded-full bg-ink-800">
                  <div
                    className="h-2 rounded-full bg-emerald-500"
                    style={{ width: `${(m.open / maxWorkload) * 100}%` }}
                  />
                </div>
              </div>
            ))}
            {analytics.openByMember.length === 0 && (
              <p className="text-sm text-ink-400">No members yet.</p>
            )}
          </div>
          <h2 className="mt-6 text-sm font-semibold">Completions — last 14 days</h2>
          <div className="mt-3 flex h-24 items-end gap-1" role="img" aria-label="Bar chart of completed tasks per day for the last 14 days">
            {analytics.completedLast14Days.map((d) => (
              <div key={d.date} className="flex flex-1 flex-col items-center gap-1">
                <div
                  className="w-full rounded-t bg-indigo-500/80"
                  style={{ height: `${Math.max(4, (d.count / maxCompleted) * 80)}px` }}
                  title={`${d.date}: ${d.count} completed`}
                />
                <span className="text-[9px] text-ink-400">{d.date.slice(8)}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <Card className="p-5">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold">Recent activity</h2>
          <Link
            href={`/app/workspaces/${workspaceId}/activity`}
            className="text-xs text-indigo-300 hover:text-indigo-200"
          >
            View all
          </Link>
        </div>
        <ul className="mt-3 divide-y divide-ink-800">
          {activity.items.map((a) => (
            <li key={a.id} className="flex items-baseline justify-between gap-4 py-2.5 text-sm">
              <span className="text-ink-300">
                <span className="font-medium text-ink-100">{a.actor.name}</span>{" "}
                <span className="text-ink-400">{a.action.replaceAll(".", " ")}</span>
                {a.project ? <span className="text-ink-400"> · {a.project.name}</span> : null}
              </span>
              <span className="shrink-0 text-xs text-ink-400">
                {new Date(a.createdAt).toLocaleString()}
              </span>
            </li>
          ))}
          {activity.items.length === 0 && (
            <li className="py-3 text-sm text-ink-400">No activity yet.</li>
          )}
        </ul>
      </Card>
    </div>
  );
}
