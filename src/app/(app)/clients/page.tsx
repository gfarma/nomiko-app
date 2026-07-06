import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { Badge, EmptyState, PageHeader } from "@/components/ui";
import { CLIENT_TYPE_LABELS, type ClientType } from "@/lib/constants";

export const metadata: Metadata = { title: "Πελάτες" };

export default async function ClientsPage() {
  const user = await requireUser();
  const clients = await prisma.client.findMany({
    where: { firmId: user.firmId },
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { cases: true } } },
  });

  return (
    <div>
      <PageHeader
        kicker="Πελατολογιο"
        title="Πελάτες"
        action={
          <Link href="/clients/new" className="btn btn-primary">
            + Νέος πελάτης
          </Link>
        }
      />

      {clients.length === 0 ? (
        <EmptyState>Δεν υπάρχουν πελάτες ακόμα. Προσθέστε τον πρώτο σας πελάτη.</EmptyState>
      ) : (
        <div className="card overflow-x-auto">
          <table className="table-ledger">
            <thead>
              <tr>
                <th>Ονοματεπώνυμο / Επωνυμία</th>
                <th>Τύπος</th>
                <th>Επικοινωνία</th>
                <th>Υποθέσεις</th>
                <th>GDPR</th>
              </tr>
            </thead>
            <tbody>
              {clients.map((c) => (
                <tr key={c.id}>
                  <td>
                    <Link href={`/clients/${c.id}`} className="font-medium hover:underline">
                      {c.fullName}
                    </Link>
                  </td>
                  <td>
                    <Badge tone={c.type === "company" ? "brass" : "neutral"}>
                      {CLIENT_TYPE_LABELS[c.type as ClientType] ?? c.type}
                    </Badge>
                  </td>
                  <td className="text-ink-soft">
                    {[c.phone, c.email].filter(Boolean).join(" · ") || "—"}
                  </td>
                  <td className="tabular">{c._count.cases}</td>
                  <td>
                    {c.consentDataProcessing ? (
                      <Badge tone="green">Συγκατάθεση ✓</Badge>
                    ) : (
                      <Badge tone="red">Χωρίς συγκατάθεση</Badge>
                    )}
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
