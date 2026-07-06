import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { BackLink, EmptyState, PageHeader } from "@/components/ui";
import { formatDate, formatMinutes, formatMoney } from "@/lib/format";
import { createInvoiceFromTime } from "../actions";

export const metadata: Metadata = { title: "Νέο τιμολόγιο" };

export default async function NewInvoicePage(props: PageProps<"/invoices/new">) {
  const user = await requireUser();
  const sp = await props.searchParams;
  const clientId = typeof sp.clientId === "string" ? sp.clientId : "";

  const clients = await prisma.client.findMany({
    where: { firmId: user.firmId },
    orderBy: { fullName: "asc" },
    select: { id: true, fullName: true },
  });

  const unbilled = clientId
    ? await prisma.timeEntry.findMany({
        where: { firmId: user.firmId, billable: true, invoiceLineId: null, case: { clientId } },
        orderBy: { date: "asc" },
        include: { case: { select: { title: true } }, user: { select: { name: true } } },
      })
    : [];

  return (
    <div className="max-w-3xl">
      <BackLink href="/invoices" label="Τιμολόγηση" />
      <PageHeader kicker="Οικονομικα" title="Νέο τιμολόγιο από χρόνο εργασίας" />

      <form method="GET" className="card p-4 mb-4 flex items-end gap-3">
        <div className="flex-1">
          <label className="label" htmlFor="clientId">Πελάτης</label>
          <select id="clientId" name="clientId" defaultValue={clientId} className="field">
            <option value="">— Επιλέξτε πελάτη —</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>{c.fullName}</option>
            ))}
          </select>
        </div>
        <button className="btn btn-secondary">Φόρτωση χρόνου</button>
      </form>

      {clientId && unbilled.length === 0 && (
        <EmptyState>Δεν υπάρχει ατιμολόγητος χρεώσιμος χρόνος για αυτόν τον πελάτη.</EmptyState>
      )}

      {unbilled.length > 0 && (
        <form action={createInvoiceFromTime} className="card overflow-hidden">
          <input type="hidden" name="clientId" value={clientId} />
          <table className="table-ledger">
            <thead>
              <tr>
                <th className="w-8"></th>
                <th>Ημ/νία</th>
                <th>Υπόθεση / Περιγραφή</th>
                <th>Διάρκεια</th>
                <th className="text-right">Αξία</th>
              </tr>
            </thead>
            <tbody>
              {unbilled.map((e) => (
                <tr key={e.id}>
                  <td>
                    <input type="checkbox" name="entryIds" value={e.id} defaultChecked />
                  </td>
                  <td className="tabular text-ink-soft">{formatDate(e.date)}</td>
                  <td>
                    <span className="font-medium">{e.case.title}</span>
                    <div className="text-xs text-ink-faint">
                      {e.description} — {e.user.name}
                    </div>
                  </td>
                  <td className="tabular">{formatMinutes(e.minutes)}</td>
                  <td className="text-right tabular">{formatMoney(Math.round((e.minutes / 60) * e.rateCents))}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="p-4 border-t border-line-strong bg-paper/50 flex items-end justify-between gap-4">
            <div className="w-32">
              <label className="label" htmlFor="vatRate">ΦΠΑ %</label>
              <input id="vatRate" name="vatRate" type="number" min={0} max={24} defaultValue={24} className="field" />
            </div>
            <button className="btn btn-primary">Δημιουργία τιμολογίου</button>
          </div>
        </form>
      )}
    </div>
  );
}
