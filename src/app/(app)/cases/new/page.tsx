import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { BackLink, PageHeader } from "@/components/ui";
import {
  CASE_STATUSES,
  CASE_STATUS_LABELS,
  PRACTICE_AREAS,
  PRACTICE_AREA_LABELS,
} from "@/lib/constants";
import { createCase } from "../actions";
import { CustomFieldInputs, parseTemplateFields } from "../custom-fields";

export const metadata: Metadata = { title: "Νέα υπόθεση" };

export default async function NewCasePage(props: PageProps<"/cases/new">) {
  const user = await requireUser();
  const sp = await props.searchParams;
  const preselectedClient = typeof sp.clientId === "string" ? sp.clientId : "";
  const templateId = typeof sp.templateId === "string" ? sp.templateId : "";

  const [clients, templates, users] = await Promise.all([
    prisma.client.findMany({ where: { firmId: user.firmId }, orderBy: { fullName: "asc" }, select: { id: true, fullName: true } }),
    prisma.practiceAreaTemplate.findMany({ where: { firmId: user.firmId }, orderBy: { name: "asc" } }),
    prisma.user.findMany({ where: { firmId: user.firmId, active: true }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);

  const selectedTemplate = templates.find((t) => t.id === templateId);
  const templateFields = selectedTemplate ? parseTemplateFields(selectedTemplate.fieldsJson) : [];

  return (
    <div className="max-w-2xl">
      <BackLink href="/cases" label="Υποθέσεις" />
      <PageHeader kicker="Δικογραφια" title="Νέα υπόθεση" />

      {/* Template picker (GET) re-renders the form with the template's custom fields */}
      <form method="GET" className="card p-4 mb-4 flex items-end gap-3">
        <div className="flex-1">
          <label className="label" htmlFor="templateId">Πρότυπο τομέα δικαίου (προαιρετικό)</label>
          <select id="templateId" name="templateId" defaultValue={templateId} className="field">
            <option value="">Χωρίς πρότυπο</option>
            {templates.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name} — {PRACTICE_AREA_LABELS[t.area as (typeof PRACTICE_AREAS)[number]] ?? t.area}
              </option>
            ))}
          </select>
        </div>
        {preselectedClient && <input type="hidden" name="clientId" value={preselectedClient} />}
        <button className="btn btn-secondary">Εφαρμογή</button>
      </form>

      <form action={createCase} className="card p-6 space-y-5">
        {selectedTemplate && <input type="hidden" name="templateId" value={selectedTemplate.id} />}
        <div>
          <label className="label" htmlFor="title">Τίτλος υπόθεσης *</label>
          <input id="title" name="title" required className="field" placeholder="π.χ. Αγωγή αποζημίωσης — Ιωάννου κατά ΧΨΩ ΑΕ" />
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="label" htmlFor="clientId">Πελάτης *</label>
            <select id="clientId" name="clientId" required defaultValue={preselectedClient} className="field">
              <option value="">— Επιλέξτε —</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>{c.fullName}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="practiceArea">Τομέας δικαίου *</label>
            <select
              id="practiceArea"
              name="practiceArea"
              required
              defaultValue={selectedTemplate?.area ?? "civil"}
              className="field"
            >
              {PRACTICE_AREAS.map((a) => (
                <option key={a} value={a}>{PRACTICE_AREA_LABELS[a]}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="caseNumber">Αρ. κατάθεσης / ΓΑΚ</label>
            <input id="caseNumber" name="caseNumber" className="field" />
          </div>
          <div>
            <label className="label" htmlFor="court">Δικαστήριο / Αρχή</label>
            <input id="court" name="court" className="field" />
          </div>
          <div>
            <label className="label" htmlFor="stage">Στάδιο</label>
            <input id="stage" name="stage" className="field" placeholder="π.χ. Κατάθεση προτάσεων" />
          </div>
          <div>
            <label className="label" htmlFor="status">Κατάσταση</label>
            <select id="status" name="status" defaultValue="active" className="field">
              {CASE_STATUSES.map((s) => (
                <option key={s} value={s}>{CASE_STATUS_LABELS[s]}</option>
              ))}
            </select>
          </div>
        </div>
        <div>
          <label className="label" htmlFor="description">Περιγραφή</label>
          <textarea id="description" name="description" rows={3} className="field" />
        </div>

        <CustomFieldInputs fields={templateFields} />

        <div>
          <span className="label">Χειριστές</span>
          <div className="flex flex-wrap gap-3">
            {users.map((u) => (
              <label key={u.id} className="flex items-center gap-1.5 text-sm">
                <input type="checkbox" name="assignees" value={u.id} defaultChecked={u.id === user.id} />
                {u.name}
              </label>
            ))}
          </div>
        </div>

        <div className="flex justify-end">
          <button className="btn btn-primary">Δημιουργία υπόθεσης</button>
        </div>
      </form>
    </div>
  );
}
