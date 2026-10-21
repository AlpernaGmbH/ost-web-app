// Every word of the public landing page. Only claims the code backs up: see the comments next to each block.
// Audience: students of the OST – Ostschweizer Fachhochschule, and nobody else. Never "offiziell", never OST
// material as an offer, no module names unless the founder provides them ([TODO] below).
import { INDEPENDENCE_NOTE, PROCESSING_REGIONS, PRODUCT_NAME } from "@/lib/site";

export const SCHOOL = "OST";
export const SCHOOL_FULL = "OST – Ostschweizer Fachhochschule";

/* ---------------------------------------------------------------- price (CHF, one place) */

export const PRICE_CHF_PER_MONTH = 12;
/** Price in running text, everywhere the same wording. */
export const PRICE_LABEL = `CHF ${PRICE_CHF_PER_MONTH} pro Monat`;
/** Big figure on the price card; "pro Monat" is rendered underneath. */
export const PRICE_BIG = `CHF ${PRICE_CHF_PER_MONTH}.–`;
// Rendered on the page only once it no longer starts with "[TODO": until then the open point stays in the code.
export const PRICE_NOTE = "[TODO: bestätigen, ob inkl. MWST, ob monatlich kündbar, ob die Beta gratis ist]";
export const priceNoteVisible = !PRICE_NOTE.startsWith("[TODO");

/**
 * Things from campus life that cost about CHF 12 and that many students buy without thinking. No brands,
 * always "etwa" or "ungefähr", nobody is mocked, nothing is promised about grades. The first entry is used
 * in the hero, the second in the closing call to action, all of them rotate in the price section.
 */
export const COMPARISONS: { item: string; line: string }[] = [
  { item: "ein Mittagessen in der Mensa", line: "Ein Monat Pensum kostet etwa so viel wie ein Mittagessen in der Mensa. Nur hält es länger als bis zur Nachmittagsvorlesung." },
  { item: "eine Woche Kaffee aus dem Automaten", line: "Ein Monat Pensum kostet ungefähr so viel wie eine Woche Kaffee aus dem Automaten. Der Stoff bleibt länger als das Koffein." },
  { item: "zweimal Znüni vom Kiosk", line: "Ein Monat Pensum kostet etwa so viel wie zweimal Znüni vom Kiosk. Dafür reicht es bis zur Prüfungswoche." },
  { item: "Kaffee und Gipfeli im Zug, hin und zurück", line: "Ein Monat Pensum kostet ungefähr so viel wie Kaffee und Gipfeli im Zug, hin und zurück. Nur ohne Verspätung." },
  { item: "drei Energydrinks in der Prüfungswoche", line: "Ein Monat Pensum kostet etwa so viel wie drei Energydrinks in der Prüfungswoche. Hält länger als bis zum Mittag." },
  { item: "ein Sandwich mit Getränk vor dem Abendunterricht", line: "Ein Monat Pensum kostet ungefähr so viel wie ein Sandwich mit Getränk vor dem Abendunterricht. Macht nicht satt, ist dafür einen Monat lang nützlich." },
  { item: "ein Frühstück im Café vor der ersten Vorlesung", line: "Ein Monat Pensum kostet etwa so viel wie ein Frühstück im Café vor der ersten Vorlesung. Dafür gibt es ihn jeden Tag." },
  { item: "ein Streaming-Abo", line: "Ein Monat Pensum kostet ungefähr so viel wie ein Streaming-Abo. Nur schaust du nicht zu, sondern übst." },
];

export const PRICING = {
  eyebrow: "Preis",
  /** read by screen readers and shown without JavaScript or with reduced motion: the first comparison */
  staticLine: COMPARISONS[0].line,
  perMonth: "pro Monat",
  // every entry exists in the code: iCal sync, documents, AI drafts with acceptance, exercises with self-assessment, vocab SRS, tasks and dashboard
  features: [
    `Stundenplan per iCal-Link der ${SCHOOL}, automatisch pro Modul`,
    "Eigene Unterlagen pro Modul hochladen",
    "KI-Übungsentwürfe, die du prüfst und freigibst",
    "Übungen mit Timer, Lösung und Selbstbewertung",
    "Vokabeltrainer mit Wiederholung in Abständen",
    "Aufgaben, Termine und Dashboard",
  ],
  button: "Zugang anfragen",
} as const;

