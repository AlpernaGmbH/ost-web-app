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
   - Ohne `NEXT_PUBLIC_SUPABASE_*` schlägt der Build **absichtlich** fehl (`Supabase ist nicht konfiguriert`): die Werte werden beim Build eingebacken, ein Deployment ohne sie wäre zur Laufzeit kaputt. Nach dem Setzen neu deployen.
   - *Settings → Deployment Protection → Vercel Authentication* auf „Only Preview Deployments" stellen, sonst verlangt auch die Production-URL einen Vercel-Login und die PWA auf dem Handy funktioniert nicht.
5. In der App: Startseite → „Semester HS26 einrichten", dann *Einstellungen* → iCal-Abo-Link speichern → „Jetzt synchronisieren".
   Nicht zugeordnete Termine landen in der Inbox; Stichwörter pro Modul sind in den Einstellungen editierbar.
6. Auf dem Handy: Seite öffnen → „Zum Home-Bildschirm" (iOS) bzw. „App installieren" (Android).

## Entwickeln

```bash
npm install
npm run dev
npm run lint && npm run typecheck
npm test            # Vitest: Wochenzählung, iCal-Parser/Planer, Formatierung
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
