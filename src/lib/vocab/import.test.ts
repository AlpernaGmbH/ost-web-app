import { describe, expect, it } from "vitest";
import { parseImport } from "./import";

describe("parseImport", () => {
  it("parses tab, dash, semicolon and equals separators", () => {
    const { rows, skipped } = parseImport("to run\trennen\nhouse - Haus\nbook; Buch\ncat = Katze\ntree : Baum");
    expect(rows.map((r) => [r.front, r.back])).toEqual([
      ["to run", "rennen"],
      ["house", "Haus"],
      ["book", "Buch"],
      ["cat", "Katze"],
      ["tree", "Baum"],
    ]);
    expect(skipped).toEqual([]);
  });

  it("keeps hyphens inside words and several meanings in the back", () => {
    const { rows } = parseImport("well-known\tbekannt; berühmt");
    expect(rows).toEqual([{ front: "well-known", back: "bekannt; berühmt", example: null }]);
    expect(parseImport("long-term - langfristig").rows[0]).toMatchObject({ front: "long-term", back: "langfristig" });
  });

  it("reads an optional example sentence as third column", () => {
    const { rows } = parseImport("achieve\terreichen\tShe achieved her goal.");
    expect(rows[0].example).toBe("She achieved her goal.");
  });

  it("handles Windows line endings, blank lines and comments", () => {
    const { rows } = parseImport("# Unit 3\r\n\r\ndog - Hund\r\n   \r\ncat - Katze\r\n");
    expect(rows).toHaveLength(2);
  });

  it("reports unparsable and duplicate lines with their line number instead of failing", () => {
    const { rows, skipped } = parseImport("dog - Hund\nnonsense without separator\nDog - Köter\nlongword\t");
    expect(rows).toHaveLength(1);
    expect(skipped.map((s) => [s.line, s.reason])).toEqual([
      [2, "kein Trennzeichen gefunden"],
      [3, "doppelt in der Liste"],
      [4, "kein Trennzeichen gefunden"],
    ]);
  });

  it("rejects over-long fields", () => {
    const { rows, skipped } = parseImport(`${"x".repeat(501)} - y`);
    expect(rows).toHaveLength(0);
    expect(skipped[0].reason).toBe("Eintrag zu lang");
  });
});

import { parseSections } from "./import";

describe("pipe separator", () => {
  it("is preferred over dashes inside the text", () => {
    const { rows } = parseImport("long-term | lasting - for a long time | A long-term plan - not a quick fix.");
    expect(rows[0]).toEqual({ front: "long-term", back: "lasting - for a long time", example: "A long-term plan - not a quick fix." });
  });
});

describe("parseSections", () => {
  const text = [
    "## Unit 1 – Goal-setting",
    "(to) accomplish | to achieve or complete successfully | She accomplished it.",
    "attainable | possible to achieve",
    "",
    "## Unit 2 – Teamwork",
    "(to) collaborate | to work jointly with others | They collaborate daily.",
    "# a comment",
  ].join("\n");

  it("starts a list at every ## heading", () => {
    const { sections, skipped } = parseSections(text);
    expect(skipped).toEqual([]);
    expect(sections.map((s) => [s.title, s.rows.length])).toEqual([
      ["Unit 1 – Goal-setting", 2],
      ["Unit 2 – Teamwork", 1],
    ]);
    expect(sections[0].rows[0]).toEqual({ front: "(to) accomplish", back: "to achieve or complete successfully", example: "She accomplished it." });
  });

  it("rejects rows before the first heading with their line number", () => {
    const { sections, skipped } = parseSections("orphan | no list yet\n## Unit 1\nword | meaning");
    expect(sections).toHaveLength(1);
    expect(skipped).toEqual([{ line: 1, text: "orphan | no list yet", reason: "steht vor der ersten Überschrift (## Name)" }]);
  });

  it("merges a repeated heading and skips duplicates only within one list", () => {
    const { sections, skipped } = parseSections("## A\nfoo | one\n## B\nfoo | one\n## a\nbar | two\nfoo | dup");
    expect(sections.map((s) => [s.title, s.rows.map((r) => r.front)])).toEqual([
      ["A", ["foo", "bar"]],
      ["B", ["foo"]],
    ]);
    expect(skipped.map((s) => s.reason)).toEqual(["doppelt in der Liste"]);
  });

  it("drops empty lists and over-long titles", () => {
    expect(parseSections("## Empty\n## Full\nx | y").sections.map((s) => s.title)).toEqual(["Full"]);
    const long = parseSections(`## ${"t".repeat(81)}\nx | y`);
    expect(long.sections).toEqual([]);
    expect(long.skipped.map((s) => s.reason)).toEqual(["Name der Liste zu lang", "steht vor der ersten Überschrift (## Name)"]);
  });
});
