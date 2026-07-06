"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser, canSeeLegalContent } from "@/lib/session";
import { audit } from "@/lib/audit";
import { storage, makeStorageKey } from "@/lib/storage";
import { CASE_STATUSES, DEADLINE_TYPES, DOC_TYPES, PRACTICE_AREAS } from "@/lib/constants";

const caseSchema = z.object({
  title: z.string().trim().min(3, "Ο τίτλος είναι υποχρεωτικός"),
  clientId: z.string().min(1),
  practiceArea: z.enum(PRACTICE_AREAS),
  caseNumber: z.string().trim().optional(),
  court: z.string().trim().optional(),
  stage: z.string().trim().optional(),
  status: z.enum(CASE_STATUSES),
  description: z.string().trim().optional(),
  templateId: z.string().optional(),
});

async function assertCaseInFirm(caseId: string, firmId: string) {
  const c = await prisma.case.findFirst({ where: { id: caseId, firmId } });
  if (!c) throw new Error("Η υπόθεση δεν βρέθηκε");
  return c;
}

function collectCustomFields(formData: FormData): string {
  const custom: Record<string, string> = {};
  for (const [key, value] of formData.entries()) {
    if (key.startsWith("cf_") && typeof value === "string" && value !== "") {
      custom[key.slice(3)] = value;
    }
  }
  return JSON.stringify(custom);
}

export async function createCase(formData: FormData) {
  const user = await requireUser();
  const data = caseSchema.parse({
    title: formData.get("title"),
    clientId: formData.get("clientId"),
    practiceArea: formData.get("practiceArea"),
    caseNumber: formData.get("caseNumber") || undefined,
    court: formData.get("court") || undefined,
    stage: formData.get("stage") || undefined,
    status: formData.get("status") || "active",
    description: formData.get("description") || undefined,
    templateId: formData.get("templateId") || undefined,
  });

  // firm-scope checks on referenced entities
  const client = await prisma.client.findFirst({ where: { id: data.clientId, firmId: user.firmId } });
  if (!client) throw new Error("Ο πελάτης δεν βρέθηκε");
  if (data.templateId) {
    const tpl = await prisma.practiceAreaTemplate.findFirst({ where: { id: data.templateId, firmId: user.firmId } });
    if (!tpl) throw new Error("Το πρότυπο δεν βρέθηκε");
  }

  const assigneeIds = formData.getAll("assignees").map(String);
  const created = await prisma.case.create({
    data: {
      ...data,
      templateId: data.templateId || null,
      firmId: user.firmId,
      customFieldsJson: collectCustomFields(formData),
      assignments: {
        create: (assigneeIds.length ? assigneeIds : [user.id]).map((userId) => ({ userId })),
      },
    },
  });

  await audit({ firmId: user.firmId, userId: user.id, action: "case.create", entityType: "Case", entityId: created.id });
  revalidatePath("/cases");
  redirect(`/cases/${created.id}`);
}

export async function updateCase(caseId: string, formData: FormData) {
  const user = await requireUser();
  await assertCaseInFirm(caseId, user.firmId);

  const data = caseSchema.parse({
    title: formData.get("title"),
    clientId: formData.get("clientId"),
    practiceArea: formData.get("practiceArea"),
    caseNumber: formData.get("caseNumber") || undefined,
    court: formData.get("court") || undefined,
    stage: formData.get("stage") || undefined,
    status: formData.get("status") || "active",
    description: formData.get("description") || undefined,
    templateId: formData.get("templateId") || undefined,
  });

  await prisma.case.update({
    where: { id: caseId },
    data: { ...data, templateId: data.templateId || null, customFieldsJson: collectCustomFields(formData) },
  });

  await audit({ firmId: user.firmId, userId: user.id, action: "case.update", entityType: "Case", entityId: caseId });
  revalidatePath(`/cases/${caseId}`);
  revalidatePath("/cases");
  redirect(`/cases/${caseId}`);
}

// ---------- Deadlines ----------

export async function addDeadline(caseId: string, formData: FormData) {
  const user = await requireUser();
  await assertCaseInFirm(caseId, user.firmId);

  const schema = z.object({
    title: z.string().trim().min(2),
    type: z.enum(DEADLINE_TYPES),
    dueAt: z.string().min(1),
    remindDaysBefore: z.coerce.number().int().min(0).max(90),
    notes: z.string().trim().optional(),
  });
  const data = schema.parse({
    title: formData.get("title"),
    type: formData.get("type"),
    dueAt: formData.get("dueAt"),
    remindDaysBefore: formData.get("remindDaysBefore") || 5,
    notes: formData.get("notes") || undefined,
  });

  const deadline = await prisma.deadline.create({
    data: {
      firmId: user.firmId,
      caseId,
      title: data.title,
      type: data.type,
      dueAt: new Date(data.dueAt),
      remindDaysBefore: data.remindDaysBefore,
      notes: data.notes,
      createdById: user.id,
    },
  });

  await audit({ firmId: user.firmId, userId: user.id, action: "deadline.create", entityType: "Deadline", entityId: deadline.id, detail: data.title });
  revalidatePath(`/cases/${caseId}`);
  revalidatePath("/deadlines");
  revalidatePath("/dashboard");
}

