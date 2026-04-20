import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

type Platform = "MAC_INTEL" | "MAC_ARM" | "WINDOWS";
type TestOutcome = "PASS" | "FAIL" | "NA" | "UNTESTED";
type BugPriority = "P0" | "P1" | "P2" | "P3" | "P4";
type ReportStatus = "DRAFT" | "PUBLISHED";

const prisma = new PrismaClient();

type SeedTestCase = {
  testcaseId: string;
  testcaseTitle: string;
  testsuiteLabel: string;
};

const SEED_TESTCASES: SeedTestCase[] = [
  { testcaseId: "TC-1001", testcaseTitle: "Sign in with Adobe ID (existing user)", testsuiteLabel: "Authentication" },
  { testcaseId: "TC-1002", testcaseTitle: "Sign out clears local cache", testsuiteLabel: "Authentication" },
  { testcaseId: "TC-1003", testcaseTitle: "SSO via Enterprise ID", testsuiteLabel: "Authentication" },
  { testcaseId: "TC-1101", testcaseTitle: "Install Photoshop from Apps tab", testsuiteLabel: "Apps - Install" },
  { testcaseId: "TC-1102", testcaseTitle: "Install Premiere Pro (large download)", testsuiteLabel: "Apps - Install" },
  { testcaseId: "TC-1103", testcaseTitle: "Update Lightroom Classic to latest", testsuiteLabel: "Apps - Update" },
  { testcaseId: "TC-1104", testcaseTitle: "Uninstall Acrobat keeping preferences", testsuiteLabel: "Apps - Uninstall" },
  { testcaseId: "TC-1105", testcaseTitle: "Install Beta app from Beta tab", testsuiteLabel: "Apps - Beta" },
  { testcaseId: "TC-1201", testcaseTitle: "Sync Creative Cloud Files (small batch)", testsuiteLabel: "Files Sync" },
  { testcaseId: "TC-1202", testcaseTitle: "Sync 5GB asset folder under low bandwidth", testsuiteLabel: "Files Sync" },
  { testcaseId: "TC-1203", testcaseTitle: "Resolve sync conflict with two clients", testsuiteLabel: "Files Sync" },
  { testcaseId: "TC-1301", testcaseTitle: "Install Adobe Fonts pack", testsuiteLabel: "Fonts" },
  { testcaseId: "TC-1302", testcaseTitle: "Activate font during Photoshop session", testsuiteLabel: "Fonts" },
  { testcaseId: "TC-1401", testcaseTitle: "Browse Stock assets and license image", testsuiteLabel: "Stock & Marketplace" },
  { testcaseId: "TC-1402", testcaseTitle: "Install plugin from Marketplace (Photoshop)", testsuiteLabel: "Stock & Marketplace" },
  { testcaseId: "TC-1501", testcaseTitle: "Notifications panel shows install completion", testsuiteLabel: "Notifications" },
  { testcaseId: "TC-1502", testcaseTitle: "Background self-update applies on next launch", testsuiteLabel: "Self Update" },
  { testcaseId: "TC-1503", testcaseTitle: "Crash reporter sends ETS payload", testsuiteLabel: "Telemetry" },
  { testcaseId: "TC-1601", testcaseTitle: "Preferences > Apps > Install Location change", testsuiteLabel: "Preferences" },
  { testcaseId: "TC-1602", testcaseTitle: "Preferences > Notifications > Disable badges", testsuiteLabel: "Preferences" },
  { testcaseId: "TC-1701", testcaseTitle: "Discover - Featured tutorials load", testsuiteLabel: "Discover" },
  { testcaseId: "TC-1702", testcaseTitle: "Search inside Discover tab", testsuiteLabel: "Discover" },
  { testcaseId: "TC-1801", testcaseTitle: "Offline mode shows cached app list", testsuiteLabel: "Offline" },
  { testcaseId: "TC-1802", testcaseTitle: "Resume interrupted download after network reconnect", testsuiteLabel: "Networking" },
  { testcaseId: "TC-1803", testcaseTitle: "Proxy configuration honored for downloads", testsuiteLabel: "Networking" },
];

