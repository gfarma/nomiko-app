import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { formatDate, formatMinutes, formatMoney } from "@/lib/format";
import { Badge, DueChip, EmptyState, PageHeader } from "@/components/ui";
import { PRACTICE_AREA_LABELS, type PracticeArea } from "@/lib/constants";

export const metadata: Metadata = { title: "Επισκόπηση" };

export default async function DashboardPage() {
  const user = await requireUser();
  const firmId = user.firmId;

  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  const [upcoming, activeCases, clientCount, newLeads, monthMinutes, unpaid] = await Promise.all([
    prisma.deadline.findMany({
      where: { firmId, status: "pending" },
      orderBy: { dueAt: "asc" },
      take: 8,
      include: { case: { select: { id: true, title: true, client: { select: { fullName: true } } } } },
    }),
    prisma.case.findMany({
      where: { firmId, status: "active" },
      orderBy: { updatedAt: "desc" },
      take: 6,
      include: { client: { select: { fullName: true } }, _count: { select: { deadlines: { where: { status: "pending" } } } } },
    }),
    prisma.client.count({ where: { firmId } }),
    prisma.lead.count({ where: { firmId, status: "new" } }),
    prisma.timeEntry.aggregate({ where: { firmId, date: { gte: monthStart } }, _sum: { minutes: true } }),
    prisma.invoice.aggregate({ where: { firmId, status: "issued" }, _sum: { totalCents: true } }),
  ]);

  const overdueCount = upcoming.filter((d) => d.dueAt < new Date()).length;

  return (
    <div>
      <PageHeader kicker="Επισκοπηση" title={`Καλώς ήρθατε, ${user.name.split(" ")[0]}`} />

      {/* Stat strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard label="Ενεργές υποθέσεις" value={String(activeCases.length)} href="/cases" />
        <StatCard label="Πελάτες" value={String(clientCount)} href="/clients" />
        <StatCard label="Ώρες μήνα" value={formatMinutes(monthMinutes._sum.minutes ?? 0)} href="/time" />
        <StatCard label="Ανεξόφλητα" value={formatMoney(unpaid._sum.totalCents ?? 0)} href="/invoices" />
      </div>

      <div className="grid lg:grid-cols-5 gap-6">
        {/* Deadlines — the most prominent block by design */}
        <section className="lg:col-span-3 card overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-line bg-gradient-to-r from-oxblood-pale/60 to-transparent">
            <div>
              <h2 className="font-display text-lg font-semibold">Επερχόμενες προθεσμίες</h2>
              {overdueCount > 0 && (
                <p className="text-xs font-bold text-oxblood mt-0.5">⚠ {overdueCount} εκπρόθεσμη/ες — άμεση ενέργεια</p>
              )}
            </div>
            <Link href="/deadlines" className="text-sm underline underline-offset-2 text-ink-soft hover:text-ink">
              Όλες →
            </Link>
          </div>
          {upcoming.length === 0 ? (
            <div className="p-6 text-sm text-ink-faint">Καμία εκκρεμής προθεσμία.</div>
          ) : (
            <ul className="divide-y divide-line">
              {upcoming.map((d) => (
                <li key={d.id} className="px-5 py-3 flex items-center gap-4">
                  <div className="w-14 text-center shrink-0">
                    <div className="font-display text-xl font-semibold tabular leading-none">
                      {new Date(d.dueAt).getDate()}
                    </div>
                    <div className="text-[10px] uppercase tracking-wide text-ink-faint">
                      {new Intl.DateTimeFormat("el-GR", { month: "short" }).format(d.dueAt)}
                    </div>
                  </div>
                  <div className="min-w-0 flex-1">
                    <Link href={`/cases/${d.case.id}`} className="font-medium hover:underline block truncate">
                      {d.title}
                    </Link>
                    <p className="text-xs text-ink-faint truncate">
                      {d.case.title} · {d.case.client.fullName}
                    </p>
                  </div>
                  <DueChip dueAt={d.dueAt} status={d.status} />
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Active cases */}
        <section className="lg:col-span-2 space-y-6">
          <div className="card overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-line">
              <h2 className="font-display text-lg font-semibold">Ενεργές υποθέσεις</h2>
              <Link href="/cases" className="text-sm underline underline-offset-2 text-ink-soft hover:text-ink">
                Όλες →
              </Link>
            </div>
            {activeCases.length === 0 ? (
              <div className="p-6 text-sm text-ink-faint">Δεν υπάρχουν ενεργές υποθέσεις.</div>
            ) : (
              <ul className="divide-y divide-line">
                {activeCases.map((c) => (
                  <li key={c.id} className="px-5 py-3">
                    <Link href={`/cases/${c.id}`} className="font-medium hover:underline block truncate">
                      {c.title}
                    </Link>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge tone="brass">{PRACTICE_AREA_LABELS[c.practiceArea as PracticeArea] ?? c.practiceArea}</Badge>
                      <span className="text-xs text-ink-faint truncate">{c.client.fullName}</span>
                      {c._count.deadlines > 0 && (
                        <span className="text-xs text-oxblood font-semibold ml-auto shrink-0">
                          {c._count.deadlines} προθεσμ.
                        </span>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {newLeads > 0 && (
            <Link href="/leads" className="card block p-5 border-brass/40 hover:border-brass transition-colors">
              <p className="kicker text-brass-dark">Νεα αιτηματα</p>
              <p className="mt-1 text-sm">
                <span className="font-display text-2xl font-semibold text-brass-dark">{newLeads}</span> νέο/α αιτήματα
                επικοινωνίας από τη δημόσια σελίδα σας.
              </p>
            </Link>
          )}
        </section>
      </div>

      <p className="mt-10 text-xs text-ink-faint">
        Demo περιβάλλον — όλα τα δεδομένα είναι πλαστά. Σημερινή ημερομηνία: {formatDate(new Date())}
      </p>
    </div>
  );
}

function StatCard({ label, value, href }: { label: string; value: string; href: string }) {
  return (
    <Link href={href} className="card p-4 hover:border-brass/50 transition-colors">
      <p className="kicker">{label}</p>
      <p className="font-display text-2xl font-semibold mt-1 tabular">{value}</p>
    </Link>
  );
}
