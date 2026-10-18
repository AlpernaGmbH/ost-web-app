import { existsSync, readdirSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { TASK_FILE_FORMAT, describeTaskOutcome, parseTaskFile, taskInput } from "./import";

const file = (tasks: unknown[], extra: Record<string, unknown> = {}) => JSON.stringify({ format: TASK_FILE_FORMAT, module: "SYS", tasks, ...extra });

describe("taskInput", () => {
  it("applies defaults and trims", () => {
    expect(taskInput.parse({ title: "  Abgabe " })).toEqual({ title: "Abgabe", kind: "task", priority: "normal", status: "open", due: null, notes: null });
  });

  it("checks the date and the vocabularies", () => {
    expect(taskInput.parse({ title: "A", due: "2026-12-01" }).due).toBe("2026-12-01");
    expect(taskInput.safeParse({ title: "A", due: "1.12.2026" }).success).toBe(false);
    expect(taskInput.safeParse({ title: "A", due: "2026-13-01" }).success).toBe(false);
    expect(taskInput.safeParse({ title: "A", kind: "todo" }).success).toBe(false);
    expect(taskInput.safeParse({ title: "A", priority: "urgent" }).success).toBe(false);
    expect(taskInput.safeParse({ title: "A", status: "closed" }).success).toBe(false);
  });

  it("limits title and notes", () => {
    expect(taskInput.safeParse({ title: "x".repeat(201) }).success).toBe(false);
    expect(taskInput.safeParse({ title: "A", notes: "x".repeat(5001) }).success).toBe(false);
    expect(taskInput.parse({ title: "A", notes: "  " }).notes).toBeNull();
  });
});

describe("parseTaskFile", () => {
  it("rejects structural problems with a readable message", () => {
    expect(parseTaskFile("{")).toEqual({ error: "Die Datei ist kein gültiges JSON." });
    expect(parseTaskFile("[]")).toEqual({ error: "Unerwartetes Dateiformat." });
    expect(parseTaskFile(JSON.stringify({ format: "x", module: "SYS", tasks: [] }))).toMatchObject({ error: expect.stringContaining("Dateiformat") });
    expect(parseTaskFile(JSON.stringify({ format: TASK_FILE_FORMAT, tasks: [{ title: "A" }] }))).toMatchObject({ error: expect.stringContaining("Modul") });
    expect(parseTaskFile(JSON.stringify({ format: TASK_FILE_FORMAT, module: "SYS" }))).toMatchObject({ error: expect.stringContaining("tasks") });
    expect(parseTaskFile(file([]))).toMatchObject({ error: expect.stringContaining("keine Aufgaben") });
  });

  it("keeps valid entries and reports invalid ones by position", () => {
    const parsed = parseTaskFile(file([{ title: "A", kind: "deadline", due: "2026-11-02" }, { title: "" }, "nonsense", { title: "B", due: "bad" }]));
    expect(parsed).toMatchObject({ module: "SYS" });
    if ("error" in parsed) throw new Error(parsed.error);
    expect(parsed.tasks.map((t) => t.title)).toEqual(["A"]);
    expect(parsed.invalid).toEqual([
      { index: 2, title: "", reason: "Titel fehlt" },
      { index: 3, title: null, reason: expect.any(String) },
      { index: 4, title: "B", reason: "Fälligkeit: Datum als JJJJ-MM-TT erwartet" },
    ]);
  });

  it("refuses a title that appears twice, because the title is the match key", () => {
    const parsed = parseTaskFile(file([{ title: "A" }, { title: " A " }]));
    if ("error" in parsed) throw new Error(parsed.error);
    expect(parsed.tasks).toHaveLength(1);
    expect(parsed.invalid[0]).toMatchObject({ index: 2, reason: "Titel kommt in der Datei mehrfach vor" });
  });
});

describe("describeTaskOutcome", () => {
  it("names counts and the first skipped entry", () => {
    expect(describeTaskOutcome({ created: 8, updated: 0, invalid: [] })).toBe("8 neu.");
    expect(describeTaskOutcome({ created: 1, updated: 2, invalid: [{ index: 3, title: "X", reason: "Titel fehlt" }] })).toBe("1 neu, 2 aktualisiert, 1 übersprungen („X“: Titel fehlt).");
    expect(describeTaskOutcome({ created: 0, updated: 0, invalid: [{ index: 3, title: null, reason: "kaputt" }] })).toBe("0 neu, 1 übersprungen (Eintrag 3: kaputt).");
  });
});

// Every task file prepared for import (import/*aufgaben*.json, not committed) must be fully valid.
const importDir = new URL("../../../import/", import.meta.url);
const taskFiles = existsSync(importDir) ? readdirSync(importDir).filter((f) => /aufgaben.*\.json$/.test(f)) : [];
describe.each(taskFiles)("import/%s", (name) => {
  const parsed = parseTaskFile(readFileSync(new URL(name, importDir), "utf8"));
  it("parses without invalid entries", () => {
    expect("error" in parsed ? parsed.error : null).toBeNull();
    if ("error" in parsed) return;
    expect(parsed.invalid).toEqual([]);
    expect(parsed.tasks.length).toBeGreaterThan(0);
  });
});