type SeedDailyPlan = {
  daysAgo: number;
  status: ReportStatus;
  summary: string;
  newBugs: number;
  closedFromYesterday: number;
  outcomeBias: { pass: number; fail: number; na: number; untested: number };
};

const PLAN: SeedDailyPlan[] = [
  { daysAgo: 14, status: "PUBLISHED", summary: "Fresh build smoke run on macOS Sonoma. Major install/update flows green; minor sync hiccup on Windows.", newBugs: 4, closedFromYesterday: 0, outcomeBias: { pass: 70, fail: 10, na: 10, untested: 10 } },
  { daysAgo: 13, status: "PUBLISHED", summary: "Regression on Mac ARM completed. Fonts activation intermittent under low memory.", newBugs: 3, closedFromYesterday: 1, outcomeBias: { pass: 72, fail: 8, na: 12, untested: 8 } },
  { daysAgo: 12, status: "PUBLISHED", summary: "Network resiliency suite executed; proxy edge cases logged for Windows.", newBugs: 2, closedFromYesterday: 2, outcomeBias: { pass: 75, fail: 7, na: 10, untested: 8 } },
  { daysAgo: 11, status: "PUBLISHED", summary: "Beta apps tab validated. Install Beta blocked on Mac Intel due to entitlement check.", newBugs: 5, closedFromYesterday: 1, outcomeBias: { pass: 65, fail: 15, na: 10, untested: 10 } },
  { daysAgo: 10, status: "PUBLISHED", summary: "Hotfix verification - install path bug fixed; revalidated install/uninstall scenarios.", newBugs: 2, closedFromYesterday: 4, outcomeBias: { pass: 78, fail: 7, na: 10, untested: 5 } },
  { daysAgo: 9, status: "PUBLISHED", summary: "Stock licensing flow validated end-to-end; one P2 around localized currency.", newBugs: 3, closedFromYesterday: 2, outcomeBias: { pass: 76, fail: 9, na: 9, untested: 6 } },
  { daysAgo: 8, status: "PUBLISHED", summary: "Discover tab content load slow on Windows under high CPU. Investigation continues.", newBugs: 2, closedFromYesterday: 3, outcomeBias: { pass: 74, fail: 11, na: 8, untested: 7 } },
  { daysAgo: 7, status: "PUBLISHED", summary: "Self-update path covered. Notifications panel works as expected on all platforms.", newBugs: 1, closedFromYesterday: 2, outcomeBias: { pass: 80, fail: 6, na: 8, untested: 6 } },
  { daysAgo: 6, status: "PUBLISHED", summary: "Preferences re-test after settings rewrite; install location migration smooth.", newBugs: 2, closedFromYesterday: 1, outcomeBias: { pass: 77, fail: 8, na: 9, untested: 6 } },
  { daysAgo: 5, status: "PUBLISHED", summary: "Files sync heavy run (5GB) on Mac ARM passes; Windows still showing throttling under VPN.", newBugs: 3, closedFromYesterday: 2, outcomeBias: { pass: 73, fail: 10, na: 10, untested: 7 } },
  { daysAgo: 4, status: "PUBLISHED", summary: "Telemetry pipeline verified. Crash reporter ETS payloads correctly tagged with build version.", newBugs: 1, closedFromYesterday: 3, outcomeBias: { pass: 79, fail: 7, na: 9, untested: 5 } },
  { daysAgo: 3, status: "PUBLISHED", summary: "Marketplace plugin install sweep passed. One P3 for thumbnail rendering on Windows HiDPI.", newBugs: 2, closedFromYesterday: 2, outcomeBias: { pass: 78, fail: 8, na: 8, untested: 6 } },
  { daysAgo: 2, status: "PUBLISHED", summary: "Authentication suite re-run after SSO endpoint change; zero blockers.", newBugs: 1, closedFromYesterday: 4, outcomeBias: { pass: 82, fail: 5, na: 8, untested: 5 } },
  { daysAgo: 1, status: "PUBLISHED", summary: "Pre-RC pass: end-to-end smoke clean on all 3 platforms. One Mac ARM stock licensing intermittent.", newBugs: 1, closedFromYesterday: 3, outcomeBias: { pass: 84, fail: 5, na: 7, untested: 4 } },
  { daysAgo: 0, status: "DRAFT",     summary: "RC candidate. Today's focus: Files sync stress, Beta installer entitlement re-test, and Discover regression.", newBugs: 3, closedFromYesterday: 2, outcomeBias: { pass: 80, fail: 8, na: 8, untested: 4 } },
];

