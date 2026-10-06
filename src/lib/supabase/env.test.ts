import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { missingSupabaseEnv, supabaseEnv } from "./env";

const KEYS = ["NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "NEXT_PUBLIC_SUPABASE_ANON_KEY"] as const;
const saved: Partial<Record<(typeof KEYS)[number], string | undefined>> = {};

beforeEach(() => {
  for (const k of KEYS) {
    saved[k] = process.env[k];
    delete process.env[k];
  }
});
afterEach(() => {
  for (const k of KEYS) {
    if (saved[k] === undefined) delete process.env[k];
    else process.env[k] = saved[k];
  }
});

describe("supabase env", () => {
  it("reports both variables when nothing is set", () => {
    expect(missingSupabaseEnv()).toEqual(["NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"]);
    expect(() => supabaseEnv()).toThrow(/nicht konfiguriert/);
  });

  it("reports only the missing one", () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://x.supabase.co";
    expect(missingSupabaseEnv()).toEqual(["NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"]);
  });

  it("accepts the legacy anon key name", () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://x.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anon";
    expect(missingSupabaseEnv()).toEqual([]);
    expect(supabaseEnv()).toEqual({ url: "https://x.supabase.co", key: "anon" });
  });
});
