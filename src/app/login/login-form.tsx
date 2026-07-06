"use client";

import { useActionState } from "react";
import { loginAction, type LoginState } from "./actions";

export function LoginForm() {
  const [state, formAction, pending] = useActionState<LoginState, FormData>(loginAction, {});

  return (
    <form action={formAction} className="space-y-4">
      <div>
        <label className="label" htmlFor="email">
          Email
        </label>
        <input id="email" name="email" type="email" required autoComplete="email" className="field" placeholder="owner@demo.nomiko.gr" />
      </div>
      <div>
        <label className="label" htmlFor="password">
          Κωδικός πρόσβασης
        </label>
        <input id="password" name="password" type="password" required autoComplete="current-password" className="field" placeholder="••••••••" />
      </div>
      {state.error && (
        <p className="text-sm font-medium text-oxblood bg-oxblood-pale border border-oxblood/20 rounded px-3 py-2">{state.error}</p>
      )}
      <button type="submit" disabled={pending} className="btn btn-primary w-full justify-center disabled:opacity-60">
        {pending ? "Σύνδεση…" : "Σύνδεση"}
      </button>
    </form>
  );
}
