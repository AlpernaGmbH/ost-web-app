import { describe, expect, it } from "vitest";
import type { Entry } from "./queue";
import { current, initialState, isFinished, ratingFor, reduce, summary, type SessionAction, type SessionState } from "./session";

const entry = (id: string, answer: string, options: string[] | null = null): Entry => ({
  key: `${id}:0`, id, english: id, prompt: id, answer, example: null, dir: "en-de", attempt: 0, options,
});
const run = (s: SessionState, ...actions: SessionAction[]) => actions.reduce(reduce, s);

describe("cards mode", () => {
  const start = () => initialState("cards", [entry("a", "A"), entry("b", "B")]);

  it("cannot rate before the card is revealed", () => {
    expect(run(start(), { type: "rate", rating: 2 }).pos).toBe(0);
  });

  it("reveal then rate advances and records the first try", () => {
    const s = run(start(), { type: "reveal" }, { type: "rate", rating: 2 });
    expect(s.pos).toBe(1);
    expect(s.revealed).toBe(false);
    expect(s.firstTry).toEqual({ a: true });
  });

  it("a missed card is repeated once at the end and listed as wrong", () => {
    let s = run(start(), { type: "reveal" }, { type: "rate", rating: 0 });
    expect(s.queue.map((e) => e.key)).toEqual(["a:0", "b:0", "a:1"]);
    expect(s.wrong.map((w) => w.id)).toEqual(["a"]);
    s = run(s, { type: "reveal" }, { type: "rate", rating: 2 }, { type: "reveal" }, { type: "rate", rating: 0 });
    expect(s.queue).toHaveLength(3); // the repeat itself is not queued again
    expect(isFinished(s)).toBe(true);
    expect(summary(s)).toMatchObject({ total: 2, correct: 1 });
    expect(s.firstTry.a).toBe(false); // the retry does not overwrite the first attempt
  });
});

describe("write mode", () => {
  const start = () => initialState("write", [entry("run", "rennen; laufen")]);

  it("shows a verdict first, advances only on next", () => {
    const s = run(start(), { type: "submit", text: "Laufen" });
    expect(s.verdict).toBe("correct");
    expect(s.pos).toBe(0);
    expect(run(s, { type: "next" }).pos).toBe(1);
  });

  it("ignores a second submit while feedback is shown", () => {
    const s = run(start(), { type: "submit", text: "springen" }, { type: "submit", text: "rennen" });
    expect(s.verdict).toBe("wrong");
    expect(s.given).toBe("springen");
  });

  it("a wrong answer queues a retry; a right retry finishes the round", () => {
    let s = run(start(), { type: "submit", text: "x" }, { type: "next" });
    expect(current(s)?.attempt).toBe(1);
    s = run(s, { type: "submit", text: "rennen" }, { type: "next" });
    expect(isFinished(s)).toBe(true);
    expect(summary(s)).toMatchObject({ total: 1, correct: 0 });
  });
});

describe("choice mode and restart", () => {
  const opts = ["A", "B", "C", "D"];
  const start = () => initialState("choice", [entry("a", "A", opts), entry("b", "B", opts)]);

  it("compares picks case-insensitively", () => {
    expect(run(start(), { type: "pick", option: "a" }).verdict).toBe("correct");
    expect(run(start(), { type: "pick", option: "C" }).verdict).toBe("wrong");
  });

  it("restart-wrong starts a fresh round with only the missed cards", () => {
    let s = run(start(), { type: "pick", option: "C" }, { type: "next" }, { type: "pick", option: "B" }, { type: "next" });
    s = run(s, { type: "pick", option: "A" }, { type: "next" }); // retry of "a"
    expect(isFinished(s)).toBe(true);
    const again = reduce(s, { type: "restart-wrong" });
    expect(again.queue.map((e) => e.key)).toEqual(["a:0"]);
    expect(again.pos).toBe(0);
    expect(again.wrong).toEqual([]);
  });

  it("restart-wrong does nothing while the round is running or when nothing was missed", () => {
    expect(reduce(start(), { type: "restart-wrong" })).toEqual(start());
  });
});

describe("ratingFor", () => {
  it("maps verdicts to SRS ratings", () => {
    expect([ratingFor("correct"), ratingFor("typo"), ratingFor("wrong")]).toEqual([2, 1, 0]);
  });
});
