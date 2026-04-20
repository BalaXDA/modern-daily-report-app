// String-literal unions used in place of Prisma enums.
// SQLite doesn't support enums, so we keep these as plain strings in the DB
// and validate them via Zod (see ./validators.ts) and constants here.

export const ROLES = ["ADMIN", "QA", "VIEWER"] as const;
export type Role = (typeof ROLES)[number];

export const REPORT_STATUSES = ["DRAFT", "PUBLISHED"] as const;
export type ReportStatus = (typeof REPORT_STATUSES)[number];

export const PLATFORM_VALUES = ["MAC_INTEL", "MAC_ARM", "WINDOWS"] as const;
export type Platform = (typeof PLATFORM_VALUES)[number];

export const TEST_OUTCOMES = ["PASS", "FAIL", "NA", "UNTESTED"] as const;
export type TestOutcome = (typeof TEST_OUTCOMES)[number];

export const BUG_PRIORITIES = ["P0", "P1", "P2", "P3", "P4"] as const;
export type BugPriority = (typeof BUG_PRIORITIES)[number];

export function isPlatform(v: unknown): v is Platform {
  return typeof v === "string" && (PLATFORM_VALUES as readonly string[]).includes(v);
}
export function isTestOutcome(v: unknown): v is TestOutcome {
  return typeof v === "string" && (TEST_OUTCOMES as readonly string[]).includes(v);
}
