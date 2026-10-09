import { describe, expect, it } from "vitest";
import { firstOpen, groupExercises, parseGroupBy, shortenSources } from "./groups";
import type { ExerciseListRow } from "./types";

const A = "OST MSTA-S2 Beschreibende Statistik · Lernblock 1 · Test 1";
const B = "OST MSTA-S2 Beschreibende Statistik · Lernblock 2+3 · Test 2";

const row = (id: string, topic: string, source: string | null, result?: "correct" | "wrong"): Pick<ExerciseListRow, "id" | "topic" | "source_label" | "exercise_attempts"> => ({
  id, topic, source_label: source, exercise_attempts: result ? [{ result, seconds: null, created_at: "2026-10-09T10:00:00Z" }] : [],
});

describe("shortenSources", () => {
  it("drops the leading parts all labels share", () => {
    const names = shortenSources([A, B, A]);
    expect(names.get(A)).toBe("Lernblock 1 · Test 1");
    expect(names.get(B)).toBe("Lernblock 2+3 · Test 2");
  });

  it("keeps the last two parts for a single label or labels that differ only in the last part", () => {
    expect(shortenSources([A]).get(A)).toBe("Lernblock 1 · Test 1");
    const t1 = "Skript · Kap. 3 · Aufgabenblatt 1";
    const t2 = "Skript · Kap. 3 · Aufgabenblatt 2";
    expect(shortenSources([t1, t2]).get(t1)).toBe("Kap. 3 · Aufgabenblatt 1");
  });

  it("copes with labels of different length and with no source", () => {
    const names = shortenSources(["Buch", "Moodle · Test 1", null]);
    expect(names.get("Buch")).toBe("Buch");
    expect(names.get("Moodle · Test 1")).toBe("Moodle · Test 1");
    expect(names.get(null)).toBe("Ohne Quelle");
    expect(shortenSources([]).get(null)).toBe("Ohne Quelle");
  });
});

describe("groupExercises", () => {
  const rows = [row("1", "X", A, "correct"), row("2", "Y", A), row("3", "Y", B, "wrong"), row("4", "X", null), row("5", "X", B)];

  it("groups by source in first-seen order with 'Ohne Quelle' last", () => {
    const groups = groupExercises(rows, "source");
    expect(groups.map((g) => [g.title, g.rows.map((r) => r.id)])).toEqual([
      ["Lernblock 1 · Test 1", ["1", "2"]],
      ["Lernblock 2+3 · Test 2", ["3", "5"]],
      ["Ohne Quelle", ["4"]],
    ]);
    expect(groups[0].summary).toEqual({ total: 2, correct: 1, partial: 0, wrong: 0, untried: 1 });
    expect(groups[1].summary.wrong).toBe(1);
  });

  it("groups by topic", () => {
    const groups = groupExercises(rows, "topic");
    expect(groups.map((g) => [g.title, g.rows.length])).toEqual([["X", 3], ["Y", 2]]);
  });
});

describe("helpers", () => {
  it("finds the first exercise that is not solved yet", () => {
    expect(firstOpen([row("1", "X", A, "correct"), row("2", "X", A, "wrong"), row("3", "X", A)])?.id).toBe("2");
    expect(firstOpen([row("1", "X", A, "correct")])).toBeUndefined();
  });

  it("reads the grouping from the URL and defaults to source", () => {
    expect(parseGroupBy({ group: "topic" })).toBe("topic");
    expect(parseGroupBy({ group: "x" })).toBe("source");
    expect(parseGroupBy({})).toBe("source");
  });
});
