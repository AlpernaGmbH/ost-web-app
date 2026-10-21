// Every word of the public landing page. Only claims the code backs up: see the comments next to each block.
import { PROCESSING_REGIONS, PRODUCT_NAME } from "@/lib/site";

export const HERO = {
  eyebrow: "Lern-App für dein Studium",
  title: "Üben, bis es sitzt.",
  lead: `${PRODUCT_NAME} bringt Stundenplan, Unterlagen, Aufgaben, Übungen und Wortschatz pro Fach an einen Ort. Auf dem Handy und am Laptop.`,
  login: "Anmelden",
  request: "Zugang anfragen",
  mockupLabel: "Vorschau des Dashboards: heutige Vorlesungen, fällige Aufgaben und Übungsstand pro Fach, auf Laptop und Handy.",
} as const;

export type TourId = "exercises" | "vocab" | "material" | "dashboard";

/** One block per core feature; the mockup of each lives in mockups.tsx under the same id. */
export const TOUR: { id: TourId; title: string; claim: string; text: string; mockupLabel: string }[] = [
  {
    // exercises-tab (filter topic/aid/state), exercise-runner (timer, solution, self-assessment), topicStats
    id: "exercises",
    title: "Aufgaben lösen",
    claim: "Übung für Übung, mit Timer, Lösung und deiner Einschätzung.",
    text: "Filtere nach Thema, Hilfsmittel und Stand, löse die Aufgabe, deck die Lösung auf und bewerte dich selbst. Pensum merkt sich pro Thema, was sitzt und was nicht.",
    mockupLabel: "Handy-Ansicht einer Übung mit Aufgabe, aufgedeckter Lösung und den Schaltflächen zur Selbstbewertung.",
  },
  {
    // vocab SRS (lib/vocab/srs.ts), modes cards/write/choice (study-session)
    id: "vocab",
    title: "Wörter lernen",
    claim: "Lernkarten, die wiederkommen, bevor du sie vergisst.",
    text: "Jedes Wort mit Bedeutung und Beispielsatz. Nach jeder Abfrage sagst du, wie leicht es war, und Pensum legt den nächsten Termin fest. Drei Modi: Karten, Schreiben, Auswahl.",
    mockupLabel: "Handy-Ansicht einer Lernkarte mit Wort, Bedeutung, Beispielsatz und den vier Bewertungen.",
  },
  {
    // upload-button, ai runs (PDF only), draft-review with accept/discard
    id: "material",
    title: "Material und KI-Entwürfe",
    claim: "Aus deinen PDFs werden Übungsentwürfe. Freigeben tust du.",
    text: "Lade Übungsblätter, Lösungen oder Skripte pro Fach hoch. Auf deinen Klick erstellt die KI daraus Entwürfe mit Aufgabe, Lösung und Thema. Du prüfst jeden Entwurf und nimmst ihn an oder verwirfst ihn.",
    mockupLabel: "Laptop-Ansicht der Entwurfsprüfung: drei KI-Entwürfe mit Thema und Dauer, Schaltflächen Annehmen und Verwerfen.",
  },
  {
    // dashboard (today, tasks due, words due), iCal sync with keyword matching, notes with KaTeX
    id: "dashboard",
    title: "Dashboard und Stundenplan",
    claim: "Ein Blick am Morgen: Was ist heute, was ist fällig.",
    text: "Mit dem iCal-Link deiner Schule landen Vorlesungen automatisch im richtigen Fach. Das Dashboard zeigt den heutigen Tag, Aufgaben der nächsten Tage und fällige Wörter. Dazu Notizen pro Vorlesung, auch mit Formeln.",
    mockupLabel: "Handy-Ansicht des Stundenplans als Wochenansicht mit farbigen Blöcken pro Fach und der Heute-Karte.",
  },
];

export const STEPS_TITLE = "So funktioniert’s";

/** semester.ts: start date, module names, iCal link are editable; modules themselves are seeded. */
export const STEPS = [
  { title: "Semester einrichten", text: "Startdatum setzen, Fächer benennen und den iCal-Link deiner Schule hinterlegen. Der Stundenplan füllt sich von selbst." },
  { title: "Material hochladen", text: "Unterlagen pro Fach ablegen, Übungen und Wörter importieren oder von der KI vorschlagen lassen." },
  { title: "Täglich üben", text: "Das Dashboard zeigt, was heute ansteht: Vorlesungen, fällige Aufgaben, fällige Wörter und offene Übungen." },
] as const;

export const PRIVACY = {
  title: "Deine Daten, deine Kontrolle",
  items: [
    // sign-ups are disabled; accounts are created by hand
    { title: "Konto nur auf Anfrage", text: "Es gibt keine Selbstregistrierung. Jede Anfrage wird einzeln geprüft, weil die Inhalte nicht öffentlich zugänglich sind." },
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
  { q: `Was ist ${PRODUCT_NAME}?`, a: "Eine Lern-App für dein Studium: Stundenplan, Unterlagen, Aufgaben, Übungen und Wortschatz pro Fach, auf dem Handy und am Laptop." },
  { q: "Für wen ist es gedacht?", a: "Für Studierende, die mit ihrem eigenen Kursmaterial lernen wollen und einen Ort für alles pro Fach suchen." },
  { q: "Was kostet es?", a: `Während der geschlossenen Beta ist ${PRODUCT_NAME} kostenlos. Preise folgen, sobald die Beta endet.` },
  {
    q: "Wie komme ich an einen Zugang?",
    a: "Schreib uns eine E-Mail mit ein, zwei Sätzen, wofür du Pensum nutzen willst. Jede Anfrage wird einzeln geprüft, weil die Inhalte nicht öffentlich zugänglich sind; passt es, bekommst du deine Zugangsdaten per Mail.",
  },
  {
    // upload-button: 50 MB per file, ZIP unpacked in the browser; ai runs: PDF only, 5 documents, 32 MB
    q: "Welche Dateien kann ich hochladen?",
    a: "Jede Datei bis 50 MB, pro Fach abgelegt; ZIP-Archive werden beim Hochladen entpackt. Die KI-Funktion verarbeitet PDF, bis fünf Dokumente und 32 MB pro Durchlauf.",
  },
  {
    q: "Wo liegen meine Daten?",
    a: `In deinem Konto bei unserem Datenbank-Anbieter Supabase, Region ${PROCESSING_REGIONS.supabase}. Die Website läuft bei Vercel. Details stehen in der Datenschutzerklärung.`,
  },
  {
    q: "Sieht die KI mein Material?",
    a: "Nur wenn du einen KI-Durchlauf startest, und nur die PDFs, die du dafür auswählst. Sie werden an Anthropic übertragen und nach dem Durchlauf dort gelöscht. Die Entwürfe prüfst du selbst.",
  },
] as const;

export const CTA = {
  title: "Aktuell geschlossene Beta",
  text: "Es gibt noch keine Selbstregistrierung. Zugang gibt es auf Anfrage per E-Mail.",
  button: "Zugang anfragen",
} as const;

export const FOOTER = { imprint: "Impressum", privacy: "Datenschutz", login: "Anmelden" } as const;
