import { describe, expect, it } from "vitest";
import { checkAnswer, meanings, normalize } from "./check";

describe("normalize", () => {
  it("ignores case, punctuation, optional hints and a leading 'to'", () => {
    expect(normalize("  To Run! ")).toBe("run");
    expect(normalize("sich (selbst) erinnern")).toBe("sich erinnern");
    expect(normalize("The  house.")).toBe("house");
  });
});

describe("meanings", () => {
  it("splits on ; and / and commas outside brackets", () => {
    expect(meanings("rennen; laufen")).toEqual(["rennen", "laufen"]);
    expect(meanings("Haus / Gebäude")).toEqual(["Haus", "Gebäude"]);
    expect(meanings("schnell, rasch")).toEqual(["schnell", "rasch"]);
    expect(meanings("bekommen (z. B. Post, Geschenk)")).toEqual(["bekommen (z. B. Post, Geschenk)"]);
  });
});

describe("checkAnswer", () => {
  it("accepts any one of several meanings and the full text", () => {
    expect(checkAnswer("laufen", "rennen; laufen")).toBe("correct");
    expect(checkAnswer("Rennen", "rennen; laufen")).toBe("correct");
    expect(checkAnswer("rennen; laufen", "rennen; laufen")).toBe("correct");
  });

  it("accepts English verbs with or without 'to' and ignores articles", () => {
    expect(checkAnswer("run", "to run")).toBe("correct");
    expect(checkAnswer("to run", "run")).toBe("correct");
    expect(checkAnswer("house", "the house")).toBe("correct");
  });

  it("forgives one typo only in longer words and reports it", () => {
    expect(checkAnswer("achievment", "achievement")).toBe("typo");
    expect(checkAnswer("Gebaeude", "Gebäude")).toBe("wrong"); // two edits
    expect(checkAnswer("Haus", "Maus")).toBe("wrong"); // short words must be exact
    expect(checkAnswer("laufn", "laufen")).toBe("typo");
  });

  it("rejects empty and wrong answers", () => {
    expect(checkAnswer("", "rennen")).toBe("wrong");
    expect(checkAnswer("   ", "rennen")).toBe("wrong");
    expect(checkAnswer("springen", "rennen; laufen")).toBe("wrong");
  });
});
