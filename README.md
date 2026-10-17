# Pensum

Lern-Web-App für das BSc Betriebsökonomie (OST, HS26): Dashboard, Fächer mit Vorlesungen nach Woche, Notizen (Markdown + Formeln),
Dokumente, Stundenplan-Import per iCal, Aufgaben (Liste, Board, Kalender), Vokabeltrainer und Übungsbank.
Next.js (App Router) · Supabase (Auth, Postgres, Storage) · Vercel · PWA.

## Navigation

Auf dem Handy eine Leiste am unteren Rand, ab Tablet-Breite eine Spalte links, auf jeder Seite gleich:
**Dashboard** (`/`: heute, fällige Aufgaben, Üben, Fächer), **Fächer** (`/faecher`: ein Modul pro Karte), **Aufgaben** (`/aufgaben`),
**Stundenplan** (`/stundenplan`), **Üben** (`/ueben`) und **Einstellungen** (`/settings`, auf dem Handy über das Zahnrad im Dashboard).

## Einrichten

1. **Supabase-Projekt** anlegen (eigenes Projekt, nicht das Alperna-Tool mitbenutzen).
   - *Authentication → Providers → Email*: **„Allow new users to sign up" ausschalten** (Einzelnutzer; schützt später auch das API-Budget).
   - *Authentication → Users → Add user*: dein Konto mit E-Mail + Passwort anlegen (Auto-Confirm an).
2. **Schema** einspielen: Inhalt von `supabase/migrations/001_phase1.sql` im SQL-Editor ausführen (oder `supabase db push`).
3. **Env-Variablen** (`.env.local` lokal, *Project Settings → Environment Variables* in Vercel), Vorlage: `.env.example`
   - `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (Supabase → Project Settings → API)
   - `SUPABASE_SERVICE_ROLE_KEY` (nur Server, nur für den täglichen iCal-Cron)
   - `CRON_SECRET` (lange Zufallszeichenkette; Vercel sendet sie als `Authorization: Bearer …` an den Cron)
4. **Vercel**: Repo verbinden, Env-Variablen setzen (Production **und** Preview), deployen. `vercel.json` registriert den täglichen Import (05:00 UTC).
   - Ohne Env-Variablen baut die App trotzdem und zeigt eine Setup-Seite, die pro Variable anzeigt, ob sie gesetzt ist. Die `NEXT_PUBLIC_*`-Werte werden beim Build eingebacken: nach dem Setzen **neu deployen**.
   - *Settings → Deployment Protection → Vercel Authentication* auf „Only Preview Deployments" stellen, sonst verlangt auch die Production-URL einen Vercel-Login und die PWA auf dem Handy funktioniert nicht.
5. In der App: Startseite → „Semester HS26 einrichten", dann *Einstellungen* → iCal-Abo-Link speichern → „Jetzt synchronisieren".
   Nicht zugeordnete Termine landen in der Inbox; Stichwörter pro Modul sind in den Einstellungen editierbar.
6. Auf dem Handy: Seite öffnen → „Zum Home-Bildschirm" (iOS) bzw. „App installieren" (Android).

## Aufgaben

Eigene To-dos, Abgaben, Prüfungstermine und Lernvorhaben, unabhängig vom Stundenplan (`/aufgaben`, setzt `supabase/migrations/007_tasks.sql` voraus).
Jede Aufgabe hat Titel, optional ein Fach, Fälligkeit, Priorität (Hoch/Normal/Tief), Typ (Aufgabe/Abgabe/Prüfung/Lernen), Status (Offen/In Arbeit/Erledigt)
und Notizen. Drei Ansichten: **Liste** (nach Fälligkeit, überfällig rot markiert), **Board** (eine Spalte pro Status; erledigte der letzten Woche)
und **Kalender** (Monatsraster mit einem Punkt pro fälliger Aufgabe in der Fachfarbe, darunter der gewählte Tag). Filter nach Fach, «Erledigte anzeigen»,
Status direkt in der Zeile umstellen, Schnelleingabe am Ende jeder Ansicht (im Kalender mit dem gewählten Tag als Fälligkeit). Das Dashboard zeigt, was
überfällig ist oder in den nächsten sieben Tagen ansteht; die Fach-Seite nennt die offenen Aufgaben pro Fach.

## Vokabeltrainer (Modul „Englisch“)

Tab **Vokabeln**: Listen anlegen, Wörter einzeln oder per Import einfügen, dann üben (Karten, Schreiben, Auswahl) mit Wiederholungsplan.
Der Import kennt mehrere Listen auf einmal: eine Zeile `## Unit 1 – Titel` startet eine Liste, darunter ein Wort pro Zeile
`Begriff | Bedeutung | Beispielsatz` (Beispielsatz optional; Trennzeichen Tab, ` | `, ` - `, `;`, `=`). Der Import ist wiederholbar, ohne Duplikate.
Die eingebaute Vorlage enthält die fünf offiziellen EPC1 Word Lists (104 Wörter) plus acht Zusatzwörter, die die Musterprüfung abfragt (Wortfamilien
wie *accomplishment*, *collaboration*, *durability*). Setzt `supabase/migrations/002_vocab.sql` voraus.

