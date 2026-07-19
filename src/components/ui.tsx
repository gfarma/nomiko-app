import Link from "next/link";
import { daysUntil } from "@/lib/format";

export function PageHeader({
  kicker,
  title,
  action,
}: {
  kicker: string;
  title: string;
  action?: React.ReactNode;
}) {
  return (
    <header className="flex items-end justify-between gap-4 mb-6">
      <div>
        <p className="kicker">{kicker}</p>
        <h1 className="font-display text-3xl font-semibold tracking-tight mt-1">{title}</h1>
      </div>
      {action}
    </header>
  );
}

const BADGE_TONES = {
  neutral: "bg-paper text-ink-soft border border-line-strong",
  brass: "bg-brass-pale text-brass-dark",
  green: "bg-moss-pale text-moss",
  red: "bg-oxblood-pale text-oxblood",
  amber: "bg-amber-pale text-amber",
  ink: "bg-ink text-paper",
} as const;

export function Badge({ tone = "neutral", children }: { tone?: keyof typeof BADGE_TONES; children: React.ReactNode }) {
  return <span className={`badge ${BADGE_TONES[tone]}`}>{children}</span>;
}

/** Prominent deadline urgency chip — a missed deadline is potential malpractice. */
export function DueChip({ dueAt, status }: { dueAt: Date; status: string }) {
  if (status === "done") return <Badge tone="green">Ολοκληρώθηκε</Badge>;
  if (status === "postponed") return <Badge tone="neutral">Αναβλήθηκε</Badge>;
  const d = daysUntil(dueAt);
  if (status === "missed" || d < 0) return <Badge tone="red">Εκπρόθεσμη {d < 0 ? `(${Math.abs(d)}ημ)` : ""}</Badge>;
  if (d === 0) return <Badge tone="red">ΣΗΜΕΡΑ</Badge>;
  if (d <= 3) return <Badge tone="red">σε {d} ημέρες</Badge>;
  if (d <= 7) return <Badge tone="amber">σε {d} ημέρες</Badge>;
  return <Badge tone="neutral">σε {d} ημέρες</Badge>;
}

export function EmptyState({ children }: { children: React.ReactNode }) {
  return (
    <div className="card border-dashed p-10 text-center text-ink-faint text-sm">{children}</div>
  );
}

export function BackLink({ href, label }: { href: string; label: string }) {
  return (
    <Link href={href} className="text-sm text-ink-soft hover:text-ink underline underline-offset-2">
      ← {label}
    </Link>
  );
}
