"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { hash } from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/session";
import { audit } from "@/lib/audit";
import { PRACTICE_AREAS, ROLES } from "@/lib/constants";

export async function updateFirm(formData: FormData) {
  const user = await requireRole(["owner"]);
  const schema = z.object({
    name: z.string().trim().min(2),
    vatNumber: z.string().trim().optional(),
    address: z.string().trim().optional(),
    phone: z.string().trim().optional(),
    email: z.string().trim().email().optional().or(z.literal("")),
    publicBio: z.string().trim().max(1000).optional(),
  });
  const data = schema.parse({
    name: formData.get("name"),
    vatNumber: formData.get("vatNumber") || undefined,
    address: formData.get("address") || undefined,
    phone: formData.get("phone") || undefined,
    email: formData.get("email") || "",
    publicBio: formData.get("publicBio") || undefined,
  });
  const practiceAreas = formData.getAll("practiceAreas").map(String).filter((a) =>
    (PRACTICE_AREAS as readonly string[]).includes(a)
  );

  await prisma.firm.update({
    where: { id: user.firmId },
    data: { ...data, email: data.email || null, practiceAreas: practiceAreas.join(",") || "civil" },
  });

  await audit({ firmId: user.firmId, userId: user.id, action: "firm.update", entityType: "Firm", entityId: user.firmId });
  revalidatePath("/settings");
}

export async function createUser(formData: FormData) {
  const user = await requireRole(["owner"]);
  const schema = z.object({
    name: z.string().trim().min(2),
    email: z.string().trim().email().toLowerCase(),
    role: z.enum(ROLES),
    password: z.string().min(8, "Τουλάχιστον 8 χαρακτήρες"),
    hourlyRateEuros: z.coerce.number().min(0).max(10000),
  });
  const data = schema.parse({
    name: formData.get("name"),
    email: formData.get("email"),
    role: formData.get("role"),
    password: formData.get("password"),
    hourlyRateEuros: formData.get("hourlyRateEuros") || 0,
  });

  const existing = await prisma.user.findUnique({ where: { email: data.email } });
  if (existing) throw new Error("Υπάρχει ήδη χρήστης με αυτό το email");

  const created = await prisma.user.create({
    data: {
      name: data.name,
      email: data.email,
      role: data.role,
      passwordHash: await hash(data.password, 10),
      hourlyRateCents: Math.round(data.hourlyRateEuros * 100),
      firmId: user.firmId,
    },
  });

  await audit({ firmId: user.firmId, userId: user.id, action: "user.create", entityType: "User", entityId: created.id, detail: data.role });
  revalidatePath("/settings");
}

export async function toggleUserActive(userId: string) {
  const user = await requireRole(["owner"]);
  if (userId === user.id) throw new Error("Δεν μπορείτε να απενεργοποιήσετε τον εαυτό σας");
  const target = await prisma.user.findFirst({ where: { id: userId, firmId: user.firmId } });
  if (!target) throw new Error("Ο χρήστης δεν βρέθηκε");

  await prisma.user.update({ where: { id: userId }, data: { active: !target.active } });
  await audit({ firmId: user.firmId, userId: user.id, action: target.active ? "user.deactivate" : "user.activate", entityType: "User", entityId: userId });
  revalidatePath("/settings");
}

export async function createTemplate(formData: FormData) {
  const user = await requireRole(["owner"]);
  const schema = z.object({
    name: z.string().trim().min(2),
    area: z.enum(PRACTICE_AREAS),
    fieldsJson: z.string().trim(),
  });
  const data = schema.parse({
    name: formData.get("name"),
    area: formData.get("area"),
    fieldsJson: formData.get("fieldsJson") || "[]",
  });

  // validate the JSON shape
  let fields: unknown;
  try {
    fields = JSON.parse(data.fieldsJson);
  } catch {
    throw new Error("Μη έγκυρο JSON πεδίων");
  }
  const fieldSchema = z.array(
    z.object({
      key: z.string().regex(/^[a-z0-9_]+$/, "key: μόνο a-z, 0-9, _"),
      label: z.string().min(1),
      type: z.enum(["text", "number", "date", "select"]),
      options: z.array(z.string()).optional(),
    })
  );
  const parsedFields = fieldSchema.parse(fields);

  const tpl = await prisma.practiceAreaTemplate.create({
    data: { firmId: user.firmId, name: data.name, area: data.area, fieldsJson: JSON.stringify(parsedFields) },
  });

  await audit({ firmId: user.firmId, userId: user.id, action: "template.create", entityType: "PracticeAreaTemplate", entityId: tpl.id });
  revalidatePath("/settings");
}
