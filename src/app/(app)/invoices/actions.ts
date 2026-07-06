"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { audit } from "@/lib/audit";

/** Create an invoice from selected unbilled time entries of a client. */
export async function createInvoiceFromTime(formData: FormData) {
  const user = await requireUser();
  const clientId = z.string().min(1).parse(formData.get("clientId"));
  const vatRate = z.coerce.number().int().min(0).max(24).parse(formData.get("vatRate") || 24);
  const entryIds = formData.getAll("entryIds").map(String);
  if (entryIds.length === 0) throw new Error("Επιλέξτε τουλάχιστον μία καταχώρηση χρόνου");

  const client = await prisma.client.findFirst({ where: { id: clientId, firmId: user.firmId } });
  if (!client) throw new Error("Ο πελάτης δεν βρέθηκε");

  const entries = await prisma.timeEntry.findMany({
    where: {
      id: { in: entryIds },
      firmId: user.firmId,
      billable: true,
      invoiceLineId: null,
      case: { clientId },
    },
    include: { case: { select: { title: true } }, user: { select: { name: true } } },
  });
  if (entries.length === 0) throw new Error("Δεν βρέθηκαν διαθέσιμες καταχωρήσεις");

  const year = new Date().getFullYear();
  const count = await prisma.invoice.count({ where: { firmId: user.firmId } });
  const number = `ΤΠΥ-${year}-${String(count + 1).padStart(3, "0")}`;

  const subtotalCents = entries.reduce((s, e) => s + Math.round((e.minutes / 60) * e.rateCents), 0);
  const vatCents = Math.round((subtotalCents * vatRate) / 100);

  const invoice = await prisma.invoice.create({
    data: {
      firmId: user.firmId,
      clientId,
      number,
      status: "draft",
      subtotalCents,
      vatRate,
      vatCents,
      totalCents: subtotalCents + vatCents,
      dueDate: new Date(Date.now() + 30 * 86400000),
      lines: {
        create: entries.map((e) => ({
          description: `${e.case.title}: ${e.description} (${e.user.name})`,
          minutes: e.minutes,
          rateCents: e.rateCents,
          amountCents: Math.round((e.minutes / 60) * e.rateCents),
        })),
      },
    },
    include: { lines: true },
  });

  // link the time entries to the created lines (order-stable)
  await Promise.all(
    entries.map((e, i) =>
      prisma.timeEntry.update({ where: { id: e.id }, data: { invoiceLineId: invoice.lines[i].id } })
    )
  );

  await audit({ firmId: user.firmId, userId: user.id, action: "invoice.create", entityType: "Invoice", entityId: invoice.id, detail: number });
  revalidatePath("/invoices");
  redirect(`/invoices/${invoice.id}`);
}

export async function setInvoiceStatus(invoiceId: string, status: "draft" | "issued" | "paid" | "void") {
  const user = await requireUser();
  const invoice = await prisma.invoice.findFirst({ where: { id: invoiceId, firmId: user.firmId } });
  if (!invoice) throw new Error("Το τιμολόγιο δεν βρέθηκε");

  await prisma.invoice.update({ where: { id: invoiceId }, data: { status } });
  await audit({ firmId: user.firmId, userId: user.id, action: `invoice.${status}`, entityType: "Invoice", entityId: invoiceId });
  revalidatePath("/invoices");
  revalidatePath(`/invoices/${invoiceId}`);
}
