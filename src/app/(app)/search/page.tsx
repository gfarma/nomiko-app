import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { Badge, EmptyState, PageHeader } from "@/components/ui";
import {
  CASE_STATUS_LABELS,
  CLIENT_TYPE_LABELS,
  PRACTICE_AREA_LABELS,
  type CaseStatus,
  type ClientType,
  type PracticeArea,
} from "@/lib/constants";

export const metadata: Metadata = { title: "Αναζήτηση" };

export default async function SearchPage(props: PageProps<"/search">) {
  const user = await requireUser();
  const sp = await props.searchParams;
  const q = (typeof sp.q === "string" ? sp.q : "").trim();

  const [cases, clients, leads] = q.length >= 2
    ? await Promise.all([
        prisma.case.findMany({
          where: {
            firmId: user.firmId,
            OR: [
              { title: { contains: q, mode: "insensitive" } },
              { caseNumber: { contains: q, mode: "insensitive" } },
              { opposingParty: { contains: q, mode: "insensitive" } },
              { court: { contains: q, mode: "insensitive" } },
            ],
          },
          take: 20,
          include: { client: { select: { fullName: true } } },
          orderBy: { updatedAt: "desc" },
        }),
        prisma.client.findMany({
          where: {
            firmId: user.firmId,
            OR: [
              { fullName: { contains: q, mode: "insensitive" } },
              { vatNumber: { contains: q } },
              { phone: { contains: q } },
              { email: { contains: q, mode: "insensitive" } },
            ],
          },
          take: 20,
          orderBy: { updatedAt: "desc" },
        }),
        prisma.lead.findMany({
          where: {
            firmId: user.firmId,
            OR: [{ name: { contains: q, mode: "insensitive" } }, { message: { contains: q, mode: "insensitive" } }],
          },
          take: 10,
          orderBy: { createdAt: "desc" },
        }),
      ])
    : [[], [], []];

  const total = cases.length + clients.length + leads.length;

  return (
    <div className="max-w-3xl">
      <PageHeader kicker="Αναζητηση" title={q ? `Αποτελέσματα για «${q}»` : "Αναζήτηση"} />

      <form method="GET" className="card p-4 mb-6 flex gap-3">
        <input
          name="q"
          defaultValue={q}
          autoFocus
          className="field flex-1"
          placeholder="Όνομα, ΓΑΚ/ΕΑΚ, ΑΦΜ, τηλέφωνο, αντίδικος…"
        />
        <button className="btn btn-primary">Αναζήτηση</button>
      </form>

      {q.length >= 2 && total === 0 && <EmptyState>Τίποτα για «{q}».</EmptyState>}

      {cases.length > 0 && (
        <section className="card overflow-hidden mb-6">
          <h2 className="font-display text-lg font-semibold px-5 py-3 border-b border-line">Υποθέσεις ({cases.length})</h2>
          <ul className="divide-y divide-line">
            {cases.map((c) => (
              <li key={c.id} className="px-5 py-3 flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <Link href={`/cases/${c.id}`} className="font-medium hover:underline">
                    {c.title}
                  </Link>
                  <p className="text-xs text-ink-faint">
                    {c.client.fullName}
                    {c.caseNumber && ` · ${c.caseNumber}`}
                    {c.opposingParty && ` · κατά: ${c.opposingParty}`}
                  </p>
                </div>
                <Badge tone="brass">{PRACTICE_AREA_LABELS[c.practiceArea as PracticeArea] ?? c.practiceArea}</Badge>
                <Badge tone={c.status === "active" ? "green" : "neutral"}>
                  {CASE_STATUS_LABELS[c.status as CaseStatus] ?? c.status}
                </Badge>
              </li>
            ))}
          </ul>
        </section>
      )}

      {clients.length > 0 && (
        <section className="card overflow-hidden mb-6">
          <h2 className="font-display text-lg font-semibold px-5 py-3 border-b border-line">Πελάτες ({clients.length})</h2>
          <ul className="divide-y divide-line">
            {clients.map((cl) => (
              <li key={cl.id} className="px-5 py-3 flex items-center gap-3">
                <Link href={`/clients/${cl.id}`} className="font-medium hover:underline flex-1">
                  {cl.fullName}
                </Link>
                <span className="text-xs text-ink-faint">{[cl.phone, cl.email].filter(Boolean).join(" · ")}</span>
                <Badge tone={cl.type === "company" ? "brass" : "neutral"}>
                  {CLIENT_TYPE_LABELS[cl.type as ClientType] ?? cl.type}
                </Badge>
              </li>
            ))}
          </ul>
        </section>
      )}

      {leads.length > 0 && (
        <section className="card overflow-hidden">
          <h2 className="font-display text-lg font-semibold px-5 py-3 border-b border-line">Αιτήματα ({leads.length})</h2>
          <ul className="divide-y divide-line">
            {leads.map((l) => (
              <li key={l.id} className="px-5 py-3 text-sm">
                <Link href="/leads" className="font-medium hover:underline">
                  {l.name}
                </Link>
                <p className="text-xs text-ink-faint truncate">{l.message}</p>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
