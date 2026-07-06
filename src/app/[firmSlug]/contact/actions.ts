"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { audit } from "@/lib/audit";

const leadSchema = z.object({
  name: z.string().trim().min(2).max(200),
  email: z.string().trim().email().max(200).optional().or(z.literal("")),
  phone: z.string().trim().max(30).optional(),
  message: z.string().trim().min(5).max(4000),
  consent: z.literal(true),
});

/** Public — no auth. Rate limiting should be added before real launch. */
export async function submitLead(firmSlug: string, formData: FormData) {
  const firm = await prisma.firm.findUnique({ where: { slug: firmSlug }, select: { id: true } });
  if (!firm) throw new Error("Το γραφείο δεν βρέθηκε");

  const data = leadSchema.parse({
    name: formData.get("name"),
    email: formData.get("email") || "",
    phone: formData.get("phone") || undefined,
    message: formData.get("message"),
    consent: formData.get("consent") === "on",
  });

  const lead = await prisma.lead.create({
    data: {
      firmId: firm.id,
      name: data.name,
      email: data.email || null,
      phone: data.phone || null,
      message: data.message,
      consent: true,
    },
  });

  await audit({ firmId: firm.id, action: "lead.submit", entityType: "Lead", entityId: lead.id, detail: "public contact form" });
  redirect(`/${firmSlug}/contact?sent=1`);
}
