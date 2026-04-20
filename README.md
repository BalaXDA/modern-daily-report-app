# QA Daily Report Portal

An internal Next.js 14 web portal for QA teams to manually capture daily test data and instantly generate a clean daily report — with charts, summaries, tables, trend graphs and PDF export.

Built around a real-world flow used by QA teams shipping cross-platform desktop products (Mac Intel, Mac ARM, Windows). The seed dataset emulates **Adobe Creative Cloud Desktop build 28.9.8** so the dashboard, charts and preview look meaningful out of the box.

## Tech stack

- **Next.js 14** (App Router) + **TypeScript**
- **Tailwind CSS** + **shadcn/ui**-style component primitives
- **Prisma ORM** + **PostgreSQL**
- **NextAuth** credentials provider (JWT sessions, bcrypt hashes)
- **Recharts** for trend & breakdown charts
- **react-hook-form** + **zod** for fully validated forms
- **@react-pdf/renderer** for server-side PDF export
- REST API routes for create/edit/duplicate/PDF

## Quick start

### 1. Prerequisites

- Node.js 18+ (Node 20 recommended)
- A running PostgreSQL 13+ instance (local install, Docker, Postgres.app, Neon, Supabase, etc.)

### 2. Install

```bash
npm install
```

### 3. Configure environment

Copy the example env file and edit:

```bash
cp .env.example .env
```

