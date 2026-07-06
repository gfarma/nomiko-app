import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { storage } from "@/lib/storage";
import { audit } from "@/lib/audit";
import { canSeeLegalContent } from "@/lib/session";
import type { Role } from "@/lib/constants";

export async function GET(_req: Request, ctx: RouteContext<"/api/documents/[id]">) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canSeeLegalContent(session.user.role as Role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await ctx.params;
  const doc = await prisma.document.findFirst({ where: { id, firmId: session.user.firmId } });
  if (!doc) return NextResponse.json({ error: "Not found" }, { status: 404 });

  let data: Buffer;
  try {
    data = await storage.get(doc.filePath);
  } catch {
    return NextResponse.json(
      { error: "Το αρχείο δεν είναι διαθέσιμο σε αυτό το περιβάλλον (ephemeral demo storage)." },
      { status: 410 }
    );
  }

  await audit({
    firmId: session.user.firmId,
    userId: session.user.id,
    action: "document.download",
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
