import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { Badge, DueChip, EmptyState, PageHeader } from "@/components/ui";
import { DEADLINE_TYPE_LABELS, type DeadlineType } from "@/lib/constants";
import { daysUntil, formatDateTime } from "@/lib/format";
import { setDeadlineStatus } from "../cases/actions";

export const metadata: Metadata = { title: "Προθεσμίες" };

export default async function DeadlinesPage(props: PageProps<"/deadlines">) {
  const user = await requireUser();
  const sp = await props.searchParams;
  const showDone = sp.all === "1";

  const deadlines = await prisma.deadline.findMany({
    where: { firmId: user.firmId, ...(showDone ? {} : { status: "pending" }) },
    orderBy: { dueAt: "asc" },
    include: { case: { select: { id: true, title: true, client: { select: { fullName: true } } } } },
  });

  const overdue = deadlines.filter((d) => d.status === "pending" && daysUntil(d.dueAt) < 0);
  const thisWeek = deadlines.filter((d) => d.status === "pending" && daysUntil(d.dueAt) >= 0 && daysUntil(d.dueAt) <= 7);
  const later = deadlines.filter((d) => (d.status === "pending" ? daysUntil(d.dueAt) > 7 : showDone));

  return (
    <div>
      <PageHeader
        kicker="Ημερολογιο"
        title="Προθεσμίες"
        action={
          <Link href={showDone ? "/deadlines" : "/deadlines?all=1"} className="btn btn-secondary">
            {showDone ? "Μόνο εκκρεμείς" : "Εμφάνιση όλων"}
          </Link>
        }
      />

      {deadlines.length === 0 && <EmptyState>Καμία προθεσμία. Προσθέστε προθεσμίες μέσα από κάθε υπόθεση.</EmptyState>}

      {overdue.length > 0 && (
        <Section title={`⚠ Εκπρόθεσμες (${overdue.length})`} tone="danger">
          {overdue.map((d) => (
            <DeadlineRow key={d.id} d={d} />
          ))}
        </Section>
      )}
      {thisWeek.length > 0 && (
        <Section title={`Επόμενες 7 ημέρες (${thisWeek.length})`} tone="warn">
          {thisWeek.map((d) => (
            <DeadlineRow key={d.id} d={d} />
          ))}
        </Section>
      )}
      {later.length > 0 && (
        <Section title={showDone ? "Υπόλοιπες / Ολοκληρωμένες" : "Αργότερα"}>
          {later.map((d) => (
            <DeadlineRow key={d.id} d={d} />
          ))}
        </Section>
      )}
    </div>
  );
}

function Section({ title, tone, children }: { title: string; tone?: "danger" | "warn"; children: React.ReactNode }) {
  return (
    <section className="card overflow-hidden mb-6">
      <h2
        className={`font-display text-lg font-semibold px-5 py-3 border-b border-line ${
          tone === "danger" ? "bg-oxblood-pale text-oxblood" : tone === "warn" ? "bg-amber-pale" : ""
        }`}
      >
        {title}
      </h2>
      <ul className="divide-y divide-line">{children}</ul>
    </section>
  );
}

type DeadlineWithCase = {
  id: string;
  title: string;
  type: string;
  dueAt: Date;
  status: string;
  remindDaysBefore: number;
  case: { id: string; title: string; client: { fullName: string } };
};

function DeadlineRow({ d }: { d: DeadlineWithCase }) {
  return (
    <li className="px-5 py-3 flex items-center gap-4">
      <div className="flex-1 min-w-0">
        <p className={`font-medium ${d.status === "done" ? "line-through text-ink-faint" : ""}`}>{d.title}</p>
        <p className="text-xs text-ink-faint truncate">
          <Link href={`/cases/${d.case.id}`} className="hover:underline">
            {d.case.title}
          </Link>{" "}
          · {d.case.client.fullName}
        </p>
      </div>
      <Badge tone="neutral">{DEADLINE_TYPE_LABELS[d.type as DeadlineType] ?? d.type}</Badge>
      <span className="text-sm tabular text-ink-soft w-36 text-right">{formatDateTime(d.dueAt)}</span>
      <DueChip dueAt={d.dueAt} status={d.status} />
      {d.status === "pending" && (
        <form
          action={async () => {
            "use server";
            await setDeadlineStatus(d.id, "done");
          }}
        >
          <button className="btn btn-secondary text-xs px-2 py-1" title="Ολοκληρώθηκε">✓</button>
        </form>
      )}
    </li>
  );
}
