"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { audit } from "@/lib/audit";
import { LEAD_STATUSES } from "@/lib/constants";

export async function setLeadStatus(leadId: string, status: string) {
  const user = await requireUser();
  const parsed = z.enum(LEAD_STATUSES).parse(status);
  const lead = await prisma.lead.findFirst({ where: { id: leadId, firmId: user.firmId } });
  if (!lead) throw new Error("Το αίτημα δεν βρέθηκε");

  await prisma.lead.update({ where: { id: leadId }, data: { status: parsed } });
  await audit({ firmId: user.firmId, userId: user.id, action: `lead.${parsed}`, entityType: "Lead", entityId: leadId });
  revalidatePath("/leads");
  revalidatePath("/dashboard");
}
