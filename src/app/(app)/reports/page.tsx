import Link from "next/link";
import { Plus, Eye, Edit, Copy, FileDown } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { totalsForReport, getActiveBugs, getNewBugsToday } from "@/lib/report-helpers";
import { formatDate } from "@/lib/utils";
import { DuplicateButton } from "./duplicate-button";

export const dynamic = "force-dynamic";

export default async function ReportsPage() {
  const reports = await prisma.report.findMany({
    orderBy: { reportDate: "desc" },
    include: { bugs: true, testResults: true },
  });

  return (
    <div className="mx-auto max-w-7xl p-6 lg:p-8">
      <PageHeader
        title="All reports"
        description={`${reports.length} report${reports.length === 1 ? "" : "s"} in history.`}
        actions={
          <Button asChild>
            <Link href="/reports/new">
              <Plus className="mr-2 h-4 w-4" />
              New report
            </Link>
          </Button>
        }
      />

      <Card>
        <CardContent className="p-0">
          {reports.length === 0 ? (
            <div className="p-12 text-center">
              <p className="text-muted-foreground">No reports yet.</p>
              <Button asChild className="mt-4">
                <Link href="/reports/new">Create your first report</Link>
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>Build</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Pass</TableHead>
                  <TableHead className="text-right">Fail</TableHead>
                  <TableHead className="text-right">New bugs</TableHead>
                  <TableHead className="text-right">Active bugs</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reports.map((r) => {
                  const t = totalsForReport(r.testResults);
                  return (
                    <TableRow key={r.id}>
                      <TableCell className="whitespace-nowrap text-sm">
                        {formatDate(r.reportDate)}
                      </TableCell>
                      <TableCell>
                        <Link
                          href={`/reports/${r.id}`}
                          className="font-medium text-slate-900 hover:text-primary hover:underline"
                        >
                          {r.title}
                        </Link>
                        <div className="text-xs text-muted-foreground">{r.preparedBy}</div>
                      </TableCell>
                      <TableCell className="text-sm">{r.buildVersion}</TableCell>
                      <TableCell>
                        <Badge variant={r.status === "PUBLISHED" ? "success" : "warning"}>
                          {r.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right text-sm tabular-nums text-emerald-700">{t.pass}</TableCell>
                      <TableCell className="text-right text-sm tabular-nums text-rose-700">{t.fail}</TableCell>
                      <TableCell className="text-right text-sm tabular-nums">{getNewBugsToday(r.bugs).length}</TableCell>
                      <TableCell className="text-right text-sm tabular-nums">{getActiveBugs(r.bugs).length}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button asChild size="icon" variant="ghost" title="Preview">
                            <Link href={`/reports/${r.id}`}>
                              <Eye className="h-4 w-4" />
                            </Link>
                          </Button>
                          <Button asChild size="icon" variant="ghost" title="Edit">
                            <Link href={`/reports/${r.id}/edit`}>
                              <Edit className="h-4 w-4" />
                            </Link>
                          </Button>
                          <DuplicateButton id={r.id} />
                          <Button asChild size="icon" variant="ghost" title="Export PDF">
                            <a href={`/api/reports/${r.id}/pdf`} target="_blank" rel="noreferrer">
                              <FileDown className="h-4 w-4" />
                            </a>
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
