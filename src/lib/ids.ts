import { notFound } from "next/navigation";
import { z } from "zod";

const uuid = z.string().uuid();

/** Route params come from the URL: reject anything that is not a UUID before it reaches Postgres. */
export function parseUuidOrNotFound(value: string): string {
  const parsed = uuid.safeParse(value);
  if (!parsed.success) notFound();
  return parsed.data;
}
