import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUser, canSeeLegalContent } from "@/lib/session";
import { audit } from "@/lib/audit";
import { Badge, BackLink, DueChip, PageHeader } from "@/components/ui";
import {
  CASE_STATUSES,
  CASE_STATUS_LABELS,
  DEADLINE_TYPES,
  DEADLINE_TYPE_LABELS,
  DOC_TYPES,
  DOC_TYPE_LABELS,
  PRACTICE_AREAS,
  PRACTICE_AREA_LABELS,
  type CaseStatus,
  type DocType,
  type PracticeArea,
} from "@/lib/constants";
import { formatDate, formatDateTime, formatMinutes, formatMoney } from "@/lib/format";
import { addDeadline, addNote, addTimeEntry, setDeadlineStatus, updateCase, uploadDocument } from "../actions";
import { CustomFieldInputs, parseCustomValues, parseTemplateFields } from "../custom-fields";

export const metadata: Metadata = { title: "Υπόθεση" };

export default async function CaseDetailPage(props: PageProps<"/cases/[id]">) {
  const { id } = await props.params;
  const user = await requireUser();
  const legalAccess = canSeeLegalContent(user.role);

  const c = await prisma.case.findFirst({
    where: { id, firmId: user.firmId },
    include: {
      client: true,
      template: true,
      assignments: { include: { user: { select: { id: true, name: true } } } },
      deadlines: { orderBy: { dueAt: "asc" } },
      documents: { orderBy: { createdAt: "desc" }, include: { uploadedBy: { select: { name: true } } } },
      timeEntries: { orderBy: { date: "desc" }, include: { user: { select: { name: true } } } },
      notes: { orderBy: { createdAt: "desc" }, include: { author: { select: { name: true } } } },
    },
  });
  if (!c) notFound();

  // Attorney-client privilege: log every access to case file
  await audit({ firmId: user.firmId, userId: user.id, action: "case.view", entityType: "Case", entityId: c.id });

  const [clients, templates] = await Promise.all([
    prisma.client.findMany({ where: { firmId: user.firmId }, orderBy: { fullName: "asc" }, select: { id: true, fullName: true } }),
    prisma.practiceAreaTemplate.findMany({ where: { firmId: user.firmId }, orderBy: { name: "asc" } }),
  ]);

  const templateFields = c.template ? parseTemplateFields(c.template.fieldsJson) : [];
  const customValues = parseCustomValues(c.customFieldsJson);
  const totalMinutes = c.timeEntries.reduce((s, t) => s + t.minutes, 0);
  const billableCents = c.timeEntries
    .filter((t) => t.billable)
    .reduce((s, t) => s + Math.round((t.minutes / 60) * t.rateCents), 0);

  const updateWithId = updateCase.bind(null, c.id);
  const addDeadlineWithId = addDeadline.bind(null, c.id);
  const addNoteWithId = addNote.bind(null, c.id);
  const uploadWithId = uploadDocument.bind(null, c.id);

  return (
    <div>
      <BackLink href="/cases" label="Υποθέσεις" />
      <PageHeader
        kicker={PRACTICE_AREA_LABELS[c.practiceArea as PracticeArea] ?? c.practiceArea}
        title={c.title}
        action={
          <Badge tone={c.status === "active" ? "green" : c.status === "pending" ? "amber" : "neutral"}>
            {CASE_STATUS_LABELS[c.status as CaseStatus] ?? c.status}
          </Badge>
        }
      />

      {/* Overview */}
      <section className="card p-5 mb-6 grid sm:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
        <div>
          <p className="kicker">Πελατης</p>
          <Link href={`/clients/${c.clientId}`} className="font-medium hover:underline">
            {c.client.fullName}
          </Link>
        </div>
        <div>
          <p className="kicker">Δικαστηριο / Αρχη</p>
          <p>{c.court || "—"}</p>
        </div>
        <div>
          <p className="kicker">Αρ. καταθεσης</p>
          <p className="tabular">{c.caseNumber || "—"}</p>
        </div>
        <div>
          <p className="kicker">Σταδιο</p>
          <p>{c.stage || "—"}</p>
        </div>
        {legalAccess && c.description && (
          <div className="sm:col-span-2 lg:col-span-4">
            <p className="kicker">Περιγραφη</p>
            <p className="text-ink-soft whitespace-pre-wrap">{c.description}</p>
          </div>
        )}
        {legalAccess && templateFields.length > 0 && (
          <div className="sm:col-span-2 lg:col-span-4 grid sm:grid-cols-4 gap-3 border-t border-line pt-3">
            {templateFields.map((f) => (
              <div key={f.key}>
                <p className="kicker">{f.label}</p>
                <p className="tabular">{customValues[f.key] || "—"}</p>
              </div>
            ))}
          </div>
        )}
        <div className="sm:col-span-2 lg:col-span-4 flex flex-wrap items-center gap-4 border-t border-line pt-3 text-xs text-ink-faint">
          <span>Χειριστές: {c.assignments.map((a) => a.user.name).join(", ") || "—"}</span>
          <span>Συνολικός χρόνος: {formatMinutes(totalMinutes)}</span>
          <span>Χρεώσιμη αξία: {formatMoney(billableCents)}</span>
          <span>Ενημέρωση: {formatDate(c.updatedAt)}</span>
        </div>
      </section>

      {/* Edit (collapsible) */}
      {legalAccess && (
        <details className="card mb-6">
          <summary className="px-5 py-3 cursor-pointer font-semibold text-sm select-none">✎ Επεξεργασία στοιχείων υπόθεσης</summary>
          <form action={updateWithId} className="p-5 pt-2 space-y-4 border-t border-line">
            {c.templateId && <input type="hidden" name="templateId" value={c.templateId} />}
            <div>
              <label className="label" htmlFor="title">Τίτλος *</label>
              <input id="title" name="title" required defaultValue={c.title} className="field" />
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="label" htmlFor="clientId">Πελάτης *</label>
                <select id="clientId" name="clientId" required defaultValue={c.clientId} className="field">
                  {clients.map((cl) => (
                    <option key={cl.id} value={cl.id}>{cl.fullName}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label" htmlFor="practiceArea">Τομέας *</label>
                <select id="practiceArea" name="practiceArea" defaultValue={c.practiceArea} className="field">
                  {PRACTICE_AREAS.map((a) => (
                    <option key={a} value={a}>{PRACTICE_AREA_LABELS[a]}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label" htmlFor="caseNumber">Αρ. κατάθεσης</label>
                <input id="caseNumber" name="caseNumber" defaultValue={c.caseNumber ?? ""} className="field" />
              </div>
              <div>
                <label className="label" htmlFor="court">Δικαστήριο</label>
                <input id="court" name="court" defaultValue={c.court ?? ""} className="field" />
              </div>
              <div>
                <label className="label" htmlFor="stage">Στάδιο</label>
                <input id="stage" name="stage" defaultValue={c.stage ?? ""} className="field" />
              </div>
              <div>
                <label className="label" htmlFor="status">Κατάσταση</label>
                <select id="status" name="status" defaultValue={c.status} className="field">
                  {CASE_STATUSES.map((s) => (
                    <option key={s} value={s}>{CASE_STATUS_LABELS[s]}</option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <label className="label" htmlFor="description">Περιγραφή</label>
              <textarea id="description" name="description" rows={3} defaultValue={c.description ?? ""} className="field" />
            </div>
            <CustomFieldInputs fields={templateFields} values={customValues} />
            <div className="flex justify-end">
              <button className="btn btn-primary">Αποθήκευση</button>
            </div>
          </form>
        </details>
      )}

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Deadlines */}
        <section className="card overflow-hidden">
          <h2 className="font-display text-lg font-semibold px-5 py-4 border-b border-line bg-gradient-to-r from-oxblood-pale/50 to-transparent">
            Προθεσμίες
          </h2>
          <ul className="divide-y divide-line">
            {c.deadlines.map((d) => (
              <li key={d.id} className="px-5 py-3 flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <p className={`font-medium truncate ${d.status === "done" ? "line-through text-ink-faint" : ""}`}>{d.title}</p>
                  <p className="text-xs text-ink-faint">
                    {DEADLINE_TYPE_LABELS[d.type as (typeof DEADLINE_TYPES)[number]] ?? d.type} · {formatDateTime(d.dueAt)}
                  </p>
                </div>
                <DueChip dueAt={d.dueAt} status={d.status} />
                {d.status === "pending" && (
                  <form
                    action={async () => {
                      "use server";
                      await setDeadlineStatus(d.id, "done");
                    }}
                  >
                    <button className="btn btn-secondary text-xs px-2 py-1" title="Σήμανση ως ολοκληρωμένη">✓</button>
                  </form>
                )}
              </li>
            ))}
            {c.deadlines.length === 0 && <li className="px-5 py-4 text-sm text-ink-faint">Καμία προθεσμία.</li>}
          </ul>
          <form action={addDeadlineWithId} className="border-t border-line-strong p-4 grid grid-cols-2 gap-3 bg-paper/50">
            <div className="col-span-2">
              <label className="label" htmlFor="dl-title">Νέα προθεσμία</label>
              <input id="dl-title" name="title" required className="field" placeholder="π.χ. Κατάθεση προτάσεων" />
            </div>
            <div>
              <label className="label" htmlFor="dl-type">Τύπος</label>
              <select id="dl-type" name="type" className="field">
                {DEADLINE_TYPES.map((t) => (
                  <option key={t} value={t}>{DEADLINE_TYPE_LABELS[t]}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label" htmlFor="dl-due">Ημερομηνία *</label>
              <input id="dl-due" name="dueAt" type="datetime-local" required className="field" />
            </div>
            <div>
              <label className="label" htmlFor="dl-remind">Υπενθύμιση (ημέρες πριν)</label>
              <input id="dl-remind" name="remindDaysBefore" type="number" defaultValue={5} min={0} max={90} className="field" />
            </div>
            <div className="flex items-end justify-end">
              <button className="btn btn-brass w-full justify-center">Προσθήκη</button>
            </div>
          </form>
        </section>

        {/* Time */}
        <section className="card overflow-hidden">
          <h2 className="font-display text-lg font-semibold px-5 py-4 border-b border-line">Χρόνος εργασίας</h2>
          <ul className="divide-y divide-line max-h-72 overflow-y-auto">
            {c.timeEntries.map((t) => (
              <li key={t.id} className="px-5 py-3 flex items-center gap-3 text-sm">
                <div className="flex-1 min-w-0">
                  <p className="truncate">{t.description}</p>
                  <p className="text-xs text-ink-faint">
                    {t.user.name} · {formatDate(t.date)}
                  </p>
                </div>
                <span className="tabular font-semibold">{formatMinutes(t.minutes)}</span>
                {!t.billable && <Badge tone="neutral">μη χρεώσιμο</Badge>}
              </li>
            ))}
            {c.timeEntries.length === 0 && <li className="px-5 py-4 text-sm text-ink-faint">Καμία καταχώρηση.</li>}
          </ul>
          <form action={addTimeEntry} className="border-t border-line-strong p-4 grid grid-cols-4 gap-3 bg-paper/50">
            <input type="hidden" name="caseId" value={c.id} />
            <div className="col-span-4">
              <label className="label" htmlFor="te-desc">Περιγραφή εργασίας *</label>
              <input id="te-desc" name="description" required className="field" />
            </div>
            <div>
              <label className="label" htmlFor="te-date">Ημ/νία</label>
              <input id="te-date" name="date" type="date" required defaultValue={new Date().toISOString().slice(0, 10)} className="field" />
            </div>
            <div>
              <label className="label" htmlFor="te-h">Ώρες</label>
              <input id="te-h" name="hours" type="number" min={0} max={24} defaultValue={1} className="field" />
            </div>
            <div>
              <label className="label" htmlFor="te-m">Λεπτά</label>
              <input id="te-m" name="mins" type="number" min={0} max={59} defaultValue={0} className="field" />
            </div>
            <div>
              <label className="label" htmlFor="te-rate">€/ώρα</label>
              <input id="te-rate" name="rateEuros" type="number" min={0} step="0.01" defaultValue={120} className="field" />
            </div>
            <label className="flex items-center gap-2 text-sm col-span-2">
              <input type="checkbox" name="billable" defaultChecked /> Χρεώσιμο
            </label>
            <div className="col-span-2 flex justify-end">
              <button className="btn btn-brass">Καταχώρηση</button>
            </div>
          </form>
        </section>

        {/* Documents — legal content, hidden from staff */}
        {legalAccess && (
          <section className="card overflow-hidden">
            <h2 className="font-display text-lg font-semibold px-5 py-4 border-b border-line">Έγγραφα</h2>
            <ul className="divide-y divide-line">
              {c.documents.map((d) => (
                <li key={d.id} className="px-5 py-3 flex items-center gap-3 text-sm">
                  <div className="flex-1 min-w-0">
                    <a href={`/api/documents/${d.id}`} className="font-medium hover:underline truncate block">
                      {d.title}
                      {d.version > 1 && <span className="text-xs text-brass-dark ml-1">v{d.version}</span>}
                    </a>
                    <p className="text-xs text-ink-faint">
                      {DOC_TYPE_LABELS[d.docType as DocType] ?? d.docType} · {d.fileName} ·{" "}
                      {(d.size / 1024).toFixed(0)}KB · {d.uploadedBy?.name ?? "—"}
                    </p>
                  </div>
                  <span className="text-xs text-ink-faint tabular">{formatDate(d.createdAt)}</span>
                </li>
              ))}
              {c.documents.length === 0 && <li className="px-5 py-4 text-sm text-ink-faint">Κανένα έγγραφο.</li>}
            </ul>
            <form action={uploadWithId} className="border-t border-line-strong p-4 grid grid-cols-2 gap-3 bg-paper/50">
              <div>
                <label className="label" htmlFor="doc-title">Τίτλος *</label>
                <input id="doc-title" name="title" required className="field" />
              </div>
              <div>
                <label className="label" htmlFor="doc-type">Είδος</label>
                <select id="doc-type" name="docType" className="field">
                  {DOC_TYPES.map((t) => (
                    <option key={t} value={t}>{DOC_TYPE_LABELS[t]}</option>
                  ))}
                </select>
              </div>
              <div className="col-span-2">
                <label className="label" htmlFor="doc-file">Αρχείο * (έως 15MB)</label>
                <input id="doc-file" name="file" type="file" required className="field" />
              </div>
              <div className="col-span-2 flex justify-end">
                <button className="btn btn-brass">Μεταφόρτωση</button>
              </div>
            </form>
          </section>
        )}

        {/* Notes — legal content, hidden from staff */}
        {legalAccess && (
          <section className="card overflow-hidden">
            <h2 className="font-display text-lg font-semibold px-5 py-4 border-b border-line">Σημειώσεις / Πρακτικά</h2>
            <ul className="divide-y divide-line max-h-96 overflow-y-auto">
              {c.notes.map((n) => (
                <li key={n.id} className="px-5 py-3 text-sm">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold text-xs">{n.author.name}</span>
                    {n.source === "ai_structured" && <Badge tone="brass">AI · εγκεκριμένο</Badge>}
                    <span className="text-xs text-ink-faint ml-auto tabular">{formatDateTime(n.createdAt)}</span>
                  </div>
                  <p className="whitespace-pre-wrap text-ink-soft">{n.content}</p>
                </li>
              ))}
              {c.notes.length === 0 && <li className="px-5 py-4 text-sm text-ink-faint">Καμία σημείωση.</li>}
            </ul>
            <form action={addNoteWithId} className="border-t border-line-strong p-4 bg-paper/50">
              <label className="label" htmlFor="note-content">Νέα σημείωση</label>
              <textarea id="note-content" name="content" rows={3} required className="field mb-3" />
              <div className="flex items-center justify-between gap-3">
                <Link href={`/ai/notes?caseId=${c.id}`} className="text-xs text-brass-dark underline underline-offset-2">
                  ✨ Δόμηση με AI βοηθό
                </Link>
                <button className="btn btn-brass">Προσθήκη</button>
              </div>
            </form>
          </section>
        )}
      </div>
    </div>
  );
}
