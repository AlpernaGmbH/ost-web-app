import { describe, expect, it } from "vitest";
import { normalizeFeedUrl } from "./feed-url";

describe("normalizeFeedUrl", () => {
  it("accepts https and converts webcal", () => {
    expect(normalizeFeedUrl("https://example.org/cal.ics?token=abc")).toBe("https://example.org/cal.ics?token=abc");
    expect(normalizeFeedUrl("  webcal://example.org/cal.ics ")).toBe("https://example.org/cal.ics");
  });

  it("rejects plain http, junk, localhost and IP literals", () => {
    for (const bad of ["http://example.org/a.ics", "not a url", "https://localhost/a.ics", "https://127.0.0.1/a.ics", "https://169.254.169.254/latest", "https://[::1]/a.ics", "https://db.internal/a.ics", "ftp://example.org/a.ics"]) {
      expect(() => normalizeFeedUrl(bad), bad).toThrow();
    }
  });
});