/* ---------------------------------------------------------------- hero */

export const HERO = {
  eyebrow: `Von einem ${SCHOOL}-Studenten für ${SCHOOL}-Studierende`,
  // Chosen: keeps the claim the app already carries (login page, title) and adds the audience.
  // Alternative 1: title "Dein OST-Semester, an einem Ort." / lead "Stundenplan, Module, Unterlagen und Übungen: alles für den Studienalltag an der OST, auf dem Handy und am Laptop."
  // Alternative 2: title "Gebaut für deinen Stundenplan, deine Module, dein Semester." / lead "Die Lern-App von einem OST-Studenten für OST-Studierende. Eigenes Material rein, Übungen und Wortschatz raus."
  title: `Üben, bis es sitzt. Gebaut für die ${SCHOOL}.`,
  lead: `Stundenplan, Unterlagen, Übungen und Wortschatz für dein ${SCHOOL}-Semester an einem Ort. Auf dem Handy und am Laptop.`,
  login: "Anmelden",
  request: "Zugang anfragen",
  access: `Nur für Studierende der ${SCHOOL}. Zugang auf Anfrage per WhatsApp.`,
  mockupLabel: "Vorschau des Dashboards: heutige Vorlesungen, fällige Aufgaben und Übungsstand pro Modul, auf Laptop und Handy.",
} as const;

/** Small line under the hero lead: "Etwa so viel wie …: CHF 12 pro Monat." */
export const HERO_PRICE_LINE = `Etwa so viel wie ${COMPARISONS[0].item}: ${PRICE_LABEL}.`;

/* ---------------------------------------------------------------- tour */

export type TourId = "exercises" | "vocab" | "material" | "dashboard";

/** One block per core feature; the mockup of each lives in mockups.tsx under the same id. */
export const TOUR: { id: TourId; title: string; claim: string; text: string; mockupLabel: string }[] = [
  {
    // exercises-tab (filter topic/aid/state), exercise-runner (timer, solution, self-assessment), topicStats; aids vocabulary
    id: "exercises",
    title: "Aufgaben lösen",
    claim: "Übung für Übung, mit Timer, Lösung und deiner Einschätzung.",
    text: `Filtere nach Thema, Hilfsmittel und Stand, löse die Aufgabe, deck die Lösung auf und bewerte dich selbst. Hilfsmittel stehen dran wie an der ${SCHOOL}: Taschenrechner, Formelsammlung, Skript. Pensum merkt sich pro Thema, was sitzt und was nicht.`,
    mockupLabel: "Handy-Ansicht einer Übung mit Aufgabe, aufgedeckter Lösung und den Schaltflächen zur Selbstbewertung.",
  },
  {
    // vocab SRS (lib/vocab/srs.ts), modes cards/write/choice (study-session)
    id: "vocab",
    title: "Wörter lernen",
    claim: "Lernkarten, die wiederkommen, bevor du sie vergisst.",
    text: "Für dein Englischmodul: jedes Wort mit Bedeutung und Beispielsatz. Nach jeder Abfrage sagst du, wie leicht es war, und Pensum legt den nächsten Termin fest. Drei Modi: Karten, Schreiben, Auswahl.",
    mockupLabel: "Handy-Ansicht einer Lernkarte mit Wort, Bedeutung, Beispielsatz und den vier Bewertungen.",
  },
  {
    // upload-button, ai runs (PDF only), draft-review with accept/discard
    id: "material",
    title: "Eigenes Material und KI-Entwürfe",
    claim: "Aus deinen PDFs aus dem Unterricht werden Übungsentwürfe. Freigeben tust du.",
    text: "Lade deine eigenen Übungsblätter, Lösungen oder Skripte pro Modul hoch. Auf deinen Klick erstellt die KI daraus Entwürfe mit Aufgabe, Lösung und Thema. Du prüfst jeden Entwurf und nimmst ihn an oder verwirfst ihn.",
    mockupLabel: "Laptop-Ansicht der Entwurfsprüfung: drei KI-Entwürfe mit Thema und Dauer, Schaltflächen Annehmen und Verwerfen.",
  },
  {
    // dashboard (today, tasks due, words due), iCal sync with keyword matching, notes with KaTeX
    id: "dashboard",
    title: "Dashboard und Stundenplan",
    claim: "Ein Blick am Morgen: Was ist heute, was ist fällig.",
    text: `Mit dem iCal-Link deines ${SCHOOL}-Stundenplans landen Vorlesungen automatisch im richtigen Modul. Das Dashboard zeigt den heutigen Tag, Aufgaben der nächsten Tage und fällige Wörter. Dazu Notizen pro Vorlesung, auch mit Formeln.`,
    mockupLabel: "Handy-Ansicht des Stundenplans als Wochenansicht mit farbigen Blöcken pro Modul und der Heute-Karte.",
  },
];

