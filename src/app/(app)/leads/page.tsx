import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { Badge, EmptyState, PageHeader } from "@/components/ui";
import { LEAD_STATUSES, LEAD_STATUS_LABELS, type LeadStatus } from "@/lib/constants";
import { formatDateTime } from "@/lib/format";
import { setLeadStatus } from "./actions";

export const metadata: Metadata = { title: "Αιτήματα επικοινωνίας" };

const TONE: Record<LeadStatus, "brass" | "amber" | "green" | "neutral"> = {
  new: "brass",
  contacted: "amber",
  converted: "green",
  dismissed: "neutral",
};

export default async function LeadsPage() {
  const user = await requireUser();
  const [leads, firm] = await Promise.all([
    prisma.lead.findMany({ where: { firmId: user.firmId }, orderBy: { createdAt: "desc" } }),
    prisma.firm.findUnique({ where: { id: user.firmId }, select: { slug: true } }),
  ]);

  return (
    <div>
      <PageHeader kicker="Δημοσια σελιδα" title="Αιτήματα επικοινωνίας" />

      <p className="text-sm text-ink-soft mb-5">
        Τα αιτήματα φτάνουν από τη δημόσια σελίδα του γραφείου σας:{" "}
        <a href={`/${firm?.slug}/contact`} target="_blank" className="underline underline-offset-2 text-brass-dark">
          /{firm?.slug}/contact ↗
        </a>
      </p>

      {leads.length === 0 ? (
        <EmptyState>Κανένα αίτημα ακόμα.</EmptyState>
      ) : (
        <ul className="space-y-3">
          {leads.map((l) => (
            <li key={l.id} className="card p-4 flex gap-4 items-start">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold">{l.name}</span>
                  <Badge tone={TONE[l.status as LeadStatus] ?? "neutral"}>
                    {LEAD_STATUS_LABELS[l.status as LeadStatus] ?? l.status}
                  </Badge>
                  <span className="text-xs text-ink-faint ml-auto tabular">{formatDateTime(l.createdAt)}</span>
                </div>
                <p className="text-xs text-ink-faint mt-0.5">
                  {[l.email, l.phone].filter(Boolean).join(" · ") || "χωρίς στοιχεία επικοινωνίας"}
                  {!l.consent && " · ⚠ χωρίς συγκατάθεση"}
                </p>
                <p className="text-sm text-ink-soft mt-2 whitespace-pre-wrap">{l.message}</p>
              </div>
              <form
                action={async (formData: FormData) => {
                  "use server";
                  await setLeadStatus(l.id, String(formData.get("status")));
                }}
                className="flex items-center gap-2 shrink-0"
              >
                <select name="status" defaultValue={l.status} className="field text-xs py-1.5 w-40">
                  {LEAD_STATUSES.map((s) => (
                    <option key={s} value={s}>{LEAD_STATUS_LABELS[s]}</option>
                  ))}
                </select>
                <button className="btn btn-secondary text-xs px-2 py-1.5">OK</button>
              </form>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
