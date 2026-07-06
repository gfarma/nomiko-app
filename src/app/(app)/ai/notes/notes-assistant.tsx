"use client";

import { useActionState } from "react";
import { acceptStructuredNotes, generateStructuredNotes, type GenerateState } from "./actions";

export function NotesAssistant({
  cases,
  defaultCaseId,
}: {
  cases: { id: string; title: string }[];
  defaultCaseId?: string;
}) {
  const [state, generateAction, generating] = useActionState<GenerateState, FormData>(generateStructuredNotes, {});

  return (
    <div className="grid lg:grid-cols-2 gap-6 items-start">
      {/* Input */}
      <form action={generateAction} className="card p-5 space-y-4">
        <div>
          <label className="label" htmlFor="caseId">Υπόθεση *</label>
          <select id="caseId" name="caseId" required defaultValue={defaultCaseId ?? ""} className="field">
            <option value="">— Επιλέξτε —</option>
            {cases.map((c) => (
              <option key={c.id} value={c.id}>{c.title}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="rawNotes">Πρόχειρες σημειώσεις *</label>
          <textarea
            id="rawNotes"
            name="rawNotes"
            rows={12}
            required
            className="field"
            placeholder={"π.χ.\nτηλ με πελάτη 20λ\nθέλει να προχωρήσουμε σε αγωγή\nεκκρεμεί βεβαίωση εργοδότη\nραντεβού Πέμπτη 12:00"}
          />
        </div>
        <p className="text-xs text-ink-faint">
          Πριν την αποστολή, ονόματα/τηλέφωνα/ΑΦΜ ψευδωνυμοποιούνται αυτόματα. Η κλήση καταγράφεται στο μητρώο AI.
        </p>
        {state.error && (
          <p className="text-sm font-medium text-oxblood bg-oxblood-pale border border-oxblood/20 rounded px-3 py-2">
            {state.error}
          </p>
        )}
        <button disabled={generating} className="btn btn-primary w-full justify-center disabled:opacity-60">
          {generating ? "Δόμηση…" : "✨ Δόμηση σημειώσεων"}
        </button>
      </form>

      {/* Preview + Accept (human-in-the-loop) */}
      <div className="card p-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-display text-lg font-semibold">Προεπισκόπηση</h2>
          {state.output && (
            <span className="badge bg-amber-pale text-amber">Απαιτεί έγκριση δικηγόρου</span>
          )}
        </div>

        {!state.output ? (
          <p className="text-sm text-ink-faint py-10 text-center">
            Το δομημένο πρακτικό θα εμφανιστεί εδώ.
            <br />
            Τίποτα δεν αποθηκεύεται χωρίς την έγκρισή σας.
          </p>
        ) : (
          <form action={acceptStructuredNotes} className="space-y-3">
            <input type="hidden" name="logId" value={state.logId} />
            <input type="hidden" name="caseId" value={state.caseId} />
            <textarea name="content" rows={16} defaultValue={state.output} className="field font-mono text-sm" />
            <p className="text-xs text-ink-faint">
              Μοντέλο: {state.model}
              {state.mocked && " (offline formatter — δεν έγινε εξωτερική κλήση)"} · Ψευδωνυμοποιήσεις:{" "}
              {state.replacements ?? 0}. Ελέγξτε και διορθώστε πριν την αποδοχή — το AI περιεχόμενο δεν αποτελεί νομική
              συμβουλή.
            </p>
            <button className="btn btn-brass w-full justify-center">✓ Αποδοχή &amp; αποθήκευση στην υπόθεση</button>
          </form>
        )}
      </div>
    </div>
  );
}
