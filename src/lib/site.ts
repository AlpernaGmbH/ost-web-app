/** Public-facing identity of the app: the only place the public pages take their name and contact data from. */
export const PRODUCT_NAME = "Pensum";

/** Address in the Impressum and the privacy policy. Access requests go through WhatsApp instead (REQUEST_PATH). */
export const CONTACT_EMAIL = "leander.zuest@ost.ch";

/** Where "Zugang anfragen" links to: a redirect to WhatsApp (src/app/anfrage/route.ts). The number lives only in WHATSAPP_NUMBER. */
export const REQUEST_PATH = "/anfrage";

/** Shown in the footer and in the founder section of the landing page; the legal pages may quote it too. */
export const INDEPENDENCE_NOTE = `${PRODUCT_NAME} ist ein unabhängiges Projekt und steht in keiner offiziellen Verbindung zur OST – Ostschweizer Fachhochschule.`;

/** Operator named in the Impressum and the privacy policy (a private person during the closed beta). */
export const OPERATOR = {
  name: "Leander Züst",
  street: "Röhrenbrugg 7",
  city: "9042 Speicher",
  country: "Schweiz",
} as const;

/** Prefilled WhatsApp message behind "Zugang anfragen"; the student completes the two lines before sending. */
export const WHATSAPP_REQUEST_TEXT = `Hallo ${OPERATOR.name.split(" ")[0]}, ich studiere an der OST und möchte Zugang zu ${PRODUCT_NAME}.\nStudiengang: \nWofür ich ${PRODUCT_NAME} nutzen will: `;

/** Where the operator's providers process data; shown in the privacy policy. TODO: check in the Supabase and Vercel dashboards. */
export const PROCESSING_REGIONS = {
  supabase: "[TODO Region des Supabase-Projekts, z. B. EU (Frankfurt)]",
  vercel: "[TODO Region der Vercel-Funktionen, z. B. Washington D.C. (USA)]",
} as const;

/** Date of the last change to the legal pages (ISO). */
export const LEGAL_UPDATED = "2026-10-21";
