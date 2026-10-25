# Teamflow — Build Log

Honest, evidence-based record of what was built and verified, milestone by milestone.
Status key: **done** (verified with evidence) / **partial** / **blocked**.

## Environment

- Node v24.22.1, npm 10.9.4, Ubuntu 24.04 VM.
- PostgreSQL 16.15 installed via apt (`apt-get install -y postgresql`), cluster started with `pg_ctlcluster 16 main start`.
  Role `teamflow` (LOGIN, CREATEDB) and databases `teamflow_dev` + `teamflow_test` created and connection verified with psql.
  **No SQLite fallback needed.**
- Tooling note: `prisma` CLI initially resolved to a v8 RC and engine downloads via npm postinstall kept failing with
  ECONNRESET on this network. Resolved by pinning `prisma@6.19.3` + `@prisma/client@6.19.3` (installed with
  `--ignore-scripts`) and fetching the two engine binaries directly from binaries.prisma.sh with resumable curl
  (`libquery_engine-debian-openssl-3.0.x.so.node`, `schema-engine-debian-openssl-3.0.x`). `npx prisma --version`
  confirms 6.19.3 / debian-openssl-3.0.x.
- Next.js 16.4.3 (create-next-app: App Router, src/, TS, Tailwind v4, ESLint, Turbopack), React 19.3,
  Auth.js v5 (next-auth 5.0.0-beta.32), Zod 4, @dnd-kit, Vitest 5.

## Milestones

### M1 — Scaffold + Prisma schema + migration + seed — **done**
- create-next-app scaffold (Next 16.4.3, src/, TS strict, Tailwind v4, ESLint).
- Full Prisma schema: User, Workspace, WorkspaceMember (OWNER/ADMIN/MEMBER), Project, Board, BoardColumn,
  Task (priority enum, float position, dueDate, assignee/creator), Comment, ActivityLog, Notification, Invite.
- `prisma migrate dev --name init` applied to teamflow_dev — verified with psql: all 11 tables present.
- `prisma generate` initially crashed downloading engines (network); fixed by copying the verified engine
  binaries into `node_modules/prisma/` as well as `node_modules/@prisma/engines/`.
- `npm run db:seed` ran clean; psql counts: 3 users, 1 workspace, 1 project, 4 columns, 10 tasks.

### M2 — Auth — **done**
- Auth.js v5 Credentials provider, bcryptjs hashing (cost 12 at registration), JWT sessions,
  register/login/logout, session endpoint, protected `/app/*` via middleware (Auth.js `auth` export,
  surfaced by Next 16 as Proxy) plus a server-side layout guard; auth error state on bad credentials.
- Evidence: smoke test — register → 201, credentials callback login → 302, session contains the user,
  wrong password yields no session, unauthenticated `/api/workspaces` → 401, `/app` → 307 redirect.

### M3 — Workspaces, members, invites, RBAC — **done**
- Workspace create/list/switch (sidebar), rename, delete (OWNER only), ownership transfer.
- Members list; invite by email creates an Invite record (token, 7-day expiry) and returns a shareable
  `/invite/<token>` accept link (no email provider in this demo — documented in README). Accept flow
  enforces email match + PENDING + unexpired; duplicate members/invites rejected with 409.
- RBAC: `src/lib/permissions.ts` matrix is the single source of truth; `requireMembership` /
  `requirePermission` (`src/lib/authz.ts`) guard every service mutation. OWNER-only: delete + transfer.
  ADMIN+: members/projects. MEMBER: tasks/comments. Non-members get 404.
- Evidence: 6 unit tests exhaustively verify the matrix for all roles; integration tests verify
  isolation (404s), MEMBER blocked from projects/invites (403), invite→accept→membership end to end.

### M4 — Projects — **done**
- Project CRUD in a workspace (unique key per workspace, 409 on clash); creating a project atomically
  creates its board + 4 default columns; project overview/list with task counts.
- Evidence: smoke test (project created via API, board returns 4 columns); integration tests.

