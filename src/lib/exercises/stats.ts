import type { ExerciseListRow, Result } from "./types";
import { AID_IDS, type Aid } from "./types";

/** Result of the most recent attempt, or null when the exercise was never tried. */
export function latestResult(row: Pick<ExerciseListRow, "exercise_attempts">): Result | null {
  let latest: { result: Result; at: number } | null = null;
  for (const attempt of row.exercise_attempts) {
    const at = Date.parse(attempt.created_at);
    if (!latest || at > latest.at) latest = { result: attempt.result, at };
  }
  return latest?.result ?? null;
}

export type Summary = { total: number; correct: number; partial: number; wrong: number; untried: number };

export function summarize(rows: Pick<ExerciseListRow, "exercise_attempts">[]): Summary {
  const summary: Summary = { total: rows.length, correct: 0, partial: 0, wrong: 0, untried: 0 };
  for (const row of rows) {
    const result = latestResult(row);
    if (result === null) summary.untried++;
    else summary[result]++;
  }
  return summary;
}

export type Show = "all" | "open";
export type Filter = { topic: string | null; aid: Aid | null; show: Show };

/** Reads the list filter from URL parameters; anything unknown falls back to "no filter". */
export function parseFilter(params: Record<string, string | string[] | undefined>): Filter {
  const one = (key: string) => (typeof params[key] === "string" ? (params[key] as string) : null);
  const aid = one("aid");
  return {
    topic: one("topic")?.trim() || null,
    aid: AID_IDS.find((id) => id === aid) ?? null,
    show: one("show") === "open" ? "open" : "all",
  };
}

/** "open" = not solved correctly yet (never tried, or the last attempt was partial or wrong). */
export function filterExercises<T extends Pick<ExerciseListRow, "topic" | "aids" | "exercise_attempts">>(rows: T[], filter: Filter): T[] {
  return rows.filter(
    (row) =>
      (filter.topic === null || row.topic === filter.topic) &&
      (filter.aid === null || row.aids.includes(filter.aid)) &&
      (filter.show === "all" || latestResult(row) !== "correct"),
  );
}

export type TopicStat = { topic: string; total: number; correct: number };

/** Topics in the order they first appear in the list (= book order), with how many are solved. */
export function topicStats(rows: Pick<ExerciseListRow, "topic" | "exercise_attempts">[]): TopicStat[] {
  const byTopic = new Map<string, TopicStat>();
  for (const row of rows) {
    const stat = byTopic.get(row.topic) ?? { topic: row.topic, total: 0, correct: 0 };
    stat.total++;
    if (latestResult(row) === "correct") stat.correct++;
    byTopic.set(row.topic, stat);
  }
  return [...byTopic.values()];
}

/** "ca. 12 Min." / "ca. 1 h 30 Min." */
export function formatMinutes(minutes: number): string {
  if (minutes < 60) return `ca. ${minutes} Min.`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m === 0 ? `ca. ${h} h` : `ca. ${h} h ${m} Min.`;
}

/** "9:05" / "1:02:30" for a measured duration. */
export function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return h > 0 ? `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}` : `${m}:${String(s).padStart(2, "0")}`;
}
