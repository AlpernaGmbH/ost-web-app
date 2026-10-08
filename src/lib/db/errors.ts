export type DbErrorLike = { code?: string; message?: string };

/** True when PostgREST cannot find a table: the migration has not been applied to this project. */
export function isMissingTable(error: DbErrorLike | null | undefined): boolean {
  return Boolean(error && (error.code === "PGRST205" || error.code === "42P01" || /schema cache|does not exist/i.test(error.message ?? "")));
}

// Which migration creates which table, so the message names the file that is actually missing.
const MIGRATION_OF_TABLE: Record<string, string> = {
  semesters: "001_phase1.sql",
  modules: "001_phase1.sql",
  lectures: "001_phase1.sql",
  notes: "001_phase1.sql",
  documents: "001_phase1.sql",
  decks: "002_vocab.sql",
  cards: "002_vocab.sql",
  card_reviews: "002_vocab.sql",
};

export function describeDbError(error: DbErrorLike): string {
  if (isMissingTable(error)) {
    const table = /(?:public\.|relation ")"?(\w+)/.exec(error.message ?? "")?.[1];
    const file = (table && MIGRATION_OF_TABLE[table]) ?? "001_phase1.sql";
    return `Die Datenbank-Tabelle${table ? ` „${table}“` : "n"} fehlt. Im Supabase-SQL-Editor supabase/migrations/${file} ausführen, danach hier nochmals versuchen.`;
  }
  if (error.code === "42501" || /row-level security/i.test(error.message ?? "")) {
    return "Keine Berechtigung (Row Level Security). Bist du mit dem richtigen Konto angemeldet?";
  }
  return `Datenbankfehler${error.code ? ` (${error.code})` : ""}: ${error.message ?? "unbekannt"}`;
}
