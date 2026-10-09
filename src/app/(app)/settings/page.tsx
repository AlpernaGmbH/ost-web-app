import type { Metadata } from "next";
import { assignLecture } from "@/app/actions/semester";
import { signOut } from "@/app/actions/auth";
import { ModuleForm, SemesterForm, SyncForm } from "@/components/forms";
import { Button, Card, PageTitle } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import type { Lecture, Module, Semester } from "@/lib/db/types";
import { formatDateTime, maskUrl } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Einstellungen" };

export default async function SettingsPage() {
  const user = await requireUser();
  const supabase = await createClient();

  const { data: semester } = await supabase
    .from("semesters")
    .select("id, name, start_date, ical_url, last_synced_at")
    .order("start_date", { ascending: false })
    .limit(1)
    .maybeSingle<Pick<Semester, "id" | "name" | "start_date" | "ical_url" | "last_synced_at">>();

  if (!semester) {
    return (
      <>
        <PageTitle title="Einstellungen" />
        <Card>
          <p className="text-sm text-muted">Zuerst auf der Startseite das Semester einrichten.</p>
        </Card>
        <SignOut email={user.email} />
      </>
    );
  }

  const [modulesRes, inboxRes] = await Promise.all([
    supabase
      .from("modules")
      .select("id, code, name, ects, ical_match, kind")
      .eq("semester_id", semester.id)
      .order("sort_order")
      .returns<Pick<Module, "id" | "code" | "name" | "ects" | "ical_match" | "kind">[]>(),
    supabase
      .from("lectures")
      .select("id, title, starts_at")
      .eq("semester_id", semester.id)
      .is("module_id", null)
      .eq("status", "scheduled")
      .order("starts_at")
      .limit(100)
      .returns<Pick<Lecture, "id" | "title" | "starts_at">[]>(),
  ]);
  const modules = modulesRes.data ?? [];
  const inbox = inboxRes.data ?? [];

  return (
    <div className="space-y-8">
      <PageTitle title="Einstellungen" subtitle={user.email} />

      <section aria-labelledby="sem" className="space-y-3">
        <h2 id="sem" className="heading">Semester & Stundenplan</h2>
        <Card className="space-y-6">
          <SemesterForm
            semester={{
              id: semester.id,
              name: semester.name,
              start_date: semester.start_date,
              icalHint: semester.ical_url ? maskUrl(semester.ical_url) : null,
            }}
          />
          <hr className="border-border" />
          <SyncForm
            semesterId={semester.id}
            hasUrl={Boolean(semester.ical_url)}
            lastSyncedLabel={semester.last_synced_at ? formatDateTime(semester.last_synced_at) : "noch nie"}
          />
        </Card>
      </section>

      <section id="inbox" aria-labelledby="inbox-h" className="space-y-3">
        <h2 id="inbox-h" className="heading">Inbox: nicht eindeutig zugeordnete Termine ({inbox.length})</h2>
        {inbox.length === 0 ? (
          <Card>
            <p className="text-sm text-muted">Alle importierten Termine sind einem Modul zugeordnet.</p>
          </Card>
        ) : (
          <ul className="divide-y divide-border rounded-card border border-border bg-card">
            {inbox.map((l) => (
              <li key={l.id} className="space-y-2 px-4 py-3">
                <p className="text-sm">
                  <span className="font-medium">{l.title}</span>
                  <span className="block text-sm text-muted">{formatDateTime(l.starts_at)}</span>
                </p>
                <form action={assignLecture} className="flex gap-2">
                  <input type="hidden" name="lectureId" value={l.id} />
                  <select
                    name="moduleId"
                    required
                    defaultValue=""
                    aria-label={`Modul für ${l.title}`}
                    className="h-13 min-w-0 flex-1 rounded-field border-2 border-control bg-card px-4 text-lg hover:border-primary"
                  >
                    <option value="" disabled>
                      Modul wählen …
                    </option>
                    {modules.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.code} · {m.name}
                      </option>
                    ))}
                  </select>
                  <Button type="submit" variant="secondary">
                    Zuordnen
                  </Button>
                </form>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="mods" className="space-y-3">
        <h2 id="mods" className="heading">Module</h2>
        <div className="space-y-3">
          {modules.filter((m) => m.kind !== "admin").map((m) => (
            <Card key={m.id}>
              <ModuleForm module={m} />
            </Card>
          ))}
        </div>
      </section>

      <SignOut email={user.email} />
    </div>
  );
}

function SignOut({ email }: { email: string | undefined }) {
  return (
    <form action={signOut} className="pt-2">
      <Button type="submit" variant="secondary" className="w-full">
        Abmelden{email ? ` (${email})` : ""}
      </Button>
    </form>
  );
}