## Übungsbank (Kurs- und Sprachmodule)

Tab **Übungen** (WMS, SYS, VHR und Englisch; Englisch hat daneben den Vokabeltrainer): Aufgaben mit Thema, erlaubten Hilfsmitteln (Taschenrechner, Blatt & Stift, Formelsammlung, Tabellen, Computer, Skript/Zusammenfassung),
Zeitschätzung, Niveau, Punkten und Quelle. Pro Aufgabe: Timer, „Lösung zeigen“ (mit Herkunft der Lösung) und Selbstbewertung
(richtig / teilweise / falsch). Es gibt keine automatische Bewertung und keine KI in der App, Lösungen kommen aus der Quelle oder sind von Hand
bzw. von Claude hergeleitet (so gekennzeichnet). Setzt `supabase/migrations/004_exercises.sql` und `005_aid_script.sql` voraus.

Aufgaben entstehen von Hand oder per **Übungsdatei** (JSON, `docs/examples/wms-beispiel.json` ist ein Muster): `format` = `ost-exercises/1`,
`module` = Modulkürzel (muss zum Modul passen), `exercises` = Liste mit `id` (stabil, `a-z0-9._-`; gleiche id = Aktualisierung statt Duplikat),
`title`, `topic`, `task` (Markdown, Formeln mit `$…$`) und optional `kind` (`calculation` | `multiple_choice` | `open`), `solution` +
`solution_source` (`source` | `derived` | `manual`), `aids`, `aids_confirmed`, `minutes`, `difficulty` (1–3), `points`, `source`, `source_ref`.
Ungültige Einträge werden mit Begründung übersprungen, gültige importiert. Quellmaterial (Bücher, Moodle) und daraus erzeugte Übungsdateien bleiben ausserhalb des Repos (`import/` ist ignoriert).

**Operator-Import ohne Formular:** `POST /api/import/exercises` mit `Authorization: Bearer <IMPORT_SECRET>` und der Übungsdatei als Body schreibt die Aufgaben
in das Modul, das in der Datei steht (Service-Role, gleiche Prüfung wie das Formular). Gedacht für die Einzelnutzer-Phase: Gehört ein Modul mit diesem Kürzel
mehreren Konten, wird nichts geschrieben. Ohne `IMPORT_SECRET` lehnt der Endpunkt alles ab. Mit `?dry=1` wird nur geprüft (Modul gefunden, wie viele Einträge gültig), ohne zu schreiben.

## Übungen aus Unterlagen (KI)

Im Tab **Übungen** eines Kursmoduls, unter «Aus Unterlagen erzeugen»: PDFs aus dem Tab Dokumente wählen (Übungsblatt und Lösung zusammen, höchstens 5,
zusammen max. 32 MB), optional einen Hinweis («nur Kapitel 3») mitgeben, «Entwürfe erzeugen». Die App lädt die PDFs zum Anbieter hoch, zählt die Tokens,
prüft das Monatsbudget und gibt **einen Auftrag an die Message Batches API** (Modell `claude-opus-5-5`, strukturierte Ausgabe, halber Preis, Ergebnis meist innert
Minuten, spätestens nach 24 h). Solange ein Durchlauf offen ist, fragt die Seite alle 20 Sekunden nach; das Ergebnis wird beim nächsten Besuch abgeholt, auch
Tage später. Was entsteht, sind **Entwürfe** (`exercises.status = draft`): sie erscheinen nicht beim Üben, sondern unter «Entwürfe prüfen», wo sie einzeln, pro
Durchlauf oder alle zusammen übernommen oder verworfen werden. Jede Lösung trägt ihre Herkunft (`source` = aus der Musterlösung, `derived` = von der KI gerechnet).
Pro Konto und Modul gilt RLS; jede Person erzeugt Übungen nur aus den eigenen Dateien.

