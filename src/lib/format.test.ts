import { describe, expect, it } from "vitest";
import { formatDateTime, formatDay, formatSize, formatTime, maskUrl } from "./format";

describe("format", () => {
  it("formats in Zurich time", () => {
    expect(formatDay("2026-10-07T08:15:00Z")).toBe("Mi 07.10.");
    expect(formatTime("2026-10-07T08:15:00Z")).toBe("10:15");
    expect(formatTime("2026-12-01T07:15:00Z")).toBe("08:15");
    expect(formatDateTime("2026-10-07T08:15:00Z")).toBe("Mi 07.10. 10:15");
  });

  it("rolls over to the next local day after 22:00 UTC", () => {
    expect(formatDay("2026-09-20T22:30:00Z")).toBe("Mo 21.09.");
  });

  it("formats file sizes", () => {
    expect(formatSize(512)).toBe("512 B");
    expect(formatSize(2048)).toBe("2 KB");
    expect(formatSize(5 * 1024 * 1024)).toBe("5.0 MB");
  });

  it("masks the feed token", () => {
    expect(maskUrl("https://stundenplan.example.ch/ical/abcdef123456")).toBe("stundenplan.example.ch/…3456");
    expect(maskUrl("kaputt")).toBe("…");
  });
});
