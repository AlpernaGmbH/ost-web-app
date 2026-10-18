import { NextResponse } from "next/server";
import { bearerMatches } from "@/lib/bearer";
import { createAdminClient } from "@/lib/supabase/admin";
import { describeTaskOutcome, parseTaskFile, upsertTasks } from "@/lib/tasks/import";

export const maxDuration = 60;
const MAX_BYTES = 300_000;

type ModuleHit = { id: string; code: string; user_id: string; semesters: { start_date: string } | null };

/**
 * Operator import: loads a task file (deadlines, exam dates, to-dos of one subject) into the module named in the file.
 * Authenticated by IMPORT_SECRET, like the exercise import. Meant for the single-owner phase: the owner is whoever owns
 * the module; if several accounts own a module with that code, nothing is written. `?dry=1` only validates.
 */
export async function POST(request: Request) {
  if (!bearerMatches(request.headers.get("authorization"), process.env.IMPORT_SECRET)) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const text = await request.text();
  if (text.length > MAX_BYTES) return NextResponse.json({ ok: false, error: "Datei ist zu gross (max. 300 KB)" }, { status: 413 });
  const parsed = parseTaskFile(text);
  if ("error" in parsed) return NextResponse.json({ ok: false, error: parsed.error }, { status: 400 });

  let db: ReturnType<typeof createAdminClient>;
  try {
    db = createAdminClient();
  } catch (e) {
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : "not configured" }, { status: 503 });
  }

  const { data, error } = await db
    .from("modules")
    .select("id, code, user_id, semesters(start_date)")
    .ilike("code", parsed.module.replace(/[\\%_]/g, "\\$&")) // escape LIKE wildcards: the code is matched literally
    .returns<ModuleHit[]>();
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  const hits = data ?? [];
  if (hits.length === 0) return NextResponse.json({ ok: false, error: `Kein Modul „${parsed.module}“ gefunden` }, { status: 404 });
  if (new Set(hits.map((h) => h.user_id)).size > 1) {
    return NextResponse.json({ ok: false, error: `Mehrere Konten haben ein Modul „${parsed.module}“, nichts geschrieben` }, { status: 409 });
  }
  // same account, several semesters: the newest one
  const target = [...hits].sort((a, b) => (b.semesters?.start_date ?? "").localeCompare(a.semesters?.start_date ?? ""))[0];

  if (new URL(request.url).searchParams.get("dry") === "1") {
    return NextResponse.json({ ok: true, dry: true, module: target.code, valid: parsed.tasks.length, skipped: parsed.invalid });
  }

  const outcome = await upsertTasks(db, target.user_id, target.id, parsed);
  if (outcome.error) return NextResponse.json({ ok: false, error: outcome.error, created: outcome.created, updated: outcome.updated }, { status: 500 });
  return NextResponse.json({
    ok: true,
    module: target.code,
    created: outcome.created,
    updated: outcome.updated,
    skipped: outcome.invalid,
    message: describeTaskOutcome(outcome),
  });
}