/* ---------------------------------------------------------------- only for the OST */

export const FOCUS = {
  title: `Nur für die ${SCHOOL}, darum so`,
  // 1: iCal sync + keyword matching + semester weeks; 2: bootstrapSemester seeds semester and modules; 3: aids vocabulary, tasks with exam kind, dashboard
  items: [
    {
      title: `Stundenplan und Semester der ${SCHOOL}`,
      text: `Du hinterlegst den iCal-Link deines ${SCHOOL}-Stundenplans. Vorlesungen werden täglich abgeglichen, mit Raum und Zeit, und nach Semesterwochen ab deinem Semesterstart gezählt.`,
    },
    {
      title: `Module der ${SCHOOL}`,
      // TODO: Modulbeispiele ergänzen, sobald der Gründer sie nennt (keine erfundenen Kürzel)
      text: "Dein Semester kommt mit den Modulen deines Studiengangs eingerichtet; Vorlesungen werden anhand der Modulkürzel zugeordnet. Namen und Stichwörter passt du selbst an.",
    },
    {
      title: `Abläufe für ${SCHOOL}-Studierende`,
      text: "Übungen tragen die Hilfsmittel, wie du sie aus dem Unterricht kennst (Taschenrechner, Formelsammlung, Skript), Aufgaben kennen Prüfungstermine und Abgaben, und das Dashboard sortiert den Tag nach deinem Stundenplan.",
    },
  ],
} as const;

/* ---------------------------------------------------------------- founder */

export const FOUNDER = {
  title: "Wer dahintersteckt",
  // Only what the founder stated: OST, Betriebsökonomie, part-time, built for own daily study, now opening it to fellow students.
  paragraphs: [
    `Ich studiere Betriebsökonomie im Teilzeitstudium an der ${SCHOOL}. ${PRODUCT_NAME} habe ich für meinen eigenen Studienalltag gebaut: Stundenplan, Unterlagen, Übungen und Wörter an einem Ort, statt über fünf Apps verteilt.`,
    "Jetzt öffne ich die App für Kommilitoninnen und Kommilitonen. Eigenes Material rein, üben, bis es sitzt.",
  ],
  // Each of these is rendered only once it no longer starts with "[TODO" (nothing invented, nothing shown as placeholder).
  name: "Leander Züst",
  semester: "[TODO Semester, z. B. «3. Semester»]",
  // The founder's own words (only spelling and punctuation fixed).
  quote: "Moodle zu unübersichtlich, hunderte Bücher und KI nur teilweise hilfreich. Genau aus diesem Grund habe ich dieses Tool entwickelt und nutze es nun selbst täglich. Alles, was ich zum Lernen brauche, ist nun an einem Ort vereint.",
  photoAlt: "Leander Züst, Gründer von Pensum, in schwarzem T-Shirt vor heller Wand",
  note: INDEPENDENCE_NOTE,
} as const;

export const STEPS_TITLE = "So funktioniert’s";

/** semester.ts: start date, module names, iCal link are editable; modules themselves are seeded. */
export const STEPS = [
  { title: "Semester einrichten", text: `Startdatum deines ${SCHOOL}-Semesters setzen, Module benennen und den iCal-Link deines Stundenplans hinterlegen. Der Stundenplan füllt sich von selbst.` },
  { title: "Eigenes Material hochladen", text: "Deine Unterlagen aus dem Unterricht pro Modul ablegen, Übungen und Wörter importieren oder von der KI vorschlagen lassen." },
  { title: "Täglich üben", text: "Das Dashboard zeigt, was heute ansteht: Vorlesungen, fällige Aufgaben, fällige Wörter und offene Übungen." },
] as const;

