import "server-only";
import { createClient } from "@supabase/supabase-js";
import { supabaseEnv } from "./env";

/** Service-role client: bypasses RLS. Only for the cron job, which has no user session. */
export function createAdminClient() {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) throw new Error("SUPABASE_SERVICE_ROLE_KEY ist nicht gesetzt");
  return createClient(supabaseEnv().url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
}
