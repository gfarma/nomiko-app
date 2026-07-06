"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { audit } from "@/lib/audit";
import { CLIENT_TYPES } from "@/lib/constants";

const clientSchema = z.object({
  type: z.enum(CLIENT_TYPES),
  fullName: z.string().trim().min(2, "Το όνομα είναι υποχρεωτικό"),
  vatNumber: z.string().trim().optional(),
  idNumber: z.string().trim().optional(),
  email: z.string().trim().email().optional().or(z.literal("")),
  phone: z.string().trim().optional(),
  address: z.string().trim().optional(),
  notes: z.string().trim().optional(),
  consentDataProcessing: z.coerce.boolean(),
  consentMarketing: z.coerce.boolean(),
});

function parseClientForm(formData: FormData) {
  return clientSchema.parse({
    type: formData.get("type"),
    fullName: formData.get("fullName"),
    vatNumber: formData.get("vatNumber") || undefined,
    idNumber: formData.get("idNumber") || undefined,
    email: formData.get("email") || "",
    phone: formData.get("phone") || undefined,
    address: formData.get("address") || undefined,
    notes: formData.get("notes") || undefined,
    consentDataProcessing: formData.get("consentDataProcessing") === "on",
    consentMarketing: formData.get("consentMarketing") === "on",
  });
}

export async function createClient(formData: FormData) {
  const user = await requireUser();
  const data = parseClientForm(formData);

  const client = await prisma.client.create({
    data: {
      ...data,
      email: data.email || null,
      firmId: user.firmId,
      consentDate: data.consentDataProcessing ? new Date() : null,
    },
  });

  await audit({ firmId: user.firmId, userId: user.id, action: "client.create", entityType: "Client", entityId: client.id });
  revalidatePath("/clients");
  redirect(`/clients/${client.id}`);
}

export async function updateClient(clientId: string, formData: FormData) {
  const user = await requireUser();
  const existing = await prisma.client.findFirst({ where: { id: clientId, firmId: user.firmId } });
  if (!existing) throw new Error("Ο πελάτης δεν βρέθηκε");

  const data = parseClientForm(formData);
  await prisma.client.update({
    where: { id: clientId },
    data: {
      ...data,
      email: data.email || null,
      consentDate:
        data.consentDataProcessing && !existing.consentDataProcessing ? new Date() : existing.consentDate,
    },
  });

  await audit({ firmId: user.firmId, userId: user.id, action: "client.update", entityType: "Client", entityId: clientId });
  revalidatePath("/clients");
  revalidatePath(`/clients/${clientId}`);
  redirect(`/clients/${clientId}`);
}

/** GDPR right to erasure — blocked while cases exist (legal retention duty). */
export async function deleteClient(clientId: string) {
  const user = await requireUser();
  const existing = await prisma.client.findFirst({
    where: { id: clientId, firmId: user.firmId },
    include: { _count: { select: { cases: true } } },
  });
  if (!existing) throw new Error("Ο πελάτης δεν βρέθηκε");
  if (existing._count.cases > 0) {
    throw new Error("Δεν είναι δυνατή η διαγραφή: υπάρχουν συνδεδεμένες υποθέσεις.");
  }
  await prisma.client.delete({ where: { id: clientId } });
  await audit({ firmId: user.firmId, userId: user.id, action: "client.delete", entityType: "Client", entityId: clientId, detail: "GDPR erasure" });
  revalidatePath("/clients");
  redirect("/clients");
}

/** GDPR right of access — JSON export of everything we hold for the client. */
export async function exportClientData(clientId: string): Promise<string> {
  const user = await requireUser();
  const client = await prisma.client.findFirst({
    where: { id: clientId, firmId: user.firmId },
    include: {
      cases: { include: { deadlines: true, timeEntries: true, documents: { select: { title: true, fileName: true, docType: true, createdAt: true } } } },
      invoices: { include: { lines: true } },
    },
  });
  if (!client) throw new Error("Ο πελάτης δεν βρέθηκε");
  await audit({ firmId: user.firmId, userId: user.id, action: "client.export", entityType: "Client", entityId: clientId, detail: "GDPR data export" });
  return JSON.stringify(client, null, 2);
}
