import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Σύνδεση" };

export default async function LoginPage() {
  const session = await auth();
  if (session?.user) redirect("/dashboard");

  return (
    <main className="flex-1 grid place-items-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="font-display text-4xl font-semibold tracking-tight">
            Nomiko<span className="text-brass">.</span>
          </div>
          <p className="kicker mt-2">Διαχειριση Δικηγορικου Γραφειου</p>
        </div>

        <div className="card p-8">
          <h1 className="font-display text-xl font-semibold mb-6">Σύνδεση στο γραφείο σας</h1>
          <LoginForm />
        </div>

        <div className="card mt-4 p-4 text-sm text-ink-soft border-dashed">
          <p className="font-semibold text-ink mb-1">Demo λογαριασμοί (πλαστά δεδομένα):</p>
          <ul className="space-y-0.5 tabular">
            <li>owner@demo.nomiko.gr — Ιδιοκτήτης</li>
            <li>lawyer@demo.nomiko.gr — Δικηγόρος</li>
            <li>staff@demo.nomiko.gr — Γραμματεία</li>
          </ul>
          <p className="mt-1">
            Κωδικός: <code className="font-semibold">demo1234!</code>
          </p>
        </div>
      </div>
    </main>
  );
}
