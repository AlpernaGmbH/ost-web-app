import { describe, expect, it } from "vitest";
import { isDue, schedule, type SrsState } from "./srs";

const NOW = new Date("2026-10-08T10:00:00Z");
const fresh: SrsState = { ease: 2.5, interval_days: 0, reps: 0, lapses: 0 };
const days = (d: Date) => Math.round((d.getTime() - NOW.getTime()) / 86_400_000);

describe("schedule", () => {
  it("good: 1 day, then 6 days, then interval * ease", () => {
    const a = schedule(fresh, 2, NOW);
    expect([a.interval_days, a.reps]).toEqual([1, 1]);
    const b = schedule(a, 2, NOW);
    expect([b.interval_days, b.reps]).toEqual([6, 2]);
    const c = schedule(b, 2, NOW);
    expect(c.interval_days).toBe(15); // 6 * 2.5
    expect(days(c.due_at)).toBe(15);
  });

  it("again: resets progress, counts a lapse, lowers ease and is due in 10 minutes", () => {
    const learned = { ease: 2.5, interval_days: 15, reps: 3, lapses: 0 };
    const r = schedule(learned, 0, NOW);
    expect(r).toMatchObject({ interval_days: 0, reps: 0, lapses: 1, ease: 2.3 });
    expect(r.due_at.getTime() - NOW.getTime()).toBe(10 * 60_000);
  });

  it("never lets ease fall below 1.3", () => {
    let s: SrsState = { ...fresh, ease: 1.35 };
    for (let i = 0; i < 5; i++) s = { ...s, ...schedule(s, 0, NOW) };
    expect(s.ease).toBe(1.3);
    expect(schedule({ ...fresh, ease: 1.3 }, 1, NOW).ease).toBe(1.3);
  });

  it("hard grows slowly and lowers ease, easy jumps ahead and raises ease", () => {
    const state = { ease: 2.5, interval_days: 10, reps: 3, lapses: 0 };
    expect(schedule(state, 1, NOW)).toMatchObject({ interval_days: 12, ease: 2.35 });
    expect(schedule(state, 3, NOW)).toMatchObject({ interval_days: 33, ease: 2.65 }); // 10 * 2.5 * 1.3 = 32.5
    expect(schedule(fresh, 3, NOW).interval_days).toBe(4);
  });

  it("keeps lapses on success and does not mutate the input", () => {
    const state = Object.freeze({ ease: 2.5, interval_days: 6, reps: 2, lapses: 4 });
    expect(schedule(state, 2, NOW).lapses).toBe(4);
  });
});

describe("isDue", () => {
  it("treats new cards and past due dates as due", () => {
    expect(isDue({ due_at: null }, NOW)).toBe(true);
    expect(isDue({ due_at: "2026-10-08T09:59:59Z" }, NOW)).toBe(true);
    expect(isDue({ due_at: "2026-10-08T10:00:00Z" }, NOW)).toBe(true);
    expect(isDue({ due_at: "2026-10-09T10:00:00Z" }, NOW)).toBe(false);
  });
});
