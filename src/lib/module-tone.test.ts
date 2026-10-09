import { describe, expect, it } from "vitest";
import { assignTones, toneColors } from "./module-tone";

describe("assignTones", () => {
  it("numbers the subjects in order and keeps administration neutral", () => {
    const tones = assignTones([
      { id: "wms", kind: "course" },
      { id: "sys", kind: "course" },
      { id: "vhr", kind: "course" },
      { id: "eng", kind: "language" },
      { id: "adm", kind: "admin" },
    ]);
    expect([...tones]).toEqual([["wms", 1], ["sys", 2], ["vhr", 3], ["eng", 4], ["adm", 0]]);
  });

  it("wraps around after six subjects", () => {
    const tones = assignTones(Array.from({ length: 7 }, (_, i) => ({ id: String(i), kind: "course" })));
    expect(tones.get("5")).toBe(6);
    expect(tones.get("6")).toBe(1);
  });
});

describe("toneColors", () => {
  it("maps a tone to the token pair and falls back to neutral", () => {
    expect(toneColors(2)).toEqual({ soft: "var(--mod-2)", ink: "var(--mod-2-ink)" });
    expect(toneColors(0).soft).toBe("var(--surface-200)");
    expect(toneColors(undefined).ink).toBe("var(--ink-muted)");
    expect(toneColors(9).ink).toBe("var(--ink-muted)");
  });
});
