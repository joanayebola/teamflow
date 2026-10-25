export const dynamic = "force-dynamic";

import Link from "next/link";
import { auth } from "@/auth";

export default async function LandingPage() {
  const session = await auth();
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col px-6">
      <header className="flex items-center justify-between py-6">
        <span className="text-lg font-bold tracking-tight">
          Team<span className="text-indigo-400">flow</span>
        </span>
        <nav className="flex items-center gap-3">
          {session?.user ? (
            <Link
              href="/app"
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500"
            >
              Open app
            </Link>
          ) : (
            <>
              <Link
                href="/login"
                className="rounded-lg px-4 py-2 text-sm font-medium text-ink-300 hover:bg-ink-800"
              >
                Sign in
              </Link>
              <Link
                href="/register"
                className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500"
              >
                Get started
              </Link>
            </>
          )}
        </nav>
      </header>

      <section className="flex flex-1 flex-col items-center justify-center py-20 text-center">
        <p className="mb-4 rounded-full border border-indigo-500/30 bg-indigo-500/10 px-3 py-1 text-xs font-medium text-indigo-300">
          Project management for small teams
        </p>
        <h1 className="max-w-3xl text-5xl font-bold leading-tight tracking-tight">
          Plan, track and ship work —{" "}
          <span className="text-indigo-400">without the bloat.</span>
        </h1>
        <p className="mt-6 max-w-xl text-lg text-ink-400">
          Workspaces with role-based access, drag-and-drop Kanban boards, a full
          activity trail, notifications and analytics. Built with Next.js,
          Prisma and PostgreSQL.
        </p>
        <div className="mt-10 flex gap-3">
          <Link
            href="/register"
            className="rounded-lg bg-indigo-600 px-6 py-3 text-sm font-semibold text-white hover:bg-indigo-500"
          >
            Create your workspace
          </Link>
          <Link
            href="/login"
            className="rounded-lg border border-ink-700 bg-ink-900 px-6 py-3 text-sm font-semibold text-ink-100 hover:bg-ink-800"
          >
            Try the demo
          </Link>
        </div>
        <div className="mt-14 grid w-full max-w-4xl grid-cols-1 gap-4 text-left sm:grid-cols-3">
          {[
            {
              title: "Kanban that keeps up",
              body: "Drag tasks between columns with fractional ordering and optimistic updates that roll back on failure.",
            },
            {
              title: "Roles done properly",
              body: "Owner, Admin and Member permissions enforced on the server for every single mutation.",
            },
            {
              title: "Nothing happens silently",
              body: "Every create, move, assignment and comment lands in the activity log and notifies the right person.",
            },
          ].map((f) => (
            <div key={f.title} className="rounded-xl border border-ink-800 bg-ink-900 p-5">
              <h2 className="text-sm font-semibold text-ink-100">{f.title}</h2>
              <p className="mt-2 text-sm leading-relaxed text-ink-400">{f.body}</p>
            </div>
          ))}
        </div>
        <p className="mt-12 text-xs text-ink-400">
          Demo accounts (demo only): owner@teamflow.demo · ada@teamflow.demo ·
          ben@teamflow.demo — password <code className="text-ink-200">demo-password-123</code>
        </p>
      </section>
    </main>
  );
}
