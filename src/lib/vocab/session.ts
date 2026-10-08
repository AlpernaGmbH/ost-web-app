import { checkAnswer, type Verdict } from "./check";
import type { Entry, Mode } from "./queue";
import type { Rating } from "./srs";

// Pure state machine of a study round. The component renders it and records ratings on the server.

export type SessionState = {
  mode: Mode;
  queue: Entry[];
  pos: number;
  revealed: boolean; // cards mode: back side visible
  verdict: Verdict | null; // write/choice: result of the current question
  given: string | null; // what the user typed or picked
  firstTry: Record<string, boolean>; // card id -> answered correctly on the first attempt
  wrong: Entry[]; // distinct cards missed at least once
};

export type SessionAction =
  | { type: "reveal" }
  | { type: "rate"; rating: Rating } // cards mode
  | { type: "submit"; text: string } // write mode
  | { type: "pick"; option: string } // choice mode
  | { type: "next" } // leave the feedback screen
  | { type: "restart-wrong" };

export function initialState(mode: Mode, queue: Entry[]): SessionState {
  return { mode, queue, pos: 0, revealed: false, verdict: null, given: null, firstTry: {}, wrong: [] };
}

export const current = (s: SessionState): Entry | undefined => s.queue[s.pos];
export const isFinished = (s: SessionState) => s.pos >= s.queue.length;

/** Rating that results from a verdict. A typo counts as recalled, but only as "hard". */
export function ratingFor(verdict: Verdict): Rating {
  return verdict === "correct" ? 2 : verdict === "typo" ? 1 : 0;
}

function advance(s: SessionState, rating: Rating): SessionState {
  const entry = current(s);
  if (!entry) return s;
  const missed = rating === 0;
  const next: SessionState = {
    ...s,
    pos: s.pos + 1,
    revealed: false,
    verdict: null,
    given: null,
    firstTry: entry.attempt === 0 ? { ...s.firstTry, [entry.id]: !missed } : s.firstTry,
    wrong: missed && !s.wrong.some((w) => w.id === entry.id) ? [...s.wrong, entry] : s.wrong,
  };
  // a missed card comes back once at the end of the round
  if (missed && entry.attempt === 0) next.queue = [...s.queue, { ...entry, key: `${entry.id}:1`, attempt: 1 }];
  return next;
}

export function reduce(s: SessionState, action: SessionAction): SessionState {
  const entry = current(s);
  switch (action.type) {
    case "reveal":
      return entry && s.mode === "cards" ? { ...s, revealed: true } : s;
    case "rate":
      return entry && s.mode === "cards" && s.revealed ? advance(s, action.rating) : s;
    case "submit": {
      if (!entry || s.mode !== "write" || s.verdict) return s;
      return { ...s, verdict: checkAnswer(action.text, entry.answer), given: action.text };
    }
    case "pick": {
      if (!entry || s.mode !== "choice" || s.verdict) return s;
      const correct = action.option.toLowerCase() === entry.answer.toLowerCase();
      return { ...s, verdict: correct ? "correct" : "wrong", given: action.option };
    }
    case "next":
      return s.verdict ? advance(s, ratingFor(s.verdict)) : s;
    case "restart-wrong":
      return isFinished(s) && s.wrong.length > 0
        ? { ...initialState(s.mode, s.wrong.map((w) => ({ ...w, key: `${w.id}:0`, attempt: 0 }))) }
        : s;
  }
}

export function summary(s: SessionState) {
  const ids = Object.keys(s.firstTry);
  const correct = ids.filter((id) => s.firstTry[id]).length;
  return { total: ids.length, correct, wrong: s.wrong };
}
