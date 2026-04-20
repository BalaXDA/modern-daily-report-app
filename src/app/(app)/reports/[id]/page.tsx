import Link from "next/link";
import { notFound } from "next/navigation";
import { Edit, FileDown, Printer } from "lucide-react";

import { prisma } from "@/lib/prisma";
import { ReportPreview } from "@/components/report/report-preview";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { PrintButton } from "./print-button";

export const dynamic = "force-dynamic";

export default async function ReportPreviewPage({ params }: { params: { id: string } }) {
  const report = await prisma.report.findUnique({
    where: { id: params.id },
    include: { bugs: true, devices: true, testResults: true },
  });
  if (!report) notFound();

  return (
    <div className="mx-auto max-w-6xl p-6 lg:p-8">
      <PageHeader
        title="Report preview"
        description="Read-only view, ready for sharing or PDF export."
        actions={
          <>
            <PrintButton />
            <Button asChild variant="outline">
              <a href={`/api/reports/${report.id}/pdf`} target="_blank" rel="noreferrer">
                <FileDown className="mr-2 h-4 w-4" />
                Export PDF
              </a>
            </Button>
            <Button asChild>
              <Link href={`/reports/${report.id}/edit`}>
                <Edit className="mr-2 h-4 w-4" />
                Edit
              </Link>
            </Button>
          </>
        }
      />
      <ReportPreview report={report} />
    </div>
  );
}
