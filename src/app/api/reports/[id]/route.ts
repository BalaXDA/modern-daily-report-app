import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { reportSchema } from "@/lib/validators";
import { getSession } from "@/lib/auth";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const report = await prisma.report.findUnique({
    where: { id: params.id },
    include: { bugs: true, devices: true, testResults: true },
  });
  if (!report) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(report);
}

export async function PUT(req: Request, { params }: { params: { id: string } }) {
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

  const updated = await prisma.$transaction(async (tx) => {
    await tx.bug.deleteMany({ where: { reportId: params.id } });
    await tx.deviceConfiguration.deleteMany({ where: { reportId: params.id } });
    await tx.testResult.deleteMany({ where: { reportId: params.id } });

    return tx.report.update({
      where: { id: params.id },
      data: {
        title: data.title,
        productName: data.productName,
        buildVersion: data.buildVersion,
        reportDate: data.reportDate,
        preparedBy: data.preparedBy,
        summary: data.summary,
        status: data.status,
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
  });

  return NextResponse.json(updated);
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await prisma.report.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
