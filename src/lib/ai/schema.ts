// Shape of what Claude returns, and how it becomes exercise drafts (pure).
import { z } from "zod";
import { exerciseInput, type ExerciseInput } from "@/lib/exercises/schema";
import { AID_IDS, KIND_IDS } from "@/lib/exercises/types";

// Output schema: no length or range constraints (structured outputs do not support them); clamps happen in draftsFromOutput.
export const generatedExercise = z.object({
  title: z.string(),
  topic: z.string(),
  kind: z.enum(KIND_IDS),
  task: z.string(),
  solution: z.string(),
  solution_source: z.enum(["source", "derived"]),
  aids: z.array(z.enum(AID_IDS)),
  aids_confirmed: z.boolean(),
  minutes: z.number().int(),
  difficulty: z.number().int(),
  points: z.number().nullable(),
  source_ref: z.string(),
  notes: z.string().nullable(),
});
export const generatedOutput = z.object({ exercises: z.array(generatedExercise), summary: z.string() });
export type GeneratedOutput = z.infer<typeof generatedOutput>;

/** The parts of an API message this module needs (works for batch results and direct responses alike). */
export type MessageLike = { stop_reason: string | null; content: { type: string; text?: string }[] };

export type ExtractedOutput = { ok: true; output: GeneratedOutput } | { ok: false; error: string };

/** Reads the structured output out of a message; every failure comes back as a readable reason. */
export function extractOutput(message: MessageLike): ExtractedOutput {
  if (message.stop_reason === "refusal") return { ok: false, error: "Die KI hat die Anfrage abgelehnt." };
  const text = message.content.find((block) => block.type === "text")?.text;
  if (!text) return { ok: false, error: "Die Antwort enthält keinen Text." };
  if (message.stop_reason === "max_tokens") {
    return { ok: false, error: "Die Antwort wurde abgeschnitten (zu viele Aufgaben für einen Durchlauf). Weniger Dokumente wählen oder im Hinweis einen Teil nennen." };
  }
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return { ok: false, error: "Die Antwort ist kein gültiges JSON." };
  }
  const parsed = generatedOutput.safeParse(raw);
  if (!parsed.success) return { ok: false, error: `Die Antwort hat nicht das erwartete Format (${parsed.error.issues[0]?.message ?? "unbekannt"}).` };
  return { ok: true, output: parsed.data };
}

const clip = (text: string, max: number) => (text.length > max ? `${text.slice(0, max - 1)}…` : text);
const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, Math.round(n)));

export type DraftBatch = {
  exercises: (ExerciseInput & { external_id: string })[];
  invalid: { index: number; reason: string }[];
};

/** Stable id of the n-th draft of a run: a re-run of the same job updates instead of duplicating. */
export function draftExternalId(runId: string, index: number): string {
  return `ai-${runId.replace(/-/g, "").slice(0, 8)}-${String(index + 1).padStart(3, "0")}`;
}

/** Generated exercises -> validated exercise inputs (same rules as the import file); unusable entries are reported. */
export function draftsFromOutput(output: GeneratedOutput, run: { id: string; filenames: string[] }): DraftBatch {
  const source = clip(`KI-Entwurf · ${run.filenames.join(" + ")}`, 160);
  const exercises: DraftBatch["exercises"] = [];
  const invalid: DraftBatch["invalid"] = [];
  output.exercises.forEach((g, i) => {
    const notes = g.notes?.trim();
    const candidate = {
      title: clip(g.title.trim(), 200),
      topic: clip(g.topic.trim(), 120),
      kind: g.kind,
      task: notes ? `${g.task.trim()}\n\n*Hinweis (KI): ${notes}*` : g.task.trim(),
      solution: g.solution.trim() || null,
      solution_source: g.solution.trim() ? g.solution_source : null,
      aids: [...new Set(g.aids)],
      aids_confirmed: g.aids_confirmed,
      minutes: clamp(g.minutes, 1, 240),
      difficulty: clamp(g.difficulty, 1, 3),
      points: g.points !== null && g.points >= 0 && g.points <= 100 ? g.points : null,
      source,
      source_ref: clip(g.source_ref.trim(), 120) || null,
    };
    const parsed = exerciseInput.safeParse(candidate);
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      invalid.push({ index: i + 1, reason: `${issue?.path[0] ? `${String(issue.path[0])}: ` : ""}${issue?.message ?? "ungültig"}` });
      return;
    }
    exercises.push({ ...parsed.data, external_id: draftExternalId(run.id, i) });
  });
  return { exercises, invalid };
}
