export const ROLES = ["owner", "lawyer", "trainee", "staff"] as const;
export type Role = (typeof ROLES)[number];

export const ROLE_LABELS: Record<Role, string> = {
  owner: "Ιδιοκτήτης",
  lawyer: "Δικηγόρος",
  trainee: "Ασκούμενος/η",
  staff: "Γραμματεία",
};

// staff must never see legal content (case descriptions, documents, notes)
export const LEGAL_CONTENT_ROLES: Role[] = ["owner", "lawyer", "trainee"];

export const PRACTICE_AREAS = [
  "civil",
  "criminal",
  "commercial",
  "labor",
  "administrative",
  "family",
  "real_estate",
  "other",
] as const;
export type PracticeArea = (typeof PRACTICE_AREAS)[number];

export const PRACTICE_AREA_LABELS: Record<PracticeArea, string> = {
  civil: "Αστικό Δίκαιο",
  criminal: "Ποινικό Δίκαιο",
  commercial: "Εμπορικό Δίκαιο",
  labor: "Εργατικό Δίκαιο",
  administrative: "Διοικητικό Δίκαιο",
  family: "Οικογενειακό Δίκαιο",
  real_estate: "Ακίνητα / Εμπράγματο",
  other: "Άλλο",
};

export const CASE_STATUSES = ["active", "pending", "closed", "archived"] as const;
export type CaseStatus = (typeof CASE_STATUSES)[number];
export const CASE_STATUS_LABELS: Record<CaseStatus, string> = {
  active: "Ενεργή",
  pending: "Σε αναμονή",
  closed: "Κλειστή",
  archived: "Αρχειοθετημένη",
};

export const DEADLINE_TYPES = ["hearing", "procedural", "administrative", "other"] as const;
export type DeadlineType = (typeof DEADLINE_TYPES)[number];
export const DEADLINE_TYPE_LABELS: Record<DeadlineType, string> = {
  hearing: "Δικάσιμος",
  procedural: "Δικονομική προθεσμία",
  administrative: "Διοικητική",
  other: "Άλλη",
};

export const DEADLINE_STATUSES = ["pending", "done", "missed", "postponed"] as const;
export type DeadlineStatus = (typeof DEADLINE_STATUSES)[number];
export const DEADLINE_STATUS_LABELS: Record<DeadlineStatus, string> = {
  pending: "Εκκρεμεί",
  done: "Ολοκληρώθηκε",
  missed: "Χάθηκε",
  postponed: "Αναβλήθηκε",
};

/** Plain-language case status for the client portal («Ο φάκελός μου»). */
export const PORTAL_STATUS_LABELS: Record<CaseStatus, string> = {
  active: "Σε εξέλιξη",
  pending: "Σε αναμονή",
  closed: "Ολοκληρώθηκε",
  archived: "Στο αρχείο",
};

export const DOC_TYPES = [
  "pleading",
  "correspondence",
  "evidence",
  "contract",
  "authorization",
  "other",
] as const;
export type DocType = (typeof DOC_TYPES)[number];
export const DOC_TYPE_LABELS: Record<DocType, string> = {
  pleading: "Δικόγραφο",
  correspondence: "Αλληλογραφία",
  evidence: "Αποδεικτικό",
  contract: "Σύμβαση",
  authorization: "Εξουσιοδότηση",
  other: "Άλλο",
};

export const INVOICE_STATUSES = ["draft", "issued", "paid", "void"] as const;
export type InvoiceStatus = (typeof INVOICE_STATUSES)[number];
export const INVOICE_STATUS_LABELS: Record<InvoiceStatus, string> = {
  draft: "Πρόχειρο",
  issued: "Εκδόθηκε",
  paid: "Εξοφλήθηκε",
  void: "Ακυρώθηκε",
};

export const CLIENT_TYPES = ["individual", "company"] as const;
export type ClientType = (typeof CLIENT_TYPES)[number];
export const CLIENT_TYPE_LABELS: Record<ClientType, string> = {
  individual: "Φυσικό πρόσωπο",
  company: "Νομικό πρόσωπο",
};

export const LEAD_STATUSES = ["new", "contacted", "converted", "dismissed"] as const;
export type LeadStatus = (typeof LEAD_STATUSES)[number];
export const LEAD_STATUS_LABELS: Record<LeadStatus, string> = {
  new: "Νέο",
  contacted: "Επικοινωνήσαμε",
  converted: "Έγινε πελάτης",
  dismissed: "Απορρίφθηκε",
};

export const AI_DISCLAIMER =
  "ΑΝΕΠΙΒΕΒΑΙΩΤΟ — ΕΛΕΓΞΕ ΠΡΙΝ ΧΡΗΣΙΜΟΠΟΙΗΣΕΙΣ. Το περιεχόμενο παρήχθη από AI και δεν αποτελεί νομική συμβουλή.";
