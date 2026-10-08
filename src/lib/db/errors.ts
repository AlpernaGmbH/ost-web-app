export type DbErrorLike = { code?: string; message?: string };

/** True when PostgREST cannot find a table: the migration has not been applied to this project. */
export function isMissingTable(error: DbErrorLike | null | undefined): boolean {
  return Boolean(error && (error.code === "PGRST205" || error.code === "42P01" || /schema cache|does not exist/i.test(error.message ?? "")));
}

export function describeDbError(error: DbErrorLike): string {
  if (isMissingTable(error)) {
    return "Die Datenbank-Tabellen fehlen. Im Supabase-SQL-Editor supabase/migrations/001_phase1.sql ausführen, danach hier nochmals versuchen.";
  }
  if (error.code === "42501" || /row-level security/i.test(error.message ?? "")) {
    return "Keine Berechtigung (Row Level Security). Bist du mit dem richtigen Konto angemeldet?";
  }
  return `Datenbankfehler${error.code ? ` (${error.code})` : ""}: ${error.message ?? "unbekannt"}`;
}
