import { latestResult, summarize, type Summary } from "./stats";
import type { ExerciseListRow } from "./types";

export type GroupBy = "source" | "topic";
export type ExerciseGroup<T> = { key: string; title: string; rows: T[]; summary: Summary };

const SEP = " · ";
const NO_SOURCE = "Ohne Quelle";

export function parseGroupBy(params: Record<string, string | string[] | undefined>): GroupBy {
  return params.group === "topic" ? "topic" : "source";
}

/**
 * Short names for source labels like "OST MSTA-S2 Beschreibende Statistik · Lernblock 1 · Test 1": the leading parts
 * all labels share are dropped ("Lernblock 1 · Test 1"), but at least the last two parts always stay.
 */
export function shortenSources(labels: (string | null)[]): Map<string | null, string> {
  const distinct = [...new Set(labels.filter((l): l is string => l !== null))];
  const parts = distinct.map((label) => label.split(SEP));
  let common = 0;
  while (parts.length > 0 && parts.every((p) => p.length > common && p[common] === parts[0][common])) common++;
  const result = new Map<string | null, string>([[null, NO_SOURCE]]);
  distinct.forEach((label, i) => {
    const segments = parts[i];
    const keep = Math.max(segments.length - common, Math.min(2, segments.length));
    result.set(label, segments.slice(segments.length - keep).join(SEP));
  });
  return result;
}

/** Groups in the order their first exercise appears (= order of the source); "Ohne Quelle" always last. */
export function groupExercises<T extends Pick<ExerciseListRow, "topic" | "source_label" | "exercise_attempts">>(rows: T[], by: GroupBy): ExerciseGroup<T>[] {
  const names = shortenSources(rows.map((r) => r.source_label));
  const groups = new Map<string, ExerciseGroup<T>>();
  for (const row of rows) {
    const key = by === "topic" ? row.topic : (row.source_label ?? "");
    const title = by === "topic" ? row.topic : (names.get(row.source_label) ?? NO_SOURCE);
    const group = groups.get(key) ?? { key, title, rows: [], summary: summarize([]) };
    group.rows.push(row);
    groups.set(key, group);
  }
  const list = [...groups.values()].map((g) => ({ ...g, summary: summarize(g.rows) }));
  return by === "source" ? [...list.filter((g) => g.key !== ""), ...list.filter((g) => g.key === "")] : list;
}

/** First exercise that is not solved correctly yet. */
export function firstOpen<T extends Pick<ExerciseListRow, "exercise_attempts">>(rows: T[]): T | undefined {
  return rows.find((row) => latestResult(row) !== "correct");
}
