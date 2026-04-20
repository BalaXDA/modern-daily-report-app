import { prisma } from "@/lib/prisma";
import { buildDailyTrend } from "@/lib/report-helpers";
import { ReportForm } from "@/components/report/report-form";
import { PageHeader } from "@/components/page-header";
import { getSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function NewReportPage() {
  const session = await getSession();
  const reports = await prisma.report.findMany({
    orderBy: { reportDate: "asc" },
    include: { bugs: true, devices: true, testResults: true },
  });
  const trend = buildDailyTrend(reports, 15);

  return (
    <div className="mx-auto max-w-7xl p-6 lg:p-8">
      <PageHeader
        title="New daily report"
        description="Capture today's QA results, bugs, devices, and detailed test outcomes."
      />
      <ReportForm
        trend={trend}
        initial={{
          preparedBy: session?.user?.name ?? "",
          title: `Daily QA Report - ${new Date().toISOString().slice(0, 10)}`,
        }}
      />
    </div>
  );
}
