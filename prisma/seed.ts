/**
 * Demo seed — ΟΛΑ τα δεδομένα είναι ΠΛΑΣΤΑ (fake γραφείο, πελάτες, υποθέσεις).
 * Ποτέ πραγματικά στοιχεία πελατών σε demo περιβάλλον.
 */
import { config as loadEnv } from "dotenv";
loadEnv({ path: ".env.local" });
loadEnv({ path: ".env" });

import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { hash } from "bcryptjs";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

function daysFromNow(days: number, hour = 10): Date {
  const d = new Date();
  d.setDate(d.getDate() + days);
  d.setHours(hour, 0, 0, 0);
  return d;
}

async function main() {
  const existing = await prisma.firm.findUnique({ where: { slug: "papadopoulos-demo" } });
  if (existing) {
    console.log("Seed already applied (firm papadopoulos-demo exists). Skipping.");
    return;
  }

  const firm = await prisma.firm.create({
    data: {
      name: "Δικηγορικό Γραφείο Παπαδόπουλος & Συνεργάτες (DEMO)",
      slug: "papadopoulos-demo",
      vatNumber: "999999999",
      address: "Σταδίου 10, 105 64 Αθήνα",
      phone: "210 0000000",
      email: "info@papadopoulos-demo.gr",
      practiceAreas: "civil,commercial,labor,criminal",
      publicBio:
        "Δικηγορικό γραφείο με έδρα την Αθήνα και εξειδίκευση σε αστικό, εμπορικό, εργατικό και ποινικό δίκαιο. (Demo σελίδα — πλαστά στοιχεία.)",
    },
  });

  const pw = await hash("demo1234!", 10);
  const [owner, lawyer, trainee, staff] = await Promise.all([
    prisma.user.create({
      data: { email: "owner@demo.nomiko.gr", passwordHash: pw, name: "Γιώργος Παπαδόπουλος", role: "owner", firmId: firm.id, hourlyRateCents: 18000 },
    }),
    prisma.user.create({
      data: { email: "lawyer@demo.nomiko.gr", passwordHash: pw, name: "Μαρία Οικονόμου", role: "lawyer", firmId: firm.id, hourlyRateCents: 14000 },
    }),
    prisma.user.create({
      data: { email: "trainee@demo.nomiko.gr", passwordHash: pw, name: "Νίκος Αντωνίου", role: "trainee", firmId: firm.id, hourlyRateCents: 6000 },
    }),
    prisma.user.create({
      data: { email: "staff@demo.nomiko.gr", passwordHash: pw, name: "Ελένη Δήμου", role: "staff", firmId: firm.id, hourlyRateCents: 0 },
    }),
  ]);

  // Practice-area templates with custom fields
  const civilTpl = await prisma.practiceAreaTemplate.create({
    data: {
      firmId: firm.id,
      area: "civil",
      name: "Αστική υπόθεση (αγωγή)",
      fieldsJson: JSON.stringify([
        { key: "gak", label: "ΓΑΚ", type: "text" },
        { key: "eak", label: "ΕΑΚ", type: "text" },
        { key: "hearing_date", label: "Ημερομηνία συζήτησης", type: "date" },
        { key: "claim_amount", label: "Αντικείμενο διαφοράς (€)", type: "number" },
      ]),
    },
  });
  const criminalTpl = await prisma.practiceAreaTemplate.create({
    data: {
      firmId: firm.id,
      area: "criminal",
      name: "Ποινική υπόθεση",
      fieldsJson: JSON.stringify([
        { key: "abm", label: "ΑΒΜ (Αρ. Βιβλίου Μηνύσεων)", type: "text" },
        { key: "stage", label: "Στάδιο", type: "select", options: ["Προκαταρκτική", "Ανάκριση", "Ακροατήριο", "Έφεση"] },
        { key: "custody", label: "Μέτρα δικονομικού καταναγκασμού", type: "text" },
      ]),
    },
  });
  const commercialTpl = await prisma.practiceAreaTemplate.create({
    data: {
      firmId: firm.id,
      area: "commercial",
      name: "Εμπορική σύμβαση",
      fieldsJson: JSON.stringify([
        { key: "contract_type", label: "Είδος σύμβασης", type: "select", options: ["Πώληση", "Διανομή", "Franchise", "Μίσθωση", "Άλλο"] },
        { key: "counterparty", label: "Αντισυμβαλλόμενος", type: "text" },
        { key: "value", label: "Αξία σύμβασης (€)", type: "number" },
      ]),
    },
  });

  // Fake clients
  const [c1, c2, c3, c4] = await Promise.all([
    prisma.client.create({
      data: {
        firmId: firm.id, type: "individual", fullName: "Δημήτρης Ιωάννου (DEMO)",
        email: "d.ioannou@example.com", phone: "6900000001", address: "Ερμού 5, Αθήνα",
        idNumber: "ΑΒ000001", consentDataProcessing: true, consentDate: new Date(),
        notes: "Πλαστός πελάτης για demo.",
      },
    }),
    prisma.client.create({
      data: {
        firmId: firm.id, type: "company", fullName: "Τεχνική Ανάπτυξη ΑΕ (DEMO)",
        vatNumber: "888888888", email: "legal@texniki-demo.gr", phone: "2100000002",
        address: "Λ. Κηφισίας 100, Μαρούσι", consentDataProcessing: true, consentDate: new Date(),
      },
    }),
    prisma.client.create({
      data: {
        firmId: firm.id, type: "individual", fullName: "Άννα Γεωργίου (DEMO)",
        email: "a.georgiou@example.com", phone: "6900000003",
        consentDataProcessing: true, consentMarketing: true, consentDate: new Date(),
      },
    }),
    prisma.client.create({
      data: {
        firmId: firm.id, type: "individual", fullName: "Κώστας Λεβέντης (DEMO)",
        phone: "6900000004", consentDataProcessing: true, consentDate: new Date(),
      },
    }),
  ]);

  // Cases
  const case1 = await prisma.case.create({
    data: {
      firmId: firm.id, clientId: c1.id, title: "Αγωγή αποζημίωσης από τροχαίο",
      caseNumber: "ΓΑΚ 12345/2026", practiceArea: "civil", court: "Μονομελές Πρωτοδικείο Αθηνών",
      stage: "Κατάθεση προτάσεων", status: "active", templateId: civilTpl.id,
      description: "Υλικές ζημίες και ηθική βλάβη από τροχαίο ατύχημα (demo).",
      customFieldsJson: JSON.stringify({ gak: "12345/2026", eak: "678/2026", hearing_date: daysFromNow(45).toISOString().slice(0, 10), claim_amount: 25000 }),
      assignments: { create: [{ userId: owner.id }, { userId: trainee.id }] },
    },
  });
  const case2 = await prisma.case.create({
    data: {
      firmId: firm.id, clientId: c2.id, title: "Σύμβαση διανομής — αναθεώρηση όρων",
      practiceArea: "commercial", stage: "Διαπραγμάτευση", status: "active", templateId: commercialTpl.id,
      description: "Επισκόπηση και αναδιαπραγμάτευση σύμβασης αποκλειστικής διανομής (demo).",
      customFieldsJson: JSON.stringify({ contract_type: "Διανομή", counterparty: "Εισαγωγική ΕΠΕ", value: 120000 }),
      assignments: { create: [{ userId: lawyer.id }] },
    },
  });
  const case3 = await prisma.case.create({
    data: {
      firmId: firm.id, clientId: c3.id, title: "Εργατική διαφορά — καταγγελία σύμβασης",
      caseNumber: "ΓΑΚ 55555/2026", practiceArea: "labor", court: "Ειρηνοδικείο Αθηνών",
      stage: "Αναμονή δικασίμου", status: "active",
      description: "Αξίωση αποζημίωσης απόλυσης και δεδουλευμένων (demo).",
      assignments: { create: [{ userId: lawyer.id }, { userId: trainee.id }] },
    },
  });
  const case4 = await prisma.case.create({
    data: {
      firmId: firm.id, clientId: c4.id, title: "Ποινική υπεράσπιση — σωματική βλάβη",
      practiceArea: "criminal", court: "Τριμελές Πλημμελειοδικείο Αθηνών",
      stage: "Ακροατήριο", status: "pending", templateId: criminalTpl.id,
      customFieldsJson: JSON.stringify({ abm: "Α2026/000111", stage: "Ακροατήριο" }),
      description: "Υπεράσπιση κατηγορουμένου (demo — πλαστά στοιχεία).",
      assignments: { create: [{ userId: owner.id }] },
    },
  });

  // Deadlines — the critical entity: some close, some comfortable
  await prisma.deadline.createMany({
    data: [
      { firmId: firm.id, caseId: case1.id, title: "Κατάθεση προτάσεων", type: "procedural", dueAt: daysFromNow(3), remindDaysBefore: 5, createdById: owner.id },
      { firmId: firm.id, caseId: case1.id, title: "Προσθήκη — αντίκρουση", type: "procedural", dueAt: daysFromNow(18), remindDaysBefore: 5, createdById: owner.id },
      { firmId: firm.id, caseId: case3.id, title: "Δικάσιμος (Ειρηνοδικείο Αθηνών)", type: "procedural", dueAt: daysFromNow(9), remindDaysBefore: 7, createdById: lawyer.id },
      { firmId: firm.id, caseId: case2.id, title: "Παράδοση σχεδίου σύμβασης στον πελάτη", type: "other", dueAt: daysFromNow(6), remindDaysBefore: 3, createdById: lawyer.id },
      { firmId: firm.id, caseId: case4.id, title: "Δικάσιμος — Τριμελές Πλημ/κείο", type: "procedural", dueAt: daysFromNow(30), remindDaysBefore: 10, createdById: owner.id },
      { firmId: firm.id, caseId: case2.id, title: "Απάντηση σε εξώδικο", type: "other", dueAt: daysFromNow(-2), status: "done", completedAt: daysFromNow(-3), createdById: lawyer.id },
    ],
  });

  // Time entries
  await prisma.timeEntry.createMany({
    data: [
      { firmId: firm.id, caseId: case1.id, userId: owner.id, date: daysFromNow(-6), minutes: 120, description: "Μελέτη δικογραφίας, συλλογή αποδεικτικών", rateCents: 18000 },
      { firmId: firm.id, caseId: case1.id, userId: trainee.id, date: daysFromNow(-5), minutes: 180, description: "Έρευνα νομολογίας για ηθική βλάβη", rateCents: 6000 },
      { firmId: firm.id, caseId: case1.id, userId: owner.id, date: daysFromNow(-2), minutes: 90, description: "Σύνταξη προτάσεων (α΄ μέρος)", rateCents: 18000 },
      { firmId: firm.id, caseId: case2.id, userId: lawyer.id, date: daysFromNow(-4), minutes: 150, description: "Επισκόπηση σύμβασης, σημειώσεις αναθεώρησης", rateCents: 14000 },
      { firmId: firm.id, caseId: case3.id, userId: lawyer.id, date: daysFromNow(-1), minutes: 60, description: "Τηλεδιάσκεψη με εντολέα, ενημέρωση", rateCents: 14000 },
      { firmId: firm.id, caseId: case3.id, userId: trainee.id, date: daysFromNow(-1), minutes: 240, description: "Υπολογισμός δεδουλευμένων/αποζημίωσης", rateCents: 6000, billable: false },
    ],
  });

  // A demo invoice from case1 time
  const inv = await prisma.invoice.create({
    data: {
      firmId: firm.id, clientId: c1.id, caseId: case1.id, number: "ΤΠΥ-2026-001",
      status: "issued", issueDate: daysFromNow(-1), dueDate: daysFromNow(29),
      subtotalCents: 54000, vatRate: 24, vatCents: 12960, totalCents: 66960,
      notes: "Demo τιμολόγιο — myDATA placeholder (Phase 2).",
      lines: {
        create: [
          { description: "Μελέτη δικογραφίας (2ω × 180€)", minutes: 120, rateCents: 18000, amountCents: 36000 },
          { description: "Έρευνα νομολογίας (3ω × 60€)", minutes: 180, rateCents: 6000, amountCents: 18000 },
        ],
      },
    },
  });

  // Notes
  await prisma.note.create({
    data: {
      firmId: firm.id, caseId: case1.id, authorId: owner.id, source: "manual",
      content: "Συνάντηση με εντολέα: προσκόμισε ιατρικές γνωματεύσεις και δελτίο συμβάντος. Εκκρεμεί βεβαίωση εργοδότη για απώλεια εισοδήματος.",
    },
  });

  // Leads from the public page
  await prisma.lead.createMany({
    data: [
      { firmId: firm.id, name: "Σοφία Καραμήτσου", email: "sofia.k@example.com", phone: "6911111111", message: "Θα ήθελα ραντεβού για θέμα μισθωτικής διαφοράς.", consent: true },
      { firmId: firm.id, name: "Πέτρος Ζάχος", email: "p.zachos@example.com", message: "Ερώτηση για εργατικό ατύχημα — πότε μπορώ να περάσω;", consent: true, status: "contacted" },
    ],
  });

  await prisma.auditLog.create({
    data: { firmId: firm.id, userId: owner.id, action: "seed.applied", entityType: "Firm", entityId: firm.id, detail: "Demo seed with fake data" },
  });

  console.log("Seed complete:");
  console.log("  Firm:", firm.name);
  console.log("  Users: owner@demo.nomiko.gr / lawyer@ / trainee@ / staff@  (password: demo1234!)");
  console.log("  Public page: /papadopoulos-demo/contact");
  console.log("  Invoice:", inv.number);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
