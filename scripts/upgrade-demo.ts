/** Non-destructive demo upgrade: adds αντίδικοι, portal, δικάσιμοι, γραμμάτιο to an existing seed. */
import { config } from "dotenv";
config({ path: ".env.local" });
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });

function daysFromNow(days: number, hour = 10): Date {
  const d = new Date();
  d.setDate(d.getDate() + days);
  d.setHours(hour, 0, 0, 0);
  return d;
}

async function main() {
  const firm = await prisma.firm.findUniqueOrThrow({ where: { slug: "papadopoulos-demo" } });
  const lawyer = await prisma.user.findUniqueOrThrow({ where: { email: "lawyer@demo.nomiko.gr" } });
  const owner = await prisma.user.findUniqueOrThrow({ where: { email: "owner@demo.nomiko.gr" } });

  const troxaio = await prisma.case.findFirstOrThrow({ where: { firmId: firm.id, title: { contains: "τροχαίο" } } });
  const symvasi = await prisma.case.findFirstOrThrow({ where: { firmId: firm.id, title: { contains: "διανομής" } } });
  const ergatiki = await prisma.case.findFirstOrThrow({ where: { firmId: firm.id, title: { contains: "Εργατική" } } });
  const poiniki = await prisma.case.findFirstOrThrow({ where: { firmId: firm.id, title: { contains: "Ποινική" } } });

  if (troxaio.portalToken) { console.log("Upgrade already applied. Skipping."); return; }

  await prisma.case.update({ where: { id: troxaio.id }, data: {
    opposingParty: "Ασφαλιστική Προστασία ΑΕ (DEMO)", opposingCounsel: "Ι. Δημητρίου",
    portalEnabled: true, portalToken: "demo-fakelos-ioannou",
  }});
  await prisma.case.update({ where: { id: symvasi.id }, data: { opposingParty: "Εισαγωγική ΕΠΕ (DEMO)" } });
  // Επίτηδες: αντίδικος = υφιστάμενος πελάτης -> αναδεικνύει τον έλεγχο σύγκρουσης
  await prisma.case.update({ where: { id: ergatiki.id }, data: { opposingParty: "Τεχνική Ανάπτυξη ΑΕ (DEMO)", opposingCounsel: "Σ. Παππάς" } });

  // Δικάσιμοι: υπάρχουσες -> type hearing + ορατές
  await prisma.deadline.updateMany({
    where: { firmId: firm.id, title: { contains: "Δικάσιμος" } },
    data: { type: "hearing" },
  });
  await prisma.deadline.updateMany({
    where: { firmId: firm.id, caseId: { in: [troxaio.id, ergatiki.id] } },
    data: { visibleToClient: true },
  });

  // Ιστορικό αναβολής στην εργατική: η υπάρχουσα δικάσιμος προήλθε από αναβολή
  const currentHearing = await prisma.deadline.findFirst({ where: { caseId: ergatiki.id, type: "hearing", status: "pending" } });
  if (currentHearing && !currentHearing.rescheduledFromId) {
    const old = await prisma.deadline.create({ data: {
      firmId: firm.id, caseId: ergatiki.id, title: currentHearing.title, type: "hearing",
      dueAt: daysFromNow(-15), status: "postponed", remindDaysBefore: 7, createdById: lawyer.id, visibleToClient: true,
    }});
    await prisma.deadline.update({ where: { id: currentHearing.id }, data: { rescheduledFromId: old.id, notes: "Αναβολή: εκ του πινακίου" } });
  }

  // Δικάσιμος ορατή στην πύλη του τροχαίου
  const exists = await prisma.deadline.findFirst({ where: { caseId: troxaio.id, title: "Συζήτηση αγωγής" } });
  if (!exists) {
    await prisma.deadline.create({ data: {
      firmId: firm.id, caseId: troxaio.id, title: "Συζήτηση αγωγής", type: "hearing",
      dueAt: daysFromNow(45), remindDaysBefore: 14, createdById: owner.id, visibleToClient: true,
    }});
  }

  await prisma.invoice.updateMany({
    where: { firmId: firm.id, number: "ΤΠΥ-2026-001" },
    data: { grammatioNumber: "Γ-2026/004512", grammatioCents: 6900 },
  });

  console.log("Demo upgrade complete. Portal: /f/demo-fakelos-ioannou  Poiniki case:", poiniki.id);
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
