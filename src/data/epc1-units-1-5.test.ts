import { describe, expect, it } from "vitest";
import { parseSections } from "@/lib/vocab/import";
import { EPC1_UNITS_1_5 } from "./epc1-units-1-5";

// Guards the bundled word list: counts are taken from the headings of the source document.
describe("EPC1 Units 1-5 starter set", () => {
  const { sections, skipped } = parseSections(EPC1_UNITS_1_5);

  it("parses into five units with the documented word counts and nothing skipped", () => {
    expect(skipped).toEqual([]);
    expect(sections.map((s) => [s.title.split(" – ")[0], s.rows.length])).toEqual([
      ["Unit 1", 10],
      ["Unit 2", 27],
      ["Unit 3", 28],
      ["Unit 4", 21],
      ["Unit 5", 18],
    ]);
    expect(sections.reduce((n, s) => n + s.rows.length, 0)).toBe(104);
  });

  it("gives every word a meaning and an example sentence", () => {
    for (const section of sections) {
      for (const row of section.rows) {
        expect(row.back.length, row.front).toBeGreaterThan(3);
        expect(row.example, row.front).toBeTruthy();
      }
    }
  });
});