Set `DATABASE_URL` to your Postgres connection string and pick a strong `NEXTAUTH_SECRET`:

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/qa_report_portal?schema=public"
NEXTAUTH_SECRET="a-long-random-string"
NEXTAUTH_URL="http://localhost:3000"
SEED_ADMIN_EMAIL="admin@qa-portal.local"
SEED_ADMIN_PASSWORD="admin123"
SEED_ADMIN_NAME="QA Admin"
```

> Need a quick local Postgres? Run `docker run --name qa-pg -e POSTGRES_PASSWORD=postgres -p 5432:5432 -d postgres:16`.

### 4. Migrate & seed the database

```bash
npx prisma migrate dev --name init
npm run db:seed
```

This creates 15 historical reports for *Adobe Creative Cloud Desktop 28.9.8* — one per day for the last two weeks (the most recent one is a draft) — populated with bugs, device configs, and 25 test cases each, so all charts and previews work immediately.

### 5. Run the app

```bash
npm run dev
```

Open <http://localhost:3000> and sign in with the seeded credentials:

- **Email:** `admin@qa-portal.local`
- **Password:** `admin123`

## Project layout

```
modern_daily_report_app/
├── prisma/
│   ├── schema.prisma          ← User / Report / Bug / DeviceConfiguration / TestResult
│   └── seed.ts                ← 15-day Adobe CC desktop seed dataset
├── src/
│   ├── app/
│   │   ├── login/             ← Sign-in page
│   │   ├── (app)/             ← Auth-protected layout (dashboard sidebar)
│   │   │   ├── dashboard/     ← Stats, trend charts, recent reports
│   │   │   ├── reports/       ← List + new + [id] preview + [id]/edit
│   │   │   └── settings/      ← Workspace overview
│   │   └── api/
│   │       ├── auth/[...nextauth]
│   │       └── reports/       ← REST: create / update / duplicate / PDF
│   ├── components/
│   │   ├── ui/                ← shadcn-style primitives
│   │   ├── charts/            ← Recharts trend + breakdown charts
│   │   ├── report/            ← Form + preview + platform summary grid
│   │   ├── app-shell.tsx      ← Sidebar + sign-out
│   │   └── providers.tsx
│   └── lib/
│       ├── prisma.ts          ← Cached Prisma client
│       ├── auth.ts            ← NextAuth options + getSession()
│       ├── validators.ts      ← Zod schemas for form + API
│       ├── report-helpers.ts  ← Platform summary, trend builder, bug filters
│       ├── pdf-document.tsx   ← @react-pdf/renderer document
│       └── utils.ts
├── tailwind.config.ts
├── next.config.mjs
└── package.json
```

## How each major part works

### Authentication (`src/lib/auth.ts`, `src/app/api/auth/[...nextauth]`)

- Uses NextAuth credentials provider with a JWT session strategy.
- Passwords are stored as bcrypt hashes in `User.passwordHash`.
- `getSession()` is a typed helper that returns the session including `id` and `role`.
- The `(app)` route group is protected: `src/app/(app)/layout.tsx` redirects unauthenticated visitors to `/login`.

To add a user: edit `prisma/seed.ts` and re-run `npm run db:seed`. (You can later add a /api/users CRUD route if needed.)

### Database schema (`prisma/schema.prisma`)

Five core models, all linked to `Report`:

- `User` — `id, name, email, passwordHash, role(ADMIN|QA|VIEWER), createdAt, updatedAt`.
- `Report` — header info + `status(DRAFT|PUBLISHED)` + `createdById`.
- `Bug` — `jiraId, title, status, priority(P0..P4), epvFlag, platform, isNewToday, owner`.
- `DeviceConfiguration` — `platform, osVersion, processor, ram, notes`.
- `TestResult` — `testcaseId, testcaseTitle, testsuiteLabel, macIntelResult, macArmResult, windowsResult` (each is `PASS|FAIL|NA|UNTESTED`).

`onDelete: Cascade` is set on the children so deleting a report cleans up its rows.

### Auto-computed metrics (`src/lib/report-helpers.ts`)

- **Platform summary** — `computePlatformSummary(testResults)` walks all rows and counts PASS / FAIL / NA / UNTESTED per platform. Used both server-side (preview, dashboard) and client-side (live form summary).
- **Active bugs** — any bug whose `status` (case-insensitive, trimmed) is **not** `closed`, `resolved`, `done`.
- **New bugs** — `bug.isNewToday === true`.
- **Trend graph data** — `buildDailyTrend(reports, days)` aggregates per `reportDate`: pass/fail/na/untested totals + new/closed/active bug counts. Drives the 7d / 15d toggle on dashboard and form charts.

### Report form (`src/components/report/report-form.tsx`)

- Single-screen multi-section form (cards): Report info → Quick summary → New bugs → Devices → Test results → Live platform summary → Trend charts → Sticky action bar.
- Powered by `react-hook-form` + `zod` (`reportSchema` from `src/lib/validators.ts`).
- All add/remove rows for bugs, devices and test results use `useFieldArray`.
- The platform summary grid recalculates live as you change outcomes (no save required).
- Sticky bottom bar offers **Save draft**, **Publish**, **Preview** and **Export PDF** (last two only when editing an existing report).

To customise the form (e.g. add a "Risk" field):
1. Add the column to `prisma/schema.prisma`, run `npx prisma migrate dev`.
2. Add the field to `bugSchema`/`reportSchema` in `src/lib/validators.ts`.
3. Render the input inside the relevant section of `report-form.tsx`.
4. Map it in the create/update API routes (`src/app/api/reports/...`).

### Report preview (`src/components/report/report-preview.tsx`)

- Pure server-rendered, print-friendly read-only view.
- Reuses the same helper utilities so the preview always matches what the form shows.
- The preview page (`src/app/(app)/reports/[id]/page.tsx`) wraps it with print + edit + PDF export buttons. The `@media print` rule in `globals.css` hides chrome (`.no-print` class) so browser-print produces a clean output too.

### PDF export (`src/lib/pdf-document.tsx` + `src/app/api/reports/[id]/pdf/route.ts`)

- Uses `@react-pdf/renderer` to render a fully-styled A4 PDF with header, summary, platform cards, bug tables, device list and full test grid (with coloured outcome pills).
- The route is `nodejs` runtime (required by react-pdf), pulls the report with all relations, streams to a buffer, then returns it as `inline` so the browser can preview before downloading.
- Page footer shows `Product - Date | Page X of Y`.

To customise the PDF: edit `ReportPdfDocument` in `src/lib/pdf-document.tsx` (it's normal React with `<Page>`, `<View>`, `<Text>` from react-pdf and a `StyleSheet`).

### Dashboard (`src/app/(app)/dashboard/page.tsx`)

- 4 KPI tiles — pass / fail / new bugs / active bugs for the latest report.
- Pass-vs-fail area chart and bug trend line chart (both 7d/15d toggles).
- Stacked platform breakdown bar chart for the latest report.
- Recent reports list with quick-edit shortcut.

### Reports list (`src/app/(app)/reports/page.tsx`)

- Sortable table of every report with status badge, pass/fail counts, bug counts.
- Per-row actions: preview, edit, duplicate (creates a new draft for today, carries over open bugs and clones the test grid as `UNTESTED`), export PDF.

### Duplicate flow (`src/app/api/reports/[id]/duplicate/route.ts`)

- Creates a new `DRAFT` report dated today.
- Carries over only **non-closed** bugs (`status` not in closed/resolved/done) and resets `isNewToday=false`.
- Clones the test grid but resets every outcome to `UNTESTED` so QA can rerun the day.
- Clones device configurations as-is.

## Available scripts

| Script | Purpose |
| --- | --- |
| `npm run dev` | Start the Next.js dev server. |
| `npm run build` | `prisma generate` + production build. |
| `npm start` | Serve the production build. |
| `npm run db:migrate` | `prisma migrate dev` (alias). |
| `npm run db:push` | Push schema without migrations (handy for prototyping). |
| `npm run db:seed` | Run the seed script (`prisma/seed.ts`). |
| `npm run db:reset` | Drop + recreate DB and re-run all migrations + seed. |

## Test result vocabulary

The schema enforces these four outcomes per platform/test:

- **Pass** — test executed successfully.
- **Fail** — test executed but failed.
- **NA** — not applicable for this platform/build.
- **Untested** — not run today (default for new rows).

## Where to look when extending

| You want to... | Touch this file |
| --- | --- |
| Add a new report column | `prisma/schema.prisma` → migrate → `validators.ts` → `report-form.tsx` → API routes |
| Add a chart | `src/components/charts/trend-charts.tsx` (then drop into a page) |
| Change PDF layout | `src/lib/pdf-document.tsx` |
| Add a new role / permission | `Role` enum + checks in `src/lib/auth.ts` and API routes |
| Add a new platform | `Platform` enum + helpers in `src/lib/report-helpers.ts` (the `PLATFORMS`, `PLATFORM_LABELS` constants) and add the new outcome column to `TestResult` |
| Replace seed data | `prisma/seed.ts` — re-run `npm run db:seed` |

## Production notes

- For prod, swap `SEED_ADMIN_PASSWORD` for a real password and rotate `NEXTAUTH_SECRET`.
- `getSession()` covers all protected routes; if you expose any new API routes, copy the `if (!session) return 401` pattern.
- `prisma generate` runs on `postinstall`, so deploys (Vercel, Render, Railway, fly.io) will work out of the box as long as `DATABASE_URL` is configured.
- The PDF route requires the **Node.js** runtime; do not switch it to Edge.

Happy reporting!
