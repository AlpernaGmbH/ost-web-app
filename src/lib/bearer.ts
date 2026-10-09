import { timingSafeEqual } from "node:crypto";

/** True when `header` is exactly "Bearer <secret>". A missing or empty secret never authorizes anything. */
export function bearerMatches(header: string | null, secret: string | undefined): boolean {
  if (!secret) return false;
  const expected = `Bearer ${secret}`;
  const given = header ?? "";
  return given.length === expected.length && timingSafeEqual(Buffer.from(given), Buffer.from(expected));
}
