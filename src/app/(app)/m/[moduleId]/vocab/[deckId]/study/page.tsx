import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { StudySession } from "@/components/study-session";
import { Card, PageTitle, buttonClass } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { describeDbError } from "@/lib/db/errors";
import { parseUuidOrNotFound } from "@/lib/ids";
import { createClient } from "@/lib/supabase/server";
import { buildEntries, canUseChoice, resolveDirection, selectCards, type CardRow } from "@/lib/vocab/queue";

const query = z.object({
  mode: z.enum(["cards", "write", "choice"]).catch("cards"),
  dir: z.enum(["auto", "en-de", "de-en", "mixed"]).catch("auto"),
  scope: z.enum(["due", "all"]).catch("due"),
});

const MODE_LABEL = { cards: "Karten", write: "Schreiben", choice: "Auswahl" } as const;

// "all" as deck id studies every word of the module (all units together)
export default async function StudyPage({ params, searchParams }: PageProps<"/m/[moduleId]/vocab/[deckId]/study">) {
  await requireUser();
  const { moduleId: rawModule, deckId: rawDeck } = await params;
  const moduleId = parseUuidOrNotFound(rawModule);
  const studyAll = rawDeck === "all";
  const deckId = studyAll ? null : parseUuidOrNotFound(rawDeck);
  const { mode, dir: dirChoice, scope } = query.parse(await searchParams);
  const dir = resolveDirection(dirChoice, mode);
  const backHref = studyAll ? `/m/${moduleId}` : `/m/${moduleId}/vocab/${deckId}`;

  const supabase = await createClient();
  const cardSelect = supabase.from("cards").select("id, front_md, back_md, data, due_at, created_at");
  const [deckRes, cardsRes] = await Promise.all([
    deckId
      ? supabase.from("decks").select("id, name").eq("id", deckId).eq("module_id", moduleId).maybeSingle<{ id: string; name: string }>()
      : Promise.resolve({ data: { id: "all", name: "Alle Wörter" }, error: null }),
    (deckId ? cardSelect.eq("deck_id", deckId) : cardSelect.eq("module_id", moduleId).eq("kind", "vocab"))
      .eq("status", "active")
      .order("created_at")
      .limit(5000)
      .returns<CardRow[]>(),
  ]);
  if (deckRes.error || cardsRes.error) return <Card>{describeDbError((deckRes.error ?? cardsRes.error)!)}</Card>;
  if (!deckRes.data) notFound();

  const pool = cardsRes.data ?? [];
  const title = `${deckRes.data.name} · ${MODE_LABEL[mode]}`;

  if (mode === "choice" && !canUseChoice(pool)) {
    return (
      <>
        <PageTitle title={title} />
        <Card className="space-y-3">
          <p className="text-sm">Für „Auswahl“ braucht die Liste mindestens 4 verschiedene Bedeutungen.</p>
          <Link href={backHref} className={buttonClass("secondary")}>
            Zurück
          </Link>
        </Card>
      </>
    );
  }

  const selected = selectCards(pool, { scope, now: new Date(), rand: Math.random });
  if (selected.length === 0) {
    return (
      <>
        <PageTitle title={title} />
        <Card className="space-y-3">
          <p className="text-sm">
            {pool.length === 0 ? "Hier gibt es noch keine Wörter." : "Heute ist nichts mehr fällig. Du kannst trotzdem alle Wörter üben."}
          </p>
          <div className="flex gap-2">
            {pool.length > 0 ? (
              <a href={`?mode=${mode}&dir=${dirChoice}&scope=all`} className={buttonClass("primary")}>
                Alle üben
              </a>
            ) : null}
            <Link href={backHref} className={buttonClass("secondary")}>
              Zurück
            </Link>
          </div>
        </Card>
      </>
    );
  }

  const entries = buildEntries(selected, pool, { mode, direction: dir, rand: Math.random });
  return (
    <>
      <PageTitle title={title} />
      <StudySession
        // a new round gets fresh state even though the URL is the same
        key={entries.map((e) => e.id).join("")}
        mode={mode}
        entries={entries}
        backHref={backHref}
        againHref={`?mode=${mode}&dir=${dirChoice}&scope=${scope}`}
      />
    </>
  );
}
