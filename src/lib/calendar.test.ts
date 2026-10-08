import { describe, expect, it } from "vitest";
import { groupByDate, groupWeek, type AgendaLecture } from "./agenda";
import { buildMonth, eventSpan, hourRange, isMonth, layoutDay, monthBounds, monthLabel, shiftMonth, visibleDays } from "./calendar";

const NOW = new Date("2026-10-07T08:30:00Z");
const lecture = (id: string, starts_at: string, ends_at: string | null, status: AgendaLecture["status"] = "scheduled"): AgendaLecture => ({
  id, module_id: "m", title: id, starts_at, ends_at, location: null, status,
});
const items = (...list: AgendaLecture[]) => [...groupByDate(list, NOW).values()].flat();

describe("eventSpan", () => {
  it("returns Zurich wall-clock minutes (summer and winter time)", () => {
    expect(eventSpan(items(lecture("a", "2026-10-07T16:15:00Z", "2026-10-07T17:45:00Z"))[0])).toEqual({ start: 18 * 60 + 15, end: 19 * 60 + 45 });
    expect(eventSpan(items(lecture("b", "2026-11-04T17:15:00Z", "2026-11-04T18:45:00Z"))[0])).toEqual({ start: 18 * 60 + 15, end: 19 * 60 + 45 });
  });

  it("falls back to 90 minutes without an end time or with a broken one", () => {
    expect(eventSpan(items(lecture("a", "2026-10-07T16:00:00Z", null))[0])).toEqual({ start: 18 * 60, end: 19 * 60 + 30 });
    expect(eventSpan(items(lecture("b", "2026-10-07T16:00:00Z", "2026-10-07T15:00:00Z"))[0])).toEqual({ start: 18 * 60, end: 19 * 60 + 30 });
  });

  it("draws very short events at least 30 minutes tall and stops at midnight", () => {
    expect(eventSpan(items(lecture("a", "2026-10-07T16:00:00Z", "2026-10-07T16:10:00Z"))[0]).end).toBe(18 * 60 + 30);
    expect(eventSpan(items(lecture("b", "2026-10-07T20:30:00Z", "2026-10-08T01:00:00Z"))[0]).end).toBe(24 * 60);
  });
});

describe("layoutDay", () => {
  it("keeps events that do not overlap at full width", () => {
    const placed = layoutDay(items(lecture("a", "2026-10-07T16:00:00Z", "2026-10-07T17:00:00Z"), lecture("b", "2026-10-07T17:00:00Z", "2026-10-07T18:00:00Z")));
    expect(placed.map((p) => [p.col, p.cols])).toEqual([[0, 1], [0, 1]]);
  });

  it("puts overlapping events side by side", () => {
    const placed = layoutDay(items(lecture("a", "2026-10-07T16:00:00Z", "2026-10-07T18:00:00Z"), lecture("b", "2026-10-07T17:00:00Z", "2026-10-07T19:00:00Z")));
    expect(placed.map((p) => [p.item.id, p.col, p.cols])).toEqual([["a", 0, 2], ["b", 1, 2]]);
  });

  it("reuses a free column and sizes each group on its own", () => {
    const placed = layoutDay(
      items(
        lecture("a", "2026-10-07T16:00:00Z", "2026-10-07T18:00:00Z"),
        lecture("b", "2026-10-07T16:30:00Z", "2026-10-07T17:00:00Z"),
        lecture("c", "2026-10-07T17:00:00Z", "2026-10-07T17:30:00Z"), // fits under b in column 1
        lecture("d", "2026-10-07T19:00:00Z", "2026-10-07T20:00:00Z"), // separate group
      ),
    );
    expect(placed.map((p) => [p.item.id, p.col, p.cols])).toEqual([["a", 0, 2], ["b", 1, 2], ["c", 1, 2], ["d", 0, 1]]);
  });
});

describe("hourRange and visibleDays", () => {
  it("defaults to 08-18 for an empty week", () => {
    expect(hourRange(groupWeek("2026-10-05", [], NOW))).toEqual({ start: 8, end: 18 });
  });

  it("covers evening lectures and Saturday teaching", () => {
    const days = groupWeek("2026-10-05", [lecture("a", "2026-10-06T16:15:00Z", "2026-10-06T19:45:00Z"), lecture("b", "2026-10-10T06:15:00Z", "2026-10-10T09:45:00Z")], NOW);
    expect(hourRange(days)).toEqual({ start: 8, end: 22 }); // Sat 08:15 .. Tue 21:45
    expect(visibleDays(days).map((d) => d.date.slice(8))).toEqual(["05", "06", "07", "08", "09", "10"]);
  });

  it("shows at least four hours", () => {
    const days = groupWeek("2026-10-05", [lecture("a", "2026-10-06T16:15:00Z", "2026-10-06T17:45:00Z")], NOW);
    expect(hourRange(days)).toEqual({ start: 18, end: 22 });
  });

  it("hides the weekend when it is empty", () => {
    expect(visibleDays(groupWeek("2026-10-05", [], NOW))).toHaveLength(5);
  });
});

describe("month helpers", () => {
  it("validates and shifts months across year ends", () => {
    expect(isMonth("2026-10")).toBe(true);
    expect(isMonth("2026-13")).toBe(false);
    expect(isMonth("2026-1")).toBe(false);
    expect(shiftMonth("2026-12", 1)).toBe("2027-01");
    expect(shiftMonth("2027-01", -1)).toBe("2026-12");
    expect(shiftMonth("2026-10", 0)).toBe("2026-10");
  });

  it("covers whole weeks Monday to Sunday", () => {
    // October 2026 starts on a Thursday and ends on a Saturday
    expect(monthBounds("2026-10")).toEqual({ from: "2026-09-28", to: "2026-11-02" });
    // February 2027 starts on a Monday and ends on a Sunday: exactly four rows
    expect(monthBounds("2027-02")).toEqual({ from: "2027-02-01", to: "2027-03-01" });
  });

  it("builds the grid with week numbers, today and out-of-month days", () => {
    const byDate = groupByDate([lecture("a", "2026-10-06T16:15:00Z", "2026-10-06T17:45:00Z")], NOW);
    const weeks = buildMonth("2026-10", byDate, "2026-10-07", "2026-09-14");
    expect(weeks.map((w) => w.week)).toEqual([3, 4, 5, 6, 7]);
    expect(weeks[0].days[0]).toMatchObject({ date: "2026-09-28", inMonth: false });
    expect(weeks[1].days[1]).toMatchObject({ date: "2026-10-06", inMonth: true });
    expect(weeks[1].days[1].items).toHaveLength(1);
    expect(weeks[1].days.filter((d) => d.isToday).map((d) => d.date)).toEqual(["2026-10-07"]);
    expect(weeks.flatMap((w) => w.days)).toHaveLength(35);
  });

  it("formats the month name in German", () => {
    expect(monthLabel("2026-10")).toBe("Oktober 2026");
    expect(monthLabel("2027-03")).toBe("März 2027");
  });
});
