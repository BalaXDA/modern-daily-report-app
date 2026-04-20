import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getDefaultUser } from "@/lib/default-user";

export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const original = await prisma.report.findUnique({
    where: { id: params.id },
    include: { bugs: true, devices: true, testResults: true },
  });
  if (!original) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const user = await getDefaultUser();
  const today = new Date();
  today.setHours(9, 30, 0, 0);

  const created = await prisma.report.create({
    data: {
      title: `${original.title} (copy)`,
      productName: original.productName,
      buildVersion: original.buildVersion,
      reportDate: today,
      preparedBy: original.preparedBy,
      summary: original.summary,
      status: "DRAFT",
      createdById: user.id,
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
