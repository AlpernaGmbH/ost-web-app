import { describe, expect, it } from "vitest";
import { describeDbError, isMissingTable } from "./errors";

describe("db errors", () => {
  it("recognises a missing table from PostgREST and Postgres", () => {
    expect(isMissingTable({ code: "PGRST205", message: "Could not find the table 'public.semesters' in the schema cache" })).toBe(true);
    expect(isMissingTable({ code: "42P01", message: 'relation "semesters" does not exist' })).toBe(true);
    expect(isMissingTable({ message: "permission denied" })).toBe(false);
    expect(isMissingTable(null)).toBe(false);
  });

  it("tells the user which file to run when tables are missing", () => {
    expect(describeDbError({ code: "PGRST205" })).toMatch(/001_phase1\.sql/);
  });

  it("explains RLS rejections and passes other errors through with their code", () => {
    expect(describeDbError({ code: "42501", message: "new row violates row-level security policy" })).toMatch(/Berechtigung/);
    expect(describeDbError({ code: "23505", message: "duplicate key" })).toBe("Datenbankfehler (23505): duplicate key");
  });
});