export async function setDeadlineStatus(deadlineId: string, status: "pending" | "done" | "missed") {
  const user = await requireUser();
  const deadline = await prisma.deadline.findFirst({ where: { id: deadlineId, firmId: user.firmId } });
  if (!deadline) throw new Error("Η προθεσμία δεν βρέθηκε");

  await prisma.deadline.update({
    where: { id: deadlineId },
    data: { status, completedAt: status === "done" ? new Date() : null },
  });

  await audit({ firmId: user.firmId, userId: user.id, action: `deadline.${status}`, entityType: "Deadline", entityId: deadlineId });
  revalidatePath(`/cases/${deadline.caseId}`);
  revalidatePath("/deadlines");
  revalidatePath("/dashboard");
}

// ---------- Notes ----------

export async function addNote(caseId: string, formData: FormData) {
  const user = await requireUser();
  if (!canSeeLegalContent(user.role)) throw new Error("Δεν έχετε πρόσβαση");
  await assertCaseInFirm(caseId, user.firmId);

  const content = z.string().trim().min(1).parse(formData.get("content"));
  const note = await prisma.note.create({
    data: { firmId: user.firmId, caseId, authorId: user.id, content, source: "manual" },
  });

  await audit({ firmId: user.firmId, userId: user.id, action: "note.create", entityType: "Note", entityId: note.id });
  revalidatePath(`/cases/${caseId}`);
}

// ---------- Time entries ----------

export async function addTimeEntry(formData: FormData) {
  const user = await requireUser();
  const schema = z.object({
    caseId: z.string().min(1),
    date: z.string().min(1),
    hours: z.coerce.number().min(0).max(24),
    mins: z.coerce.number().int().min(0).max(59),
    description: z.string().trim().min(2),
    billable: z.coerce.boolean(),
    rateEuros: z.coerce.number().min(0).max(10000),
  });
  const data = schema.parse({
    caseId: formData.get("caseId"),
    date: formData.get("date"),
    hours: formData.get("hours") || 0,
    mins: formData.get("mins") || 0,
    description: formData.get("description"),
    billable: formData.get("billable") === "on",
    rateEuros: formData.get("rateEuros") || 0,
  });

  await assertCaseInFirm(data.caseId, user.firmId);
  const minutes = Math.round(data.hours * 60) + data.mins;
  if (minutes <= 0) throw new Error("Ο χρόνος πρέπει να είναι > 0");

  const entry = await prisma.timeEntry.create({
    data: {
      firmId: user.firmId,
      caseId: data.caseId,
      userId: user.id,
      date: new Date(data.date),
      minutes,
      description: data.description,
      billable: data.billable,
      rateCents: Math.round(data.rateEuros * 100),
    },
  });

  await audit({ firmId: user.firmId, userId: user.id, action: "time.create", entityType: "TimeEntry", entityId: entry.id });
  revalidatePath(`/cases/${data.caseId}`);
  revalidatePath("/time");
}

// ---------- Documents ----------

const MAX_UPLOAD_BYTES = 15 * 1024 * 1024;

export async function uploadDocument(caseId: string, formData: FormData) {
  const user = await requireUser();
  if (!canSeeLegalContent(user.role)) throw new Error("Δεν έχετε πρόσβαση σε έγγραφα υποθέσεων");
  await assertCaseInFirm(caseId, user.firmId);

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) throw new Error("Δεν επιλέχθηκε αρχείο");
  if (file.size > MAX_UPLOAD_BYTES) throw new Error("Μέγιστο μέγεθος αρχείου: 15MB");

  const schema = z.object({
    title: z.string().trim().min(2),
    docType: z.enum(DOC_TYPES),
    parentId: z.string().optional(),
  });
  const meta = schema.parse({
    title: formData.get("title"),
    docType: formData.get("docType"),
    parentId: formData.get("parentId") || undefined,
  });

  let version = 1;
  if (meta.parentId) {
    const parent = await prisma.document.findFirst({ where: { id: meta.parentId, firmId: user.firmId, caseId } });
    if (!parent) throw new Error("Το προηγούμενο έγγραφο δεν βρέθηκε");
    version = parent.version + 1;
  }

  const key = makeStorageKey(user.firmId, file.name);
  await storage.put(key, Buffer.from(await file.arrayBuffer()));

  const doc = await prisma.document.create({
    data: {
      firmId: user.firmId,
      caseId,
      title: meta.title,
      docType: meta.docType,
      fileName: file.name,
      filePath: key,
      mimeType: file.type || "application/octet-stream",
      size: file.size,
      version,
      parentId: meta.parentId || null,
      uploadedById: user.id,
    },
  });

  await audit({ firmId: user.firmId, userId: user.id, action: "document.upload", entityType: "Document", entityId: doc.id, detail: file.name });
  revalidatePath(`/cases/${caseId}`);
}
