import { NextResponse } from "next/server";
import { bearerMatches } from "@/lib/bearer";
import type { Semester } from "@/lib/db/types";
import { syncSemester } from "@/lib/ical/sync";
import { createAdminClient } from "@/lib/supabase/admin";

export const maxDuration = 60;

const authorized = (request: Request) => bearerMatches(request.headers.get("authorization"), process.env.CRON_SECRET);

/** Daily iCal import for every semester that has a feed URL (Vercel Cron sends the Bearer secret). */
export async function GET(request: Request) {
  if (!authorized(request)) return new NextResponse("Unauthorized", { status: 401 });

  let db: ReturnType<typeof createAdminClient>;
  try {
    db = createAdminClient();
  } catch (e) {
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : "not configured" }, { status: 503 });
  }
  const { data: semesters, error } = await db
    .from("semesters")
    .select("id, user_id, start_date, ical_url")
    .not("ical_url", "is", null)
    .returns<Pick<Semester, "id" | "user_id" | "start_date" | "ical_url">[]>();
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });

  // one failing feed must not block the others
  const results = [];
  for (const semester of semesters ?? []) {
    try {
      results.push({ semester: semester.id, ok: true, ...(await syncSemester(db, semester)) });
    } catch (e) {
      results.push({ semester: semester.id, ok: false, error: e instanceof Error ? e.message : "unknown" });
    }
  }
  return NextResponse.json({ ok: results.every((r) => r.ok), results });
}
