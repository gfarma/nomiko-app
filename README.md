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

## Deploy (Vercel + Postgres)

1. Βάση: `npx create-db` (δωρεάν Prisma Postgres — κάνε **claim** από το link για να μη διαγραφεί) ή Neon
2. [vercel.com/new](https://vercel.com/new) → Import το repo → πρόσθεσε env vars:
   - `DATABASE_URL` (το connection string)
   - `AUTH_SECRET` (π.χ. `openssl rand -base64 32`)
   - `AUTH_TRUST_HOST=true`
   - προαιρετικά `ENABLE_AI_FEATURES=true` (demo μόνο)
3. Deploy — το `postinstall` τρέχει `prisma generate` αυτόματα
4. Μία φορά, τοπικά με το ίδιο `DATABASE_URL`: `npx prisma db push && npm run seed`

> Σημείωση: τα uploads εγγράφων αποθηκεύονται σε local disk (ephemeral στο Vercel) — demo only. Το storage layer είναι interface, έτοιμο για S3/Blob provider.

> ⚠️ Το public preview τρέχει ΜΟΝΟ με πλαστά/demo δεδομένα. Ποτέ πραγματικά στοιχεία πελατών πριν κλειδωθεί DPA-backed AI πάροχος και γίνει security review.

## Μη-στόχοι (by design)

- Καμία νομική συμβουλή / πρόβλεψη έκβασης / αυτόματο δικόγραφο χωρίς επαλήθευση δικηγόρου
- Κάθε AI αναφορά σε νόμο/νομολογία επισημαίνεται «ΑΝΕΠΙΒΕΒΑΙΩΤΟ — ΕΛΕΓΞΕ ΠΡΙΝ ΧΡΗΣΙΜΟΠΟΙΗΣΕΙΣ»
- ΟΣΔΔΥ/ηλ. κατάθεση, myDATA submit, ψηφιακή υπογραφή → Phase 2 (placeholders μόνο)

## License

Proprietary — All rights reserved. Source-visible για λόγους επίδειξης· απαγορεύεται η χρήση/αναδιανομή χωρίς άδεια.
