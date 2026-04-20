import { z } from "zod";

export const PlatformEnum = z.enum(["MAC_INTEL", "MAC_ARM", "WINDOWS"]);
export const TestOutcomeEnum = z.enum(["PASS", "FAIL", "NA", "UNTESTED"]);
export const BugPriorityEnum = z.enum(["P0", "P1", "P2", "P3", "P4"]);
export const ReportStatusEnum = z.enum(["DRAFT", "PUBLISHED"]);

export const bugSchema = z.object({
  id: z.string().optional(),
  jiraId: z.string().min(1, "Jira ID is required"),
  title: z.string().min(1, "Title is required"),
  status: z.string().min(1, "Status is required"),
  priority: BugPriorityEnum,
  epvFlag: z.boolean().default(false),
  platform: PlatformEnum.optional().nullable(),
  isNewToday: z.boolean().default(false),
  owner: z.string().optional().nullable(),
});

export const deviceSchema = z.object({
  id: z.string().optional(),
  platform: PlatformEnum,
  osVersion: z.string().min(1, "OS version required"),
  processor: z.string().min(1, "Processor required"),
  ram: z.string().min(1, "RAM required"),
  notes: z.string().optional().nullable(),
});

export const testResultSchema = z.object({
  id: z.string().optional(),
  testcaseId: z.string().min(1, "Testcase ID required"),
  testcaseTitle: z.string().min(1, "Testcase title required"),
  testsuiteLabel: z.string().min(1, "Test suite required"),
  macIntelResult: TestOutcomeEnum,
  macArmResult: TestOutcomeEnum,
  windowsResult: TestOutcomeEnum,
});

export const reportSchema = z.object({
  title: z.string().min(1, "Title is required"),
  productName: z.string().min(1, "Product name is required"),
  buildVersion: z.string().min(1, "Build version is required"),
  reportDate: z.coerce.date(),
  preparedBy: z.string().min(1, "Prepared by is required"),
  summary: z.string().default(""),
  status: ReportStatusEnum.default("DRAFT"),
  bugs: z.array(bugSchema).default([]),
  devices: z.array(deviceSchema).default([]),
  testResults: z.array(testResultSchema).default([]),
});

export type ReportInput = z.infer<typeof reportSchema>;
export type BugInput = z.infer<typeof bugSchema>;
export type DeviceInput = z.infer<typeof deviceSchema>;
export type TestResultInput = z.infer<typeof testResultSchema>;
