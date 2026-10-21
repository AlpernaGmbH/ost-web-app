import type { Metadata } from "next";
import { LegalPage } from "@/components/legal-page";
import { CONTACT_EMAIL, OPERATOR, PROCESSING_REGIONS, PRODUCT_NAME } from "@/lib/site";

export const metadata: Metadata = { title: "Datenschutz" };

// Facts stay precise (they describe what the code does today); promises are worded as efforts, not guarantees:
// password login via Supabase, per-account rows and files, the daily iCal fetch, the AI extraction on request,
// Vercel request logs, no tracking.
export default function PrivacyPage() {
  const mail = <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>;
  return (
    <LegalPage title="Datenschutzerklärung">
      <p>
        Diese Erklärung beschreibt, welche Personendaten {PRODUCT_NAME} bearbeitet, wozu und mit welchen Dienstleistern. Massgebend ist das
        Schweizer Datenschutzgesetz (DSG); für Nutzerinnen und Nutzer in der EU gilt zusätzlich die DSGVO. Sie kann sich mit der App ändern;
        massgebend ist die jeweils hier veröffentlichte Fassung.
      </p>

      <h2>1. Verantwortliche Stelle</h2>
      <p>
        {OPERATOR.name}, {OPERATOR.street}, {OPERATOR.city}, {OPERATOR.country}. Für Datenschutzfragen: {mail}.
      </p>

      <h2>2. Welche Daten wir bearbeiten und wozu</h2>
      <h3>Zugangsanfrage und Prüfung</h3>
      <p>
        {PRODUCT_NAME} ist eine geschlossene Beta ohne Selbstregistrierung. Weil die Inhalte nicht öffentlich zugänglich sind, wird jede Anfrage
        einzeln geprüft. Dafür bearbeiten wir die Angaben aus deiner Anfrage (Name, Telefonnummer oder E-Mail-Adresse, dein Text) und entscheiden nach eigenem
        Ermessen, ob ein Konto eingerichtet wird. Die Anfrage bewahren wir auf, solange sie für die Prüfung und die Betreuung des Kontos nötig ist.
      </p>
      <h3>Konto und Anmeldung</h3>
      <p>
        Für dein Konto speichern wir deine E-Mail-Adresse und dein Passwort (nur als Hash) sowie Zeitpunkte deiner Anmeldungen. Zweck: Zugang zu
        deinem Konto und Schutz vor unberechtigtem Zugriff.
      </p>
      <h3>Inhalte deines Kontos</h3>
      <p>
        Alles, was du in {PRODUCT_NAME} anlegst oder hochlädst: Semester, Module, Stundenplan, Vorlesungen, Notizen, Dokumente, Aufgaben,
        Übungen und deine Übungsversuche, Wörter und dein Lernstand. Zweck: die Funktionen der App. Diese Inhalte sind deinem Konto zugeordnet;
        Zugriffsregeln in der Datenbank sollen sicherstellen, dass andere Nutzerinnen und Nutzer sie nicht sehen. Für Wartung und Fehlersuche
        kann der Betreiber im Einzelfall auf Daten zugreifen; das geschieht nur, soweit es für den Betrieb nötig ist.
      </p>
      <h3>Stundenplan-Import</h3>
      <p>
        Wenn du die iCal-Adresse deines Stundenplans hinterlegst, speichern wir sie und rufen sie regelmässig, in der Regel einmal täglich, auf
        unseren Servern ab, um deine Termine zu aktualisieren. Die Termine (Titel, Zeit, Ort) werden in deinem Konto gespeichert.
      </p>
      <h3>KI-Funktion</h3>
      <p>
        Nur wenn du es auslöst, werden die von dir ausgewählten Dokumente an Anthropic PBC (USA) übertragen, um daraus Übungsentwürfe zu erzeugen.
        Nach dem Durchlauf löschen wir die Dateien bei Anthropic; spätestens nach sieben Tagen verfallen sie dort von selbst. Wir speichern die
        Entwürfe, den Verbrauch und die Kosten des Laufs; pro Konto gilt eine monatliche Kostenobergrenze. Die Entwürfe sind Vorschläge ohne
        Gewähr, die du prüfst und freigibst oder verwirfst.
      </p>
      <h3>Technische Zugriffsdaten</h3>
      <p>
        Beim Aufruf der Website entstehen bei unserem Hosting-Anbieter Protokolldaten (IP-Adresse, Zeitpunkt, aufgerufene Adresse, Browser). Sie
        dienen dem sicheren Betrieb und der Fehlersuche. Wir setzen keine Analyse- oder Tracking-Dienste ein und zeigen keine Werbung.
      </p>
      <h3>Anfragen per WhatsApp oder E-Mail</h3>
      <p>
        Zugangsanfragen laufen über WhatsApp: Der Knopf «Zugang anfragen» öffnet einen Chat mit dem Betreiber. Dabei bearbeitet WhatsApp
        (WhatsApp Ireland Ltd., Teil von Meta) deine Telefonnummer, deine Nachricht und Verbindungsdaten nach seinen eigenen
        Datenschutzbestimmungen, auch ausserhalb der Schweiz; darauf haben wir keinen Einfluss. Wer WhatsApp nicht nutzen möchte, kann per E-Mail
        an {mail} anfragen. In beiden Fällen bearbeiten wir deine Angaben zur Beantwortung der Anfrage und bewahren die Korrespondenz dafür auf.
      </p>

      <h2>3. Cookies und lokaler Speicher</h2>
      <p>
        {PRODUCT_NAME} setzt ein Sitzungs-Cookie, das für die Anmeldung notwendig ist. Im lokalen Speicher deines Browsers liegen deine
        Darstellung (hell oder dunkel) und noch nicht gespeicherte Notizentwürfe. Cookies von Drittanbietern setzen wir nicht.
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
        Diese Anbieter bearbeiten Daten in unserem Auftrag nach ihren Datenschutzbedingungen. Soweit Daten in die USA oder andere Länder ohne
        gleichwertigen Datenschutz gelangen, stützen wir uns auf die vertraglichen Garantien der Anbieter, insbesondere Standardvertragsklauseln.
        Dienstleister können wechseln; diese Erklärung wird dann angepasst.
      </p>

      <h2>5. Aufbewahrung und Löschung</h2>
      <p>
        Wir bewahren deine Daten auf, solange dein Konto besteht oder es für den Betrieb nötig ist. Eine Selbstlöschung gibt es in der Beta noch
        nicht: Schreib an {mail}, dann löschen wir dein Konto mit seinen Inhalten und Dateien innert angemessener Frist. Sicherungskopien der
        Dienstleister werden nach deren Fristen überschrieben. Wird die Beta eingestellt, können Konten und Inhalte nach vorheriger Ankündigung
        gelöscht werden.
      </p>

      <h2>6. Deine Rechte</h2>
      <p>
        Du kannst Auskunft über deine Daten verlangen, sie berichtigen oder löschen lassen und ihre Herausgabe in einem gängigen Format verlangen,
        soweit das Gesetz das vorsieht. Wende dich dafür an {mail}. Du kannst dich zudem beim Eidgenössischen Datenschutz- und
        Öffentlichkeitsbeauftragten (EDÖB) beschweren.
      </p>

      <h2>7. Sicherheit</h2>
      <p>
        Wir treffen angemessene technische Massnahmen: verschlüsselte Übertragung (TLS), Zugriff auf Inhalte nur mit Anmeldung, Dateien in einem
        privaten Speicher mit kurzlebigen, signierten Links und Zugriffsregeln in der Datenbank. Absolute Sicherheit gibt es nicht; wähle ein
        starkes Passwort und gib es nicht weiter.
      </p>

      <h2>8. Änderungen</h2>
      <p>Wir passen diese Erklärung an, wenn sich die App, die Dienstleister oder die Rechtslage ändern. Das Datum der letzten Änderung steht oben.</p>
    </LegalPage>
  );
}
