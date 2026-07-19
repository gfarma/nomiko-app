import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { audit } from "@/lib/audit";
import {
  DEADLINE_TYPE_LABELS,
  DOC_TYPE_LABELS,
  INVOICE_STATUS_LABELS,
  PORTAL_STATUS_LABELS,
  type CaseStatus,
  type DeadlineType,
  type DocType,
  type InvoiceStatus,
} from "@/lib/constants";
import { formatDate, formatDateTime, formatMoney } from "@/lib/format";

export const metadata: Metadata = {
  title: "Ο φάκελός μου",
  robots: { index: false, follow: false },
};

/**
 * Πύλη εντολέα — δημόσια, read-only προβολή υπόθεσης μέσω unguessable token.
 * Εμφανίζονται ΜΟΝΟ στοιχεία που ο δικηγόρος έχει σημάνει ως ορατά.
 */
export default async function ClientPortalPage(props: PageProps<"/f/[token]">) {
  const { token } = await props.params;

  const c = await prisma.case.findFirst({
    where: { portalToken: token, portalEnabled: true },
    include: {
      firm: { select: { name: true, phone: true, email: true, address: true, slug: true } },
      client: { select: { fullName: true } },
      deadlines: {
        where: { visibleToClient: true },
        orderBy: { dueAt: "asc" },
      },
      documents: {
        where: { visibleToClient: true },
        orderBy: { createdAt: "desc" },
        select: { id: true, title: true, docType: true, fileName: true, createdAt: true },
      },
      invoices: {
        where: { status: { in: ["issued", "paid"] } },
        orderBy: { issueDate: "desc" },
        select: { id: true, number: true, status: true, totalCents: true, issueDate: true },
      },
    },
  });
  if (!c) notFound();

  await audit({ firmId: c.firmId, action: "portal.view", entityType: "Case", entityId: c.id, detail: "client portal" });

  const upcoming = c.deadlines.filter((d) => d.status === "pending");
  const past = c.deadlines.filter((d) => d.status !== "pending").slice(-6);

  return (
    <main className="flex-1">
      <section className="bg-ink-deep text-paper">
        <div className="max-w-2xl mx-auto px-6 py-10">
          <p className="kicker text-brass-pale/80">{c.firm.name}</p>
          <h1 className="font-display text-3xl font-semibold tracking-tight mt-2">Ο φάκελός μου</h1>
          <p className="text-white/70 mt-1">{c.client.fullName}</p>
        </div>
      </section>

      <div className="max-w-2xl mx-auto px-6 py-8 space-y-6">
        {/* Status */}
        <section className="card p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="kicker">Υποθεση</p>
              <h2 className="font-display text-xl font-semibold mt-0.5">{c.title}</h2>
              {c.court && <p className="text-sm text-ink-soft mt-1">{c.court}</p>}
            </div>
            <span className="badge bg-moss-pale text-moss shrink-0">
              {PORTAL_STATUS_LABELS[c.status as CaseStatus] ?? c.status}
            </span>
          </div>
          {c.stage && (
            <p className="text-sm mt-3 border-t border-line pt-3">
              <span className="kicker block">Τρεχον σταδιο</span>
              {c.stage}
            </p>
          )}
        </section>

        {/* Upcoming dates */}
        <section className="card overflow-hidden">
          <h2 className="font-display text-lg font-semibold px-5 py-3 border-b border-line">Επόμενες ημερομηνίες</h2>
          {upcoming.length === 0 ? (
            <p className="p-5 text-sm text-ink-faint">Δεν υπάρχει προγραμματισμένη ημερομηνία αυτή τη στιγμή.</p>
          ) : (
            <ul className="divide-y divide-line">
              {upcoming.map((d) => (
                <li key={d.id} className="px-5 py-3 flex items-center gap-4">
                  <div className="w-14 text-center shrink-0">
                    <div className="font-display text-xl font-semibold tabular leading-none">{d.dueAt.getDate()}</div>
                    <div className="text-[10px] uppercase tracking-wide text-ink-faint">
                      {new Intl.DateTimeFormat("el-GR", { month: "short" }).format(d.dueAt)}
                    </div>
                  </div>
                  <div>
                    <p className="font-medium">{d.title}</p>
                    <p className="text-xs text-ink-faint">
                      {DEADLINE_TYPE_LABELS[d.type as DeadlineType] ?? d.type} · {formatDateTime(d.dueAt)}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
          {past.length > 0 && (
            <details className="border-t border-line">
              <summary className="px-5 py-2.5 text-xs text-ink-faint cursor-pointer select-none">Ιστορικό</summary>
              <ul className="divide-y divide-line border-t border-line">
                {past.map((d) => (
                  <li key={d.id} className="px-5 py-2.5 text-sm flex items-center justify-between gap-3">
                    <span className={d.status === "done" ? "" : "text-ink-faint"}>
                      {d.title} — {formatDate(d.dueAt)}
                    </span>
                    <span className="badge bg-paper text-ink-soft border border-line-strong">
                      {d.status === "done" ? "Έγινε" : d.status === "postponed" ? "Αναβλήθηκε" : "—"}
                    </span>
                  </li>
                ))}
              </ul>
            </details>
          )}
        </section>

        {/* Documents */}
        {c.documents.length > 0 && (
          <section className="card overflow-hidden">
            <h2 className="font-display text-lg font-semibold px-5 py-3 border-b border-line">Έγγραφα για εσάς</h2>
            <ul className="divide-y divide-line">
              {c.documents.map((d) => (
                <li key={d.id} className="px-5 py-3 flex items-center gap-3 text-sm">
                  <div className="flex-1 min-w-0">
                    <a href={`/f/${token}/doc/${d.id}`} className="font-medium hover:underline">
                      {d.title}
                    </a>
                    <p className="text-xs text-ink-faint">
                      {DOC_TYPE_LABELS[d.docType as DocType] ?? d.docType} · {formatDate(d.createdAt)}
                    </p>
                  </div>
                  <span className="text-xs underline underline-offset-2 text-brass-dark shrink-0">Λήψη ↓</span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Invoices */}
        {c.invoices.length > 0 && (
          <section className="card overflow-hidden">
            <h2 className="font-display text-lg font-semibold px-5 py-3 border-b border-line">Οικονομικά</h2>
            <ul className="divide-y divide-line">
              {c.invoices.map((inv) => (
                <li key={inv.id} className="px-5 py-3 flex items-center gap-3 text-sm">
                  <span className="tabular font-medium">{inv.number}</span>
                  <span className="text-xs text-ink-faint">{formatDate(inv.issueDate)}</span>
                  <span
                    className={`badge ml-auto ${inv.status === "paid" ? "bg-moss-pale text-moss" : "bg-amber-pale text-amber"}`}
                  >
                    {INVOICE_STATUS_LABELS[inv.status as InvoiceStatus] ?? inv.status}
                  </span>
                  <span className="tabular font-semibold">{formatMoney(inv.totalCents)}</span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Contact */}
        <section className="card border-dashed p-5 text-sm">
          <p className="kicker mb-1">Εχετε απορια;</p>
          <p className="text-ink-soft">
            Επικοινωνήστε με το γραφείο:{" "}
            {c.firm.phone && (
              <a href={`tel:${c.firm.phone.replace(/\s/g, "")}`} className="underline underline-offset-2">
                {c.firm.phone}
              </a>
            )}
            {c.firm.phone && c.firm.email && " · "}
            {c.firm.email && (
              <a href={`mailto:${c.firm.email}`} className="underline underline-offset-2">
                {c.firm.email}
              </a>
            )}
          </p>
        </section>

        <p className="text-xs text-ink-faint text-center pb-6">
          Η σελίδα ενημερώνεται από το γραφείο σας. Μην κοινοποιείτε αυτό το link — είναι προσωπικό.
        </p>
      </div>
    </main>
  );
}
