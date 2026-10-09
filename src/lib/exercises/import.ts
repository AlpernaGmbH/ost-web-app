import type { SupabaseClient } from "@supabase/supabase-js";
import { describeDbError } from "@/lib/db/errors";
import type { ExerciseInput, ParsedFile } from "./schema";

const UPSERT_CHUNK = 100;

/** Column values of an exercise row (shared by the form, the editor and the import). */
export function exerciseRow(input: ExerciseInput) {
  return {
    title: input.title,
    topic: input.topic,
    kind: input.kind,
    task_md: input.task,
    solution_md: input.solution,
    solution_source: input.solution_source,
    aids: input.aids,
    aids_confirmed: input.aids_confirmed,
    minutes: input.minutes,
    difficulty: input.difficulty,
    points: input.points,
    source_label: input.source,
    source_ref: input.source_ref,
  };
}

export type ImportOutcome = {
  created: number;
  updated: number;
  /** Entries that were not imported (invalid, or an id that belongs to another module); `index` 0 = not tied to a position. */
  invalid: ParsedFile["invalid"];
  /** Set when the database refused a chunk; what was written before stays and the import can simply be repeated. */
  error?: string;
};

/**
 * Upserts the exercises of a parsed file into one module of one user (match on user_id + external_id).
 * Works with a user session (RLS) and with the service-role client alike: every query names the user explicitly.
 */
export async function upsertExercises(supabase: SupabaseClient, userId: string, moduleId: string, parsed: ParsedFile): Promise<ImportOutcome> {
  // ids that already exist: same module = update, other module = refuse (an id never moves between modules)
  const { data: known, error: knownError } = await supabase
    .from("exercises")
    .select("external_id, module_id")
    .eq("user_id", userId)
    .not("external_id", "is", null)
    .limit(10_000);
  if (knownError) return { created: 0, updated: 0, invalid: parsed.invalid, error: describeDbError(knownError) };
  const moduleOfId = new Map((known ?? []).map((row) => [String(row.external_id), String(row.module_id)]));

  const invalid = [...parsed.invalid];
  const importable = parsed.exercises
    .map((exercise, i) => ({ exercise, position: i + 1 }))
    .filter(({ exercise }) => {
      const owner = moduleOfId.get(exercise.external_id);
      if (owner && owner !== moduleId) {
        invalid.push({ index: 0, id: exercise.external_id, reason: "id gehört schon zu einem anderen Modul" });
        return false;
      }
      return true;
    });

  let created = 0;
  let updated = 0;
  for (let i = 0; i < importable.length; i += UPSERT_CHUNK) {
    const chunk = importable.slice(i, i + UPSERT_CHUNK);
    const { error } = await supabase.from("exercises").upsert(
      chunk.map(({ exercise, position }) => ({ ...exerciseRow(exercise), user_id: userId, module_id: moduleId, external_id: exercise.external_id, position })),
      { onConflict: "user_id,external_id" },
    );
    if (error) return { created, updated, invalid, error: describeDbError(error) };
    for (const { exercise } of chunk) {
      if (moduleOfId.has(exercise.external_id)) updated++;
      else created++;
    }
  }
  return { created, updated, invalid };
}

/** "10 neu, 2 aktualisiert, 1 übersprungen (…)" */
export function describeOutcome(outcome: ImportOutcome): string {
  const parts = [`${outcome.created} neu`];
  if (outcome.updated > 0) parts.push(`${outcome.updated} aktualisiert`);
  if (outcome.invalid.length > 0) {
    const first = outcome.invalid[0];
    parts.push(`${outcome.invalid.length} übersprungen (${first.id ? `„${first.id}“` : `Eintrag ${first.index}`}: ${first.reason})`);
  }
  return `${parts.join(", ")}.`;
}
