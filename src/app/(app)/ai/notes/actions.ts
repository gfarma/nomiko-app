"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser, canSeeLegalContent } from "@/lib/session";
import { audit } from "@/lib/audit";
import { flags } from "@/lib/flags";
import { aiComplete } from "@/lib/ai/provider";
import { pseudonymize } from "@/lib/ai/pseudonymize";
import { AI_DISCLAIMER } from "@/lib/constants";

const SYSTEM_PROMPT = `Είσαι διοικητικός βοηθός δικηγορικού γραφείου. Μετατρέπεις πρόχειρες/τηλεγραφικές σημειώσεις σε δομημένο πρακτικό συνάντησης στα ελληνικά, με ενότητες: Σημεία συζήτησης, Αποφάσεις, Εκκρεμότητες/Επόμενες ενέργειες.
ΚΑΝΟΝΕΣ:
- ΔΕΝ παρέχεις νομική συμβουλή, νομική ανάλυση ή προτάσεις στρατηγικής.
- ΔΕΝ προσθέτεις αναφορές σε νόμους, άρθρα ή νομολογία που δεν υπάρχουν στις σημειώσεις. Αν οι σημειώσεις αναφέρουν διάταξη/απόφαση, τη μεταφέρεις αυτούσια με την ένδειξη «[ΑΝΕΠΙΒΕΒΑΙΩΤΟ — ΕΛΕΓΞΕ ΠΡΙΝ ΧΡΗΣΙΜΟΠΟΙΗΣΕΙΣ]».
- Δεν επινοείς γεγονότα. Ό,τι δεν προκύπτει από τις σημειώσεις, δεν το γράφεις.
- Τα ψευδωνυμοποιημένα tokens (π.χ. [ΠΡΟΣΩΠΟ_1], [ΤΗΛΕΦΩΝΟ]) τα διατηρείς ως έχουν.`;

export type GenerateState = {
  output?: string;
  logId?: string;
  model?: string;
  mocked?: boolean;
  replacements?: number;
  error?: string;
  caseId?: string;
};

export async function generateStructuredNotes(_prev: GenerateState, formData: FormData): Promise<GenerateState> {
  const user = await requireUser();
  if (!canSeeLegalContent(user.role)) return { error: "Δεν έχετε πρόσβαση σε αυτή τη λειτουργία." };
  if (!flags.aiFeatures) return { error: "Οι AI λειτουργίες είναι απενεργοποιημένες (ENABLE_AI_FEATURES=false)." };

  const schema = z.object({ caseId: z.string().min(1), rawNotes: z.string().trim().min(10, "Γράψτε τουλάχιστον μερικές λέξεις") });
  const parsed = schema.safeParse({ caseId: formData.get("caseId"), rawNotes: formData.get("rawNotes") });
  if (!parsed.success) return { error: "Συμπληρώστε υπόθεση και σημειώσεις (τουλάχιστον 10 χαρακτήρες)." };
  const { caseId, rawNotes } = parsed.data;

  const c = await prisma.case.findFirst({
    where: { id: caseId, firmId: user.firmId },
    include: { client: { select: { fullName: true } } },
  });
  if (!c) return { error: "Η υπόθεση δεν βρέθηκε." };

  // Pseudonymize before anything leaves the app
  const { text: pseudonymized, replacements } = pseudonymize(rawNotes, [c.client.fullName]);

  try {
    const result = await aiComplete(SYSTEM_PROMPT, pseudonymized);

    const log = await prisma.aIInteractionLog.create({
      data: {
        firmId: user.firmId,
        userId: user.id,
        feature: "notes_structure",
        inputSummary: pseudonymized.slice(0, 2000),
        output: result.output,
        model: result.model,
        provider: result.provider,
        caseId: c.id,
        reviewedByLawyer: false,
      },
    });

    await audit({
      firmId: user.firmId,
      userId: user.id,
      action: "ai.notes_structure",
      entityType: "Case",
      entityId: c.id,
      detail: `model=${result.model} pseudonymized=${replacements}`,
      aiInvolved: true,
    });

    return { output: result.output, logId: log.id, model: result.model, mocked: result.mocked, replacements, caseId: c.id };
  } catch (err) {
    console.error("[ai] notes_structure failed", err);
    return { error: "Σφάλμα AI παρόχου. Δοκιμάστε ξανά αργότερα." };
  }
}

/** Human-in-the-loop: the lawyer explicitly accepts (and may have edited) the output. */
export async function acceptStructuredNotes(formData: FormData) {
  const user = await requireUser();
  if (!canSeeLegalContent(user.role)) throw new Error("Δεν έχετε πρόσβαση");

  const schema = z.object({ logId: z.string().min(1), caseId: z.string().min(1), content: z.string().trim().min(10) });
  const { logId, caseId, content } = schema.parse({
    logId: formData.get("logId"),
    caseId: formData.get("caseId"),
    content: formData.get("content"),
  });

  const [log, c] = await Promise.all([
    prisma.aIInteractionLog.findFirst({ where: { id: logId, firmId: user.firmId } }),
    prisma.case.findFirst({ where: { id: caseId, firmId: user.firmId } }),
  ]);
  if (!log || !c) throw new Error("Δεν βρέθηκε η καταχώρηση");

  const note = await prisma.note.create({
    data: {
      firmId: user.firmId,
      caseId,
      authorId: user.id,
      content: `${content}\n\n— ${AI_DISCLAIMER}`,
      source: "ai_structured",
      aiLogId: logId,
    },
  });
  await prisma.aIInteractionLog.update({ where: { id: logId }, data: { reviewedByLawyer: true } });

  await audit({
    firmId: user.firmId,
    userId: user.id,
    action: "ai.notes_accept",
    entityType: "Note",
    entityId: note.id,
    aiInvolved: true,
  });

  revalidatePath(`/cases/${caseId}`);
  redirect(`/cases/${caseId}`);
}