export const PRIVACY = {
  title: "Deine Daten, deine Kontrolle",
  items: [
    // sign-ups are disabled; accounts are created by hand after review
    { title: "Konto nur auf Anfrage", text: `Es gibt keine Selbstregistrierung. Zugang nur für Studierende der ${SCHOOL}, auf Anfrage per WhatsApp; jede Anfrage wird einzeln geprüft.` },
    // RLS on every table, private storage bucket
    { title: "Deine Inhalte bleiben bei dir", text: "Unterlagen, Übungen, Notizen und Wörter gehören zu deinem Konto. Zugriffsregeln in der Datenbank beschränken den Zugriff darauf." },
    // ai runs: PDFs chosen by the user, provider files deleted after the run, drafts need acceptance
    { title: "KI nur auf deinen Klick", text: "Nur die PDFs, die du auswählst, gehen an Anthropic. Nach dem Durchlauf löschen wir sie dort. Entwürfe sind Vorschläge und werden erst zu Übungen, wenn du sie freigibst." },
    // no analytics, no ads, no third-party cookies (checked: no such packages in the code)
    { title: "Kein Tracking", text: `Keine Analyse-Dienste, keine Werbung, keine Cookies von Dritten. Deine Daten liegen bei Supabase, Region ${PROCESSING_REGIONS.supabase}.` },
  ],
  link: "Alle Details in der Datenschutzerklärung",
} as const;

export const FAQ_TITLE = "Fragen und Antworten";

export const FAQ = [
  {
    q: `Was ist ${PRODUCT_NAME}?`,
    a: `Eine Lern-App für Studierende der ${SCHOOL}: Stundenplan, eigene Unterlagen, Aufgaben, Übungen und Wortschatz pro Modul, auf dem Handy und am Laptop.`,
  },
  { q: "Wer kann mitmachen?", a: `Studierende der ${SCHOOL}. Zugang gibt es auf Anfrage per WhatsApp; jede Anfrage wird einzeln geprüft.` },
  {
    q: `Ist das offiziell von der ${SCHOOL}?`,
    a: `Nein. ${PRODUCT_NAME} ist ein unabhängiges Projekt eines ${SCHOOL}-Studenten und steht in keiner offiziellen Verbindung zur ${SCHOOL_FULL}.`,
  },
  { q: "Was kostet es?", a: `${PRICE_LABEL}.` },
  {
    q: "Wie komme ich an einen Zugang?",
    // "Zugang anfragen" opens WhatsApp with a prefilled message (WHATSAPP_REQUEST_TEXT in site.ts); accounts are created by hand
    a: `Tipp auf «Zugang anfragen»: Das öffnet WhatsApp mit einer vorbereiteten Nachricht. Ergänze in ein, zwei Sätzen, was du an der ${SCHOOL} studierst und wofür du ${PRODUCT_NAME} nutzen willst. Passt es, bekommst du ein Konto und deine Zugangsdaten. Eine Selbstregistrierung gibt es nicht.`,
  },
  {
    // RLS per account, private storage bucket, short-lived signed links; the operator can access data for maintenance (privacy policy)
    q: "Sind meine Unterlagen für andere sichtbar?",
    a: "Nein. Deine Unterlagen, Übungen und Notizen gehören zu deinem Konto; Zugriffsregeln in der Datenbank beschränken den Zugriff darauf, und Dateien liegen in einem privaten Speicher. Für Wartung kann der Betreiber im Einzelfall darauf zugreifen, mehr dazu in der Datenschutzerklärung.",
  },
  {
    // upload-button: 50 MB per file, ZIP unpacked in the browser; ai runs: PDF only, 5 documents, 32 MB
    q: "Welche Dateien kann ich hochladen?",
    a: "Dein eigenes Material: jede Datei bis 50 MB, pro Modul abgelegt; ZIP-Archive werden beim Hochladen entpackt. Die KI-Funktion verarbeitet PDF, bis fünf Dokumente und 32 MB pro Durchlauf.",
  },
] as const;

export const CTA = {
  title: "Aktuell geschlossene Beta",
  text: `Nur für Studierende der ${SCHOOL}. Zugang gibt es auf Anfrage per WhatsApp, eine Selbstregistrierung gibt es nicht.`,
  button: "Zugang anfragen",
  comparison: COMPARISONS[1].line,
} as const;

export const FOOTER = { imprint: "Impressum", privacy: "Datenschutz", login: "Anmelden", note: INDEPENDENCE_NOTE } as const;
