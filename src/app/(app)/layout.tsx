import { connection } from "next/server";
import { BottomNav } from "@/components/bottom-nav";
import { SetupRequired } from "@/components/setup-required";
import { requireUser } from "@/lib/auth";
import { missingSupabaseEnv } from "@/lib/supabase/env";

export default async function AppLayout({ children }: LayoutProps<"/">) {
  // Every page in this group depends on the session, so nothing here is ever prerendered.
  await connection();
  const missing = missingSupabaseEnv();
  if (missing.length > 0) return <SetupRequired missingPublic={missing} />;

  await requireUser();
  return (
    <>
      <main className="mx-auto w-full max-w-2xl px-4 pb-28 pt-6">{children}</main>
      <BottomNav />
    </>
  );
}
