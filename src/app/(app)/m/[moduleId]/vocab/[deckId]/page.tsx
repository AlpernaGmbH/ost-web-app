import Link from "next/link";
import { notFound } from "next/navigation";
import { deleteCard, deleteDeck } from "@/app/actions/vocab";
import { ConfirmButton } from "@/components/confirm-button";
import { AddCardForm, EditCardForm, ImportForm } from "@/components/forms";
import { Card, PageTitle, buttonClass } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { describeDbError } from "@/lib/db/errors";
import { parseUuidOrNotFound } from "@/lib/ids";
import { createClient } from "@/lib/supabase/server";
import { canUseChoice } from "@/lib/vocab/queue";
import { isDue } from "@/lib/vocab/srs";

type CardListRow = { id: string; front_md: string; back_md: string; data: { example?: string } | null; due_at: string | null; reps: number };

export default async function DeckPage({ params }: PageProps<"/m/[moduleId]/vocab/[deckId]">) {
  await requireUser();
  const { moduleId: rawModule, deckId: rawDeck } = await params;
  const moduleId = parseUuidOrNotFound(rawModule);
  const deckId = parseUuidOrNotFound(rawDeck);

  const supabase = await createClient();
  const [deckRes, cardsRes] = await Promise.all([
    supabase.from("decks").select("id, name").eq("id", deckId).eq("module_id", moduleId).maybeSingle<{ id: string; name: string }>(),
    supabase
      .from("cards")
      .select("id, front_md, back_md, data, due_at, reps")
      .eq("deck_id", deckId)
      .eq("status", "active")
      .order("created_at")
      .limit(5000)
      .returns<CardListRow[]>(),
  ]);
  if (deckRes.error || cardsRes.error) {
    return <Card>{describeDbError((deckRes.error ?? cardsRes.error)!)}</Card>;
  }
  const deck = deckRes.data;
  if (!deck) notFound();

  const cards = cardsRes.data ?? [];
  const now = new Date();
  const due = cards.filter((c) => c.due_at !== null && isDue(c, now)).length;
  const fresh = cards.filter((c) => c.due_at === null).length;
  const learned = cards.filter((c) => c.reps >= 3).length;
  const studyBase = `/m/${moduleId}/vocab/${deckId}/study`;
  const choiceOk = canUseChoice(cards);

  return (
    <>
      <Link href={`/m/${moduleId}`} className="mb-3 inline-block text-sm text-muted">
        ← Vokabeln
      </Link>
      <PageTitle title={deck.name} subtitle={`${cards.length} Wörter · ${due} zu wiederholen · ${fresh} neu · ${learned} gefestigt`} />

      {cards.length === 0 ? (
        <Card className="mb-6">
          <p className="text-sm text-muted">Noch keine Wörter. Füge sie unten einzeln hinzu oder importiere eine ganze Liste.</p>
        </Card>
      ) : (
        <form action={studyBase} method="get" className="mb-6 space-y-3 rounded-xl border border-border bg-card p-4">
          <div className="grid grid-cols-2 gap-2">
            <label className="block text-sm">
              Richtung
              <select name="dir" defaultValue="en-de" className="mt-1 min-h-11 w-full rounded-lg border border-border bg-card px-3">
                <option value="en-de">English → Deutsch</option>
                <option value="de-en">Deutsch → English</option>
                <option value="mixed">Gemischt</option>
              </select>
            </label>
            <label className="block text-sm">
              Welche Wörter
              <select name="scope" defaultValue={due + fresh > 0 ? "due" : "all"} className="mt-1 min-h-11 w-full rounded-lg border border-border bg-card px-3">
                <option value="due">Fällige und neue</option>
                <option value="all">Alle (Zufall)</option>
              </select>
            </label>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <button name="mode" value="cards" className={buttonClass("primary")}>
              Karten
            </button>
            <button name="mode" value="write" className={buttonClass("secondary")}>
              Schreiben
            </button>
            <button name="mode" value="choice" disabled={!choiceOk} className={buttonClass("secondary")}>
              Auswahl
            </button>
          </div>
          {!choiceOk ? <p className="text-xs text-muted">„Auswahl“ braucht mindestens 4 verschiedene Bedeutungen in der Liste.</p> : null}
        </form>
      )}

      <div className="space-y-3">
        <details className="rounded-xl border border-border bg-card" open={cards.length === 0}>
          <summary className="flex min-h-12 cursor-pointer list-none items-center px-4 text-sm font-semibold">+ Wortliste importieren</summary>
          <div className="border-t border-border p-4">
            <ImportForm deckId={deckId} />
          </div>
        </details>
        <details className="rounded-xl border border-border bg-card">
          <summary className="flex min-h-12 cursor-pointer list-none items-center px-4 text-sm font-semibold">+ Einzelnes Wort hinzufügen</summary>
          <div className="border-t border-border p-4">
            <AddCardForm deckId={deckId} />
          </div>
        </details>
      </div>

      {cards.length > 0 ? (
        <section className="mt-8" aria-labelledby="words">
          <h2 id="words" className="mb-2 font-semibold">
            Wörter ({cards.length})
          </h2>
          <ul className="divide-y divide-border rounded-xl border border-border bg-card">
            {cards.map((c) => (
              <li key={c.id}>
                <details>
                  <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 px-4 py-2">
                    <span className="min-w-0">
                      <span className="block truncate font-medium">{c.front_md}</span>
                      <span className="block truncate text-sm text-muted">{c.back_md}</span>
                    </span>
                    <span className="shrink-0 text-xs text-muted">{c.due_at === null ? "neu" : isDue(c, now) ? "fällig" : "geplant"}</span>
                  </summary>
                  <EditCardForm card={{ id: c.id, front_md: c.front_md, back_md: c.back_md, example: c.data?.example ?? null }} />
                  <form action={deleteCard} className="px-4 pb-3">
                    <input type="hidden" name="cardId" value={c.id} />
                    <input type="hidden" name="moduleId" value={moduleId} />
                    <ConfirmButton type="submit" variant="danger" confirmText={`„${c.front_md}" löschen?`} className="min-h-9 px-3">
                      Wort löschen
                    </ConfirmButton>
                  </form>
                </details>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <form action={deleteDeck} className="mt-10">
        <input type="hidden" name="deckId" value={deckId} />
        <input type="hidden" name="moduleId" value={moduleId} />
        <ConfirmButton
          type="submit"
          variant="danger"
          confirmText={`Liste „${deck.name}" mit allen ${cards.length} Wörtern und dem Lernfortschritt löschen?`}
        >
          Liste löschen
        </ConfirmButton>
      </form>
    </>
  );
}
