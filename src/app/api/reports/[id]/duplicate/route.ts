import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const original = await prisma.report.findUnique({
    where: { id: params.id },
    include: { bugs: true, devices: true, testResults: true },
  });
  if (!original) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const today = new Date();
  today.setHours(9, 30, 0, 0);

  const created = await prisma.report.create({
    data: {
      title: `${original.title} (copy)`,
      productName: original.productName,
      buildVersion: original.buildVersion,
      reportDate: today,
      preparedBy: session.user.name ?? original.preparedBy,
      summary: original.summary,
      status: "DRAFT",
      createdById: session.user.id,
      devices: {
        create: original.devices.map((d) => ({
          platform: d.platform,
          osVersion: d.osVersion,
          processor: d.processor,
          ram: d.ram,
          notes: d.notes,
        })),
      },
      testResults: {
        create: original.testResults.map((t) => ({
          testcaseId: t.testcaseId,
          testcaseTitle: t.testcaseTitle,
          testsuiteLabel: t.testsuiteLabel,
          macIntelResult: "UNTESTED",
          macArmResult: "UNTESTED",
          windowsResult: "UNTESTED",
        })),
      },
      bugs: {
        create: original.bugs
          .filter((b) => {
            const s = b.status.toLowerCase();
            return s !== "closed" && s !== "resolved" && s !== "done";
          })
          .map((b) => ({
            jiraId: b.jiraId,
            title: b.title,
            status: b.status,
            priority: b.priority,
            epvFlag: b.epvFlag,
            platform: b.platform,
            isNewToday: false,
            owner: b.owner,
          })),
      },
    },
  });
  return NextResponse.json(created, { status: 201 });
}
