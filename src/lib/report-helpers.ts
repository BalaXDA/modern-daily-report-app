import type { Bug, DeviceConfiguration, Report, TestResult } from "@prisma/client";
import { Platform, TestOutcome } from "@prisma/client";

export const PLATFORMS: Platform[] = [Platform.MAC_INTEL, Platform.MAC_ARM, Platform.WINDOWS];

export const PLATFORM_LABELS: Record<Platform, string> = {
  MAC_INTEL: "Mac Intel",
  MAC_ARM: "Mac ARM",
  WINDOWS: "Windows",
};

export const OUTCOME_LABELS: Record<TestOutcome, string> = {
  PASS: "Pass",
  FAIL: "Fail",
  NA: "NA",
  UNTESTED: "Untested",
};

export const OUTCOME_COLORS: Record<TestOutcome, string> = {
  PASS: "bg-emerald-100 text-emerald-700 border-emerald-200",
  FAIL: "bg-rose-100 text-rose-700 border-rose-200",
  NA: "bg-amber-100 text-amber-700 border-amber-200",
  UNTESTED: "bg-slate-100 text-slate-600 border-slate-200",
};

export const CLOSED_BUG_STATUSES = new Set(["closed", "resolved", "done"]);

export type PlatformCounts = {
  pass: number;
  fail: number;
  na: number;
  untested: number;
  total: number;
};

export type PlatformSummary = Record<Platform, PlatformCounts>;

export function emptyPlatformCounts(): PlatformCounts {
  return { pass: 0, fail: 0, na: 0, untested: 0, total: 0 };
}

export function computePlatformSummary(testResults: TestResult[]): PlatformSummary {
  const summary: PlatformSummary = {
    MAC_INTEL: emptyPlatformCounts(),
    MAC_ARM: emptyPlatformCounts(),
    WINDOWS: emptyPlatformCounts(),
  };

  for (const tr of testResults) {
    incrementOutcome(summary.MAC_INTEL, tr.macIntelResult);
    incrementOutcome(summary.MAC_ARM, tr.macArmResult);
    incrementOutcome(summary.WINDOWS, tr.windowsResult);
  }
  return summary;
}

function incrementOutcome(counts: PlatformCounts, outcome: TestOutcome) {
  counts.total += 1;
  switch (outcome) {
    case TestOutcome.PASS:
      counts.pass += 1;
      break;
    case TestOutcome.FAIL:
      counts.fail += 1;
      break;
    case TestOutcome.NA:
      counts.na += 1;
      break;
    case TestOutcome.UNTESTED:
      counts.untested += 1;
      break;
  }
}

export function isActiveBug(bug: Pick<Bug, "status">): boolean {
  return !CLOSED_BUG_STATUSES.has(bug.status.trim().toLowerCase());
}

export function getNewBugsToday(bugs: Bug[]): Bug[] {
  return bugs.filter((b) => b.isNewToday);
}

export function getActiveBugs(bugs: Bug[]): Bug[] {
  return bugs.filter(isActiveBug);
}

export function totalsForReport(testResults: TestResult[]) {
  const summary = computePlatformSummary(testResults);
  let pass = 0,
    fail = 0,
    na = 0,
    untested = 0;
  for (const p of PLATFORMS) {
    pass += summary[p].pass;
    fail += summary[p].fail;
    na += summary[p].na;
    untested += summary[p].untested;
  }
  return { pass, fail, na, untested, total: pass + fail + na + untested };
}

export type ReportWithChildren = Report & {
  bugs: Bug[];
  devices: DeviceConfiguration[];
  testResults: TestResult[];
};

export type DailyTrendPoint = {
  date: string;
  label: string;
  pass: number;
  fail: number;
  na: number;
  untested: number;
  newBugs: number;
  closedBugs: number;
  activeBugs: number;
};

export function buildDailyTrend(reports: ReportWithChildren[], days: number): DailyTrendPoint[] {
  const sorted = [...reports].sort(
    (a, b) => new Date(a.reportDate).getTime() - new Date(b.reportDate).getTime(),
  );
  const slice = sorted.slice(-days);
  return slice.map((r) => {
    const t = totalsForReport(r.testResults);
    const newBugs = getNewBugsToday(r.bugs).length;
    const activeBugs = getActiveBugs(r.bugs).length;
    const closedBugs = r.bugs.length - activeBugs;
    return {
      date: new Date(r.reportDate).toISOString().slice(0, 10),
      label: new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(
        new Date(r.reportDate),
      ),
      pass: t.pass,
      fail: t.fail,
      na: t.na,
      untested: t.untested,
      newBugs,
      closedBugs,
      activeBugs,
    };
  });
}
