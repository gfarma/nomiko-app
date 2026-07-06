import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { Badge, EmptyState, PageHeader } from "@/components/ui";
import { formatDate, formatMinutes, formatMoney } from "@/lib/format";
import { addTimeEntry } from "../cases/actions";

export const metadata: Metadata = { title: "Χρόνος εργασίας" };

export default async function TimePage() {
  const user = await requireUser();

  const [entries, cases] = await Promise.all([
    prisma.timeEntry.findMany({
      where: { firmId: user.firmId },
      orderBy: { date: "desc" },
      take: 100,
      include: { case: { select: { id: true, title: true } }, user: { select: { name: true } } },
    }),
    prisma.case.findMany({
      where: { firmId: user.firmId, status: { in: ["active", "pending"] } },
      orderBy: { title: "asc" },
      select: { id: true, title: true },
    }),
  ]);

  const totalMinutes = entries.reduce((s, e) => s + e.minutes, 0);
  const billableValue = entries.filter((e) => e.billable).reduce((s, e) => s + Math.round((e.minutes / 60) * e.rateCents), 0);

  return (
    <div>
      <PageHeader kicker="Χρεωσεις" title="Χρόνος εργασίας" />

      <div className="grid sm:grid-cols-2 gap-4 mb-6 max-w-md">
        <div className="card p-4">
          <p className="kicker">Συνολο (τελευταιες 100)</p>
          <p className="font-display text-2xl font-semibold tabular">{formatMinutes(totalMinutes)}</p>
        </div>
        <div className="card p-4">
          <p className="kicker">Χρεωσιμη αξια</p>
          <p className="font-display text-2xl font-semibold tabular">{formatMoney(billableValue)}</p>
        </div>
      </div>

      {/* Quick add */}
      <section className="card p-5 mb-6">
        <h2 className="font-display text-lg font-semibold mb-4">Νέα καταχώρηση</h2>
        <form action={addTimeEntry} className="grid sm:grid-cols-6 gap-3 items-end">
          <div className="sm:col-span-2">
            <label className="label" htmlFor="caseId">Υπόθεση *</label>
            <select id="caseId" name="caseId" required className="field">
              <option value="">— Επιλέξτε —</option>
              {cases.map((c) => (
                <option key={c.id} value={c.id}>{c.title}</option>
              ))}
            </select>
          </div>
          <div className="sm:col-span-2">
            <label className="label" htmlFor="description">Περιγραφή *</label>
            <input id="description" name="description" required className="field" />
          </div>
          <div>
            <label className="label" htmlFor="date">Ημ/νία</label>
            <input id="date" name="date" type="date" required defaultValue={new Date().toISOString().slice(0, 10)} className="field" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="label" htmlFor="hours">Ώρες</label>
              <input id="hours" name="hours" type="number" min={0} max={24} defaultValue={1} className="field" />
            </div>
            <div>
              <label className="label" htmlFor="mins">Λεπτά</label>
              <input id="mins" name="mins" type="number" min={0} max={59} defaultValue={0} className="field" />
            </div>
          </div>
          <div>
            <label className="label" htmlFor="rateEuros">€/ώρα</label>
            <input id="rateEuros" name="rateEuros" type="number" min={0} step="0.01" defaultValue={120} className="field" />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="billable" defaultChecked /> Χρεώσιμο
          </label>
          <div className="sm:col-span-6 flex justify-end">
            <button className="btn btn-primary">Καταχώρηση</button>
          </div>
        </form>
      </section>

      {entries.length === 0 ? (
        <EmptyState>Καμία καταχώρηση χρόνου.</EmptyState>
      ) : (
        <div className="card overflow-x-auto">
          <table className="table-ledger">
            <thead>
              <tr>
                <th>Ημ/νία</th>
                <th>Υπόθεση</th>
                <th>Περιγραφή</th>
                <th>Χειριστής</th>
                <th>Διάρκεια</th>
                <th>Αξία</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((e) => (
                <tr key={e.id}>
                  <td className="tabular text-ink-soft">{formatDate(e.date)}</td>
                  <td>
                    <Link href={`/cases/${e.case.id}`} className="hover:underline">
                      {e.case.title}
                    </Link>
                  </td>
                  <td className="text-ink-soft">{e.description}</td>
                  <td className="text-ink-soft">{e.user.name}</td>
                  <td className="tabular font-semibold">{formatMinutes(e.minutes)}</td>
                  <td className="tabular">
                    {e.billable ? formatMoney(Math.round((e.minutes / 60) * e.rateCents)) : <Badge tone="neutral">μη χρεώσιμο</Badge>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
