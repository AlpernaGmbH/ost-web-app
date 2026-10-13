# Übungen aus Unterlagen (KI): Einrichtung in drei Schritten

## 1. Datenbank

Im Supabase-SQL-Editor (https://supabase.com/dashboard/project/sihjlrtggbfdyvpubcid/sql/new) den Inhalt von
`supabase/migrations/006_ai_runs.sql` einfügen und ausführen («Run»). Bei der Warnung «Run and enable RLS» wählen.
Die Migration ist idempotent, ein zweiter Lauf schadet nicht.

## 2. API-Schlüssel

1. Auf https://platform.claude.com ein Konto anlegen (getrennt vom Claude-Abo), Guthaben laden (z. B. 10 USD).
2. Unter *API Keys* einen Schlüssel erstellen.
3. In Vercel: Projekt `ost-web-app` → *Settings* → *Environment Variables* → `ANTHROPIC_API_KEY` = der Schlüssel, Umgebung *Production*.
4. Optional, gleiche Stelle: `AI_MONTHLY_CAP_USD` (Limit für die ganze App, Standard 10) und `AI_USER_MONTHLY_CAP_USD` (Limit pro Konto, Standard 5).
5. *Deployments* → neustes Deployment → *Redeploy*, damit die Variablen wirken.

## 3. Benutzen

Modul öffnen → Tab *Übungen* → «Aus Unterlagen erzeugen» → PDFs wählen (Übungsblatt und Lösung zusammen) → «Entwürfe erzeugen».
Die Seite prüft alle 20 Sekunden nach; die Entwürfe erscheinen unter «Entwürfe prüfen». Dort einzeln, pro Durchlauf oder alle übernehmen.
Verbrauch des Monats: *Einstellungen* → «Übungen aus Unterlagen (KI)».

## Was die Kosten bestimmt

Abgerechnet wird pro Token (Batch-Preise des Modells `claude-opus-5-5`: 2 USD pro Million Eingabe-Tokens, 10 USD pro Million Ausgabe-Tokens).
Vor jedem Durchlauf zählt die App die Eingabe exakt und reserviert die maximale Ausgabe; die Reservation wird nach dem Durchlauf durch die
tatsächlichen Kosten ersetzt. Richtwerte: Übungsblatt mit Lösung (10–25 Seiten) etwa 0.10–0.30 USD, Skript mit 100 Seiten etwa 0.50–1.00 USD.
