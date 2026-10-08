// Spaced repetition (SM-2 style). Pure function: the server action loads the card, calls schedule()
// and stores the result, so the algorithm can be replaced without touching the UI.

export type Rating = 0 | 1 | 2 | 3; // 0 again, 1 hard, 2 good, 3 easy

export type SrsState = {
  ease: number;
  interval_days: number;
  reps: number;
  lapses: number;
};

export type SrsResult = SrsState & { due_at: Date };

const MIN_EASE = 1.3;
const AGAIN_MINUTES = 10;
const DAY_MS = 86_400_000;

export function schedule(card: SrsState, rating: Rating, now: Date): SrsResult {
  const { ease, interval_days: interval, reps, lapses } = card;

  if (rating === 0) {
    return {
      ease: Math.max(MIN_EASE, round2(ease - 0.2)),
      interval_days: 0,
      reps: 0,
      lapses: lapses + 1,
      due_at: new Date(now.getTime() + AGAIN_MINUTES * 60_000),
    };
  }

  let nextInterval: number;
  let nextEase = ease;
  if (rating === 1) {
    nextInterval = Math.max(1, Math.round(Math.max(interval, 1) * 1.2));
    nextEase = Math.max(MIN_EASE, round2(ease - 0.15));
  } else if (rating === 2) {
    nextInterval = reps === 0 ? 1 : reps === 1 ? 6 : Math.round(Math.max(interval, 1) * ease);
  } else {
    nextInterval = reps === 0 ? 4 : Math.round(Math.max(interval, 1) * ease * 1.3);
    nextEase = round2(ease + 0.15);
  }

  return {
    ease: nextEase,
    interval_days: nextInterval,
    reps: reps + 1,
    lapses,
    due_at: new Date(now.getTime() + nextInterval * DAY_MS),
  };
}

const round2 = (n: number) => Math.round(n * 100) / 100;

/** A card is due when it is new (never scheduled) or its due date has passed. */
export function isDue(card: { due_at: string | null }, now: Date): boolean {
  return card.due_at === null || new Date(card.due_at).getTime() <= now.getTime();
}
