import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage } from "@/components/legal-page";
import { CONTACT_EMAIL, OPERATOR, PRICE_LABEL, PRODUCT_NAME } from "@/lib/site";

export const metadata: Metadata = { title: "Impressum" };

export default function ImprintPage() {
  return (
    <LegalPage title="Impressum">
      <h2>Betrieb und Verantwortung</h2>
      <p>
        {OPERATOR.name}
        <br />
        {OPERATOR.street}
        <br />
        {OPERATOR.city}
        <br />
        {OPERATOR.country}
      </p>
      <p>
        E-Mail: <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>
      </p>

      <h2>Stand des Angebots</h2>
      <p>
        {PRODUCT_NAME} befindet sich in einer geschlossenen Beta und wird laufend verändert. Während der Beta ist die Nutzung kostenlos. Nach
        Ende der Beta kostet {PRODUCT_NAME} {PRICE_LABEL}, monatlich kündbar; wer die App nutzt, wird vor dem Ende der Beta und vor dem Start der
        kostenpflichtigen Nutzung informiert. Es gibt keine Selbstregistrierung. Funktionen können jederzeit geändert, eingeschränkt oder
        eingestellt werden.
      </p>

      <h2>Zugang</h2>
      <p>
        Weil die Inhalte in {PRODUCT_NAME} nicht öffentlich zugänglich sind, wird jede Zugangsanfrage einzeln geprüft. Es besteht kein Anspruch
        auf ein Konto. Ein Konto kann ohne Angabe von Gründen abgelehnt, eingeschränkt oder beendet werden, insbesondere bei Missbrauch oder bei
        Verstössen gegen Rechte Dritter.
      </p>

      <h2>Haftungsausschluss</h2>
      <p>
        {PRODUCT_NAME} wird im Rahmen der Beta ohne Gewähr zur Verfügung gestellt. Es besteht keine Zusicherung für Verfügbarkeit, Fehlerfreiheit,
        Vollständigkeit oder Aktualität der Website, der App und ihrer Inhalte. Von der KI erzeugte Entwürfe können Fehler enthalten; sie sind
        Vorschläge, die du vor der Verwendung prüfst. Für Lernerfolg, Prüfungsergebnisse oder Entscheidungen, die du auf Grundlage der App
        triffst, wird keine Verantwortung übernommen.
      </p>
      <p>
        Haftungsansprüche wegen Schäden materieller oder immaterieller Art, die aus dem Zugriff auf oder der Nutzung oder Nichtnutzung der Website
        und der App, aus Datenverlust, Unterbrüchen oder aus fehlerhaften Inhalten entstehen, sind ausgeschlossen, soweit gesetzlich zulässig.
        Sichere wichtige Inhalte zusätzlich selbst. Für Inhalte verlinkter Seiten Dritter sind deren Betreiber verantwortlich.
      </p>

      <h2>Hochgeladene Inhalte</h2>
      <p>
        Material, das du in dein Konto lädst, bleibt in deinem Konto und wird von {PRODUCT_NAME} nicht veröffentlicht. Du bist allein dafür
        verantwortlich, dass du dieses Material besitzen und auf diese Weise nutzen darfst, und stellst {OPERATOR.name} von Ansprüchen Dritter frei,
        die aus deinen Inhalten entstehen. Inhalte, die Rechte Dritter oder Gesetze verletzen, können ohne Vorankündigung entfernt werden.
        Einzelheiten zur Bearbeitung stehen in der <Link href="/datenschutz">Datenschutzerklärung</Link>.
      </p>

      <h2>Urheberrecht</h2>
      <p>Texte, Gestaltung und Code dieser Website und der App gehören {OPERATOR.name}, soweit nicht anders gekennzeichnet.</p>

      <h2>Anwendbares Recht</h2>
      <p>Es gilt Schweizer Recht. Gerichtsstand ist, soweit gesetzlich zulässig, der Wohnsitz des Betreibers.</p>
    </LegalPage>
  );
}
