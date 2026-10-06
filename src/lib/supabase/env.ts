// NEXT_PUBLIC_* must be read as literal `process.env.NEXT_PUBLIC_X` expressions so Next can inline them.
function readPublicEnv() {
  return {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL,
    key: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  };
}

/** Names of the browser-visible Supabase variables that are not set (empty = configured). */
export function missingSupabaseEnv(): string[] {
  const { url, key } = readPublicEnv();
  const missing: string[] = [];
  if (!url) missing.push("NEXT_PUBLIC_SUPABASE_URL");
  if (!key) missing.push("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY");
  return missing;
}

export function supabaseEnv(): { url: string; key: string } {
  const { url, key } = readPublicEnv();
  if (!url || !key) {
    throw new Error(
      "Supabase ist nicht konfiguriert: NEXT_PUBLIC_SUPABASE_URL und NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY setzen (siehe .env.example)",
    );
  }
  return { url, key };
}
