import { existsSync, readdirSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { exerciseFromForm, exerciseInput, parseExerciseFile } from "./schema";
import { filterExercises, formatDuration, formatMinutes, latestResult, parseFilter, summarize, topicStats } from "./stats";
import { AIDS, AID_IDS, KINDS, KIND_IDS, SOLUTION_SOURCES, SOLUTION_SOURCE_IDS, type ExerciseListRow } from "./types";

const base = { title: "Mittelwert", topic: "Deskriptive Statistik", task: "Berechne $\\bar{x}$." };

describe("lists", () => {
  it("keeps ids and labels in sync", () => {
    expect(AIDS.map((a) => a.id)).toEqual([...AID_IDS]);
    expect(KINDS.map((k) => k.id)).toEqual([...KIND_IDS]);
    expect(SOLUTION_SOURCES.map((s) => s.id)).toEqual([...SOLUTION_SOURCE_IDS]);
  });
});

describe("exerciseInput", () => {
  it("applies defaults and trims", () => {
    const parsed = exerciseInput.parse({ ...base, title: "  Mittelwert " });
    expect(parsed).toMatchObject({ title: "Mittelwert", kind: "calculation", aids: [], aids_confirmed: false, solution: null, solution_source: null, minutes: null, points: null });
  });

  it("defaults a typed solution to 'manual' and keeps an explicit origin", () => {
    expect(exerciseInput.parse({ ...base, solution: "4" }).solution_source).toBe("manual");
    expect(exerciseInput.parse({ ...base, solution: "4", solution_source: "derived" }).solution_source).toBe("derived");
  });

  it("rejects an origin without a solution", () => {
    const result = exerciseInput.safeParse({ ...base, solution_source: "source" });
    expect(result.success).toBe(false);
  });

  it("de-duplicates aids and rejects unknown ones", () => {
    expect(exerciseInput.parse({ ...base, aids: ["calculator", "calculator", "paper"] }).aids).toEqual(["calculator", "paper"]);
    expect(exerciseInput.safeParse({ ...base, aids: ["abacus"] }).success).toBe(false);
  });

  it("checks ranges and rounds points to halves", () => {
    expect(exerciseInput.safeParse({ ...base, minutes: 0 }).success).toBe(false);
    expect(exerciseInput.safeParse({ ...base, minutes: 241 }).success).toBe(false);
    expect(exerciseInput.safeParse({ ...base, difficulty: 4 }).success).toBe(false);
    expect(exerciseInput.safeParse({ ...base, points: -1 }).success).toBe(false);
    expect(exerciseInput.parse({ ...base, points: 4.3 }).points).toBe(4.5);
  });

  it("reports missing required fields in German", () => {
    const result = exerciseInput.safeParse({ title: "", topic: "x", task: "y" });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.issues[0].message).toBe("Titel fehlt");
  });
});

describe("exerciseFromForm", () => {
  const form = (entries: [string, string][]) => {
    const data = new FormData();
    for (const [k, v] of entries) data.append(k, v);
    return data;
  };

  it("turns form fields into the input shape", () => {
    const raw = exerciseFromForm(
      form([["title", "A"], ["topic", "T"], ["task", "Aufgabe"], ["aids", "calculator"], ["aids", "paper"], ["aids_confirmed", "on"], ["minutes", "12"], ["points", "4,5"], ["difficulty", ""], ["solution", "Lösung"], ["solution_source", "source"]]),
    );
    const parsed = exerciseInput.parse(raw);
    expect(parsed).toMatchObject({ aids: ["calculator", "paper"], aids_confirmed: true, minutes: 12, points: 4.5, difficulty: null, solution: "Lösung", solution_source: "source" });
  });

  it("treats empty optional fields and a missing checkbox as unset", () => {
    const parsed = exerciseInput.parse(exerciseFromForm(form([["title", "A"], ["topic", "T"], ["task", "x"], ["minutes", ""], ["solution", "  "], ["solution_source", "source"]])));
    expect(parsed).toMatchObject({ aids: [], aids_confirmed: false, minutes: null, solution: null, solution_source: null });
  });

  it("surfaces a non-numeric number as a validation error", () => {
    const result = exerciseInput.safeParse(exerciseFromForm(form([["title", "A"], ["topic", "T"], ["task", "x"], ["minutes", "viel"]])));
    expect(result.success).toBe(false);
  });
});

