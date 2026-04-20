import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import { PlatformSummaryGrid } from "./platform-summary-grid";
import {
  computePlatformSummary,
  PLATFORM_LABELS,
  OUTCOME_LABELS,
  OUTCOME_COLORS,
  getActiveBugs,
  getNewBugsToday,
  type ReportWithChildren,
} from "@/lib/report-helpers";
import { formatDate } from "@/lib/utils";
import { cn } from "@/lib/utils";
import type { TestOutcome } from "@prisma/client";

export function ReportPreview({ report }: { report: ReportWithChildren }) {
  const summary = computePlatformSummary(report.testResults);
  const newBugs = getNewBugsToday(report.bugs);
  const activeBugs = getActiveBugs(report.bugs);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="border-b bg-gradient-to-br from-blue-50 via-white to-white">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="space-y-1">
              <Badge variant={report.status === "PUBLISHED" ? "success" : "warning"}>
                {report.status}
              </Badge>
              <CardTitle className="text-2xl">{report.title}</CardTitle>
              <CardDescription className="text-sm">
                {report.productName} &middot; Build {report.buildVersion}
              </CardDescription>
            </div>
            <div className="text-right text-sm">
              <div className="font-medium">{formatDate(report.reportDate, { weekday: "long" })}</div>
              <div className="text-xs text-muted-foreground">Prepared by {report.preparedBy}</div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          <div className="grid gap-4 sm:grid-cols-4">
            <Field label="Product" value={report.productName} />
            <Field label="Build" value={report.buildVersion} />
            <Field label="Date" value={formatDate(report.reportDate)} />
            <Field label="Prepared by" value={report.preparedBy} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Quick summary</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="whitespace-pre-wrap text-sm leading-6 text-slate-700">
            {report.summary || <span className="text-muted-foreground">No summary provided.</span>}
          </p>
        </CardContent>
      </Card>

      <div>
        <h2 className="mb-3 text-lg font-semibold">Platform summary</h2>
        <PlatformSummaryGrid summary={summary} />
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">New bugs logged today</CardTitle>
            <Badge variant="muted">{newBugs.length} bugs</Badge>
          </div>
        </CardHeader>
        <CardContent>
          {newBugs.length === 0 ? (
            <Empty text="No new bugs logged today." />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Jira ID</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>EPV</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {newBugs.map((b) => (
                  <TableRow key={b.id}>
                    <TableCell className="font-mono text-xs">{b.jiraId}</TableCell>
                    <TableCell className="max-w-[420px] truncate">{b.title}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{b.status}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="muted">{b.priority}</Badge>
                    </TableCell>
                    <TableCell>
                      {b.epvFlag ? <Badge variant="success">Yes</Badge> : <Badge variant="muted">No</Badge>}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Active bugs</CardTitle>
            <Badge variant="muted">{activeBugs.length} active</Badge>
          </div>
          <CardDescription>Bugs not in Closed / Resolved / Done</CardDescription>
        </CardHeader>
        <CardContent>
          {activeBugs.length === 0 ? (
            <Empty text="No active bugs." />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Jira ID</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>EPV</TableHead>
                  <TableHead>Platform</TableHead>
                  <TableHead>Owner</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {activeBugs.map((b) => (
                  <TableRow key={b.id}>
                    <TableCell className="font-mono text-xs">{b.jiraId}</TableCell>
                    <TableCell className="max-w-[360px] truncate">{b.title}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{b.status}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="muted">{b.priority}</Badge>
                    </TableCell>
                    <TableCell>
                      {b.epvFlag ? <Badge variant="success">Yes</Badge> : <Badge variant="muted">No</Badge>}
                    </TableCell>
                    <TableCell className="text-xs">
                      {b.platform ? PLATFORM_LABELS[b.platform] : "—"}
                    </TableCell>
                    <TableCell className="text-xs">{b.owner ?? "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Device configurations used today</CardTitle>
        </CardHeader>
        <CardContent>
          {report.devices.length === 0 ? (
            <Empty text="No device configurations recorded." />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Platform</TableHead>
                  <TableHead>OS version</TableHead>
                  <TableHead>Processor</TableHead>
                  <TableHead>RAM</TableHead>
                  <TableHead>Notes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {report.devices.map((d) => (
                  <TableRow key={d.id}>
                    <TableCell>
                      <Badge variant="outline">{PLATFORM_LABELS[d.platform]}</Badge>
                    </TableCell>
                    <TableCell className="text-sm">{d.osVersion}</TableCell>
                    <TableCell className="text-sm">{d.processor}</TableCell>
                    <TableCell className="text-sm">{d.ram}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{d.notes ?? "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Detailed test results</CardTitle>
            <Badge variant="muted">{report.testResults.length} test cases</Badge>
          </div>
        </CardHeader>
        <CardContent>
          {report.testResults.length === 0 ? (
            <Empty text="No test results captured." />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Testcase</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>Suite</TableHead>
                  <TableHead className="text-center">Mac Intel</TableHead>
                  <TableHead className="text-center">Mac ARM</TableHead>
                  <TableHead className="text-center">Windows</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {report.testResults.map((t) => (
                  <TableRow key={t.id}>
                    <TableCell className="font-mono text-xs">{t.testcaseId}</TableCell>
                    <TableCell className="max-w-[320px] truncate">{t.testcaseTitle}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{t.testsuiteLabel}</TableCell>
                    <TableCell className="text-center"><OutcomePill outcome={t.macIntelResult} /></TableCell>
                    <TableCell className="text-center"><OutcomePill outcome={t.macArmResult} /></TableCell>
                    <TableCell className="text-center"><OutcomePill outcome={t.windowsResult} /></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Separator />
      <p className="pb-6 text-center text-xs text-muted-foreground">
        Generated by QA Daily Report Portal &middot; {formatDate(new Date())}
      </p>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="mt-0.5 text-sm font-medium">{value}</div>
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return (
    <div className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
      {text}
    </div>
  );
}

function OutcomePill({ outcome }: { outcome: TestOutcome }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium",
        OUTCOME_COLORS[outcome],
      )}
    >
      {OUTCOME_LABELS[outcome]}
    </span>
  );
}
