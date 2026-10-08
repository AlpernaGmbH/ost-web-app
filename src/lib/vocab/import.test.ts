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
