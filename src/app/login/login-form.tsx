"use client";

import { useActionState } from "react";
import { signIn } from "@/app/actions/auth";
import { Button, FormMessage, inputClass } from "@/components/ui";
import type { FormState } from "@/lib/form-state";

const initial: FormState = {};

export function LoginForm() {
  const [state, action, pending] = useActionState(signIn, initial);
  return (
    <form action={action} className="space-y-4">
      <label className="block text-sm">
        E-Mail
        <input name="email" type="email" autoComplete="username" required className={`${inputClass} mt-1`} />
      </label>
      <label className="block text-sm">
        Passwort
        <input name="password" type="password" autoComplete="current-password" required className={`${inputClass} mt-1`} />
      </label>
      <FormMessage state={state} />
      <Button type="submit" disabled={pending} className="w-full">
        {pending ? "Anmelden …" : "Anmelden"}
      </Button>
    </form>
  );
}
