import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage } from "@/components/legal-page";
import { CONTACT_EMAIL, OPERATOR, PRODUCT_NAME } from "@/lib/site";

export const metadata: Metadata = { title: "Impressum" };

export default function ImprintPage() {
  return (
    <LegalPage title="Impressum">
      <h2>Betreiberin</h2>
      <p>
        {OPERATOR.name}
        <br />
        {OPERATOR.street}
        <br />
        {OPERATOR.city}
        <br />
        {OPERATOR.country}
      </p>
      <p>Unternehmens-Identifikationsnummer: {OPERATOR.uid}</p>

      <h2>Kontakt</h2>
      <p>
        E-Mail: <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>
      </p>

      <h2>Verantwortlich für den Inhalt</h2>
      <p>
        {OPERATOR.responsible}, {OPERATOR.name}
      </p>

      <h2>Stand des Angebots</h2>
      <p>
        {PRODUCT_NAME} befindet sich in einer geschlossenen Beta. Konten werden auf Anfrage eingerichtet; es gibt keine Selbstregistrierung und keine
        kostenpflichtigen Angebote.
      </p>

      <h2>Haftung</h2>
      <p>
        Die Inhalte dieser Website wurden sorgfältig erstellt. {OPERATOR.name} übernimmt keine Gewähr für Richtigkeit, Vollständigkeit und Aktualität.
        Haftungsansprüche wegen Schäden materieller oder immaterieller Art, die aus dem Zugriff auf oder der Nutzung der Website und der App entstehen,
        sind ausgeschlossen, soweit gesetzlich zulässig. Für Inhalte verlinkter Seiten Dritter sind deren Betreiber verantwortlich.
      </p>

      <h2>Urheberrecht</h2>
      <p>
        Texte, Gestaltung und Code dieser Website und der App gehören {OPERATOR.name}. Material, das du in dein Konto lädst, bleibt bei dir, ist nur
        für dich sichtbar und wird von {PRODUCT_NAME} nicht veröffentlicht. Du bist dafür verantwortlich, dass du es nutzen darfst. Einzelheiten zur
        Bearbeitung stehen in der <Link href="/datenschutz">Datenschutzerklärung</Link>.
      </p>
    </LegalPage>
  );
}
