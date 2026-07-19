# Nomiko App

SaaS διαχείρισης δικηγορικού γραφείου για την ελληνική αγορά — πολλαπλοί τομείς δικαίου, AI-native administrative layer.

**Status: 🚧 Under active development (MVP Phase 1)**

## Τι είναι

Web εφαρμογή όπου δικηγορικά γραφεία διαχειρίζονται:

- 👥 **Πελάτες** (φυσικά & νομικά πρόσωπα, GDPR consent tracking)
- ⚖️ **Υποθέσεις** (configurable custom fields ανά τομέα δικαίου)
- ⏰ **Δικονομικές προθεσμίες** (ημερολόγιο, reminders, prominent dashboard)
- 📄 **Έγγραφα** (upload, οργάνωση ανά υπόθεση, version history)
- ⏱️ **Χρόνο εργασίας** (time tracking ανά υπόθεση/δικηγόρο)
- 💶 **Τιμολόγηση** βάσει καταγεγραμμένου χρόνου (myDATA-ready placeholder)
- 🤖 **AI διοικητικά εργαλεία** (πίσω από feature flags, human-in-the-loop, ποτέ νομική συμβουλή)
- 🌐 **Δημόσια σελίδα επικοινωνίας** ανά γραφείο (`/[firm-slug]/contact`) για lead capture
- 📁 **Πύλη εντολέα «Ο φάκελός μου»** (`/f/[token]`) — ο πελάτης βλέπει πορεία, δικασίμους και έγγραφα που επιλέγει ο δικηγόρος (per-item 👁)
- ⚔️ **Αντίδικοι + έλεγχος σύγκρουσης συμφερόντων** (accent-insensitive matching, banner στην υπόθεση)
- ⚖️ **Δικάσιμοι με ροή αναβολής** (ιστορικό αναβολών, λόγος, «Αναβλήθηκε»)
- 🔎 **Καθολική αναζήτηση** (ΓΑΚ/ΕΑΚ, ονόματα, ΑΦΜ, αντίδικοι, τηλέφωνα)
- 🧾 **Γραμμάτιο προείσπραξης ΔΣΑ** στα τιμολόγια

**Static demo (πλοήγηση μόνο):** https://gfarma.github.io/nomiko-app/

## Tech stack

- **Next.js 16** (App Router, Turbopack) · TypeScript · Tailwind CSS v4
- **PostgreSQL** (Prisma Postgres / Neon / οποιαδήποτε) · Prisma 7 ORM (driver adapters)
- **Auth.js (NextAuth v5)** — credentials, role-based (owner / lawyer / trainee / staff)
- **Vercel** deployment
- **AI provider**: configurable μέσω env (`AI_PROVIDER`, `AI_API_KEY`, `AI_BASE_URL`) — vendor-agnostic

## Τοπική εκτέλεση

```bash
npm install
cp .env.example .env.local   # συμπλήρωσε DATABASE_URL + AUTH_SECRET
npx prisma db push           # δημιουργία schema
npm run seed                 # demo δεδομένα (ΠΛΑΣΤΑ — fake γραφείο/πελάτες/υποθέσεις)
npm run dev
```

Demo login (μετά το seed): `owner@demo.nomiko.gr` / `demo1234!`

## Deploy — Self-hosted (Docker)

```bash
docker build -t nomiko-app .
docker run -d --name nomiko -p 3000:3000 \
  -e DATABASE_URL="postgres://..." \
  -e AUTH_SECRET="$(openssl rand -base64 32)" \
  -e AUTH_TRUST_HOST=true \
  -v nomiko-storage:/app/storage \
  nomiko-app
```

- Βάση: οποιαδήποτε Postgres (hosted Prisma Postgres από `npx create-db`, Neon, ή δική σου σε container)
- Schema + demo δεδομένα (μία φορά, με το ίδιο `DATABASE_URL`): `npx prisma db push && npm run seed`
- Πίσω από reverse proxy (nginx/traefik) με TLS. Το `/app/storage` volume κρατά τα uploads εγγράφων.
- Προαιρετικά: `ENABLE_AI_FEATURES=true` **μόνο** σε demo περιβάλλον με πλαστά δεδομένα.

Χωρίς Docker: `npm run build` και μετά `node .next/standalone/server.js` (αντιγράφοντας `.next/static` → `.next/standalone/.next/static` και `public` → `.next/standalone/public`).

> ⚠️ Το public preview τρέχει ΜΟΝΟ με πλαστά/demo δεδομένα. Ποτέ πραγματικά στοιχεία πελατών πριν κλειδωθεί DPA-backed AI πάροχος και γίνει security review.

## Μη-στόχοι (by design)

- Καμία νομική συμβουλή / πρόβλεψη έκβασης / αυτόματο δικόγραφο χωρίς επαλήθευση δικηγόρου
- Κάθε AI αναφορά σε νόμο/νομολογία επισημαίνεται «ΑΝΕΠΙΒΕΒΑΙΩΤΟ — ΕΛΕΓΞΕ ΠΡΙΝ ΧΡΗΣΙΜΟΠΟΙΗΣΕΙΣ»
- ΟΣΔΔΥ/ηλ. κατάθεση, myDATA submit, ψηφιακή υπογραφή → Phase 2 (placeholders μόνο)

## License

Proprietary — All rights reserved. Source-visible για λόγους επίδειξης· απαγορεύεται η χρήση/αναδιανομή χωρίς άδεια.
