# QA Daily Report Portal — Project Documentation

A complete technical overview of the QA Daily Report Portal: what it does, how it is built, how data flows through it, and where to change things.

> For the quickstart and deploy steps, see [`README.md`](./README.md). This document is the deeper architecture + reference guide.

---

## 1. Overview

The QA Daily Report Portal is an internal **Next.js 14 (App Router)** web application that lets a QA team capture daily test data and instantly turn it into a polished daily report — complete with KPI cards, trend charts, platform breakdowns, a print-ready preview, and server-side PDF export.

The seed dataset models **Adobe Creative Cloud Desktop build 28.9.8** tested across **Mac Intel / Mac ARM / Windows**, so every screen looks meaningful the moment you open it.

**Key characteristics:**

- **Zero-setup local dev** — uses a SQLite file (`prisma/dev.db`), no Docker or external DB needed.
- **Portable to production** — automatically switches Prisma to PostgreSQL on Vercel based on `DATABASE_URL`, with no schema edits.
- **No authentication** — opening the URL drops you straight into the dashboard. Intended for internal/protected hosting (Vercel password protection, IP allowlist, VPN, etc.).

---

## 2. Tech Stack

| Layer | Technology |
| --- | --- |
| Framework | Next.js 14 (App Router, Server Components, Route Handlers) |
| Language | TypeScript 5 |
| UI | React 18, Tailwind CSS 3, Radix UI primitives, `lucide-react` icons |
| Styling system | shadcn-style component primitives (`src/components/ui`), `class-variance-authority`, `tailwind-merge` |
| Charts | Recharts |
| Forms & validation | `react-hook-form` + `zod` (via `@hookform/resolvers`) |
| ORM / DB | Prisma 5 → SQLite (local) / PostgreSQL (prod) |
| PDF | `@react-pdf/renderer` (server-side render) |
| Dates | `date-fns` |

---

## 3. Architecture

The app follows the standard Next.js App Router model: **Server Components fetch data directly from Prisma**, and **Route Handlers (`/api/*`) handle writes**. There is no separate backend service.

```
Browser
  │
  ├── Server Components (dashboard, reports, preview)
  │       └── read directly via Prisma  ─────────────┐
  │                                                   │
  └── Client Components (report form)                 ▼
          └── fetch() → /api/reports/* ────────►  Prisma Client  ──► SQLite / Postgres
                         (POST / PUT / DELETE)
```

- **Reads**: Pages are `async` Server Components that call `prisma.*` directly. Most are marked `export const dynamic = "force-dynamic"` so they always reflect the latest DB state.
- **Writes**: The report form (a Client Component) submits JSON to Route Handlers under `src/app/api/reports`, which validate with Zod and persist with Prisma.
- **PDF**: A dedicated route renders the report to a PDF stream server-side.

---

## 4. Data Model

