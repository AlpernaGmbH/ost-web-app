import { describe, expect, it } from "vitest";
import { describeDbError, isMissingTable } from "./errors";

describe("db errors", () => {
  it("recognises a missing table from PostgREST and Postgres", () => {
    expect(isMissingTable({ code: "PGRST205", message: "Could not find the table 'public.semesters' in the schema cache" })).toBe(true);
    expect(isMissingTable({ code: "42P01", message: 'relation "semesters" does not exist' })).toBe(true);
    expect(isMissingTable({ message: "permission denied" })).toBe(false);
    expect(isMissingTable(null)).toBe(false);
  });

  it("names the migration file that creates the missing table", () => {
    expect(describeDbError({ code: "PGRST205", message: "Could not find the table 'public.semesters' in the schema cache" })).toMatch(/001_phase1\.sql/);
    expect(describeDbError({ code: "PGRST205", message: "Could not find the table 'public.decks' in the schema cache" })).toMatch(/002_vocab\.sql/);
    expect(describeDbError({ code: "42P01", message: 'relation "cards" does not exist' })).toMatch(/002_vocab\.sql/);
    expect(describeDbError({ code: "PGRST205" })).toMatch(/001_phase1\.sql/); // unknown table: first migration
    expect(describeDbError({ code: "PGRST205" })).toMatch(/^Eine Datenbank-Tabelle fehlt/);
    expect(describeDbError({ code: "PGRST205", message: "Could not find the table 'public.tasks' in the schema cache" })).toMatch(/007_tasks\.sql/);
  });

  it("names the migration that adds a missing column, even though Postgres says 'does not exist' there too", () => {
    expect(describeDbError({ code: "42703", message: "column exercises.status does not exist" })).toMatch(/Spalte „status“.*006_ai_runs\.sql/);
    expect(describeDbError({ code: "42703", message: 'column "ai_run_id" does not exist' })).toMatch(/006_ai_runs\.sql/);
  });

  it("explains RLS rejections and passes other errors through with their code", () => {
    expect(describeDbError({ code: "42501", message: "new row violates row-level security policy" })).toMatch(/Berechtigung/);
    expect(describeDbError({ code: "23505", message: "duplicate key" })).toBe("Datenbankfehler (23505): duplicate key");
  });
});
