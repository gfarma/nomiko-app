import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { Badge, BackLink, PageHeader } from "@/components/ui";
import { CASE_STATUS_LABELS, PRACTICE_AREA_LABELS, type CaseStatus, type PracticeArea } from "@/lib/constants";
import { formatDate } from "@/lib/format";
import { ClientFormFields } from "../client-form";
import { deleteClient, updateClient } from "../actions";

export const metadata: Metadata = { title: "Πελάτης" };

export default async function ClientDetailPage(props: PageProps<"/clients/[id]">) {
  const { id } = await props.params;
  const user = await requireUser();

  const client = await prisma.client.findFirst({
    where: { id, firmId: user.firmId },
    include: { cases: { orderBy: { updatedAt: "desc" }, select: { id: true, title: true, practiceArea: true, status: true, updatedAt: true } } },
  });
  if (!client) notFound();

  const updateWithId = updateClient.bind(null, client.id);
  const deleteWithId = deleteClient.bind(null, client.id);

  return (
    <div className="max-w-2xl">
      <BackLink href="/clients" label="Πελάτες" />
      <PageHeader kicker="Πελατολογιο" title={client.fullName} />

      <section className="card p-6 mb-6">
        <h2 className="font-display text-lg font-semibold mb-4">Στοιχεία</h2>
        <form action={updateWithId}>
          <ClientFormFields client={client} />
          <div className="mt-6 flex justify-end gap-3">
            <button className="btn btn-primary">Αποθήκευση αλλαγών</button>
          </div>
        </form>
      </section>

      <section className="card overflow-hidden mb-6">
        <div className="flex items-center justify-between px-5 py-4 border-b border-line">
          <h2 className="font-display text-lg font-semibold">Υποθέσεις ({client.cases.length})</h2>
          <Link href={`/cases/new?clientId=${client.id}`} className="btn btn-secondary text-xs">
            + Νέα υπόθεση
          </Link>
        </div>
        {client.cases.length === 0 ? (
          <p className="p-5 text-sm text-ink-faint">Καμία υπόθεση για αυτόν τον πελάτη.</p>
        ) : (
          <ul className="divide-y divide-line">
            {client.cases.map((c) => (
              <li key={c.id} className="px-5 py-3 flex items-center gap-3">
                <Link href={`/cases/${c.id}`} className="font-medium hover:underline flex-1 truncate">
                  {c.title}
                </Link>
                <Badge tone="brass">{PRACTICE_AREA_LABELS[c.practiceArea as PracticeArea] ?? c.practiceArea}</Badge>
                <Badge tone={c.status === "active" ? "green" : "neutral"}>
                  {CASE_STATUS_LABELS[c.status as CaseStatus] ?? c.status}
                </Badge>
                <span className="text-xs text-ink-faint tabular">{formatDate(c.updatedAt)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="card border-dashed p-5 flex items-center justify-between">
        <div className="text-sm text-ink-soft">
          <p className="font-semibold text-ink">Διαγραφή πελάτη (GDPR)</p>
          <p>Επιτρέπεται μόνο εφόσον δεν υπάρχουν συνδεδεμένες υποθέσεις.</p>
        </div>
        <form action={deleteWithId}>
          <button className="btn btn-danger" disabled={client.cases.length > 0}>
            Διαγραφή
          </button>
        </form>
      </section>
    </div>
  );
}
