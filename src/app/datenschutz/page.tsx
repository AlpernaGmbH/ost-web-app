import type { Metadata } from "next";
import { LegalPage } from "@/components/legal-page";
import { CONTACT_EMAIL, OPERATOR, PROCESSING_REGIONS, PRODUCT_NAME } from "@/lib/site";

export const metadata: Metadata = { title: "Datenschutz" };

// Every statement here describes what the code does today: password login via Supabase, per-account
// rows and files, the daily iCal fetch, the AI extraction on request, Vercel request logs, no tracking.
export default function PrivacyPage() {
  const mail = <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>;
  return (
    <LegalPage title="Datenschutzerklärung">
      <p>
        Diese Erklärung beschreibt, welche Personendaten {PRODUCT_NAME} bearbeitet, wozu und mit welchen Dienstleistern. Massgebend ist das
        Schweizer Datenschutzgesetz (DSG); für Nutzerinnen und Nutzer in der EU gilt zusätzlich die DSGVO.
      </p>

      <h2>1. Verantwortliche Stelle</h2>
      <p>
        {OPERATOR.name}, {OPERATOR.street}, {OPERATOR.city}, {OPERATOR.country}. Ansprechperson für Datenschutzfragen: {OPERATOR.responsible},{" "}
        {mail}.
      </p>

      <h2>2. Welche Daten wir bearbeiten und wozu</h2>
      <h3>Konto und Anmeldung</h3>
      <p>
        Für dein Konto speichern wir deine E-Mail-Adresse und dein Passwort (nur als Hash) sowie den Zeitpunkt deiner Anmeldungen. Es gibt keine
        Selbstregistrierung: Ein Konto wird auf deine Anfrage hin eingerichtet. Zweck: Zugang zu deinem Konto und Schutz vor unberechtigtem Zugriff.
      </p>
      <h3>Inhalte deines Kontos</h3>
      <p>
        Alles, was du in {PRODUCT_NAME} anlegst oder hochlädst: Semester, Module, Stundenplan, Vorlesungen, Notizen, Dokumente, Aufgaben, Übungen und
        deine Übungsversuche, Wörter und dein Lernstand. Zweck: die Funktionen der App. Diese Inhalte sind nur für dich sichtbar; Datenbankregeln
        beschränken jeden Zugriff auf das eigene Konto.
      </p>
      <h3>Stundenplan-Import</h3>
      <p>
        Wenn du die iCal-Adresse deines Stundenplans hinterlegst, speichern wir sie und rufen sie einmal täglich auf unseren Servern ab, um deine
        Termine zu aktualisieren. Die Termine (Titel, Zeit, Ort) werden in deinem Konto gespeichert.
      </p>
      <h3>KI-Funktion</h3>
      <p>
        Nur wenn du es auslöst, werden die von dir ausgewählten Dokumente an Anthropic PBC (USA) übertragen, um daraus Übungsentwürfe zu erzeugen.
        Nach Abschluss werden die Dateien bei Anthropic wieder gelöscht. Wir speichern die Entwürfe, den Verbrauch und die Kosten des Laufs; pro Konto
        gilt eine monatliche Kostenobergrenze.
      </p>
      <h3>Technische Zugriffsdaten</h3>
      <p>
        Beim Aufruf der Website entstehen bei unserem Hosting-Anbieter Protokolldaten (IP-Adresse, Zeitpunkt, aufgerufene Adresse, Browser). Sie
        dienen dem sicheren Betrieb und der Fehlersuche. Wir setzen keine Analyse- oder Tracking-Dienste ein und zeigen keine Werbung.
      </p>
      <h3>Anfragen per E-Mail</h3>
      <p>Schreibst du uns, bearbeiten wir deine Angaben zur Beantwortung der Anfrage und bewahren die Korrespondenz dafür auf.</p>

      <h2>3. Cookies und lokaler Speicher</h2>
      <p>
        {PRODUCT_NAME} setzt ein Sitzungs-Cookie, das für die Anmeldung notwendig ist. Im lokalen Speicher deines Browsers liegen deine Darstellung
        (hell oder dunkel) und noch nicht gespeicherte Notizentwürfe. Es gibt keine Cookies von Drittanbietern.
      </p>

      <h2>4. Dienstleister und Datenübermittlung ins Ausland</h2>
      <ul>
        <li>
          <strong>Vercel Inc.</strong> (USA): Hosting der Website und der App. Region der Verarbeitung: {PROCESSING_REGIONS.vercel}.
        </li>
        <li>
          <strong>Supabase Inc.</strong> (USA): Datenbank, Anmeldung und Dateispeicher. Region der Verarbeitung: {PROCESSING_REGIONS.supabase}.
        </li>
        <li>
          <strong>Anthropic PBC</strong> (USA): KI-Auswertung von Dokumenten, nur wenn du die Funktion nutzt.
        </li>
      </ul>
      <p>
        Diese Anbieter bearbeiten Daten in unserem Auftrag und sind vertraglich zum Datenschutz verpflichtet. Soweit Daten in die USA gelangen,
        stützen wir uns auf die Standardvertragsklauseln der Anbieter.
      </p>

      <h2>5. Aufbewahrung und Löschung</h2>
      <p>
        Wir bewahren deine Daten auf, solange dein Konto besteht. Eine Selbstlöschung gibt es in der Beta noch nicht: Schreib an {mail}, dann löschen wir
        dein Konto mit allen Inhalten und Dateien. Sicherungskopien der Dienstleister werden nach deren Fristen überschrieben.
      </p>

      <h2>6. Deine Rechte</h2>
      <p>
        Du kannst Auskunft über deine Daten verlangen, sie berichtigen oder löschen lassen und ihre Herausgabe in einem gängigen Format verlangen.
        Wende dich dafür an {mail}. Du kannst dich zudem beim Eidgenössischen Datenschutz- und Öffentlichkeitsbeauftragten (EDÖB) beschweren.
      </p>

      <h2>7. Sicherheit</h2>
      <p>
        Die Übertragung ist verschlüsselt (TLS). Der Zugriff auf Inhalte ist nur mit Anmeldung möglich, Dateien liegen in einem privaten Speicher
        und werden über kurzlebige, signierte Links ausgeliefert. Datenbankregeln stellen sicher, dass jedes Konto nur die eigenen Daten sieht.
      </p>

      <h2>8. Änderungen</h2>
      <p>Wir passen diese Erklärung an, wenn sich die App oder die Rechtslage ändert. Das Datum der letzten Änderung steht oben auf dieser Seite.</p>
    </LegalPage>
  );
}