describe("parseExerciseFile", () => {
  const file = (exercises: unknown[], extra: object = {}) => JSON.stringify({ format: "ost-exercises/1", module: "WMS", exercises, ...extra });
  const ex = (id: string, extra: object = {}) => ({ id, ...base, ...extra });

  it("parses a valid file", () => {
    const parsed = parseExerciseFile(file([ex("wms-1", { aids: ["calculator"], solution: "4", solution_source: "source", source: "Skript", source_ref: "S. 3" })]));
    expect("error" in parsed).toBe(false);
    if ("error" in parsed) return;
    expect(parsed.module).toBe("WMS");
    expect(parsed.invalid).toEqual([]);
    expect(parsed.exercises[0]).toMatchObject({ external_id: "wms-1", aids: ["calculator"], source: "Skript", source_ref: "S. 3" });
  });

  it("rejects files that are not ours", () => {
    expect(parseExerciseFile("kein json")).toEqual({ error: expect.stringContaining("kein gültiges JSON") });
    expect(parseExerciseFile("[]")).toEqual({ error: "Unerwartetes Dateiformat." });
    expect(parseExerciseFile(JSON.stringify({ format: "other", module: "WMS", exercises: [] }))).toEqual({ error: expect.stringContaining("Unbekanntes Dateiformat") });
    expect(parseExerciseFile(JSON.stringify({ format: "ost-exercises/1", exercises: [] }))).toEqual({ error: expect.stringContaining("Modul") });
    expect(parseExerciseFile(file([]))).toEqual({ error: "Die Datei enthält keine Aufgaben." });
  });

  it("limits the number of exercises per file", () => {
    const many = Array.from({ length: 501 }, (_, i) => ex(`wms-${i}`));
    expect(parseExerciseFile(file(many))).toEqual({ error: "Maximal 500 Aufgaben pro Datei." });
  });

  it("keeps the valid exercises and explains each invalid one", () => {
    const parsed = parseExerciseFile(
      file([ex("ok-1"), ex("bad id"), { ...ex("no-title"), title: "" }, ex("ok-1"), ex("ok-2", { aids: ["abacus"] }), { title: "ohne id", topic: "T", task: "x" }, ex("ok-3", { minutes: "viel" })]),
    );
    if ("error" in parsed) throw new Error(parsed.error);
    expect(parsed.exercises.map((e) => e.external_id)).toEqual(["ok-1"]);
    expect(parsed.invalid.map((i) => [i.index, i.id])).toEqual([[2, "bad id"], [3, "no-title"], [4, "ok-1"], [5, "ok-2"], [6, null], [7, "ok-3"]]);
    expect(parsed.invalid[1].reason).toBe("title: Titel fehlt");
    expect(parsed.invalid[2].reason).toBe("id kommt in der Datei mehrfach vor");
    expect(parsed.invalid[3].reason).toContain("aids");
  });
});