Defined in [`prisma/schema.prisma`](./prisma/schema.prisma). SQLite has no native enums, so "enum" fields are stored as plain strings and validated in code (see [§7](#7-domain-vocabulary--business-rules)).

### Entities & relationships

```
User ──< Report ──< Bug
                 ├──< DeviceConfiguration
                 └──< TestResult
```

| Model | Purpose | Notable fields |
| --- | --- | --- |
| `User` | Report author (FK target) | `name`, `email` (unique), `passwordHash`, `role` (ADMIN/QA/VIEWER) |
| `Report` | One daily report | `title`, `productName`, `buildVersion`, `reportDate`, `preparedBy`, `summary`, `status` (DRAFT/PUBLISHED) |
| `Bug` | A bug listed in a report | `jiraId`, `title`, `status`, `priority` (P0–P4), `epvFlag`, `platform?`, `isNewToday`, `owner?` |
| `DeviceConfiguration` | Test machine spec | `platform`, `osVersion`, `processor`, `ram`, `notes?` |
| `TestResult` | One test case across 3 platforms | `testcaseId`, `testcaseTitle`, `testsuiteLabel`, `macIntelResult`, `macArmResult`, `windowsResult` |

- `Bug`, `DeviceConfiguration`, and `TestResult` are cascade-deleted with their parent `Report`.
- Indexes exist on `Report.reportDate`, `Report.status`, `Bug.reportId`, `Bug.isNewToday`, and child `reportId`s.

---

## 5. Project Structure

```
prisma/
  schema.prisma            # SQLite by default; auto-switches to postgresql on Vercel
  seed.ts                  # 15 days of realistic CCD demo data
scripts/
  prebuild.mjs             # Flips provider, generates client, pushes schema, seeds (build step)
src/
  app/
    layout.tsx             # Root layout
    page.tsx               # "/" → redirects to /dashboard
    (app)/                 # Main authenticated-shell layout group
      layout.tsx           # App shell (sidebar/nav)
      dashboard/page.tsx   # KPI dashboard + trend charts
      reports/
        page.tsx           # Reports list
        new/page.tsx       # Create report
        [id]/page.tsx      # Preview a report
        [id]/edit/page.tsx # Edit a report
        duplicate-button.tsx
    api/
      reports/
        route.ts                  # GET list, POST create
        [id]/route.ts             # GET / PUT / DELETE one report
        [id]/duplicate/route.ts   # POST duplicate
        [id]/pdf/route.tsx        # GET PDF export (maxDuration 30s on Vercel)
  components/
    app-shell.tsx          # Nav layout
    page-header.tsx
    ui/                    # Button, Card, Dialog, Table, Select, etc. (shadcn-style)
    charts/trend-charts.tsx        # Recharts: pass/fail trend, bug trend, platform breakdown
    report/
      report-form.tsx              # The big create/edit form (Client Component)
      report-preview.tsx           # Print-ready report view (shared with PDF look)
      platform-summary-grid.tsx    # Live per-platform pass/fail grid
  lib/
    prisma.ts              # Singleton Prisma client
    default-user.ts        # Lazily creates/returns a default user for FK requirement
    types.ts               # String-literal unions (Platform, TestOutcome, Role, …)
    validators.ts          # Zod schemas for all API inputs
    report-helpers.ts      # Platform summaries, trend builder, totals, bug logic
    pdf-document.tsx        # @react-pdf/renderer template
    utils.ts               # cn() + formatDate()
```

---

## 6. API Reference

All endpoints live under `src/app/api/reports`. Writes are validated with the Zod `reportSchema` ([`src/lib/validators.ts`](./src/lib/validators.ts)); a failed validation returns `400` with `{ error, details }`.

| Method | Path | Description | Success |
| --- | --- | --- | --- |
| `GET` | `/api/reports` | List all reports (desc by date) with bug/testResult counts | `200` array |
| `POST` | `/api/reports` | Create a report + nested bugs/devices/testResults | `201` report |
| `GET` | `/api/reports/[id]` | Fetch one report with all children | `200` / `404` |
| `PUT` | `/api/reports/[id]` | Replace a report (children are deleted + recreated in a transaction) | `200` |
| `DELETE` | `/api/reports/[id]` | Delete a report (children cascade) | `200 { ok: true }` |
| `POST` | `/api/reports/[id]/duplicate` | Clone an existing report | `201` |
| `GET` | `/api/reports/[id]/pdf` | Server-rendered PDF of the report | PDF stream |

**Write model note:** On update, the API deletes existing `bugs`, `devices`, and `testResults` for the report and recreates them from the payload inside a single `prisma.$transaction`. This keeps the children fully in sync with the submitted form.

**Author handling:** Since auth is removed, every create resolves an author via `getDefaultUser()` ([`src/lib/default-user.ts`](./src/lib/default-user.ts)), which returns the first user or lazily creates a `Default User` (role `ADMIN`) so the `createdById` foreign key is always satisfied.

---

## 7. Domain Vocabulary & Business Rules

Defined in [`src/lib/types.ts`](./src/lib/types.ts) and applied in [`src/lib/report-helpers.ts`](./src/lib/report-helpers.ts).

### Enumerations (stored as strings)

| Type | Values |
| --- | --- |
| `Role` | `ADMIN`, `QA`, `VIEWER` |
| `ReportStatus` | `DRAFT`, `PUBLISHED` |
| `Platform` | `MAC_INTEL`, `MAC_ARM`, `WINDOWS` |
| `TestOutcome` | `PASS`, `FAIL`, `NA`, `UNTESTED` |
| `BugPriority` | `P0`, `P1`, `P2`, `P3`, `P4` |

### Test outcome meaning

| Outcome | Meaning |
| --- | --- |
| `PASS` | Test executed and passed |
| `FAIL` | Test executed and failed |
| `NA` | Not applicable on this platform |
| `UNTESTED` | Skipped today (default) |

### Bug rules

- **Active bug**: a bug whose `status` is **not** one of `closed`, `resolved`, `done` (case-insensitive, trimmed). See `isActiveBug()` / `CLOSED_BUG_STATUSES`.
- **New today**: bugs with `isNewToday = true` (surfaced as a KPI).

### Derived metrics (`report-helpers.ts`)

- `computePlatformSummary()` — tallies pass/fail/na/untested per platform for a report's test results.
- `totalsForReport()` — aggregates those counts across all three platforms.
- `buildDailyTrend(reports, days)` — produces the time-series used by the charts: per-day pass/fail/na/untested plus new/closed/active bug counts (last *N* days).

---

## 8. Key Screens

| Route | What it shows |
| --- | --- |
| `/dashboard` | KPI cards for the **latest** report (pass, fail, new bugs, active bugs), 15-day pass/fail trend, bug trend, platform breakdown chart, and recent reports list. |
| `/reports` | Every report with summary counts; links to preview, edit, duplicate, and PDF. |
| `/reports/new` | The full create form. |
| `/reports/[id]` | Clean, print-ready preview (same template feel as the PDF). |
| `/reports/[id]/edit` | Edit form pre-filled from the report. |
| `/settings` | Lightweight admin overview. |

The create/edit experience is a single rich form (`report/report-form.tsx`) with sections for report info, summary, new bugs, device configurations, detailed per-platform test results, and a live-updating platform summary grid.

---

## 9. Local Development

No Docker, Postgres install, or accounts required. Storage defaults to a SQLite file at `prisma/dev.db`.

```bash
npm install        # installs deps + runs prisma generate (postinstall)
npm run setup      # creates the SQLite DB and seeds 15 days of demo data
npm run dev        # http://localhost:3000
```

`.env` controls the database location (see `.env.example`):

```env
DATABASE_URL="file:./dev.db"
```

Re-seed any time with `npm run db:reset`.

---

## 10. Deployment (Vercel + Postgres)

Serverless functions can't write to a SQLite file, so production uses PostgreSQL (Vercel/Neon recommended). **No schema edits are needed** — [`scripts/prebuild.mjs`](./scripts/prebuild.mjs) handles everything at build time.

### What `prebuild.mjs` does

1. Reads `DATABASE_URL`. If it looks like `postgres://` / `postgresql://`, it rewrites the Prisma `datasource` provider to `postgresql` (otherwise keeps `sqlite`).
2. Runs `prisma generate`.
3. If no `DATABASE_URL` is set, it **skips** `db push` so the first deploy still succeeds (data routes will 500 until a DB is added).
4. With a valid DB URL, runs `prisma db push` to create tables.
5. Runs an **idempotent** auto-seed (`SEED_AUTO=true`) that only inserts when the DB is empty.
6. Next.js build runs (`next build`).

### Steps

1. **Push to GitHub** and import the repo in Vercel → **Deploy**.
2. In the Vercel project: **Storage → Create Database → Neon (Postgres)**. Vercel injects `DATABASE_URL` automatically. Redeploy — the prebuild step provisions and seeds the schema.

`vercel.json` sets the PDF route (`/api/reports/[id]/pdf`) `maxDuration` to 30s and pins the framework to `nextjs`. The Prisma client is generated with extra `binaryTargets` (`rhel-openssl-3.0.x`, `debian-openssl-3.0.x`) for the Vercel runtime.

> The app has **no login**. Anyone with the URL can read and edit. Host behind Vercel password protection, an IP allowlist, or a VPN.

---

## 11. Available Scripts

```bash
npm run dev          # Next.js dev server
npm run setup        # First-time DB create + seed
npm run db:push      # Apply schema changes to the DB
npm run db:seed      # Re-run the seed
npm run db:reset     # Drop everything and reseed
npm run db:studio    # Visual DB browser (Prisma Studio)
npm run build        # Production build (runs prebuild.mjs then next build)
npm run start        # Run the production build
npm run lint         # ESLint
```

---

## 12. Where to Extend

| Want to… | Edit |
| --- | --- |
| Add a column to a model | `prisma/schema.prisma` → `npm run db:push` |
| Change valid enum values | `src/lib/types.ts` + `src/lib/validators.ts` |
| Add a chart | `src/components/charts/trend-charts.tsx` |
| Change the PDF template | `src/lib/pdf-document.tsx` |
| Add a new page | `src/app/(app)/your-page/page.tsx` |
| Tweak business logic | `src/lib/report-helpers.ts` |
| Add/adjust an endpoint | `src/app/api/reports/...` |
| Re-add login | Restore `next-auth`, recreate `src/lib/auth.ts`, wrap `src/app/(app)/layout.tsx` with a session guard |
