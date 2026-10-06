"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import type { FormState } from "@/lib/form-state";
import { createClient } from "@/lib/supabase/server";

const credentials = z.object({ email: z.string().trim().email(), password: z.string().min(1) });

export async function signIn(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = credentials.safeParse({ email: formData.get("email"), password: formData.get("password") });
  if (!parsed.success) return { ok: false, message: "Bitte E-Mail und Passwort eingeben." };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) {
    // 4xx = rejected credentials (one generic message on purpose: do not reveal whether the account
    // exists). Anything else is an outage or network problem and must not look like a wrong password.
    const rejected = typeof error.status === "number" && error.status >= 400 && error.status < 500;
    return {
      ok: false,
      message: rejected ? "E-Mail oder Passwort stimmt nicht." : "Anmeldung gerade nicht möglich (Verbindung?). Bitte gleich nochmals versuchen.",
    };
  }
  redirect("/");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
