import type { Metadata } from "next";
import { PageHeader, BackLink } from "@/components/ui";
import { ClientFormFields } from "../client-form";
import { createClient } from "../actions";

export const metadata: Metadata = { title: "Νέος πελάτης" };

export default function NewClientPage() {
  return (
    <div className="max-w-2xl">
      <BackLink href="/clients" label="Πελάτες" />
      <PageHeader kicker="Πελατολογιο" title="Νέος πελάτης" />
      <form action={createClient} className="card p-6">
        <ClientFormFields />
        <div className="mt-6 flex justify-end">
          <button className="btn btn-primary">Αποθήκευση</button>
        </div>
      </form>
    </div>
  );
}
