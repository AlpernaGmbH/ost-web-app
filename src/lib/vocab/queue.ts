import { isDue } from "./srs";

export type Direction = "en-de" | "de-en" | "mixed";
export type Mode = "cards" | "write" | "choice";
export type Scope = "due" | "all";
type Dir = "en-de" | "de-en";

export type CardRow = {
  id: string;
  front_md: string;
  back_md: string;
  data: { example?: string } | null;
  due_at: string | null;
  created_at?: string;
};

/** One question in a study round. Built on the server so the client stays free of randomness. */
export type Entry = {
  key: string;
  id: string;
  english: string; // the English side, used for text-to-speech
  prompt: string;
  answer: string;
  example: string | null;
  dir: Dir;
  attempt: 0 | 1; // 1 = a card repeated because it was wrong the first time
  options: string[] | null; // choice mode: shuffled answers including the correct one
};

export const ROUND_SIZE = { due: 20, all: 40 } as const;

export function shuffle<T>(items: readonly T[], rand: () => number): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/** Due scope: overdue cards (oldest first) before new ones. All scope: random sample, ignores the schedule. */
export function selectCards(cards: CardRow[], opts: { scope: Scope; now: Date; rand: () => number; limit?: number }): CardRow[] {
  const limit = opts.limit ?? ROUND_SIZE[opts.scope];
  if (opts.scope === "all") return shuffle(cards, opts.rand).slice(0, limit);
  const due = cards.filter((c) => isDue(c, opts.now));
  const reviews = due.filter((c) => c.due_at !== null).sort((a, b) => Date.parse(a.due_at!) - Date.parse(b.due_at!));
  const fresh = due.filter((c) => c.due_at === null);
  return [...reviews, ...fresh].slice(0, limit);
}

export function buildEntries(
  cards: CardRow[],
  pool: Pick<CardRow, "front_md" | "back_md">[],
  opts: { mode: Mode; direction: Direction; rand: () => number },
): Entry[] {
  return cards.map((card) => {
    const dir: Dir = opts.direction === "mixed" ? (opts.rand() < 0.5 ? "en-de" : "de-en") : opts.direction;
    const prompt = dir === "en-de" ? card.front_md : card.back_md;
    const answer = dir === "en-de" ? card.back_md : card.front_md;

    let options: string[] | null = null;
    if (opts.mode === "choice") {
      const sameSide = pool.map((p) => (dir === "en-de" ? p.back_md : p.front_md));
      const distractors = shuffle([...new Set(sameSide)].filter((a) => a.toLowerCase() !== answer.toLowerCase()), opts.rand).slice(0, 3);
      options = shuffle([answer, ...distractors], opts.rand);
    }

    return {
      key: `${card.id}:0`,
      id: card.id,
      english: card.front_md,
      prompt,
      answer,
      example: card.data?.example ?? null,
      dir,
      attempt: 0,
      options,
    };
  });
}

/** Choice mode needs real alternatives: at least 4 distinct meanings in the deck. */
export function canUseChoice(pool: Pick<CardRow, "back_md">[]): boolean {
  return new Set(pool.map((p) => p.back_md.toLowerCase())).size >= 4;
}
