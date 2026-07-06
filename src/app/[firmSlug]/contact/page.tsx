import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { PRACTICE_AREA_LABELS, type PracticeArea } from "@/lib/constants";
import { submitLead } from "./actions";

export async function generateMetadata(props: PageProps<"/[firmSlug]/contact">): Promise<Metadata> {
  const { firmSlug } = await props.params;
  const firm = await prisma.firm.findUnique({ where: { slug: firmSlug }, select: { name: true } });
  if (!firm) return { title: "Δεν βρέθηκε" };
  return {
    title: `Επικοινωνία — ${firm.name}`,
    description: `Επικοινωνήστε με το ${firm.name}. Στείλτε το αίτημά σας και θα σας απαντήσουμε άμεσα.`,
  };
}

export default async function PublicContactPage(props: PageProps<"/[firmSlug]/contact">) {
  const { firmSlug } = await props.params;
  const sp = await props.searchParams;
  const sent = sp.sent === "1";

  const firm = await prisma.firm.findUnique({ where: { slug: firmSlug } });
  if (!firm) notFound();

  const areas = firm.practiceAreas
    .split(",")
    .map((a) => PRACTICE_AREA_LABELS[a.trim() as PracticeArea])
    .filter(Boolean);

  const submitWithSlug = submitLead.bind(null, firm.slug);

  return (
    <main className="flex-1">
      {/* Hero */}
      <section className="bg-ink-deep text-paper">
        <div className="max-w-3xl mx-auto px-6 py-16">
          <p className="kicker text-brass-pale/80">Δικηγορικο Γραφειο</p>
          <h1 className="font-display text-4xl sm:text-5xl font-semibold tracking-tight mt-2">{firm.name}</h1>
          {firm.publicBio && <p className="mt-4 text-white/70 max-w-xl leading-relaxed">{firm.publicBio}</p>}
          {areas.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-6">
              {areas.map((a) => (
                <span key={a} className="badge bg-white/10 text-brass-pale border border-white/15">
                  {a}
                </span>
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="max-w-3xl mx-auto px-6 py-12 grid md:grid-cols-5 gap-8">
        {/* Contact info */}
        <div className="md:col-span-2 space-y-4 text-sm">
          <h2 className="font-display text-xl font-semibold">Στοιχεία επικοινωνίας</h2>
          {firm.address && (
            <p>
              <span className="kicker block">Διευθυνση</span>
              {firm.address}
            </p>
          )}
          {firm.phone && (
            <p>
              <span className="kicker block">Τηλεφωνο</span>
              <a href={`tel:${firm.phone.replace(/\s/g, "")}`} className="underline underline-offset-2">
                {firm.phone}
              </a>
            </p>
          )}
          {firm.email && (
            <p>
              <span className="kicker block">Email</span>
              <a href={`mailto:${firm.email}`} className="underline underline-offset-2">
                {firm.email}
              </a>
            </p>
          )}
        </div>

        {/* Lead form */}
        <div className="md:col-span-3">
          <div className="card p-6">
            <h2 className="font-display text-xl font-semibold mb-1">Στείλτε μας το αίτημά σας</h2>
            <p className="text-xs text-ink-faint mb-5">
              Θα επικοινωνήσουμε μαζί σας το συντομότερο. Η φόρμα δεν υποκαθιστά νομική συμβουλή.
            </p>

            {sent ? (
              <div className="rounded border border-moss/30 bg-moss-pale text-moss px-4 py-6 text-center font-medium">
                ✓ Το αίτημά σας εστάλη. Θα επικοινωνήσουμε σύντομα μαζί σας.
              </div>
            ) : (
              <form action={submitWithSlug} className="space-y-4">
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="label" htmlFor="name">Ονοματεπώνυμο *</label>
                    <input id="name" name="name" required className="field" />
                  </div>
                  <div>
                    <label className="label" htmlFor="phone">Τηλέφωνο</label>
                    <input id="phone" name="phone" className="field" />
                  </div>
                </div>
                <div>
                  <label className="label" htmlFor="email">Email</label>
                  <input id="email" name="email" type="email" className="field" />
                </div>
                <div>
                  <label className="label" htmlFor="message">Το αίτημά σας *</label>
                  <textarea
                    id="message"
                    name="message"
                    rows={4}
                    required
                    className="field"
                    placeholder="Περιγράψτε συνοπτικά το θέμα σας — μην συμπεριλάβετε ευαίσθητα προσωπικά δεδομένα."
                  />
                </div>
                <label className="flex items-start gap-2 text-xs text-ink-soft">
                  <input type="checkbox" name="consent" required className="mt-0.5" />
                  Συναινώ στην επεξεργασία των στοιχείων μου αποκλειστικά για την εξυπηρέτηση του αιτήματός μου (GDPR).
                </label>
                <button className="btn btn-primary w-full justify-center">Αποστολή</button>
              </form>
            )}
          </div>
        </div>
      </section>

      <footer className="border-t border-line py-6 text-center text-xs text-ink-faint">
        Σελίδα demo — τα στοιχεία του γραφείου είναι πλαστά. Powered by Nomiko.
      </footer>
    </main>
  );
}
