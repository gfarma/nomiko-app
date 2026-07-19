import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { Badge, BackLink, PageHeader } from "@/components/ui";
import { INVOICE_STATUS_LABELS, type InvoiceStatus } from "@/lib/constants";
import { formatDate, formatMinutes, formatMoney } from "@/lib/format";
import { setInvoiceStatus } from "../actions";

export const metadata: Metadata = { title: "Τιμολόγιο" };

export default async function InvoiceDetailPage(props: PageProps<"/invoices/[id]">) {
  const { id } = await props.params;
  const user = await requireUser();

  const inv = await prisma.invoice.findFirst({
    where: { id, firmId: user.firmId },
    include: { client: true, firm: true, lines: true },
  });
  if (!inv) notFound();

  const transitions: { to: "issued" | "paid" | "void"; label: string; cls: string }[] =
    inv.status === "draft"
      ? [
          { to: "issued", label: "Έκδοση", cls: "btn-primary" },
          { to: "void", label: "Ακύρωση", cls: "btn-danger" },
        ]
      : inv.status === "issued"
        ? [
            { to: "paid", label: "Σήμανση ως εξοφλημένο", cls: "btn-brass" },
            { to: "void", label: "Ακύρωση", cls: "btn-danger" },
          ]
        : [];

  return (
    <div className="max-w-3xl">
      <BackLink href="/invoices" label="Τιμολόγηση" />
      <PageHeader
        kicker="Οικονομικα"
        title={inv.number}
        action={
          <Badge tone={inv.status === "paid" ? "green" : inv.status === "issued" ? "amber" : inv.status === "void" ? "red" : "neutral"}>
            {INVOICE_STATUS_LABELS[inv.status as InvoiceStatus] ?? inv.status}
          </Badge>
        }
      />

      <div className="card p-6 mb-6">
        <div className="flex justify-between gap-6 pb-5 border-b border-line mb-5">
          <div>
            <p className="kicker mb-1">Εκδοτης</p>
            <p className="font-semibold">{inv.firm.name}</p>
            <p className="text-sm text-ink-soft">{inv.firm.address}</p>
            <p className="text-sm text-ink-soft tabular">ΑΦΜ: {inv.firm.vatNumber ?? "—"}</p>
          </div>
          <div className="text-right">
            <p className="kicker mb-1">Προς</p>
            <p className="font-semibold">{inv.client.fullName}</p>
            <p className="text-sm text-ink-soft">{inv.client.address}</p>
            <p className="text-sm text-ink-soft tabular">
              Έκδοση: {formatDate(inv.issueDate)}
              {inv.dueDate && <> · Λήξη: {formatDate(inv.dueDate)}</>}
            </p>
          </div>
        </div>

        <table className="table-ledger mb-5">
          <thead>
            <tr>
              <th>Περιγραφή</th>
              <th className="text-right">Διάρκεια</th>
              <th className="text-right">Ποσό</th>
            </tr>
          </thead>
          <tbody>
            {inv.lines.map((l) => (
              <tr key={l.id}>
                <td>{l.description}</td>
                <td className="text-right tabular text-ink-soft">{l.minutes ? formatMinutes(l.minutes) : "—"}</td>
                <td className="text-right tabular">{formatMoney(l.amountCents)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="flex justify-end">
          <dl className="w-64 space-y-1 text-sm">
            <div className="flex justify-between">
              <dt className="text-ink-soft">Καθαρή αξία</dt>
              <dd className="tabular">{formatMoney(inv.subtotalCents)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-ink-soft">ΦΠΑ {inv.vatRate}%</dt>
              <dd className="tabular">{formatMoney(inv.vatCents)}</dd>
            </div>
            <div className="flex justify-between border-t border-line-strong pt-1 font-semibold text-base">
              <dt>Σύνολο</dt>
              <dd className="tabular">{formatMoney(inv.totalCents)}</dd>
            </div>
          </dl>
        </div>

        <div className="text-xs text-ink-faint mt-5 border-t border-line pt-3 space-y-1">
          {(inv.grammatioNumber || inv.grammatioCents) && (
            <p>
              Γραμμάτιο προείσπραξης ΔΣΑ: {inv.grammatioNumber ?? "—"}
              {inv.grammatioCents ? ` · ${formatMoney(inv.grammatioCents)}` : ""}
            </p>
          )}
          <p>
            myDATA: {inv.mydataUid ? `UID ${inv.mydataUid}` : "Δεν έχει διαβιβαστεί (Phase 2 — μέσω αδειοδοτημένου παρόχου)."}
          </p>
        </div>
      </div>

      {transitions.length > 0 && (
        <div className="flex gap-3 justify-end">
          {transitions.map((t) => (
            <form
              key={t.to}
              action={async () => {
                "use server";
                await setInvoiceStatus(inv.id, t.to);
              }}
            >
              <button className={`btn ${t.cls}`}>{t.label}</button>
            </form>
          ))}
        </div>
      )}
    </div>
  );
}
