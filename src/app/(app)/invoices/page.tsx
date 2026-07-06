import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { Badge, EmptyState, PageHeader } from "@/components/ui";
import { INVOICE_STATUS_LABELS, type InvoiceStatus } from "@/lib/constants";
import { formatDate, formatMoney } from "@/lib/format";

export const metadata: Metadata = { title: "Τιμολόγηση" };

const STATUS_TONE = { draft: "neutral", issued: "amber", paid: "green", void: "red" } as const;

export default async function InvoicesPage() {
  const user = await requireUser();
  const invoices = await prisma.invoice.findMany({
    where: { firmId: user.firmId },
    orderBy: { createdAt: "desc" },
    include: { client: { select: { fullName: true } } },
  });

  return (
    <div>
      <PageHeader
        kicker="Οικονομικα"
        title="Τιμολόγηση"
        action={
          <Link href="/invoices/new" className="btn btn-primary">
            + Νέο τιμολόγιο
          </Link>
        }
      />

      <p className="text-xs text-ink-faint mb-4">
        Το myDATA (ΑΑΔΕ) θα συνδεθεί σε επόμενη φάση μέσω αδειοδοτημένου παρόχου — τα πεδία υπάρχουν ήδη στο σύστημα.
      </p>

      {invoices.length === 0 ? (
        <EmptyState>Κανένα τιμολόγιο. Δημιουργήστε το πρώτο από καταγεγραμμένο χρόνο.</EmptyState>
      ) : (
        <div className="card overflow-x-auto">
          <table className="table-ledger">
            <thead>
              <tr>
                <th>Αριθμός</th>
                <th>Πελάτης</th>
                <th>Έκδοση</th>
                <th>Κατάσταση</th>
                <th className="text-right">Καθαρή αξία</th>
                <th className="text-right">ΦΠΑ</th>
                <th className="text-right">Σύνολο</th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((inv) => (
                <tr key={inv.id}>
                  <td>
                    <Link href={`/invoices/${inv.id}`} className="font-semibold hover:underline tabular">
                      {inv.number}
                    </Link>
                  </td>
                  <td className="text-ink-soft">{inv.client.fullName}</td>
                  <td className="tabular text-ink-soft">{formatDate(inv.issueDate)}</td>
                  <td>
                    <Badge tone={STATUS_TONE[inv.status as InvoiceStatus] ?? "neutral"}>
                      {INVOICE_STATUS_LABELS[inv.status as InvoiceStatus] ?? inv.status}
                    </Badge>
                  </td>
                  <td className="text-right tabular">{formatMoney(inv.subtotalCents)}</td>
                  <td className="text-right tabular text-ink-soft">{formatMoney(inv.vatCents)}</td>
                  <td className="text-right tabular font-semibold">{formatMoney(inv.totalCents)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
