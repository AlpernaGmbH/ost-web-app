import { describe, expect, it } from "vitest";
import { checkBudget, estimateCostUsd, formatUsd, monthStartIso, sumCostUsd } from "./budget";
import { capFromEnv, DEFAULT_MONTHLY_CAP_USD } from "./config";
import { buildUserText, SYSTEM_PROMPT } from "./prompt";
import { draftExternalId, draftsFromOutput, extractOutput, type GeneratedOutput } from "./schema";

describe("config", () => {
  it("reads caps from the environment and falls back on nonsense", () => {
    expect(capFromEnv("12.5", 10)).toBe(12.5);
    expect(capFromEnv("0", 10)).toBe(0);
    expect(capFromEnv("", 10)).toBe(10);
    expect(capFromEnv("abc", 10)).toBe(10);
    expect(capFromEnv("-3", 10)).toBe(10);
    expect(capFromEnv(undefined, DEFAULT_MONTHLY_CAP_USD)).toBe(DEFAULT_MONTHLY_CAP_USD);
  });
});

describe("budget", () => {
  it("prices a batch request at the batch rate", () => {
    // 100k input at 2 USD/M + 10k output at 10 USD/M
    expect(estimateCostUsd(100_000, 10_000)).toBe(0.3);
    expect(estimateCostUsd(0, 0)).toBe(0);
  });

  it("sums numeric strings from PostgREST", () => {
    expect(sumCostUsd([{ cost_usd: "0.1234" }, { cost_usd: 0.2 }, { cost_usd: null }, { cost_usd: "x" }])).toBe(0.3234);
  });

  it("counts spending per calendar month (UTC)", () => {
    expect(monthStartIso(new Date("2026-10-13T08:00:00Z"))).toBe("2026-10-01T00:00:00.000Z");
  });

  it("refuses a run that would exceed the user or the global cap", () => {
    expect(checkBudget({ reservation: 1, userSpent: 1, globalSpent: 3, userCap: 5, globalCap: 10 })).toEqual({ ok: true });
    const user = checkBudget({ reservation: 1, userSpent: 4.5, globalSpent: 3, userCap: 5, globalCap: 10 });
    expect(user.ok).toBe(false);
    expect(user.ok ? "" : user.message).toContain("Monatsbudget");
    const global = checkBudget({ reservation: 1, userSpent: 1, globalSpent: 9.5, userCap: 5, globalCap: 10 });
    expect(global.ok).toBe(false);
    expect(global.ok ? "" : global.message).toContain("der App");
    expect(formatUsd(0.3)).toBe("0.30 USD");
  });
});

describe("prompt", () => {
  it("names module, files and the hint", () => {
    const text = buildUserText({ moduleCode: "WMS", moduleName: "Wirtschaftsmathematik", filenames: ["u1.pdf", "u1-loesung.pdf"], hint: "nur Kapitel 3" });
    expect(text).toContain("WMS – Wirtschaftsmathematik");
    expect(text).toContain("1. u1.pdf");
    expect(text).toContain("2. u1-loesung.pdf");
    expect(text).toContain("Hinweis der Nutzerin oder des Nutzers: nur Kapitel 3");
    expect(buildUserText({ moduleCode: "SYS", moduleName: "S", filenames: ["a.pdf"], hint: null })).not.toContain("Hinweis der");
    expect(SYSTEM_PROMPT).toContain("KaTeX");
    expect(SYSTEM_PROMPT).toContain("solution_source");
  });
});

const sample: GeneratedOutput = {
  summary: "Zwei Aufgaben gefunden.",
  exercises: [
    {
      title: "Mittelwert",
      topic: "Deskriptive Statistik",
      kind: "calculation",
      task: "Berechne $\\bar x$ von 1, 2, 3.",
      solution: "$\\bar x = 2$",
      solution_source: "source",
      aids: ["calculator", "calculator", "paper"],
      aids_confirmed: false,
      minutes: 0,
      difficulty: 7,
      points: 150,
      source_ref: "Übung 1, Aufgabe 1",
      notes: "Grafik fehlt: Histogramm",
    },
    {
      title: "   ",
      topic: "x",
      kind: "open",
      task: "leer",
      solution: "",
      solution_source: "derived",
      aids: [],
      aids_confirmed: true,
      minutes: 5,
      difficulty: 1,
      points: null,
      source_ref: "",
      notes: null,
    },
  ],
};

describe("extractOutput", () => {
  const text = (body: string, stop = "end_turn") => ({ stop_reason: stop, content: [{ type: "text", text: body }] });

  it("parses a valid structured answer", () => {
    const result = extractOutput(text(JSON.stringify(sample)));
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.output.exercises).toHaveLength(2);
  });

  it("explains refusals, truncation, bad JSON and wrong shapes", () => {
    expect(extractOutput({ stop_reason: "refusal", content: [] })).toEqual({ ok: false, error: expect.stringContaining("abgelehnt") });
    expect(extractOutput(text("{", "max_tokens"))).toEqual({ ok: false, error: expect.stringContaining("abgeschnitten") });
    expect(extractOutput(text("not json"))).toEqual({ ok: false, error: expect.stringContaining("JSON") });
    expect(extractOutput(text(JSON.stringify({ exercises: "nope" })))).toEqual({ ok: false, error: expect.stringContaining("Format") });
    expect(extractOutput({ stop_reason: "end_turn", content: [{ type: "thinking" }] })).toEqual({ ok: false, error: expect.stringContaining("keinen Text") });
  });
});

describe("draftsFromOutput", () => {
  it("clamps, dedupes, appends notes and skips unusable entries with a reason", () => {
    const { exercises, invalid } = draftsFromOutput(sample, { id: "f4444444-0000-0000-0000-000000000001", filenames: ["u1.pdf", "l1.pdf"] });
    expect(exercises).toHaveLength(1);
    const [first] = exercises;
    expect(first.external_id).toBe("ai-f4444444-001");
    expect(first.aids).toEqual(["calculator", "paper"]);
    expect(first.minutes).toBe(1);
    expect(first.difficulty).toBe(3);
    expect(first.points).toBeNull();
    expect(first.task).toContain("*Hinweis (KI): Grafik fehlt: Histogramm*");
    expect(first.source).toBe("KI-Entwurf · u1.pdf + l1.pdf");
    expect(first.solution_source).toBe("source");
    expect(invalid).toEqual([{ index: 2, reason: expect.stringContaining("Titel") }]);
  });

  it("keeps an exercise without solution consistent and numbers ids per run", () => {
    const out: GeneratedOutput = { summary: "", exercises: [{ ...sample.exercises[1], title: "Offen", source_ref: "x" }] };
    const { exercises } = draftsFromOutput(out, { id: "abcdef12-0000-0000-0000-000000000001", filenames: ["a.pdf"] });
    expect(exercises[0].solution).toBeNull();
    expect(exercises[0].solution_source).toBeNull();
    expect(draftExternalId("abcdef12-0000-0000-0000-000000000001", 9)).toBe("ai-abcdef12-010");
  });
});
