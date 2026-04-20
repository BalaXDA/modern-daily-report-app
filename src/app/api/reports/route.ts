import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { reportSchema } from "@/lib/validators";
import { getSession } from "@/lib/auth";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const reports = await prisma.report.findMany({
    orderBy: { reportDate: "desc" },
    include: { _count: { select: { bugs: true, testResults: true } } },
  });
  return NextResponse.json(reports);
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const parsed = reportSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 },
    );
  }
  const data = parsed.data;

  const report = await prisma.report.create({
    data: {
      title: data.title,
      productName: data.productName,
      buildVersion: data.buildVersion,
      reportDate: data.reportDate,
      preparedBy: data.preparedBy,
      summary: data.summary,
      status: data.status,
      createdById: session.user.id,
      bugs: {
        create: data.bugs.map((b) => ({
          jiraId: b.jiraId,
          title: b.title,
          status: b.status,
          priority: b.priority,
          epvFlag: b.epvFlag,
          platform: b.platform ?? null,
          isNewToday: b.isNewToday,
          owner: b.owner || null,
        })),
      },
      devices: {
        create: data.devices.map((d) => ({
          platform: d.platform,
          osVersion: d.osVersion,
          processor: d.processor,
          ram: d.ram,
          notes: d.notes || null,
        })),
      },
      testResults: {
        create: data.testResults.map((t) => ({
          testcaseId: t.testcaseId,
          testcaseTitle: t.testcaseTitle,
          testsuiteLabel: t.testsuiteLabel,
          macIntelResult: t.macIntelResult,
          macArmResult: t.macArmResult,
          windowsResult: t.windowsResult,
        })),
      },
    },
  });
  return NextResponse.json(report, { status: 201 });
}
