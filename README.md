# QA Daily Report Portal

An internal Next.js 14 web portal for QA teams to capture daily test data and instantly generate a clean daily report — with charts, summaries, tables, trend graphs, and PDF export.

The seed dataset emulates **Adobe Creative Cloud Desktop build 28.9.8** across **Mac Intel / Mac ARM / Windows** so the dashboard, charts, and preview look meaningful out of the box.

---

## Run locally — 3 commands, zero external services

No Docker. No Postgres install. No accounts. The default storage is a SQLite file written under `prisma/dev.db`.

```bash
npm install        # installs deps + runs prisma generate
npm run setup      # creates the SQLite DB and seeds 15 days of demo data
npm run dev        # http://localhost:3000
```

Login (seeded):

| Email | Password |
| --- | --- |
| `admin@qa-portal.local` | `admin123` |
| `priya@qa-portal.local` | `priya123` |

> The first run writes `prisma/dev.db` (gitignored). Re-seed any time with `npm run db:reset`.

---

## Deploy to Vercel — 3 steps

Serverless functions can't write SQLite files, so for production we recommend Vercel/Neon Postgres. The schema is intentionally portable — it uses no SQLite-only or Postgres-only features, and **no application code changes are required**.

### Step 1 — Switch the Prisma provider

Open `prisma/schema.prisma` and change one line:

```prisma
datasource db {
  provider = "postgresql"   // was: "sqlite"
  url      = env("DATABASE_URL")
}
```

### Step 2 — Push to GitHub and import in Vercel

```bash
git add . && git commit -m "Configure for Vercel deploy" && git push
```

In the Vercel dashboard: **New Project → Import this GitHub repo**. Don't deploy yet — first add the env vars.

### Step 3 — Add a Postgres database + env vars

In your Vercel project:

1. **Storage tab → Create Database → Neon Postgres** (one click, free tier). Vercel will inject `DATABASE_URL` automatically.
2. **Settings → Environment Variables** — add:
   - `NEXTAUTH_SECRET` → run `openssl rand -base64 32` to generate one
   - `NEXTAUTH_URL` → your production URL, e.g. `https://your-app.vercel.app`
3. **Deployments → Redeploy** (or push a new commit).

The `build` script runs `prisma db push` against the new database on first deploy, creating all tables. Then visit `/api/seed` (or run `npm run db:seed` against the prod URL once) to populate demo data — or just start using it.

---

## What you get

- **Login** — credentials auth via NextAuth, JWT sessions, bcrypt hashes.
- **Dashboard** — KPIs for the latest report, 7d/15d pass-fail trend, bug trend, platform breakdown, recent reports.
- **Reports list** — every report with summary counts; preview, edit, duplicate, PDF export.
- **Create / edit** — single rich form with sections for info, summary, new bugs, devices, detailed test results, and a live-updating platform summary.
- **Preview** — clean, print-ready view; the same template used for PDF.
- **PDF export** — server-side render via `@react-pdf/renderer`.

## Project layout

```
prisma/
  schema.prisma           # SQLite by default; one-line switch to postgresql
  seed.ts                 # 15 days of realistic CCD data
src/
  app/
    (app)/                # Authenticated layout
      dashboard/          # KPI dashboard
      reports/            # List, new, edit, preview
      settings/           # Lightweight admin overview
    api/
      auth/[...nextauth]/ # NextAuth route
      reports/...         # CRUD + duplicate + PDF endpoints
    login/                # Login screen
  components/             # UI primitives, charts, report views
  lib/
    auth.ts               # NextAuth options + session helper
    prisma.ts             # Singleton Prisma client
    types.ts              # String-literal unions (Platform, TestOutcome, ...)
    validators.ts         # Zod schemas for all inputs
    report-helpers.ts     # Platform summary, trend builder, totals
    pdf-document.tsx      # @react-pdf/renderer template
```

## Where to extend

| Want to... | Edit |
| --- | --- |
| Add a column to a model | `prisma/schema.prisma` → `npm run db:push` |
| Change valid values for an enum | `src/lib/types.ts` + `src/lib/validators.ts` |
| Add a chart | `src/components/charts/trend-charts.tsx` |
| Change the PDF template | `src/lib/pdf-document.tsx` |
| Add a new page | `src/app/(app)/your-page/page.tsx` |
| Tweak business logic | `src/lib/report-helpers.ts` |

## Available scripts

```bash
npm run dev          # Next.js dev server
npm run setup        # First-time DB create + seed
npm run db:push      # Apply schema changes to the DB
npm run db:seed      # Re-run the seed
npm run db:reset     # Drop everything and reseed
npm run db:studio    # Visual DB browser
npm run build        # Production build (used by Vercel)
npm run start        # Run the production build
npm run lint         # ESLint
```

## Test result vocabulary

| Outcome | Meaning |
| --- | --- |
| `PASS` | Test executed and passed |
| `FAIL` | Test executed and failed |
| `NA` | Not applicable on this platform |
| `UNTESTED` | Skipped today (default) |

Bug `status` is a free-text field; `Closed`, `Resolved`, and `Done` are treated as closed when computing **active bugs**.

## Notes

- SQLite is great for local + small teams; for multi-user prod, Postgres is the right call.
- All routes under `/dashboard`, `/reports`, `/settings` require an authenticated session; the API routes also enforce auth.
- The seed wipes existing data before inserting. Don't run it against a production DB.
