import { Card, PageTitle } from "./ui";

// Shown instead of the app while the deployment has no Supabase configuration. Values are never
// printed, only whether a variable is present.
const VARIABLES: { name: string; purpose: string; buildTime: boolean }[] = [
  { name: "NEXT_PUBLIC_SUPABASE_URL", purpose: "Supabase → Project Settings → API → Project URL", buildTime: true },
  { name: "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", purpose: "Supabase → Project Settings → API → publishable (anon) key", buildTime: true },
  { name: "SUPABASE_SERVICE_ROLE_KEY", purpose: "nur Server, für den täglichen iCal-Import", buildTime: false },
  { name: "CRON_SECRET", purpose: "beliebige lange Zufallszeichenkette für den Cron-Aufruf", buildTime: false },
];

export function SetupRequired({ missingPublic }: { missingPublic: string[] }) {
  const isSet = (name: string) =>
    missingPublic.includes(name) ? false : name.startsWith("NEXT_PUBLIC_") ? true : Boolean(process.env[name]);

  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-8">
      <PageTitle title="Einrichtung nötig" subtitle="Die App läuft, hat aber noch keine Verbindung zu Supabase." />
      <Card className="space-y-4">
        <ul className="divide-y divide-border">
          {VARIABLES.map((v) => {
            const ok = isSet(v.name);
            return (
              <li key={v.name} className="flex items-start gap-3 py-3">
                <span aria-hidden className={`mt-0.5 text-lg leading-none ${ok ? "text-success" : "text-danger"}`}>
                  {ok ? "✓" : "✗"}
                </span>
                <span className="min-w-0">
                  <code className="block break-all text-sm font-semibold">{v.name}</code>
                  <span className="block text-sm text-muted">
                    {ok ? "gesetzt" : "fehlt"} · {v.purpose}
                  </span>
                </span>
              </li>
            );
          })}
        </ul>
        <ol className="list-decimal space-y-1 pl-5 text-sm">
          <li>Vercel → Projekt → Settings → Environment Variables: fehlende Werte für Production und Preview eintragen.</li>
          <li>
            Deployments → letztes Deployment → Redeploy. Die <code>NEXT_PUBLIC_*</code>-Werte werden beim Build eingebacken, ohne
            Redeploy bleibt diese Seite stehen.
          </li>
          <li>Supabase: Migration <code>supabase/migrations/001_phase1.sql</code> ausführen, Sign-ups ausschalten, Benutzer anlegen.</li>
        </ol>
      </Card>
    </main>
  );
}
