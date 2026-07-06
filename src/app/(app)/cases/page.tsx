import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { Badge, EmptyState, PageHeader } from "@/components/ui";
import {
  CASE_STATUS_LABELS,
  PRACTICE_AREA_LABELS,
  type CaseStatus,
  type PracticeArea,
} from "@/lib/constants";
import { formatDate } from "@/lib/format";

export const metadata: Metadata = { title: "Υποθέσεις" };

export default async function CasesPage(props: PageProps<"/cases">) {
  const user = await requireUser();
  const sp = await props.searchParams;
  const statusFilter = typeof sp.status === "string" ? sp.status : undefined;

  const cases = await prisma.case.findMany({
    where: { firmId: user.firmId, ...(statusFilter ? { status: statusFilter } : {}) },
    orderBy: { updatedAt: "desc" },
    include: {
      client: { select: { fullName: true } },
      assignments: { include: { user: { select: { name: true } } } },
      _count: { select: { deadlines: { where: { status: "pending" } } } },
    },
  });

  return (
    <div>
      <PageHeader
        kicker="Δικογραφια"
        title="Υποθέσεις"
        action={
          <Link href="/cases/new" className="btn btn-primary">
            + Νέα υπόθεση
          </Link>
        }
      />

      <div className="flex gap-2 mb-4 text-sm">
        <FilterLink href="/cases" active={!statusFilter} label="Όλες" />
        {(["active", "pending", "closed"] as const).map((s) => (
          <FilterLink key={s} href={`/cases?status=${s}`} active={statusFilter === s} label={CASE_STATUS_LABELS[s]} />
        ))}
      </div>

      {cases.length === 0 ? (
        <EmptyState>Δεν βρέθηκαν υποθέσεις.</EmptyState>
      ) : (
        <div className="card overflow-x-auto">
          <table className="table-ledger">
            <thead>
              <tr>
                <th>Υπόθεση</th>
                <th>Πελάτης</th>
                <th>Τομέας</th>
                <th>Κατάσταση</th>
                <th>Χειριστές</th>
                <th>Προθεσμίες</th>
                <th>Ενημέρωση</th>
              </tr>
            </thead>
            <tbody>
              {cases.map((c) => (
                <tr key={c.id}>
                  <td>
                    <Link href={`/cases/${c.id}`} className="font-medium hover:underline">
                      {c.title}
                    </Link>
                    {c.caseNumber && <div className="text-xs text-ink-faint">{c.caseNumber}</div>}
                  </td>
                  <td className="text-ink-soft">{c.client.fullName}</td>
                  <td>
                    <Badge tone="brass">{PRACTICE_AREA_LABELS[c.practiceArea as PracticeArea] ?? c.practiceArea}</Badge>
                  </td>
                  <td>
                    <Badge tone={c.status === "active" ? "green" : c.status === "pending" ? "amber" : "neutral"}>
                      {CASE_STATUS_LABELS[c.status as CaseStatus] ?? c.status}
                    </Badge>
                  </td>
                  <td className="text-xs text-ink-soft">
                    {c.assignments.map((a) => a.user.name.split(" ")[0]).join(", ") || "—"}
                  </td>
                  <td>
                    {c._count.deadlines > 0 ? (
                      <span className="font-semibold text-oxblood tabular">{c._count.deadlines}</span>
                    ) : (
                      <span className="text-ink-faint">—</span>
                    )}
                  </td>
                  <td className="text-xs text-ink-faint tabular">{formatDate(c.updatedAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function FilterLink({ href, active, label }: { href: string; active: boolean; label: string }) {
  return (
    <Link
      href={href}
      className={`px-3 py-1.5 rounded-full border text-sm transition-colors ${
        active ? "bg-ink text-paper border-ink" : "border-line-strong text-ink-soft hover:border-ink-soft"
      }`}
    >
      {label}
    </Link>
  );
}
