// Answer checking for the "write" mode. Lenient where a learner would expect it:
// several accepted meanings (";" "/" ","), an optional leading "to" for English verbs,
// case, punctuation and one typo in longer words.

export type Verdict = "correct" | "typo" | "wrong";

const ARTICLES = /^(the|a|an|der|die|das|ein|eine|einen|einem|einer)\s+/;

export function normalize(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFC")
    .replace(/\([^)]*\)/g, " ") // "(sich)" or "(fam.)" hints are optional
    .replace(/[.!?¿¡"„“”'’`´,;:]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^to\s+/, "")
    .replace(ARTICLES, "");
}

/** All meanings of a card side: "rennen; laufen" -> ["rennen", "laufen"]. */
export function meanings(side: string): string[] {
  const parts = side.split(/[;/]|,(?![^(]*\))/).map((p) => p.trim()).filter(Boolean);
  return parts.length > 0 ? parts : [side.trim()];
}

function distance(a: string, b: string): number {
  if (a === b) return 0;
  const prev = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    let diagonal = prev[0];
    prev[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const above = prev[j];
      prev[j] = Math.min(prev[j] + 1, prev[j - 1] + 1, diagonal + (a[i - 1] === b[j - 1] ? 0 : 1));
      diagonal = above;
    }
  }
  return prev[b.length];
}

/** `answer` is what the user typed, `expected` the full back side of the card. */
export function checkAnswer(answer: string, expected: string): Verdict {
  const given = normalize(answer);
  if (!given) return "wrong";
  const accepted = [...new Set([...meanings(expected), expected].map(normalize).filter(Boolean))];
  if (accepted.includes(given)) return "correct";
  // one typo is forgiven in words of 5+ letters; shorter words must be exact
  if (accepted.some((a) => a.length >= 5 && distance(given, a) === 1)) return "typo";
  return "wrong";
}
