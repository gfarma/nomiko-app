import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { requireUser, canSeeLegalContent } from "@/lib/session";
import { PageHeader, EmptyState } from "@/components/ui";
import { flags } from "@/lib/flags";
import { NotesAssistant } from "./notes-assistant";

export const metadata: Metadata = { title: "AI Βοηθός — Δόμηση σημειώσεων" };

export default async function AiNotesPage(props: PageProps<"/ai/notes">) {
  const user = await requireUser();
  const sp = await props.searchParams;
  const defaultCaseId = typeof sp.caseId === "string" ? sp.caseId : undefined;

  if (!canSeeLegalContent(user.role)) {
    return (
      <div>
        <PageHeader kicker="AI Βοηθος" title="Δόμηση σημειώσεων" />
        <EmptyState>Η λειτουργία είναι διαθέσιμη μόνο σε δικηγόρους και ασκούμενους.</EmptyState>
      </div>
    );
  }

  if (!flags.aiFeatures) {
    return (
      <div>
        <PageHeader kicker="AI Βοηθος" title="Δόμηση σημειώσεων" />
        <EmptyState>
          Οι AI λειτουργίες είναι απενεργοποιημένες σε αυτό το περιβάλλον (<code>ENABLE_AI_FEATURES=false</code>).
          <br />
          Ενεργοποιούνται μόνο σε demo/test περιβάλλον με πλαστά δεδομένα, μέχρι να κλειδωθεί DPA-backed πάροχος.
        </EmptyState>
      </div>
    );
  }

  const cases = await prisma.case.findMany({
    where: { firmId: user.firmId, status: { in: ["active", "pending"] } },
    orderBy: { title: "asc" },
    select: { id: true, title: true },
  });

  return (
    <div>
      <PageHeader kicker="AI Βοηθος · Διοικητικη υποστηριξη" title="Δόμηση σημειώσεων" />
      <div className="card border-dashed p-4 mb-6 text-xs text-ink-soft">
        <strong>Όρια λειτουργίας:</strong> Το εργαλείο δομεί σημειώσεις — δεν παρέχει νομική συμβουλή, δεν προσθέτει
        νομολογία και τίποτα δεν αποθηκεύεται χωρίς ρητή έγκριση δικηγόρου (human-in-the-loop). Κάθε κλήση καταγράφεται
        στο μητρώο AI αλληλεπιδράσεων με ψευδωνυμοποιημένη είσοδο.
      </div>
      <NotesAssistant cases={cases} defaultCaseId={defaultCaseId} />
    </div>
  );
}
