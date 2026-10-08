import { describe, expect, it } from "vitest";
import { buildEntries, canUseChoice, selectCards, shuffle, type CardRow } from "./queue";

const NOW = new Date("2026-10-08T10:00:00Z");
const seq = (values: number[]) => {
  let i = 0;
  return () => values[i++ % values.length];
};
const card = (id: string, due_at: string | null, front = id, back = `${id}-de`): CardRow => ({
  id, front_md: front, back_md: back, data: null, due_at,
});

describe("shuffle", () => {
  it("keeps all items and does not mutate the input", () => {
    const input = [1, 2, 3, 4, 5];
    const out = shuffle(input, seq([0.9, 0.1, 0.5, 0.3]));
    expect([...out].sort()).toEqual([1, 2, 3, 4, 5]);
    expect(input).toEqual([1, 2, 3, 4, 5]);
  });
});

describe("selectCards", () => {
  const cards = [
    card("future", "2026-10-20T00:00:00Z"),
    card("new1", null),
    card("old", "2026-10-01T00:00:00Z"),
    card("recent", "2026-10-07T00:00:00Z"),
    card("new2", null),
  ];

  it("due scope: overdue first (oldest first), then new, never future cards", () => {
    const out = selectCards(cards, { scope: "due", now: NOW, rand: Math.random });
    expect(out.map((c) => c.id)).toEqual(["old", "recent", "new1", "new2"]);
  });

  it("respects the round size", () => {
    expect(selectCards(cards, { scope: "due", now: NOW, rand: Math.random, limit: 2 }).map((c) => c.id)).toEqual(["old", "recent"]);
  });

  it("all scope ignores the schedule and includes future cards", () => {
    const out = selectCards(cards, { scope: "all", now: NOW, rand: seq([0.2, 0.7]) });
    expect(out).toHaveLength(5);
    expect(out.map((c) => c.id)).toContain("future");
  });
});

describe("buildEntries", () => {
  const cards = [card("a", null, "run", "rennen"), card("b", null, "house", "Haus")];
  const pool = [...cards, card("c", null, "tree", "Baum"), card("d", null, "dog", "Hund"), card("e", null, "sky", "Himmel")];

  it("en-de asks the English side, de-en the German side", () => {
    expect(buildEntries(cards, pool, { mode: "write", direction: "en-de", rand: () => 0 })[0]).toMatchObject({ prompt: "run", answer: "rennen", english: "run", dir: "en-de" });
    expect(buildEntries(cards, pool, { mode: "write", direction: "de-en", rand: () => 0 })[0]).toMatchObject({ prompt: "rennen", answer: "run", english: "run", dir: "de-en" });
  });

  it("mixed picks a direction per card", () => {
    const out = buildEntries(cards, pool, { mode: "cards", direction: "mixed", rand: seq([0.1, 0.9]) });
    expect(out.map((e) => e.dir)).toEqual(["en-de", "de-en"]);
  });

  it("choice mode: 4 distinct options with the correct answer exactly once", () => {
    const [entry] = buildEntries(cards, pool, { mode: "choice", direction: "en-de", rand: Math.random });
    expect(entry.options).toHaveLength(4);
    expect(new Set(entry.options).size).toBe(4);
    expect(entry.options!.filter((o) => o === "rennen")).toHaveLength(1);
  });

  it("only choice mode gets options; examples are carried over", () => {
    const withExample = [{ ...cards[0], data: { example: "I run daily." } }];
    const [entry] = buildEntries(withExample, pool, { mode: "write", direction: "en-de", rand: () => 0 });
    expect(entry.options).toBeNull();
    expect(entry.example).toBe("I run daily.");
  });
});

describe("canUseChoice", () => {
  it("needs four distinct meanings", () => {
    expect(canUseChoice([{ back_md: "a" }, { back_md: "b" }, { back_md: "c" }])).toBe(false);
    expect(canUseChoice([{ back_md: "a" }, { back_md: "A" }, { back_md: "c" }, { back_md: "d" }])).toBe(false);
    expect(canUseChoice([{ back_md: "a" }, { back_md: "b" }, { back_md: "c" }, { back_md: "d" }])).toBe(true);
  });
});
