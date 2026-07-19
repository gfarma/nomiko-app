import { prisma } from "@/lib/prisma";

/** Accent-insensitive, case-insensitive normalization for Greek names. */
export function normalizeName(s: string): string {
  return s
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/\(demo\)/g, "")
    .replace(/[^a-zα-ω0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function namesOverlap(a: string, b: string): boolean {
  const na = normalizeName(a);
  const nb = normalizeName(b);
  if (na.length < 4 || nb.length < 4) return false;
  if (na.includes(nb) || nb.includes(na)) return true;
  // surname+name in different order: require ≥2 common tokens of length ≥4
  const ta = new Set(na.split(" ").filter((t) => t.length >= 4));
  const common = nb.split(" ").filter((t) => t.length >= 4 && ta.has(t));
  return common.length >= 2;
}

export type ConflictHit = {
  kind: "opposing_is_client" | "client_is_opposing";
  caseId: string;
  caseTitle: string;
  matchedName: string;
};

/**
 * Έλεγχος σύγκρουσης συμφερόντων:
 *  - Ο αντίδικος της υπόθεσης είναι (ή μοιάζει με) υφιστάμενος πελάτης του γραφείου.
 *  - Ο πελάτης εμφανίζεται ως αντίδικος σε άλλη υπόθεση του γραφείου.
 * Ενδεικτικός έλεγχος ονομάτων (συνωνυμίες υπαρκτές) — πάντα κρίνει ο δικηγόρος.
 */
export async function findConflictsForCase(params: {
  firmId: string;
  caseId?: string;
  clientId: string;
  opposingParty?: string | null;
}): Promise<ConflictHit[]> {
  const hits: ConflictHit[] = [];

  const [clients, cases, thisClient] = await Promise.all([
    prisma.client.findMany({ where: { firmId: params.firmId }, select: { id: true, fullName: true } }),
    prisma.case.findMany({
      where: { firmId: params.firmId, ...(params.caseId ? { id: { not: params.caseId } } : {}), opposingParty: { not: null } },
      select: { id: true, title: true, opposingParty: true, clientId: true },
    }),
    prisma.client.findUnique({ where: { id: params.clientId }, select: { fullName: true } }),
  ]);

  if (params.opposingParty) {
    for (const cl of clients) {
      if (cl.id === params.clientId) continue;
      if (namesOverlap(cl.fullName, params.opposingParty)) {
        hits.push({
          kind: "opposing_is_client",
          caseId: params.caseId ?? "",
          caseTitle: "",
          matchedName: cl.fullName,
        });
      }
    }
  }

  if (thisClient) {
    for (const c of cases) {
      if (c.opposingParty && namesOverlap(thisClient.fullName, c.opposingParty)) {
        hits.push({ kind: "client_is_opposing", caseId: c.id, caseTitle: c.title, matchedName: c.opposingParty });
      }
    }
  }

  return hits;
}
