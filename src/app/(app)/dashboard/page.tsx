import Link from "next/link";
import { ArrowRight, Bug, CheckCircle2, FileText, Plus, XCircle } from "lucide-react";

import { prisma } from "@/lib/prisma";
import {
  buildDailyTrend,
  computePlatformSummary,
  getActiveBugs,
  getNewBugsToday,
  PLATFORMS,
  PLATFORM_LABELS,
  totalsForReport,
} from "@/lib/report-helpers";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/page-header";
import {
  PassFailTrendChart,
  BugTrendChart,
  PlatformBreakdownChart,
} from "@/components/charts/trend-charts";
import { formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const reports = await prisma.report.findMany({
    orderBy: { reportDate: "asc" },
    include: { bugs: true, devices: true, testResults: true },
  });

  const trend = buildDailyTrend(reports, 15);
  const sortedDesc = [...reports].sort(
    (a, b) => new Date(b.reportDate).getTime() - new Date(a.reportDate).getTime(),
  );
  const latest = sortedDesc[0];
  const recent = sortedDesc.slice(0, 5);

  const latestTotals = latest ? totalsForReport(latest.testResults) : { pass: 0, fail: 0, na: 0, untested: 0, total: 0 };
  const latestSummary = latest ? computePlatformSummary(latest.testResults) : null;
  const newBugCount = latest ? getNewBugsToday(latest.bugs).length : 0;
  const activeBugCount = latest ? getActiveBugs(latest.bugs).length : 0;

  const platformBars = latestSummary
    ? PLATFORMS.map((p) => ({
        platform: PLATFORM_LABELS[p],
        pass: latestSummary[p].pass,
        fail: latestSummary[p].fail,
        na: latestSummary[p].na,
        untested: latestSummary[p].untested,
      }))
    : [];

  return (
    <div className="mx-auto max-w-7xl p-6 lg:p-8">
      <PageHeader
        title="Dashboard"
        description={
          latest
            ? `Latest report: ${latest.title} - ${formatDate(latest.reportDate)}`
            : "No reports yet - create your first daily report."
        }
        actions={
          <>
            <Button asChild variant="outline">
              <Link href="/reports">
                <FileText className="mr-2 h-4 w-4" />
                All reports
              </Link>
            </Button>
            <Button asChild>
              <Link href="/reports/new">
                <Plus className="mr-2 h-4 w-4" />
                New report
              </Link>
            </Button>
          </>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={<CheckCircle2 className="h-5 w-5 text-emerald-600" />}
          label="Pass (latest)"
          value={latestTotals.pass}
          subtext={`${latestTotals.total} total runs`}
          accent="emerald"
        />
        <StatCard
          icon={<XCircle className="h-5 w-5 text-rose-600" />}
          label="Fail (latest)"
          value={latestTotals.fail}
          subtext={`${latestTotals.untested} untested`}
          accent="rose"
        />
        <StatCard
          icon={<Bug className="h-5 w-5 text-amber-600" />}
          label="New bugs today"
          value={newBugCount}
          subtext={`${activeBugCount} active`}
          accent="amber"
        />
        <StatCard
          icon={<Bug className="h-5 w-5 text-blue-600" />}
          label="Active bugs"
          value={activeBugCount}
          subtext={`${latest?.bugs.length ?? 0} total in report`}
          accent="blue"
        />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <PassFailTrendChart data={trend} />
        <BugTrendChart data={trend} />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          {latestSummary && <PlatformBreakdownChart data={platformBars} />}
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Recent reports</CardTitle>
            <CardDescription>Quick access to the latest reports.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {recent.length === 0 && (
              <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
                No reports yet.
              </div>
            )}
            {recent.map((r) => {
              const t = totalsForReport(r.testResults);
              return (
                <Link
                  key={r.id}
                  href={`/reports/${r.id}`}
                  className="group flex items-center justify-between rounded-lg border bg-white p-3 transition hover:border-primary/30 hover:bg-primary/5"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <Badge variant={r.status === "PUBLISHED" ? "success" : "warning"} className="text-[10px]">
                        {r.status}
                      </Badge>
                      <span className="truncate text-sm font-medium">{r.title}</span>
                    </div>
                    <div className="mt-0.5 text-xs text-muted-foreground">
                      {formatDate(r.reportDate)} &middot; {t.pass} pass &middot; {t.fail} fail
                    </div>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground transition group-hover:translate-x-0.5 group-hover:text-primary" />
                </Link>
              );
            })}
            {latest && (
              <Button asChild variant="outline" size="sm" className="mt-2 w-full">
                <Link href={`/reports/${latest.id}/edit`}>Edit latest report</Link>
              </Button>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  subtext,
  accent,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  subtext?: string;
  accent: "emerald" | "rose" | "amber" | "blue";
}) {
  const accentBg: Record<typeof accent, string> = {
    emerald: "bg-emerald-50",
    rose: "bg-rose-50",
    amber: "bg-amber-50",
    blue: "bg-blue-50",
  };
  return (
    <Card>
      <CardContent className="flex items-center gap-4 p-5">
        <div className={`rounded-xl p-3 ${accentBg[accent]}`}>{icon}</div>
        <div>
          <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
          <div className="text-2xl font-semibold">{value}</div>
          {subtext && <div className="text-xs text-muted-foreground">{subtext}</div>}
        </div>
      </CardContent>
    </Card>
  );
}
