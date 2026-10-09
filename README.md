# OST Lern-App

Lern-Web-App für das BSc Betriebsökonomie (OST, HS26): Module, Vorlesungen nach Woche, Notizen (Markdown + Formeln),
Dokumente, Stundenplan-Import per iCal. Next.js (App Router) · Supabase (Auth, Postgres, Storage) · Vercel · PWA.

Stand: **Phase 1** (Grundgerüst). Karteikarten/MC (Phase 2) und Übungen/Dashboard (Phase 3) folgen nach Freigabe.

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

## Vokabeltrainer (Modul „Englisch“)

Tab **Vokabeln**: Listen anlegen, Wörter einzeln oder per Import einfügen, dann üben (Karten, Schreiben, Auswahl) mit Wiederholungsplan.
Der Import kennt mehrere Listen auf einmal: eine Zeile `## Unit 1 – Titel` startet eine Liste, darunter ein Wort pro Zeile
`Begriff | Bedeutung | Beispielsatz` (Beispielsatz optional; Trennzeichen Tab, ` | `, ` - `, `;`, `=`). Der Import ist wiederholbar, ohne Duplikate.
Setzt `supabase/migrations/002_vocab.sql` voraus.

## Übungsbank (Kursmodule)

Tab **Übungen** (WMS, SYS, VHR): Aufgaben mit Thema, erlaubten Hilfsmitteln (Taschenrechner, Blatt & Stift, Formelsammlung, Tabellen, Computer, Skript/Zusammenfassung),
Zeitschätzung, Niveau, Punkten und Quelle. Pro Aufgabe: Timer, „Lösung zeigen“ (mit Herkunft der Lösung) und Selbstbewertung
(richtig / teilweise / falsch). Es gibt keine automatische Bewertung und keine KI in der App, Lösungen kommen aus der Quelle oder sind von Hand
bzw. von Claude hergeleitet (so gekennzeichnet). Setzt `supabase/migrations/004_exercises.sql` und `005_aid_script.sql` voraus.

Aufgaben entstehen von Hand oder per **Übungsdatei** (JSON, `docs/examples/wms-beispiel.json` ist ein Muster): `format` = `ost-exercises/1`,
`module` = Modulkürzel (muss zum Modul passen), `exercises` = Liste mit `id` (stabil, `a-z0-9._-`; gleiche id = Aktualisierung statt Duplikat),
`title`, `topic`, `task` (Markdown, Formeln mit `$…$`) und optional `kind` (`calculation` | `multiple_choice` | `open`), `solution` +
`solution_source` (`source` | `derived` | `manual`), `aids`, `aids_confirmed`, `minutes`, `difficulty` (1–3), `points`, `source`, `source_ref`.
Ungültige Einträge werden mit Begründung übersprungen, gültige importiert. Quellmaterial (Bücher, Moodle) und daraus erzeugte Übungsdateien bleiben ausserhalb des Repos (`import/` ist ignoriert).

## Entwickeln

```bash
npm install
npm run dev
npm run lint && npm run typecheck
npm test            # Vitest: Wochenzählung, iCal-Parser/Planer, Kalender, Vokabeln, Übungen
npm run test:db     # Migration + RLS gegen ein temporäres lokales Postgres (braucht Postgres-Server-Binaries)
npm run test:e2e    # Playwright-Smoke (Mobile-Viewport), braucht kein Supabase
```

Hinweise:

- **Next.js 16**: `proxy.ts` ersetzt `middleware.ts`. Cache Components ist bewusst **aus** (privater, session-abhängiger Inhalt, kein statischer Shell-Gewinn).
- Jede Server Action und jeder Route Handler prüft die Session selbst (`requireUser()`); der Proxy ist nur ein optimistischer Gate.
- Dateien gehen direkt vom Browser nach Supabase Storage (umgeht das 4.5-MB-Request-Limit von Vercel); max. 50 MB pro Datei.
- Kein Service Worker: Manifest + Icons reichen für „Zum Home-Bildschirm". Offline-Zugriff ist nicht vorgesehen.
- `test:db` nutzt Supabase-Stubs auf Plain-Postgres. Gegen das echte Projekt muss RLS einmal manuell gegengeprüft werden.

## Abnahme Phase 1 (manuell, auf dem Handy)

- [ ] Login in der installierten PWA; Abmelden und wieder anmelden
- [ ] Semester einrichten → 4 Module sichtbar
- [ ] iCal-Link speichern, synchronisieren: Vorlesungen erscheinen nach Woche (W01 = 14.09.), Inbox prüfen
- [ ] Zweiter Sync direkt danach: „0 neu, 0 aktualisiert"
- [ ] Notiz mit `$x^2$` tippen, Vorschau zeigt Formel; App schliessen, wieder öffnen → Text ist da
- [ ] PDF hochladen (Modul-Tab und an Vorlesung), öffnen, löschen; dieselbe Datei nochmals → „schon vorhanden"
