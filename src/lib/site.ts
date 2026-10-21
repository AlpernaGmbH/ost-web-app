/** Public-facing identity of the app: the only place the public pages take their name and contact data from. */
export const PRODUCT_NAME = "Pensum";

// TODO: replace with the real contact address before the beta opens.
export const CONTACT_EMAIL = "kontakt@example.ch";

/** Operator named in the Impressum and the privacy policy (a private person during the closed beta). */
export const OPERATOR = {
  name: "Leander Züst",
  street: "Röhrenbrugg 7",
  city: "9042 Speicher",
  country: "Schweiz",
} as const;

/** Where the operator's providers process data; shown in the privacy policy. TODO: check in the Supabase and Vercel dashboards. */
export const PROCESSING_REGIONS = {
  supabase: "[TODO Region des Supabase-Projekts, z. B. EU (Frankfurt)]",
  vercel: "[TODO Region der Vercel-Funktionen, z. B. Washington D.C. (USA)]",
} as const;

/** Date of the last change to the legal pages (ISO). */
export const LEGAL_UPDATED = "2026-10-21";
