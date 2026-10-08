import { describe, expect, it } from "vitest";
import { matchModule } from "./match";
import { parseFeed } from "./parse";
import { planSync, type ExistingLecture } from "./plan";

const TZ = `BEGIN:VTIMEZONE
TZID:Europe/Zurich
BEGIN:DAYLIGHT
TZOFFSETFROM:+0100
TZOFFSETTO:+0200
TZNAME:CEST
DTSTART:19700329T020000
RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=-1SU
END:DAYLIGHT
BEGIN:STANDARD
TZOFFSETFROM:+0200
TZOFFSETTO:+0100
TZNAME:CET
DTSTART:19701025T030000
RRULE:FREQ=YEARLY;BYMONTH=10;BYDAY=-1SU
END:STANDARD
END:VTIMEZONE`;

const FEED = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//test//EN
${TZ}
BEGIN:VEVENT
UID:single-1@test
DTSTAMP:20260901T100000Z
DTSTART;TZID=Europe/Zurich:20260915T081500
DTEND;TZID=Europe/Zurich:20260915T094500
SUMMARY:Wirtschaftsmathematik\\, Statistik - Vorlesung
LOCATION:Raum 3.101
END:VEVENT
BEGIN:VEVENT
UID:weekly-1@test
DTSTAMP:20260901T100000Z
DTSTART;TZID=Europe/Zurich:20260916T101500
DTEND;TZID=Europe/Zurich:20260916T120000
RRULE:FREQ=WEEKLY;COUNT=4
EXDATE;TZID=Europe/Zurich:20260930T101500
SUMMARY:Systemisches Management
END:VEVENT
BEGIN:VEVENT
UID:weekly-1@test
DTSTAMP:20260901T100000Z
RECURRENCE-ID;TZID=Europe/Zurich:20261007T101500
DTSTART;TZID=Europe/Zurich:20261007T141500
DTEND;TZID=Europe/Zurich:20261007T160000
SUMMARY:Systemisches Management
END:VEVENT
BEGIN:VEVENT
UID:cancelled-1@test
DTSTAMP:20260901T100000Z
DTSTART;TZID=Europe/Zurich:20260917T081500
DTEND;TZID=Europe/Zurich:20260917T094500
STATUS:CANCELLED
SUMMARY:Vertrags- und Haftpflichtrecht
END:VEVENT
BEGIN:VEVENT
UID:allday-1@test
DTSTAMP:20260901T100000Z
DTSTART;VALUE=DATE:20260918
DTEND;VALUE=DATE:20260919
SUMMARY:Feiertag
END:VEVENT
END:VCALENDAR`;

const RANGE = { from: new Date("2026-09-14T00:00:00Z"), to: new Date("2027-01-31T00:00:00Z") };

describe("parseFeed", () => {
  const { events, skippedFullDay } = parseFeed(FEED, RANGE);

  it("converts Zurich local times to the right instants", () => {
    const single = events.find((e) => e.key === "single-1@test");
    expect(single?.startsAt.toISOString()).toBe("2026-09-15T06:15:00.000Z"); // 08:15 CEST
    expect(single?.endsAt?.toISOString()).toBe("2026-09-15T07:45:00.000Z");
    expect(single?.title).toBe("Wirtschaftsmathematik, Statistik - Vorlesung");
    expect(single?.location).toBe("Raum 3.101");
  });

  it("expands recurring events, honours EXDATE and applies the RECURRENCE-ID override", () => {
    const weekly = events.filter((e) => e.key.startsWith("weekly-1@test#"));
    expect(weekly.map((e) => e.startsAt.toISOString())).toEqual([
      "2026-09-16T08:15:00.000Z",
      "2026-09-23T08:15:00.000Z",
      "2026-10-07T12:15:00.000Z", // moved from 10:15 to 14:15 local
    ]);
  });

  it("keys an overridden instance by the slot it replaces", () => {
    const moved = events.find((e) => e.startsAt.toISOString() === "2026-10-07T12:15:00.000Z");
    expect(moved?.key).toBe("weekly-1@test#2026-10-07T08:15:00.000Z");
  });

  it("flags cancelled events and skips full-day events", () => {
    expect(events.find((e) => e.key === "cancelled-1@test")?.cancelled).toBe(true);
    expect(events.some((e) => e.key === "allday-1@test")).toBe(false);
    expect(skippedFullDay).toBe(1);
  });

  it("returns events sorted by start time", () => {
    const times = events.map((e) => e.startsAt.getTime());
    expect(times).toEqual([...times].sort((a, b) => a - b));
  });
});

describe("matchModule", () => {
  const modules = [
    { id: "wms", ical_match: "wirtschaftsmathematik, statistik" },
    { id: "sys", ical_match: "systemisch" },
    { id: "vhr", ical_match: "vertrags; haftpflicht" },
    { id: "none", ical_match: null },
  ];

  it("matches case-insensitively on any keyword", () => {
    expect(matchModule("SYSTEMISCHES Management", modules)).toBe("sys");
    expect(matchModule("Vertrags- und Haftpflichtrecht", modules)).toBe("vhr");
  });

  it("returns null for no match and for ambiguous matches", () => {
    expect(matchModule("Mittagspause", modules)).toBeNull();
    expect(matchModule("Statistik trifft Systemisches Denken", modules)).toBeNull();
  });
});

describe("planSync", () => {
  const semester = { id: "sem", user_id: "user" };
  const modules = [
    { id: "wms", ical_match: "wirtschaftsmathematik" },
    { id: "sys", ical_match: "systemisch" },
  ];
  const now = new Date("2026-10-06T12:00:00Z");
  const { events } = parseFeed(FEED, RANGE);

  const asExisting = (rows: ReturnType<typeof planSync>["upserts"], ids = true): ExistingLecture[] =>
    rows.map((r, i) => ({
      id: ids ? `id-${i}` : "x",
      ical_uid: r.ical_uid,
      module_id: r.module_id,
      title: r.title,
      starts_at: r.starts_at,
      ends_at: r.ends_at,
      location: r.location,
      status: r.status,
    }));

  it("creates everything on the first run and assigns modules by keyword", () => {
    const plan = planSync({ events, existing: [], modules, semester, now });
    expect(plan.stats).toMatchObject({ created: 5, updated: 0, unchanged: 0, cancelled: 0 });
    expect(plan.stats.unmatched).toBe(1); // "Vertrags- und Haftpflichtrecht" has no module in this setup
    expect(plan.upserts.find((u) => u.ical_uid === "single-1@test")?.module_id).toBe("wms");
    expect(plan.upserts.every((u) => u.user_id === "user" && u.source === "ical")).toBe(true);
  });

  it("is idempotent: a second run with the stored rows changes nothing", () => {
    const first = planSync({ events, existing: [], modules, semester, now });
    const second = planSync({ events, existing: asExisting(first.upserts), modules, semester, now });
    expect(second.upserts).toEqual([]);
    expect(second.cancelIds).toEqual([]);
    expect(second.stats).toMatchObject({ created: 0, updated: 0, unchanged: 5 });
  });

  it("keeps a module the user assigned manually", () => {
    const first = planSync({ events, existing: [], modules, semester, now });
    const existing = asExisting(first.upserts).map((l) => (l.ical_uid === "single-1@test" ? { ...l, module_id: "sys" } : l));
    const second = planSync({ events, existing, modules, semester, now });
    expect(second.upserts.find((u) => u.ical_uid === "single-1@test")).toBeUndefined();
  });

  it("re-matches inbox events once a keyword is added", () => {
    const first = planSync({ events, existing: [], modules, semester, now });
    const withVhr = [...modules, { id: "vhr", ical_match: "haftpflicht" }];
    const second = planSync({ events, existing: asExisting(first.upserts), modules: withVhr, semester, now });
    expect(second.upserts).toHaveLength(1);
    expect(second.upserts[0]).toMatchObject({ ical_uid: "cancelled-1@test", module_id: "vhr" });
  });

  it("updates a moved lecture in place", () => {
    const first = planSync({ events, existing: [], modules, semester, now });
    const existing = asExisting(first.upserts).map((l) =>
      l.ical_uid === "single-1@test" ? { ...l, starts_at: "2026-09-15T05:00:00.000Z" } : l,
    );
    const second = planSync({ events, existing, modules, semester, now });
    expect(second.stats).toMatchObject({ updated: 1, unchanged: 4 });
  });

  it("cancels future lectures that vanished from the feed but never past ones", () => {
    const gone: ExistingLecture[] = [
      { id: "future", ical_uid: "gone-future", module_id: "wms", title: "x", starts_at: "2026-11-01T08:00:00Z", ends_at: null, location: null, status: "scheduled" },
      { id: "past", ical_uid: "gone-past", module_id: "wms", title: "x", starts_at: "2026-09-01T08:00:00Z", ends_at: null, location: null, status: "scheduled" },
    ];
    const plan = planSync({ events, existing: gone, modules, semester, now });
    expect(plan.cancelIds).toEqual(["future"]);
    expect(plan.stats.cancelled).toBe(1);
  });
});

import { matchModuleDetailed } from "./match";

describe("matchModuleDetailed", () => {
  const modules = [
    { id: "wms", ical_match: "statistik" },
    { id: "sys", ical_match: "systemisch" },
  ];
  it("tells no match apart from an ambiguous match", () => {
    expect(matchModuleDetailed("Statistik Übung", modules)).toEqual({ id: "wms", ambiguous: false });
    expect(matchModuleDetailed("Mittagspause", modules)).toEqual({ id: null, ambiguous: false });
    expect(matchModuleDetailed("Statistik und systemisches Denken", modules)).toEqual({ id: null, ambiguous: true });
  });
});

describe("planSync with an administration module", () => {
  const semester = { id: "sem", user_id: "user" };
  const modules = [
    { id: "wms", ical_match: "wirtschaftsmathematik" },
    { id: "sys", ical_match: "systemisch" },
  ];
  const now = new Date("2026-10-06T12:00:00Z");
  const { events } = parseFeed(FEED, RANGE);
  const find = (plan: ReturnType<typeof planSync>, uid: string) => plan.upserts.find((u) => u.ical_uid === uid);

  it("files events without any keyword match under administration", () => {
    const plan = planSync({ events, existing: [], modules, fallbackModuleId: "adm", semester, now });
    expect(find(plan, "cancelled-1@test")?.module_id).toBe("adm"); // "Vertrags- und Haftpflichtrecht" has no module here
    expect(find(plan, "single-1@test")?.module_id).toBe("wms"); // keyword matches still win
    expect(plan.stats).toMatchObject({ administration: 1, unmatched: 0 });
  });

  it("keeps ambiguous matches in the inbox instead of guessing", () => {
    const both = [...modules, { id: "x", ical_match: "systemisches management" }];
    const plan = planSync({ events, existing: [], modules: both, fallbackModuleId: "adm", semester, now });
    const weekly = plan.upserts.filter((u) => u.ical_uid.startsWith("weekly-1@test#"));
    expect(weekly.every((u) => u.module_id === null)).toBe(true);
    expect(plan.stats.unmatched).toBe(weekly.length);
  });

  it("moves events that already sit in the inbox to administration on the next sync", () => {
    const first = planSync({ events, existing: [], modules, semester, now }); // no administration module yet
    expect(first.stats.unmatched).toBe(1);
    const existing = first.upserts.map((u, i) => ({ id: `id-${i}`, ical_uid: u.ical_uid, module_id: u.module_id, title: u.title, starts_at: u.starts_at, ends_at: u.ends_at, location: u.location, status: u.status }));
    const second = planSync({ events, existing, modules, fallbackModuleId: "adm", semester, now });
    expect(second.upserts).toHaveLength(1);
    expect(second.upserts[0]).toMatchObject({ ical_uid: "cancelled-1@test", module_id: "adm" });
  });

  it("does not touch a module the user assigned by hand", () => {
    const first = planSync({ events, existing: [], modules, fallbackModuleId: "adm", semester, now });
    const existing = first.upserts.map((u, i) => ({ id: `id-${i}`, ical_uid: u.ical_uid, module_id: u.ical_uid === "cancelled-1@test" ? "sys" : u.module_id, title: u.title, starts_at: u.starts_at, ends_at: u.ends_at, location: u.location, status: u.status }));
    const second = planSync({ events, existing, modules, fallbackModuleId: "adm", semester, now });
    expect(second.upserts).toEqual([]);
  });
});
