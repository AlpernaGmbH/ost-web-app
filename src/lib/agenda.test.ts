import { describe, expect, it } from "vitest";
import { groupWeek, weekBounds, type AgendaLecture } from "./agenda";

const MONDAY = "2026-10-05"; // W04
const lecture = (id: string, starts_at: string, ends_at: string | null = null, status: AgendaLecture["status"] = "scheduled"): AgendaLecture => ({
  id, module_id: "m", title: id, starts_at, ends_at, location: null, status,
});

describe("weekBounds", () => {
  it("spans Monday 00:00 to next Monday 00:00 in Zurich time", () => {
    const { from, to } = weekBounds(MONDAY);
    expect(from.toISOString()).toBe("2026-10-04T22:00:00.000Z"); // CEST
    expect(to.toISOString()).toBe("2026-10-11T22:00:00.000Z");
  });

  it("handles the week with the DST change (25 hours on Sunday)", () => {
    const { from, to } = weekBounds("2026-10-19");
    expect(to.getTime() - from.getTime()).toBe(7 * 86_400_000 + 3_600_000); // 169 hours: clocks go back on Sunday 25.10.
    const dst = weekBounds("2026-10-26");
    expect(dst.from.toISOString()).toBe("2026-10-25T23:00:00.000Z"); // CET after the change
  });
});

describe("groupWeek", () => {
  const now = new Date("2026-10-07T08:30:00Z"); // Wednesday 10:30 Zurich

  it("returns seven days Monday to Sunday with labels", () => {
    const days = groupWeek(MONDAY, [], now);
    expect(days.map((d) => d.date)).toEqual(["2026-10-05", "2026-10-06", "2026-10-07", "2026-10-08", "2026-10-09", "2026-10-10", "2026-10-11"]);
    expect(days[0].label).toBe("Mo 05.10.");
    expect(days[6].label).toBe("So 11.10.");
    expect(days.filter((d) => d.isToday).map((d) => d.date)).toEqual(["2026-10-07"]);
  });

  it("assigns events by Zurich date, sorted by start, even right after midnight", () => {
    const days = groupWeek(
      MONDAY,
      [
        lecture("late", "2026-10-05T14:15:00Z", "2026-10-05T16:00:00Z"),
        lecture("early", "2026-10-05T06:15:00Z", "2026-10-05T07:45:00Z"),
        lecture("midnight", "2026-10-05T22:30:00Z"), // 00:30 on Tuesday in Zurich
      ],
      now,
    );
    expect(days[0].items.map((i) => i.id)).toEqual(["early", "late"]);
    expect(days[1].items.map((i) => i.id)).toEqual(["midnight"]);
  });

  it("marks the running event and past events", () => {
    const days = groupWeek(
      MONDAY,
      [
        lecture("done", "2026-10-07T06:15:00Z", "2026-10-07T07:45:00Z"),
        lecture("running", "2026-10-07T08:00:00Z", "2026-10-07T09:30:00Z"),
        lecture("next", "2026-10-07T12:15:00Z", "2026-10-07T13:45:00Z"),
      ],
      now,
    );
    const wed = Object.fromEntries(days[2].items.map((i) => [i.id, i]));
    expect([wed.done.past, wed.done.ongoing]).toEqual([true, false]);
    expect([wed.running.past, wed.running.ongoing]).toEqual([false, true]);
    expect([wed.next.past, wed.next.ongoing]).toEqual([false, false]);
  });

  it("treats events without an end as 90 minutes and never marks a cancelled event as running", () => {
    const days = groupWeek(MONDAY, [lecture("open", "2026-10-07T08:00:00Z"), lecture("off", "2026-10-07T08:00:00Z", "2026-10-07T09:30:00Z", "cancelled")], now);
    const wed = Object.fromEntries(days[2].items.map((i) => [i.id, i]));
    expect(wed.open.ongoing).toBe(true);
    expect(wed.off.ongoing).toBe(false);
  });
});
