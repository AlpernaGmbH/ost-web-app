import { describe, expect, it } from "vitest";
import { bearerMatches } from "./bearer";

describe("bearerMatches", () => {
  it("accepts only the exact secret", () => {
    expect(bearerMatches("Bearer s3cret", "s3cret")).toBe(true);
    expect(bearerMatches("Bearer s3creT", "s3cret")).toBe(false);
    expect(bearerMatches("Bearer s3cret ", "s3cret")).toBe(false);
    expect(bearerMatches("s3cret", "s3cret")).toBe(false);
    expect(bearerMatches(null, "s3cret")).toBe(false);
  });

  it("never authorizes when no secret is configured", () => {
    expect(bearerMatches("Bearer ", undefined)).toBe(false);
    expect(bearerMatches("Bearer ", "")).toBe(false);
    expect(bearerMatches("", "")).toBe(false);
    expect(bearerMatches(null, undefined)).toBe(false);
  });
});
