"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import type { FormState } from "@/lib/form-state";
import { describeSignInError } from "@/lib/auth-errors";
import { missingSupabaseEnv } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";

const credentials = z.object({ email: z.string().trim().email(), password: z.string().min(1) });

export async function signIn(_prev: FormState, formData: FormData): Promise<FormState> {
  if (missingSupabaseEnv().length > 0) {
    return { ok: false, message: "Supabase ist noch nicht konfiguriert. Env-Variablen in Vercel setzen und neu deployen (Details auf der Startseite)." };
  }
  const parsed = credentials.safeParse({ email: formData.get("email"), password: formData.get("password") });
  if (!parsed.success) return { ok: false, message: "Bitte E-Mail und Passwort eingeben." };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) {
    // Diagnostics for the Vercel runtime logs: error class, status and code only, never credentials.
    console.error("signIn failed", { name: error.name, status: error.status, code: error.code });
    return { ok: false, message: describeSignInError(error) };
  }
  redirect("/");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