const BUG_TITLES = [
  "Beta apps installer fails with entitlement check (E_NOT_ENTITLED)",
  "Files sync throttles to <1MB/s when VPN reconnects",
  "Discover tab tutorials show blank cards on Windows HiDPI",
  "Stock license modal currency mismatch for INR locale",
  "Self-update banner not dismissed after upgrade",
  "Photoshop fonts not auto-activated after CC restart",
  "Acrobat uninstall leaves background helper process",
  "Notifications badge count incorrect after offline period",
  "Install location change does not migrate older app configs",
  "Plugin install spinner stuck on slow networks",
  "Crash reporter timeout on large minidumps",
  "Search in Discover returns 0 results for valid keywords",
  "Lightroom Classic update progress jumps from 30% to 100%",
  "Sign-in via Enterprise ID redirects to blank screen",
  "Premiere Pro download retries do not resume from last byte",
];

const STATUSES = ["Open", "In Progress", "Reopened", "Verify", "Closed", "Resolved", "Done"];
const PRIORITIES: BugPriority[] = ["P0", "P1", "P2", "P3", "P4"];
const PLATFORMS_ARR: Platform[] = ["MAC_INTEL", "MAC_ARM", "WINDOWS"];
const OWNERS = ["Priya R.", "Marco D.", "Aiden K.", "Sara V.", "Hiroshi T.", "Lina P."];

function rand<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function pickOutcome(bias: SeedDailyPlan["outcomeBias"]): TestOutcome {
  const total = bias.pass + bias.fail + bias.na + bias.untested;
  let n = Math.random() * total;
  if ((n -= bias.pass) < 0) return "PASS";
  if ((n -= bias.fail) < 0) return "FAIL";
  if ((n -= bias.na) < 0) return "NA";
  return "UNTESTED";
}

function dateNDaysAgo(days: number): Date {
  const d = new Date();
  d.setHours(9, 30, 0, 0);
  d.setDate(d.getDate() - days);
  return d;
}