describe("stats", () => {
  const row = (topic: string, results: [ExerciseListRow["exercise_attempts"][number]["result"], string][], aids: ExerciseListRow["aids"] = []): ExerciseListRow => ({
    id: topic + results.length, title: "t", topic, kind: "calculation", aids, aids_confirmed: false, minutes: null, difficulty: null, points: null, source_label: null, source_ref: null,
    exercise_attempts: results.map(([result, created_at]) => ({ result, seconds: null, created_at })),
  });
  const rows = [
    row("A", [["wrong", "2026-10-01T10:00:00Z"], ["correct", "2026-10-02T10:00:00Z"]], ["calculator"]), // latest = correct, attempts not sorted
    row("A", [["correct", "2026-10-01T10:00:00Z"], ["partial", "2026-10-03T10:00:00Z"]]), // latest = partial
    row("B", []),
    row("B", [["wrong", "2026-10-01T10:00:00Z"]], ["calculator", "paper"]),
  ];

  it("uses the most recent attempt, whatever the order", () => {
    expect(latestResult(rows[0])).toBe("correct");
    expect(latestResult(rows[1])).toBe("partial");
    expect(latestResult(rows[2])).toBeNull();
  });

  it("summarises the latest results", () => {
    expect(summarize(rows)).toEqual({ total: 4, correct: 1, partial: 1, wrong: 1, untried: 1 });
  });

  it("filters by topic, aid and 'open'", () => {
    expect(filterExercises(rows, { topic: "A", aid: null, show: "all" })).toHaveLength(2);
    expect(filterExercises(rows, { topic: null, aid: "calculator", show: "all" })).toHaveLength(2);
    expect(filterExercises(rows, { topic: null, aid: null, show: "open" })).toHaveLength(3);
    expect(filterExercises(rows, { topic: "B", aid: "paper", show: "open" })).toHaveLength(1);
    expect(filterExercises(rows, { topic: "C", aid: null, show: "all" })).toEqual([]);
  });

  it("lists topics in first-seen order with solved counts", () => {
    expect(topicStats(rows)).toEqual([{ topic: "A", total: 2, correct: 1 }, { topic: "B", total: 2, correct: 0 }]);
  });

  it("reads the filter from the URL and ignores nonsense", () => {
    expect(parseFilter({ topic: "A", aid: "calculator", show: "open" })).toEqual({ topic: "A", aid: "calculator", show: "open" });
    expect(parseFilter({ aid: "abacus", show: "x", topic: ["a", "b"] })).toEqual({ topic: null, aid: null, show: "all" });
    expect(parseFilter({})).toEqual({ topic: null, aid: null, show: "all" });
  });

  it("formats durations", () => {
    expect(formatMinutes(12)).toBe("ca. 12 Min.");
    expect(formatMinutes(60)).toBe("ca. 1 h");
    expect(formatMinutes(90)).toBe("ca. 1 h 30 Min.");
    expect(formatDuration(65)).toBe("1:05");
    expect(formatDuration(3725)).toBe("1:02:05");
  });
});

describe("example file", () => {
  it("docs/examples/wms-beispiel.json imports without a single skipped entry", () => {
    const parsed = parseExerciseFile(readFileSync("docs/examples/wms-beispiel.json", "utf8"));
    if ("error" in parsed) throw new Error(parsed.error);
    expect(parsed.module).toBe("WMS");
    expect(parsed.invalid).toEqual([]);
    expect(parsed.exercises.map((e) => e.external_id)).toEqual(["demo-1", "demo-2", "demo-3", "demo-4"]);
    expect(parsed.exercises.every((e) => e.solution && e.solution_source === "derived")).toBe(true);
  });
});

// Files in import/ are generated from course material and are not committed. When present they must import cleanly.
const localFiles = existsSync("import") ? readdirSync("import").filter((f) => /^[\w.-]+\.json$/.test(f) && f.includes("tests")) : [];
describe.skipIf(localFiles.length === 0)("local exercise files in import/", () => {
  it.each(localFiles)("%s imports without a single skipped entry", (file) => {
    const parsed = parseExerciseFile(readFileSync(`import/${file}`, "utf8"));
    if ("error" in parsed) throw new Error(parsed.error);
    expect(parsed.invalid).toEqual([]);
    expect(parsed.exercises.length).toBeGreaterThan(0);
    expect(parsed.exercises.every((e) => e.solution !== null && e.solution_source !== null)).toBe(true);
  });
});
