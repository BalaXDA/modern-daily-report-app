import { NextResponse } from "next/server";
import { renderToStream } from "@react-pdf/renderer";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { ReportPdfDocument } from "@/lib/pdf-document";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const report = await prisma.report.findUnique({
    where: { id: params.id },
    include: { bugs: true, devices: true, testResults: true },
  });
  if (!report) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const stream = await renderToStream(<ReportPdfDocument report={report} />);

  const chunks: Buffer[] = [];
  for await (const chunk of stream as AsyncIterable<Buffer | string>) {
    chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
  }
  const pdfBuffer = Buffer.concat(chunks);

  const safeTitle = report.title.replace(/[^a-z0-9-_]+/gi, "_").slice(0, 80);
  const dateStr = new Date(report.reportDate).toISOString().slice(0, 10);
  const filename = `${safeTitle}_${dateStr}.pdf`;

  return new NextResponse(pdfBuffer, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${filename}"`,
      "Content-Length": pdfBuffer.length.toString(),
      "Cache-Control": "no-store",
    },
  });
}
