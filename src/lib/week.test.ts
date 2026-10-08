import { describe, expect, it } from "vitest";
import { formatWeek, shortDate, weekNumber, weekRange, zurichDate, zurichInstant, zurichMinutes } from "./week";

const START = "2026-09-14"; // W01 starts Monday 14.09.2026

describe("weekNumber", () => {
  it("counts the start day as W01", () => {
    expect(weekNumber(START, new Date("2026-09-14T08:00:00+02:00"))).toBe(1);
  });

  it("keeps Sunday of the first week in W01 and moves Monday to W02", () => {
    expect(weekNumber(START, new Date("2026-09-20T12:00:00+02:00"))).toBe(1);
    expect(weekNumber(START, new Date("2026-09-21T08:15:00+02:00"))).toBe(2);
  });

  it("matches the known calendar position of 2026-10-06 (W04)", () => {
    expect(weekNumber(START, new Date("2026-10-06T12:00:00+02:00"))).toBe(4);
  });

  it("uses Zurich local time, not UTC, around midnight", () => {
    // 23:30 Zurich on Sunday = 21:30 UTC -> still W01
    expect(weekNumber(START, new Date("2026-09-20T23:30:00+02:00"))).toBe(1);
    // 00:30 Zurich on Monday = 22:30 UTC on Sunday -> already W02
    expect(weekNumber(START, new Date("2026-09-21T00:30:00+02:00"))).toBe(2);
  });

  it("stays correct across the DST change on 2026-10-25", () => {
    expect(weekNumber(START, new Date("2026-10-25T12:00:00+01:00"))).toBe(6);
    expect(weekNumber(START, new Date("2026-10-26T08:00:00+01:00"))).toBe(7);
  });

  it("returns 0 or negative numbers before the semester", () => {
    expect(weekNumber(START, new Date("2026-09-13T12:00:00+02:00"))).toBe(0);
    expect(weekNumber(START, new Date("2026-09-06T12:00:00+02:00"))).toBe(-1);
  });
});

describe("weekRange / formatting", () => {
  it("returns Monday and Sunday of a week", () => {
    expect(weekRange(START, 1)).toEqual({ monday: "2026-09-14", sunday: "2026-09-20" });
    expect(weekRange(START, 4)).toEqual({ monday: "2026-10-05", sunday: "2026-10-11" });
  });

  it("is the inverse of weekNumber", () => {
    for (const w of [1, 2, 7, 14, 20]) {
      const { monday, sunday } = weekRange(START, w);
      expect(weekNumber(START, new Date(`${monday}T12:00:00+02:00`))).toBe(w);
      expect(weekNumber(START, new Date(`${sunday}T12:00:00+01:00`))).toBe(w);
    }
  });

  it("formats labels", () => {
    expect(formatWeek(4)).toBe("W04");
    expect(formatWeek(12)).toBe("W12");
    expect(formatWeek(0)).toBe("Vor Semesterbeginn");
    expect(shortDate("2026-10-05")).toBe("05.10.");
    expect(zurichDate(new Date("2026-09-20T22:30:00Z"))).toBe("2026-09-21");
  });
});

describe("zurichInstant", () => {
  it("converts summer time (CEST, UTC+2)", () => {
    expect(zurichInstant("2026-09-15", "08:15").toISOString()).toBe("2026-09-15T06:15:00.000Z");
  });

  it("converts winter time (CET, UTC+1)", () => {
    expect(zurichInstant("2026-12-01", "08:15").toISOString()).toBe("2026-12-01T07:15:00.000Z");
  });

  it("handles the days around the DST changes", () => {
    expect(zurichInstant("2026-10-24", "23:00").toISOString()).toBe("2026-10-24T21:00:00.000Z"); // still CEST
    expect(zurichInstant("2026-10-25", "12:00").toISOString()).toBe("2026-10-25T11:00:00.000Z"); // CET again
    expect(zurichInstant("2026-03-29", "12:00").toISOString()).toBe("2026-03-29T10:00:00.000Z"); // CEST again
  });

  it("round-trips through zurichDate", () => {
    expect(zurichDate(zurichInstant("2026-09-21", "00:30"))).toBe("2026-09-21");
  });
});

import { addDays, mondayOf } from "./week";

describe("addDays / mondayOf", () => {
  it("adds calendar days across months, years and leap days", () => {
    expect(addDays("2026-10-05", 7)).toBe("2026-10-12");
    expect(addDays("2026-12-28", 7)).toBe("2027-01-04");
    expect(addDays("2028-02-28", 1)).toBe("2028-02-29");
    expect(addDays("2026-10-05", -7)).toBe("2026-09-28");
  });

  it("is not affected by the DST change", () => {
    expect(addDays("2026-10-24", 2)).toBe("2026-10-26");
  });

  it("finds the Monday of any weekday, including Sunday", () => {
    expect(mondayOf("2026-10-05")).toBe("2026-10-05"); // Monday
    expect(mondayOf("2026-10-08")).toBe("2026-10-05"); // Thursday
    expect(mondayOf("2026-10-11")).toBe("2026-10-05"); // Sunday belongs to the week before the next Monday
    expect(mondayOf("2027-01-01")).toBe("2026-12-28"); // across the year boundary
  });
});

describe("zurichMinutes", () => {
  it("returns the Zurich wall clock in minutes, in summer and winter time", () => {
    expect(zurichMinutes(new Date("2026-10-07T16:15:00Z"))).toBe(18 * 60 + 15); // CEST
    expect(zurichMinutes(new Date("2026-11-04T17:15:00Z"))).toBe(18 * 60 + 15); // CET
    expect(zurichMinutes(new Date("2026-10-06T22:00:00Z"))).toBe(0); // midnight in Zurich
  });
});
