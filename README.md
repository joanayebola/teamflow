# Teamflow

**Project management for small teams** — workspaces with role-based access control,
Kanban boards with drag-and-drop, a full activity trail, in-app notifications,
search and analytics. A production-grade full-stack portfolio project.

> Demo data notice: the seed script creates clearly-labelled **demo** accounts with
> well-known passwords (see [Demo credentials](#demo-credentials)). They exist so the
> app can be tried instantly. Never reuse them anywhere real.

## Features

- **Authentication** — register / login / logout with Auth.js v5 (Credentials
  provider, bcrypt password hashing, JWT sessions); protected app routes.
- **Workspaces** — create, rename, switch, delete; ownership transfer.
- **Members & invites** — invite by email with a role; the invite produces a
  shareable accept link (no email provider is wired up in this demo — see
  [Limitations](#limitations)). Accept flow requires the signed-in account's
  email to match the invite.
- **RBAC** — OWNER / ADMIN / MEMBER permission matrix (`src/lib/permissions.ts`),
  enforced server-side on **every** mutation. Non-members get 404 (existence is
  not leaked); insufficient role gets 403.
- **Projects** — CRUD per workspace; every project gets a board with
  To do / In progress / In review / Done columns.
- **Kanban** — column CRUD; task CRUD; drag-and-drop within and between columns
  (@dnd-kit) with fractional ordering, optimistic UI and rollback on failure;
  task detail panel (assignee, due date, priority, description), comments.
- **Activity log** — task created / moved / assigned / commented, project and
  member events; paginated workspace activity feed.
- **Notifications** — on assignment and on comments to your assigned tasks;
  header bell with unread count, dropdown, mark-as-read, paginated page.
- **Search & filters** — workspace-wide task search by title; board filters by
  assignee and priority.
- **Analytics dashboard** — task counts by column and priority, per-member open
  workload, overdue count, completions over the last 14 days.

## Tech stack

| Layer | Choice |
|---|---|
| Framework | Next.js 16 (App Router, src/ dir) + React 19 |
| Language | TypeScript (strict) |
| Styling | Tailwind CSS v4, hand-rolled components (dark slate + indigo) |
| Database | PostgreSQL 16 via Prisma 6 (migrations + seed) |
| Auth | Auth.js v5 (next-auth beta) + bcryptjs |
| Validation | Zod schemas on every mutation |
| Drag & drop | @dnd-kit |
| Tests | Vitest — unit (RBAC matrix, position math, schemas) + integration (service layer against a real test DB) |
| CI | GitHub Actions with a PostgreSQL service |

## Architecture notes

- **Service layer** (`src/server/services/`) holds all business logic and takes an
  explicit `userId`. API routes (`src/app/api/`) are thin: session → Zod parse →
  service → consistent JSON envelope (`{ error: { code, message, fields? } }` on failure).
- **Authorization** is centralised: `requireMembership` / `requirePermission`
  (`src/lib/authz.ts`) consult the permission matrix; the service layer is
  deliberately decoupled from Auth.js so it is integration-testable without HTTP.
- **Ordering** uses fractional positions (`src/lib/positions.ts`): a moved task
  takes the midpoint between neighbours; when the gap is exhausted the column is
  rebalanced in the same transaction.
- **Side effects** (activity log + notifications) are written by the services that
  perform the mutation, so UI, API and tests all observe the same trail.
- **Analytics**: "completed" means tasks currently in a column named `Done`
  (case-insensitive); completions-over-time buckets those tasks by `updatedAt`
  day. This is a documented approximation, not a separate event store.

## Getting started

### Prerequisites

- Node.js 22+ (developed on Node 24)
- PostgreSQL 14+ running locally (or any reachable Postgres)

### Setup

```bash
npm install
cp .env.example .env          # then fill in real values

# create the databases (adjust to your Postgres setup)
createdb teamflow_dev
createdb teamflow_test

npx prisma migrate dev        # applies migrations to teamflow_dev
npm run db:seed               # DEMO data — see below
npm run dev                   # http://localhost:3000
```

Generate an auth secret with `npx auth secret` (or `openssl rand -base64 32`) and
put it in `.env` as `AUTH_SECRET`. When self-hosting outside Vercel, Auth.js also
needs `AUTH_TRUST_HOST=true`.

### Environment variables

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | Postgres connection string for the dev/app database |
| `DATABASE_URL_TEST` | Postgres connection string for the test database |
| `AUTH_SECRET` | Auth.js session/JWT secret |
| `AUTH_TRUST_HOST` | `true` when self-hosting outside Vercel |
| `NEXTAUTH_URL` | Public base URL of the app |

See `.env.example` — it contains placeholders only. **No real secrets are committed.**

### Demo credentials

Seeded demo accounts (password for all three: `demo-password-123`):

| Email | Workspace role |
|---|---|
| `owner@teamflow.demo` | OWNER |
| `ada@teamflow.demo` | ADMIN |
| `ben@teamflow.demo` | MEMBER |

The seed creates one "Demo Workspace", one "Website Redesign" project, a board
with four columns and ten tasks.

## Commands

```bash
npm run dev          # development server
npm run build        # production build
npm run start        # production server
npm run lint         # ESLint
npm run typecheck    # tsc --noEmit
npm test             # Vitest (unit + integration; integration uses teamflow_test)
npm run db:migrate   # prisma migrate dev
npm run db:seed      # seed demo data
npm run db:reset     # reset dev DB and re-seed
bash scripts/smoke.sh  # end-to-end curl smoke test (server must be running)
```

## Testing

- **Unit** (`tests/unit/`) — the full RBAC permission matrix for all three roles,
  fractional position math (midpoints, gap exhaustion, rebalancing), Zod schemas,
  slug generation.
- **Integration** (`tests/integration/`) — runs against a real PostgreSQL test
  database (`DATABASE_URL_TEST`): workspace isolation (user B cannot read user A's
  workspace, tasks or members), RBAC enforcement at the service layer, task-move
  persistence and ordering, cross-board move rejection, notification side effects,
  duplicate-email registration.
- **Smoke** (`scripts/smoke.sh`) — drives the running app over HTTP:
  register → login → create workspace → project → task → move → verify, plus
  auth guards and the seeded demo data.

CI (`.github/workflows/ci.yml`) runs install → prisma generate → migrations →
lint → typecheck → test → build against a PostgreSQL 16 service container.

## Deployment

The app is a standard Next.js server app:

1. Provision PostgreSQL and set the env vars above on the host.
2. `npm ci && npx prisma migrate deploy && npm run build && npm run start`.
3. Optionally `npm run db:seed` for the demo dataset — **demo only**.

Platforms like Vercel (with a hosted Postgres) or any Node host work unchanged.

## Limitations

- **Invites are link-based**: there is no email provider configured, so inviting
  creates an invite record and returns a shareable `/invite/<token>` link. The
  accept flow itself (email match, expiry, single use) is fully enforced.
- **No real-time updates**: the board is request/response with optimistic UI;
  the notification bell polls every 30s. No WebSockets in this version.
- **Analytics completion metric** is the documented approximation described above.

## License

MIT — see [LICENSE](LICENSE) if present; otherwise all rights reserved by the author.
