import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

/** Verified user of the current request (asks the Supabase Auth server, not just the cookie). */
export const getUser = cache(async () => {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  return data.user;
});

/** Call at the top of every page, Server Action and Route Handler that touches user data. */
export async function requireUser() {
  const user = await getUser();
  if (!user) redirect("/login");
  return user;
}
