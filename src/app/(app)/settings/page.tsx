import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/session";
import { Badge, PageHeader } from "@/components/ui";
import {
  PRACTICE_AREAS,
  PRACTICE_AREA_LABELS,
  ROLES,
  ROLE_LABELS,
  type PracticeArea,
  type Role,
} from "@/lib/constants";
import { createTemplate, createUser, toggleUserActive, updateFirm } from "./actions";
import { parseTemplateFields } from "../cases/custom-fields";

export const metadata: Metadata = { title: "Ρυθμίσεις" };

export default async function SettingsPage() {
  const user = await requireRole(["owner"]);

  const [firm, users, templates] = await Promise.all([
    prisma.firm.findUniqueOrThrow({ where: { id: user.firmId } }),
    prisma.user.findMany({ where: { firmId: user.firmId }, orderBy: { createdAt: "asc" } }),
    prisma.practiceAreaTemplate.findMany({ where: { firmId: user.firmId }, orderBy: { name: "asc" } }),
  ]);

  const firmAreas = new Set(firm.practiceAreas.split(",").map((a) => a.trim()));

  return (
    <div className="max-w-3xl">
      <PageHeader kicker="Διαχειριση" title="Ρυθμίσεις γραφείου" />

      {/* Firm */}
      <section className="card p-6 mb-6">
        <h2 className="font-display text-lg font-semibold mb-4">Στοιχεία γραφείου</h2>
        <form action={updateFirm} className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="label" htmlFor="name">Επωνυμία *</label>
              <input id="name" name="name" required defaultValue={firm.name} className="field" />
            </div>
            <div>
              <label className="label" htmlFor="vatNumber">ΑΦΜ</label>
              <input id="vatNumber" name="vatNumber" defaultValue={firm.vatNumber ?? ""} className="field" />
            </div>
            <div>
              <label className="label" htmlFor="phone">Τηλέφωνο</label>
              <input id="phone" name="phone" defaultValue={firm.phone ?? ""} className="field" />
            </div>
            <div>
              <label className="label" htmlFor="email">Email</label>
              <input id="email" name="email" type="email" defaultValue={firm.email ?? ""} className="field" />
            </div>
            <div>
              <label className="label" htmlFor="address">Διεύθυνση</label>
              <input id="address" name="address" defaultValue={firm.address ?? ""} className="field" />
            </div>
          </div>
          <div>
            <label className="label" htmlFor="publicBio">Δημόσια περιγραφή (σελίδα επικοινωνίας)</label>
            <textarea id="publicBio" name="publicBio" rows={3} defaultValue={firm.publicBio ?? ""} className="field" />
          </div>
          <div>
            <span className="label">Τομείς δικαίου</span>
            <div className="flex flex-wrap gap-3">
              {PRACTICE_AREAS.map((a) => (
                <label key={a} className="flex items-center gap-1.5 text-sm">
                  <input type="checkbox" name="practiceAreas" value={a} defaultChecked={firmAreas.has(a)} />
                  {PRACTICE_AREA_LABELS[a]}
                </label>
              ))}
            </div>
          </div>
          <div className="flex items-center justify-between">
            <p className="text-xs text-ink-faint">
              Δημόσια σελίδα:{" "}
              <a href={`/${firm.slug}/contact`} target="_blank" className="underline underline-offset-2">
                /{firm.slug}/contact ↗
              </a>
            </p>
            <button className="btn btn-primary">Αποθήκευση</button>
          </div>
        </form>
      </section>

      {/* Users */}
      <section className="card overflow-hidden mb-6">
        <h2 className="font-display text-lg font-semibold px-6 py-4 border-b border-line">Χρήστες</h2>
        <ul className="divide-y divide-line">
          {users.map((u) => (
            <li key={u.id} className="px-6 py-3 flex items-center gap-3 text-sm">
              <div className="flex-1">
                <span className={`font-medium ${!u.active ? "line-through text-ink-faint" : ""}`}>{u.name}</span>
                <span className="text-ink-faint ml-2">{u.email}</span>
              </div>
              <Badge tone={u.role === "owner" ? "ink" : u.role === "lawyer" ? "brass" : "neutral"}>
                {ROLE_LABELS[u.role as Role] ?? u.role}
              </Badge>
              {!u.active && <Badge tone="red">Ανενεργός</Badge>}
              {u.id !== user.id && (
                <form
                  action={async () => {
                    "use server";
                    await toggleUserActive(u.id);
                  }}
                >
                  <button className="btn btn-secondary text-xs px-2 py-1">
                    {u.active ? "Απενεργοποίηση" : "Ενεργοποίηση"}
                  </button>
                </form>
              )}
            </li>
          ))}
        </ul>
        <form action={createUser} className="border-t border-line-strong p-5 bg-paper/50 grid sm:grid-cols-2 gap-3">
          <div>
            <label className="label" htmlFor="nu-name">Ονοματεπώνυμο *</label>
            <input id="nu-name" name="name" required className="field" />
          </div>
          <div>
            <label className="label" htmlFor="nu-email">Email *</label>
            <input id="nu-email" name="email" type="email" required className="field" />
          </div>
          <div>
            <label className="label" htmlFor="nu-role">Ρόλος</label>
            <select id="nu-role" name="role" className="field" defaultValue="lawyer">
              {ROLES.map((r) => (
                <option key={r} value={r}>{ROLE_LABELS[r]}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="nu-rate">Ωριαία χρέωση (€)</label>
            <input id="nu-rate" name="hourlyRateEuros" type="number" min={0} step="0.01" defaultValue={120} className="field" />
          </div>
          <div>
            <label className="label" htmlFor="nu-pass">Προσωρινός κωδικός * (8+)</label>
            <input id="nu-pass" name="password" type="text" required minLength={8} className="field" />
          </div>
          <div className="flex items-end justify-end">
            <button className="btn btn-brass">+ Προσθήκη χρήστη</button>
          </div>
        </form>
      </section>

      {/* Templates */}
      <section className="card overflow-hidden">
        <h2 className="font-display text-lg font-semibold px-6 py-4 border-b border-line">
          Πρότυπα τομέων δικαίου (custom πεδία υποθέσεων)
        </h2>
        <ul className="divide-y divide-line">
          {templates.map((t) => (
            <li key={t.id} className="px-6 py-3 text-sm">
              <div className="flex items-center gap-2">
                <span className="font-medium">{t.name}</span>
                <Badge tone="brass">{PRACTICE_AREA_LABELS[t.area as PracticeArea] ?? t.area}</Badge>
              </div>
              <p className="text-xs text-ink-faint mt-1">
                Πεδία: {parseTemplateFields(t.fieldsJson).map((f) => f.label).join(", ") || "—"}
              </p>
            </li>
          ))}
          {templates.length === 0 && <li className="px-6 py-4 text-sm text-ink-faint">Κανένα πρότυπο.</li>}
        </ul>
        <form action={createTemplate} className="border-t border-line-strong p-5 bg-paper/50 space-y-3">
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <label className="label" htmlFor="tpl-name">Όνομα προτύπου *</label>
              <input id="tpl-name" name="name" required className="field" placeholder="π.χ. Διοικητική προσφυγή" />
            </div>
            <div>
              <label className="label" htmlFor="tpl-area">Τομέας</label>
              <select id="tpl-area" name="area" className="field">
                {PRACTICE_AREAS.map((a) => (
                  <option key={a} value={a}>{PRACTICE_AREA_LABELS[a]}</option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="label" htmlFor="tpl-fields">
              Πεδία (JSON: key, label, type: text|number|date|select, options?)
            </label>
            <textarea
              id="tpl-fields"
              name="fieldsJson"
              rows={4}
              className="field font-mono text-xs"
              defaultValue={`[\n  { "key": "protocol_no", "label": "Αρ. πρωτοκόλλου", "type": "text" },\n  { "key": "authority", "label": "Αρχή", "type": "text" }\n]`}
            />
          </div>
          <div className="flex justify-end">
            <button className="btn btn-brass">+ Δημιουργία προτύπου</button>
          </div>
        </form>
      </section>
    </div>
  );
}
