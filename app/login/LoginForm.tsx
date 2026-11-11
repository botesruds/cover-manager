"use client";

import { useActionState } from "react";
import { signIn, type ActionState } from "../actions.ts";

export function LoginForm() {
  const [state, action, pending] = useActionState<ActionState, FormData>(signIn, { status: "idle" });
  return (
    <form action={action} className="mt-5 space-y-3">
      <div>
        <label className="label" htmlFor="email">Email</label>
        <input id="email" name="email" type="email" required autoComplete="email" className="input" />
      </div>
      <div>
        <label className="label" htmlFor="password">Password</label>
        <input id="password" name="password" type="password" required autoComplete="current-password" className="input" />
      </div>
      {state.status === "error" && <p className="text-sm text-red-600">{state.message}</p>}
      <button className="btn-primary w-full" disabled={pending}>
        {pending ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
