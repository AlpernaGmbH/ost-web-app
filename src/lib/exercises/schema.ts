import { z } from "zod";
import { AID_IDS, KIND_IDS, SOLUTION_SOURCE_IDS } from "./types";

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `Maximal ${max} Zeichen`)
    .nullish()
    .transform((v) => (v ? v : null));

const optionalInt = (min: number, max: number, what: string) =>
  z
    .number({ error: `${what}: Zahl erwartet` })
    .int(`${what}: ganze Zahl erwartet`)
    .min(min, `${what}: mindestens ${min}`)
    .max(max, `${what}: höchstens ${max}`)
    .nullish()
    .transform((v) => v ?? null);

/** One exercise as typed into the form or listed in an import file. */
export const exerciseInput = z
  .object({
    title: z.string().trim().min(1, "Titel fehlt").max(200, "Titel ist zu lang (max. 200)"),
    topic: z.string().trim().min(1, "Thema fehlt").max(120, "Thema ist zu lang (max. 120)"),
    kind: z.enum(KIND_IDS, { error: "Aufgabentyp ungültig" }).default("calculation"),
    task: z.string().trim().min(1, "Aufgabentext fehlt").max(10_000, "Aufgabentext ist zu lang (max. 10 000)"),
    solution: optionalText(10_000),
    solution_source: z.enum(SOLUTION_SOURCE_IDS, { error: "Herkunft der Lösung ungültig" }).nullish().transform((v) => v ?? null),
    aids: z
      .array(z.enum(AID_IDS, { error: "Unbekanntes Hilfsmittel" }))
      .default([])
      .transform((list) => [...new Set(list)]),
    aids_confirmed: z.boolean().default(false),
    minutes: optionalInt(1, 240, "Minuten"),
    difficulty: optionalInt(1, 3, "Schwierigkeit"),
    points: z
      .number({ error: "Punkte: Zahl erwartet" })
      .min(0, "Punkte: mindestens 0")
      .max(100, "Punkte: höchstens 100")
      .nullish()
      .transform((v) => (v === undefined || v === null ? null : Math.round(v * 2) / 2)),
    source: optionalText(160),
    source_ref: optionalText(120),
  })
  .transform((value, ctx) => {
    // a solution always carries its origin: default to "manual" for hand-typed ones, reject a lone origin
    const solution_source = value.solution ? (value.solution_source ?? "manual") : null;
    if (!value.solution && value.solution_source) {
      ctx.addIssue({ code: "custom", message: "Herkunft der Lösung angegeben, aber keine Lösung", path: ["solution"] });
    }
    return { ...value, solution_source };
  });
export type ExerciseInput = z.output<typeof exerciseInput>;

export const EXERCISE_FILE_FORMAT = "ost-exercises/1";
export const MAX_EXERCISES_PER_FILE = 500;
const externalId = z.string().regex(/^[a-z0-9][a-z0-9._-]{0,79}$/, "id: nur a-z, 0-9, . _ - (max. 80 Zeichen, beginnt mit Buchstabe oder Ziffer)");

export type ParsedFile = {
  module: string;
  exercises: (ExerciseInput & { external_id: string })[];
  /** Entries that could not be used, with their position (1 = first exercise) and a readable reason. */
  invalid: { index: number; id: string | null; reason: string }[];
};

/** Parses an exercise file (JSON, see README). Never throws; a structural problem is returned as `error`. */
export function parseExerciseFile(text: string): ParsedFile | { error: string } {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return { error: "Die Datei ist kein gültiges JSON. Bitte die Datei unverändert importieren." };
  }
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) return { error: "Unerwartetes Dateiformat." };
  const file = raw as Record<string, unknown>;
  if (file.format !== EXERCISE_FILE_FORMAT) return { error: `Unbekanntes Dateiformat (erwartet „${EXERCISE_FILE_FORMAT}“).` };
  if (typeof file.module !== "string" || !file.module.trim()) return { error: "In der Datei fehlt das Modul (Feld „module“, z. B. WMS)." };
  if (!Array.isArray(file.exercises)) return { error: "In der Datei fehlt die Liste „exercises“." };
  if (file.exercises.length === 0) return { error: "Die Datei enthält keine Aufgaben." };
  if (file.exercises.length > MAX_EXERCISES_PER_FILE) return { error: `Maximal ${MAX_EXERCISES_PER_FILE} Aufgaben pro Datei.` };

  const exercises: ParsedFile["exercises"] = [];
  const invalid: ParsedFile["invalid"] = [];
  const seen = new Set<string>();
  file.exercises.forEach((entry, i) => {
    const index = i + 1;
    const rawId = typeof entry === "object" && entry !== null && typeof (entry as { id?: unknown }).id === "string" ? (entry as { id: string }).id : null;
    const id = externalId.safeParse(rawId);
    if (!id.success) return void invalid.push({ index, id: rawId, reason: id.error.issues[0].message });
    if (seen.has(id.data)) return void invalid.push({ index, id: id.data, reason: "id kommt in der Datei mehrfach vor" });
    const parsed = exerciseInput.safeParse(entry);
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      const field = issue.path.length > 0 ? `${String(issue.path[0])}: ` : "";
      return void invalid.push({ index, id: id.data, reason: `${field}${issue.message}` });
    }
    seen.add(id.data);
    exercises.push({ ...parsed.data, external_id: id.data });
  });
  return { module: file.module.trim(), exercises, invalid };
}

const text = (formData: FormData, name: string): string => String(formData.get(name) ?? "");
const numberOrNull = (value: string): number | null => {
  const trimmed = value.trim().replace(",", ".");
  if (trimmed === "") return null;
  const n = Number(trimmed);
  return Number.isFinite(n) ? n : Number.NaN; // NaN is rejected by zod ("Zahl erwartet"), unlike undefined/null
};

/** Raw form fields -> the shape `exerciseInput` expects (empty field = null, "4,5" = 4.5, checkboxes = array). */
export function exerciseFromForm(formData: FormData): Record<string, unknown> {
  const solution = text(formData, "solution").trim();
  return {
    title: text(formData, "title"),
    topic: text(formData, "topic"),
    kind: text(formData, "kind") || undefined,
    task: text(formData, "task"),
    solution: solution || null,
    solution_source: solution ? text(formData, "solution_source") || "manual" : null,
    aids: formData.getAll("aids").map(String),
    aids_confirmed: formData.get("aids_confirmed") === "on",
    minutes: numberOrNull(text(formData, "minutes")),
    difficulty: numberOrNull(text(formData, "difficulty")),
    points: numberOrNull(text(formData, "points")),
    source: text(formData, "source"),
    source_ref: text(formData, "source_ref"),
  };
}