async function main() {
  // SEED_AUTO=true means "only seed if empty, never wipe data".
  // Used by the Vercel prebuild step on first deploy.
  const autoMode = process.env.SEED_AUTO === "true";

  if (autoMode) {
    const existing = await prisma.user.count();
    if (existing > 0) {
      console.log(`SEED_AUTO=true and ${existing} users already exist - skipping.`);
      return;
    }
    console.log("SEED_AUTO=true and database is empty - seeding...");
  } else {
    console.log("Resetting existing data...");
    await prisma.testResult.deleteMany();
    await prisma.bug.deleteMany();
    await prisma.deviceConfiguration.deleteMany();
    await prisma.report.deleteMany();
    await prisma.user.deleteMany();
  }

  const adminEmail = (process.env.SEED_ADMIN_EMAIL ?? "admin@qa-portal.local").toLowerCase();
  const adminPassword = process.env.SEED_ADMIN_PASSWORD ?? "admin123";
  const adminName = process.env.SEED_ADMIN_NAME ?? "QA Admin";
  const passwordHash = await bcrypt.hash(adminPassword, 10);

  const admin = await prisma.user.create({
    data: {
      name: adminName,
      email: adminEmail,
      passwordHash,
      role: "ADMIN",
    },
  });

  const qaUser = await prisma.user.create({
    data: {
      name: "Priya QA",
      email: "priya@qa-portal.local",
      passwordHash: await bcrypt.hash("priya123", 10),
      role: "QA",
    },
  });

  console.log(`Created admin: ${admin.email} / ${adminPassword}`);
  console.log(`Created QA user: ${qaUser.email} / priya123`);

  const product = "Adobe Creative Cloud Desktop";
  const buildVersion = "28.9.8";

  let bugCounter = 7400;
  type RunningBug = {
    jiraId: string;
    title: string;
    status: string;
    priority: BugPriority;
    epvFlag: boolean;
    platform: Platform | null;
    owner: string | null;
    bornDay: number;
  };
  const runningBugs: RunningBug[] = [];

  const sortedPlan = [...PLAN].sort((a, b) => b.daysAgo - a.daysAgo);

  for (const day of sortedPlan) {
    for (let i = 0; i < day.closedFromYesterday && runningBugs.length > 0; i++) {
      const idx = Math.floor(Math.random() * runningBugs.length);
      runningBugs[idx].status = rand(["Closed", "Resolved", "Done"]);
    }

    const newRunningBugs: RunningBug[] = [];
    for (let i = 0; i < day.newBugs; i++) {
      const platform = Math.random() < 0.85 ? rand(PLATFORMS_ARR) : null;
      newRunningBugs.push({
        jiraId: `CCD-${bugCounter++}`,
        title: rand(BUG_TITLES),
        status: rand(["Open", "In Progress", "Reopened"]),
        priority: rand(PRIORITIES),
        epvFlag: Math.random() < 0.35,
        platform,
        owner: Math.random() < 0.7 ? rand(OWNERS) : null,
        bornDay: day.daysAgo,
      });
    }

    const reportDate = dateNDaysAgo(day.daysAgo);
    const dateStr = reportDate.toISOString().slice(0, 10);

    const report = await prisma.report.create({
      data: {
        title: `Daily QA Report - ${product} ${buildVersion} - ${dateStr}`,
        productName: product,
        buildVersion,
        reportDate,
        preparedBy: rand([adminName, "Priya R.", "Marco D.", "Aiden K."]),
        summary: day.summary,
        status: day.status,
        createdById: admin.id,
      },
    });

    await prisma.deviceConfiguration.createMany({
      data: [
        {
          reportId: report.id,
          platform: "MAC_INTEL",
          osVersion: "macOS 14.6.1 (Sonoma)",
          processor: "Intel Core i7-9750H @ 2.6GHz",
          ram: "16 GB",
          notes: "Reference Intel MBP 2019",
        },
        {
          reportId: report.id,
          platform: "MAC_ARM",
          osVersion: "macOS 15.1 (Sequoia)",
          processor: "Apple M2 Pro 12-core",
          ram: "32 GB",
          notes: "MBP 14\" 2023",
        },
        {
          reportId: report.id,
          platform: "WINDOWS",
          osVersion: "Windows 11 Pro 23H2 (build 22631.4317)",
          processor: "Intel Core i7-1260P",
          ram: "16 GB",
          notes: "ThinkPad X1 Carbon Gen 11",
        },
      ],
    });

    const allBugsForReport = [...runningBugs, ...newRunningBugs];
    if (allBugsForReport.length > 0) {
      await prisma.bug.createMany({
        data: allBugsForReport.map((b) => ({
          reportId: report.id,
          jiraId: b.jiraId,
          title: b.title,
          status: b.status,
          priority: b.priority,
          epvFlag: b.epvFlag,
          platform: b.platform,
          isNewToday: b.bornDay === day.daysAgo,
          owner: b.owner,
        })),
      });
    }

    await prisma.testResult.createMany({
      data: SEED_TESTCASES.map((tc) => ({
        reportId: report.id,
        testcaseId: tc.testcaseId,
        testcaseTitle: tc.testcaseTitle,
        testsuiteLabel: tc.testsuiteLabel,
        macIntelResult: pickOutcome(day.outcomeBias),
        macArmResult: pickOutcome(day.outcomeBias),
        windowsResult: pickOutcome(day.outcomeBias),
      })),
    });

    runningBugs.push(...newRunningBugs);

    for (let i = runningBugs.length - 1; i >= 0; i--) {
      const s = runningBugs[i].status.toLowerCase();
      if (s === "closed" || s === "resolved" || s === "done") {
        runningBugs.splice(i, 1);
      }
    }

    console.log(
      `Seeded report for ${dateStr} (${day.status}) with ${allBugsForReport.length} bugs, ${SEED_TESTCASES.length} tests`,
    );
  }

  console.log("\nSeed complete.");
  console.log(`Login at /login with: ${adminEmail} / ${adminPassword}`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