### M5 — Kanban — **done**
- Board per project; column create/rename/delete (ADMIN+); task CRUD; @dnd-kit drag-and-drop within and
  between columns persisting columnId + fractional position via `POST /api/tasks/:id/move`, optimistic
  UI with rollback to the pre-drag snapshot + refetch on failure; task detail slide-over (title,
  description, priority, assignee picker from workspace members, due date), comments with delete rules
  (author or OWNER/ADMIN).
- Evidence: integration tests prove move persistence + ordering after re-read, midpoint insertion
  (C lands between A and B), and cross-board move rejection (400). Smoke test proves the HTTP move
  flow end to end. Drag *gestures* themselves are browser-only and were not automated — the state
  machine and persistence path they drive are the parts covered by tests.

### M6 — Activity log — **done**
- Services record task.created/moved/assigned/updated/deleted/commented, project.*, member.*,
  workspace.* events with actor, entity and JSON metadata; workspace activity page is paginated
  (API + load-more UI, human-readable descriptions).
- Evidence: smoke test (paginated payload returned); activity rows visible in seeded demo workspace.

### M7 — Notifications — **done**
- Notifications on task assignment (create + reassign) and on comments to an assigned task
  (self-notifications suppressed); header bell with unread count (30s poll), dropdown, mark-one-read,
  mark-all-read, and a paginated notifications page.
- Evidence: integration tests assert TASK_ASSIGNED and TASK_COMMENTED rows are created for the
  assignee and not for the actor.

### M8 — Search & filtering — **done**
- Workspace-wide task search by title (case-insensitive, project/column context, 50-result cap);
  board filters by assignee (incl. Unassigned) and priority (dragging pauses while filters are on,
  so filtered indices can never corrupt positions); paginated activity + notifications (API + UI).
- Evidence: smoke test — `search?q=analytics` finds the seeded "Audit current site analytics" task.

### M9 — Analytics dashboard — **done**
- Per-workspace dashboard: total tasks, project count, overdue count, tasks by column (bars),
  tasks by priority, open workload per member, completions over the last 14 days (hand-rolled
  accessible bar chart), recent activity. "Completed" = tasks in a column named "Done"
  (documented approximation in README).
- Evidence: smoke test — analytics endpoint returns totalTasks=10 for the seeded demo workspace.

### M10 — Tests, docs, CI — **done**
- Vitest: 20 unit tests (permissions matrix, position math, Zod schemas, slugify) + 12 integration
  tests against teamflow_test (isolation, RBAC, move persistence, cross-board rejection,
  notifications, duplicate registration). **32/32 pass.**
- `.github/workflows/ci.yml`: PostgreSQL 16 service, install, prisma generate, migrate deploy
  (dev + test), lint, typecheck, test, build. (Written and reviewed; not executed — no GitHub repo
  was created, per constraints.)
- README.md with setup/env/demo credentials/architecture/testing/deploy; .env.example placeholders
  only; .gitignore covers .env (with !.env.example exception). No secrets anywhere in the repo.

## Final verification (2026-10-25, final tree)

| Command | Result |
|---|---|
| `npm install` | OK (clean reinstall; earlier partial installs from network interruptions repaired) |
| `npx prisma migrate dev` (dev) / `migrate deploy` (test) | OK — 11 tables |
| `npm run db:seed` | OK — 3 users, 1 workspace, 1 project, 4 columns, 10 tasks |
| `npm run lint` | **Clean** (0 errors, 0 warnings; 4 targeted eslint-disable comments for fetch-on-mount effects, each justified inline) |
| `npx tsc --noEmit` | **Clean** |
| `npm test` | **32/32 passed** (4 files) |
| `npm run build` | **OK** — 40 routes compiled |
| `bash scripts/smoke.sh` (against `npm run start`) | **16/16 checks passed** |

## Known limitations (also in README)

- Invites are link-based; no transactional email provider is wired up.
- No real-time collaboration: board updates are request/response with optimistic UI; bell polls 30s.
- Analytics "completed" metric is the documented Done-column approximation.
- Next 16 deprecates the `middleware.ts` filename in favour of `proxy.ts`; the build accepts it
  (shown as "Proxy (Middleware)") and it works, but a future Next major may require the rename.
- Cache Components / PPR (scaffold default) intentionally disabled in next.config.ts — every route
  is per-user dynamic; routes declare `dynamic = "force-dynamic"` explicitly.
