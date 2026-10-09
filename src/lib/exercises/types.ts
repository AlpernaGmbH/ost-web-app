// Shared vocabulary of the exercise bank (mirrors supabase/migrations/004_exercises.sql).

export const AID_IDS = ["calculator", "paper", "formula_sheet", "tables", "computer", "script"] as const;
export type Aid = (typeof AID_IDS)[number];
export const AIDS: readonly { id: Aid; label: string }[] = [
  { id: "calculator", label: "Taschenrechner" },
  { id: "paper", label: "Blatt & Stift" },
  { id: "formula_sheet", label: "Formelsammlung" },
  { id: "tables", label: "Tabellen" },
  { id: "computer", label: "Computer / Excel" },
  { id: "script", label: "Skript / Zusammenfassung" },
];

export const KIND_IDS = ["calculation", "multiple_choice", "open"] as const;
export type Kind = (typeof KIND_IDS)[number];
export const KINDS: readonly { id: Kind; label: string }[] = [
  { id: "calculation", label: "Rechenaufgabe" },
  { id: "multiple_choice", label: "Multiple Choice" },
  { id: "open", label: "Offene Frage" },
];

export const SOLUTION_SOURCE_IDS = ["source", "derived", "manual"] as const;
export type SolutionSource = (typeof SOLUTION_SOURCE_IDS)[number];
export const SOLUTION_SOURCES: readonly { id: SolutionSource; label: string }[] = [
  { id: "source", label: "Musterlösung aus der Quelle" },
  { id: "derived", label: "Von Claude hergeleitet und nachgerechnet, nicht aus der Quelle" },
  { id: "manual", label: "Eigene Lösung" },
];

export const DIFFICULTIES: readonly { id: number; label: string }[] = [
  { id: 1, label: "leicht" },
  { id: 2, label: "mittel" },
  { id: 3, label: "schwer" },
];

export const RESULT_IDS = ["correct", "partial", "wrong"] as const;
export type Result = (typeof RESULT_IDS)[number];
export const RESULTS: readonly { id: Result; label: string }[] = [
  { id: "correct", label: "Richtig" },
  { id: "partial", label: "Teilweise" },
  { id: "wrong", label: "Nicht ganz" },
];

export const labelOf = <T extends { id: string | number; label: string }>(list: readonly T[], id: string | number | null | undefined): string =>
  list.find((item) => item.id === id)?.label ?? "";

/** What the exercise page and the editor need; `id` is the database row. */
export type ExerciseRow = {
  id: string;
  module_id: string;
  external_id: string | null;
  position: number;
  title: string;
  topic: string;
  kind: Kind;
  task_md: string;
  solution_md: string | null;
  solution_source: SolutionSource | null;
  aids: Aid[];
  aids_confirmed: boolean;
  minutes: number | null;
  difficulty: number | null;
  points: number | null;
  source_label: string | null;
  source_ref: string | null;
};

/** Slim row for the list (no task or solution text). */
export type ExerciseListRow = Pick<
  ExerciseRow,
  "id" | "title" | "topic" | "kind" | "aids" | "aids_confirmed" | "minutes" | "difficulty" | "points" | "source_label" | "source_ref"
> & { exercise_attempts: { result: Result; seconds: number | null; created_at: string }[] };