Einrichtung: `supabase/migrations/006_ai_runs.sql` ausführen, in Vercel `ANTHROPIC_API_KEY` (Console-Key von platform.claude.com) setzen, optional
`AI_MONTHLY_CAP_USD` (ganze App, Standard 10) und `AI_USER_MONTHLY_CAP_USD` (pro Konto, Standard 5). Ein Durchlauf, der eines der Limits sprengen würde, wird
abgelehnt; der Verbrauch des Monats steht in den Einstellungen. Ohne Schlüssel zeigt die App die Funktion als «nicht eingerichtet». Die Kosten hängen von der
Seitenzahl ab (Richtwert: ein Übungsblatt mit Lösung wenige Rappen bis etwa 0.30 USD, ein 100-Seiten-Skript bis etwa 1 USD).

## Entwickeln

```bash
npm install
npm run dev
npm run lint && npm run typecheck
npm test            # Vitest: Wochenzählung, iCal-Parser/Planer, Kalender, Aufgaben, Vokabeln, Übungen, KI-Extraktion (ohne API-Aufrufe)
npm run test:db     # Migration + RLS gegen ein temporäres lokales Postgres (braucht Postgres-Server-Binaries)
npm run test:e2e    # Playwright-Smoke (Mobile-Viewport), braucht kein Supabase
```

Hinweise:

- **Next.js 16**: `proxy.ts` ersetzt `middleware.ts`. Cache Components ist bewusst **aus** (privater, session-abhängiger Inhalt, kein statischer Shell-Gewinn).
- Jede Server Action und jeder Route Handler prüft die Session selbst (`requireUser()`); der Proxy ist nur ein optimistischer Gate.
- Dateien gehen direkt vom Browser nach Supabase Storage (umgeht das 4.5-MB-Request-Limit von Vercel); max. 50 MB pro Datei. Ein ZIP wird im Browser entpackt (`fflate`) und Datei für Datei hochgeladen; Ordner, versteckte Dateien und macOS-Reste werden übersprungen.
- Kein Service Worker: Manifest + Icons reichen für „Zum Home-Bildschirm". Offline-Zugriff ist nicht vorgesehen.
- `test:db` nutzt Supabase-Stubs auf Plain-Postgres. Gegen das echte Projekt muss RLS einmal manuell gegengeprüft werden.

## Abnahme Phase 1 (manuell, auf dem Handy)

- [ ] Login in der installierten PWA; Abmelden und wieder anmelden
- [ ] Semester einrichten → 4 Module sichtbar
- [ ] iCal-Link speichern, synchronisieren: Vorlesungen erscheinen nach Woche (W01 = 14.09.), Inbox prüfen
- [ ] Zweiter Sync direkt danach: „0 neu, 0 aktualisiert"
- [ ] Notiz mit `$x^2$` tippen, Vorschau zeigt Formel; App schliessen, wieder öffnen → Text ist da
- [ ] PDF hochladen (Modul-Tab und an Vorlesung), öffnen, löschen; dieselbe Datei nochmals → „schon vorhanden"

## Abnahme Aufgaben (manuell, auf dem Handy)

- [ ] Migration `007_tasks.sql` ausgeführt; `/aufgaben` zeigt die leere Liste statt einer Fehlermeldung
- [ ] Schnelleingabe: Titel tippen, Enter → Zeile erscheint, Feld ist leer
- [ ] Status in der Zeile auf «Erledigt» → verschwindet aus der Liste, «Erledigte anzeigen» holt sie zurück (durchgestrichen)
- [ ] «Neue Aufgabe» mit Fach, Datum gestern, Priorität Hoch → in der Liste rot «überfällig», im Dashboard unter Aufgaben
- [ ] Kalender: Tag antippen, Schnelleingabe nutzt diesen Tag; Punkt erscheint im Raster
- [ ] Board: Spalten seitlich wischen, Status per Auswahl verschieben
