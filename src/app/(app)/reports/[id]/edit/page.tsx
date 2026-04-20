import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { buildDailyTrend } from "@/lib/report-helpers";
import { ReportForm } from "@/components/report/report-form";
import { PageHeader } from "@/components/page-header";

export const dynamic = "force-dynamic";

export default async function EditReportPage({ params }: { params: { id: string } }) {
  const report = await prisma.report.findUnique({
    where: { id: params.id },
    include: { bugs: true, devices: true, testResults: true },
  });
  if (!report) notFound();

  const allReports = await prisma.report.findMany({
    orderBy: { reportDate: "asc" },
    include: { bugs: true, devices: true, testResults: true },
  });
  const trend = buildDailyTrend(allReports, 15);

  return (
    <div className="mx-auto max-w-7xl p-6 lg:p-8">
      <PageHeader
        title="Edit report"
        description={`Editing: ${report.title}`}
      />
      <ReportForm
        reportId={report.id}
        trend={trend}
        initial={{
          title: report.title,
          productName: report.productName,
          buildVersion: report.buildVersion,
          reportDate: report.reportDate,
          preparedBy: report.preparedBy,
          summary: report.summary,
          status: report.status,
          bugs: report.bugs.map((b) => ({
            id: b.id,
            jiraId: b.jiraId,
            title: b.title,
            status: b.status,
            priority: b.priority,
            epvFlag: b.epvFlag,
            platform: b.platform ?? null,
            isNewToday: b.isNewToday,
            owner: b.owner ?? "",
          })),
          devices: report.devices.map((d) => ({
            id: d.id,
            platform: d.platform,
            osVersion: d.osVersion,
            processor: d.processor,
            ram: d.ram,
            notes: d.notes ?? "",
          })),
          testResults: report.testResults.map((t) => ({
            id: t.id,
            testcaseId: t.testcaseId,
            testcaseTitle: t.testcaseTitle,
            testsuiteLabel: t.testsuiteLabel,
            macIntelResult: t.macIntelResult,
            macArmResult: t.macArmResult,
            windowsResult: t.windowsResult,
          })),
        }}
      />
    </div>
  );
}
