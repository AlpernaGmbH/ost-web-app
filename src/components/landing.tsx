import { BookOpen, LockKeyhole, Mail, PenLine, Upload } from "lucide-react";
import Link from "next/link";
import { Brand } from "@/components/brand";
import { buttonClass, Card } from "@/components/ui";
import { CONTACT_EMAIL, PRODUCT_NAME } from "@/lib/site";

// Only features the app really has: document upload with AI exercise drafts, exercises with
// self-assessment, the vocabulary trainer, tasks and the iCal timetable.
const BENEFITS = [
  {
    Icon: Upload,
    title: "Eigenes Material importieren",
    text: "Lade PDFs, Folien und Skripte pro Fach hoch. Auf Wunsch macht die KI daraus Übungsentwürfe, die du prüfst und freigibst.",
  },
  {
    Icon: PenLine,
    title: "Aufgaben lösen",
    text: "Übungen nach Thema, Hilfsmittel und Dauer filtern, lösen, Lösung aufdecken und selbst bewerten. Du siehst, was sitzt und was nicht.",
  },
  {
    Icon: BookOpen,
    title: "Wörter lernen",
    text: "Vokabeln mit Bedeutung und Beispielsatz, abgefragt in wachsenden Abständen. Fällige Wörter liegen jeden Tag bereit.",
  },
];

const STEPS = [
  { title: "Fächer anlegen", text: "Semester und Module einrichten. Mit dem iCal-Link deiner Schule landet der Stundenplan automatisch im richtigen Fach." },
  { title: "Material hochladen", text: "Unterlagen pro Fach ablegen, Übungen und Wörter importieren oder von der KI vorschlagen lassen." },
  { title: "Täglich üben", text: "Das Dashboard zeigt, was heute ansteht: Vorlesungen, fällige Aufgaben, fällige Wörter und offene Übungen." },
];

const footerLink = "inline-flex min-h-11 items-center text-muted hover:text-foreground";

/** Marketing page for logged-out visitors; the proxy serves it at "/" and the app at "/" once logged in. */
export function Landing() {
  const mailto = `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(`Zugang zu ${PRODUCT_NAME}`)}`;
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="mx-auto flex w-full max-w-5xl items-center justify-between px-4 py-4 sm:px-6">
        <Brand />
        <Link href="/login" className={buttonClass("secondary", "", "sm")}>
          Anmelden
        </Link>
      </header>

      <main className="mx-auto w-full max-w-5xl flex-1 px-4 pb-16 sm:px-6">
        <section className="py-10 md:py-20">
          <p className="label text-primary-ink">Lern-App für dein Studium</p>
          <h1 className="display-lg mt-3 max-w-3xl md:text-[56px] md:leading-[60px]">Üben, bis es sitzt.</h1>
          <p className="body-lg mt-4 max-w-2xl text-muted">
            {PRODUCT_NAME} bringt Stundenplan, Unterlagen, Aufgaben, Übungen und Wortschatz pro Fach an einen Ort. Auf dem Handy und am Laptop.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link href="/login" className={buttonClass("primary")}>
              Anmelden
            </Link>
            <a href={mailto} className={buttonClass("secondary")}>
              <Mail aria-hidden className="size-5" strokeWidth={2.25} />
              Zugang anfragen
            </a>
          </div>
        </section>

        <section aria-labelledby="nutzen">
          <h2 id="nutzen" className="sr-only">
            Was du damit machst
          </h2>
          <div className="grid gap-4 md:grid-cols-3">
            {BENEFITS.map(({ Icon, title, text }) => (
              <Card key={title}>
                <span className="flex size-12 items-center justify-center rounded-pill bg-primary-soft text-on-primary-soft">
                  <Icon aria-hidden className="size-6" strokeWidth={2.25} />
                </span>
                <h3 className="heading mt-4">{title}</h3>
                <p className="mt-2 text-muted">{text}</p>
              </Card>
            ))}
          </div>
        </section>

        <section aria-labelledby="ablauf" className="py-12 md:py-20">
          <h2 id="ablauf" className="display-md">
            So funktioniert&rsquo;s
          </h2>
          <ol className="mt-6 grid gap-6 md:grid-cols-3">
            {STEPS.map((step, i) => (
              <li key={step.title} className="flex gap-4 md:flex-col">
                <span className="score flex size-12 shrink-0 items-center justify-center rounded-pill bg-primary text-primary-foreground">{i + 1}</span>
                <div>
                  <h3 className="heading">{step.title}</h3>
                  <p className="mt-1 text-muted">{step.text}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        <section aria-labelledby="beta">
          <Card className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <span className="flex size-12 shrink-0 items-center justify-center rounded-pill bg-accent-soft text-on-accent-soft">
              <LockKeyhole aria-hidden className="size-6" strokeWidth={2.25} />
            </span>
            <div className="min-w-0 flex-1">
              <h2 id="beta" className="heading">
                Aktuell geschlossene Beta
              </h2>
              <p className="mt-1 text-muted">Es gibt noch keine Selbstregistrierung. Zugang gibt es auf Anfrage per E-Mail.</p>
            </div>
            <a href={mailto} className={buttonClass("secondary", "shrink-0", "sm")}>
              Zugang anfragen
            </a>
          </Card>
        </section>
      </main>

      <footer className="border-t border-border">
        <div className="mx-auto flex w-full max-w-5xl flex-col gap-2 px-4 py-6 text-sm sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <span className="text-muted">&copy; {new Date().getFullYear()} {PRODUCT_NAME}</span>
          <nav aria-label="Rechtliches" className="flex gap-6">
            <Link href="/impressum" className={footerLink}>
              Impressum
            </Link>
            <Link href="/datenschutz" className={footerLink}>
              Datenschutz
            </Link>
            <Link href="/login" className={footerLink}>
              Anmelden
            </Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}
