# QA Daily Report Portal

An internal Next.js 14 web portal for QA teams to capture daily test data and instantly generate a clean daily report — with charts, summaries, tables, trend graphs, and PDF export.

The seed dataset emulates **Adobe Creative Cloud Desktop build 28.9.8** across **Mac Intel / Mac ARM / Windows** so the dashboard, charts, and preview look meaningful out of the box.

> Auth is intentionally **disabled** in this build — opening the URL drops you straight into the dashboard. Run it on an internal network or behind your own access layer (Vercel password protection, IP allowlist, etc.).

---

## Run locally — 3 commands, zero external services

No Docker. No Postgres install. No accounts. The default storage is a SQLite file written under `prisma/dev.db`.

```bash
npm install        # installs deps + runs prisma generate
npm run setup      # creates the SQLite DB and seeds 15 days of demo data
npm run dev        # http://localhost:3000
```

> The first run writes `prisma/dev.db` (gitignored). Re-seed any time with `npm run db:reset`.

---

## Deploy to Vercel — 2 steps

Serverless functions can't write SQLite files, so for production we recommend Vercel/Neon Postgres. **You don't need to edit the schema** — the `scripts/prebuild.mjs` step automatically switches the Prisma provider to `postgresql` whenever `DATABASE_URL` looks like a Postgres URL.

### Step 1 — Push to GitHub and import in Vercel

```bash
git push
```

In the Vercel dashboard: **Add New… → Project → Import this GitHub repo**, then click **Deploy** (a first deploy without a database will still succeed; the app will just 500 on data routes until you add the DB).

### Step 2 — Add a Postgres database

In your Vercel project: **Storage → Create Database → Neon (Postgres)** (free tier, one click). Vercel automatically injects `DATABASE_URL` into all environments. Trigger a redeploy and the prebuild step will:

1. Detect the Postgres `DATABASE_URL` and flip the schema provider to `postgresql`.
2. Run `prisma generate`.
3. Run `prisma db push` to create all tables.
4. Auto-seed 15 days of demo data (only on the first deploy, when the DB is empty).
5. Build Next.js.

---

## What you get

- **Dashboard** — KPIs for the latest report, 7d/15d pass-fail trend, bug trend, platform breakdown, recent reports.
- **Reports list** — every report with summary counts; preview, edit, duplicate, PDF export.
- **Create / edit** — single rich form with sections for info, summary, new bugs, devices, detailed test results, and a live-updating platform summary.
- **Preview** — clean, print-ready view; the same template used for PDF.
- **PDF export** — server-side render via `@react-pdf/renderer`.

## Project layout

```
prisma/
  schema.prisma           # SQLite by default; auto-switches to postgresql on Vercel
  seed.ts                 # 15 days of realistic CCD data
src/
  app/
    (app)/                # Main app layout
      dashboard/          # KPI dashboard
      reports/            # List, new, edit, preview
      settings/           # Lightweight admin overview
    api/
      reports/...         # CRUD + duplicate + PDF endpoints
  components/             # UI primitives, charts, report views
  lib/
    default-user.ts       # Lazy-creates a default user for FK requirements
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
| Re-add login | restore `next-auth`, recreate `src/lib/auth.ts`, wrap `src/app/(app)/layout.tsx` with a session guard |

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
- The app has **no authentication**. Anyone with the URL can read and edit reports — host accordingly.
- The seed wipes existing data before inserting. Don't run it against a production DB.
