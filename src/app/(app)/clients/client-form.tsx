import { CLIENT_TYPE_LABELS, CLIENT_TYPES } from "@/lib/constants";

type ClientData = {
  type: string;
  fullName: string;
  vatNumber: string | null;
  idNumber: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  notes: string | null;
  consentDataProcessing: boolean;
  consentMarketing: boolean;
};

export function ClientFormFields({ client }: { client?: ClientData }) {
  return (
    <div className="space-y-5">
      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className="label" htmlFor="type">Τύπος</label>
          <select id="type" name="type" defaultValue={client?.type ?? "individual"} className="field">
            {CLIENT_TYPES.map((t) => (
              <option key={t} value={t}>{CLIENT_TYPE_LABELS[t]}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="fullName">Ονοματεπώνυμο / Επωνυμία *</label>
          <input id="fullName" name="fullName" required defaultValue={client?.fullName} className="field" />
        </div>
        <div>
          <label className="label" htmlFor="vatNumber">ΑΦΜ</label>
          <input id="vatNumber" name="vatNumber" defaultValue={client?.vatNumber ?? ""} className="field" />
        </div>
        <div>
          <label className="label" htmlFor="idNumber">ΑΔΤ</label>
          <input id="idNumber" name="idNumber" defaultValue={client?.idNumber ?? ""} className="field" />
        </div>
        <div>
          <label className="label" htmlFor="email">Email</label>
          <input id="email" name="email" type="email" defaultValue={client?.email ?? ""} className="field" />
        </div>
        <div>
          <label className="label" htmlFor="phone">Τηλέφωνο</label>
          <input id="phone" name="phone" defaultValue={client?.phone ?? ""} className="field" />
        </div>
      </div>
      <div>
        <label className="label" htmlFor="address">Διεύθυνση</label>
        <input id="address" name="address" defaultValue={client?.address ?? ""} className="field" />
      </div>
      <div>
        <label className="label" htmlFor="notes">Σημειώσεις</label>
        <textarea id="notes" name="notes" rows={3} defaultValue={client?.notes ?? ""} className="field" />
      </div>
      <fieldset className="card border-dashed p-4 space-y-2">
        <legend className="kicker px-1">Συγκαταθεσεις GDPR</legend>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="consentDataProcessing" defaultChecked={client?.consentDataProcessing ?? false} />
          Συγκατάθεση επεξεργασίας δεδομένων (υποχρεωτική για ενεργή εντολή)
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="consentMarketing" defaultChecked={client?.consentMarketing ?? false} />
          Συγκατάθεση ενημερωτικής επικοινωνίας (προαιρετική)
        </label>
      </fieldset>
    </div>
  );
}
