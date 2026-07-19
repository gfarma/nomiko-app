import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { storage } from "@/lib/storage";
import { audit } from "@/lib/audit";

/** Portal document download — gated by portal token + per-document visibility. */
export async function GET(_req: Request, ctx: RouteContext<"/f/[token]/doc/[docId]">) {
  const { token, docId } = await ctx.params;

  const c = await prisma.case.findFirst({
    where: { portalToken: token, portalEnabled: true },
    select: { id: true, firmId: true },
  });
  if (!c) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const doc = await prisma.document.findFirst({
    where: { id: docId, caseId: c.id, visibleToClient: true },
  });
  if (!doc) return NextResponse.json({ error: "Not found" }, { status: 404 });

  let data: Buffer;
  try {
    data = await storage.get(doc.filePath);
  } catch {
    return NextResponse.json({ error: "Το αρχείο δεν είναι διαθέσιμο." }, { status: 410 });
  }

  await audit({
    firmId: c.firmId,
    action: "portal.document.download",
    entityType: "Document",
    entityId: doc.id,
    detail: doc.fileName,
  });

  return new NextResponse(new Uint8Array(data), {
    headers: {
      "Content-Type": doc.mimeType,
      "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(doc.fileName)}`,
    },
  });
}
