"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { describeDbError } from "@/lib/db/errors";
import type { FormState } from "@/lib/form-state";
import { createClient } from "@/lib/supabase/server";
import { parseImport } from "@/lib/vocab/import";
import { schedule, type Rating } from "@/lib/vocab/srs";

const uuid = z.string().uuid();
const word = z.string().trim().min(1, "Eintrag fehlt").max(500, "Eintrag ist zu lang");
const example = z.string().trim().max(500).optional();

function firstIssue(error: z.ZodError): string {
  return error.issues[0]?.message ?? "Ungültige Eingabe";
}

export async function createDeck(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  const parsed = z
    .object({ moduleId: uuid, name: z.string().trim().min(1, "Name fehlt").max(80, "Name ist zu lang") })
    .safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, message: firstIssue(parsed.error) };

  const supabase = await createClient();
  const { error } = await supabase.from("decks").insert({ user_id: user.id, module_id: parsed.data.moduleId, name: parsed.data.name });
  if (error) return { ok: false, message: error.code === "23505" ? "Diese Liste gibt es schon." : describeDbError(error) };
  revalidatePath(`/m/${parsed.data.moduleId}`);
  return { ok: true, message: "Liste angelegt." };
}

export async function deleteDeck(formData: FormData): Promise<void> {
  await requireUser();
  const parsed = z.object({ deckId: uuid, moduleId: uuid }).safeParse(Object.fromEntries(formData));
  if (!parsed.success) return;
  const supabase = await createClient();
  await supabase.from("decks").delete().eq("id", parsed.data.deckId);
  revalidatePath(`/m/${parsed.data.moduleId}`);
}

export async function addCard(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  const parsed = z
    .object({ deckId: uuid, front: word, back: word, example })
    .safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, message: firstIssue(parsed.error) };

  const supabase = await createClient();
  const { data: deck } = await supabase.from("decks").select("id, module_id").eq("id", parsed.data.deckId).maybeSingle();
  if (!deck) return { ok: false, message: "Liste nicht gefunden" };

  const { error } = await supabase.from("cards").insert({
    user_id: user.id,
    module_id: deck.module_id,
    deck_id: deck.id,
    kind: "vocab",
    front_md: parsed.data.front,
    back_md: parsed.data.back,
    data: parsed.data.example ? { example: parsed.data.example } : {},
  });
  if (error) return { ok: false, message: describeDbError(error) };
  revalidatePath(`/m/${deck.module_id}`, "layout");
  return { ok: true, message: `„${parsed.data.front}" hinzugefügt.` };
}

export async function updateCard(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireUser();
  const parsed = z
    .object({ cardId: uuid, front: word, back: word, example })
    .safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, message: firstIssue(parsed.error) };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("cards")
    .update({
      front_md: parsed.data.front,
      back_md: parsed.data.back,
      data: parsed.data.example ? { example: parsed.data.example } : {},
    })
    .eq("id", parsed.data.cardId)
    .select("module_id")
    .maybeSingle();
  if (error) return { ok: false, message: describeDbError(error) };
  if (!data) return { ok: false, message: "Wort nicht gefunden" };
  revalidatePath(`/m/${data.module_id}`, "layout");
  return { ok: true, message: "Gespeichert." };
}

export async function deleteCard(formData: FormData): Promise<void> {
  await requireUser();
  const parsed = z.object({ cardId: uuid, moduleId: uuid }).safeParse(Object.fromEntries(formData));
  if (!parsed.success) return;
  const supabase = await createClient();
  await supabase.from("cards").delete().eq("id", parsed.data.cardId);
  revalidatePath(`/m/${parsed.data.moduleId}`, "layout");
}

const IMPORT_CHUNK = 200;
const IMPORT_MAX_ROWS = 2000;

/** Bulk import of a pasted word list. Words already in the deck (same English term) are skipped. */
export async function importCards(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  const parsedForm = z.object({ deckId: uuid, text: z.string().max(200_000, "Text ist zu lang") }).safeParse(Object.fromEntries(formData));
  if (!parsedForm.success) return { ok: false, message: firstIssue(parsedForm.error) };

  const { rows, skipped } = parseImport(parsedForm.data.text);
  if (rows.length === 0) {
    return { ok: false, message: skipped.length > 0 ? `Nichts erkannt. Zeile ${skipped[0].line}: ${skipped[0].reason}.` : "Nichts zum Importieren gefunden." };
  }
  if (rows.length > IMPORT_MAX_ROWS) return { ok: false, message: `Maximal ${IMPORT_MAX_ROWS} Wörter pro Import.` };

  const supabase = await createClient();
  const { data: deck } = await supabase.from("decks").select("id, module_id").eq("id", parsedForm.data.deckId).maybeSingle();
  if (!deck) return { ok: false, message: "Liste nicht gefunden" };

  const { data: existing, error: existingError } = await supabase.from("cards").select("front_md").eq("deck_id", deck.id).limit(5000);
  if (existingError) return { ok: false, message: describeDbError(existingError) };
  const known = new Set((existing ?? []).map((c) => String(c.front_md).toLowerCase()));

  const fresh = rows.filter((r) => !known.has(r.front.toLowerCase()));
  for (let i = 0; i < fresh.length; i += IMPORT_CHUNK) {
    const { error } = await supabase.from("cards").insert(
      fresh.slice(i, i + IMPORT_CHUNK).map((r) => ({
        user_id: user.id,
        module_id: deck.module_id,
        deck_id: deck.id,
        kind: "vocab",
        front_md: r.front,
        back_md: r.back,
        data: r.example ? { example: r.example } : {},
      })),
    );
    if (error) return { ok: false, message: `${i} von ${fresh.length} importiert, dann Fehler: ${describeDbError(error)}` };
  }

  revalidatePath(`/m/${deck.module_id}`, "layout");
  const parts = [`${fresh.length} importiert`];
  if (rows.length - fresh.length > 0) parts.push(`${rows.length - fresh.length} schon vorhanden`);
  if (skipped.length > 0) parts.push(`${skipped.length} Zeilen übersprungen (z. B. Zeile ${skipped[0].line}: ${skipped[0].reason})`);
  return { ok: true, message: `${parts.join(", ")}.` };
}

const reviewInput = z.object({
  cardId: uuid,
  rating: z.union([z.literal(0), z.literal(1), z.literal(2), z.literal(3)]),
  mode: z.enum(["cards", "write", "choice"]),
});

/** Stores one answer: the server computes the next due date, the client only sends the rating. */
export async function recordReview(input: z.input<typeof reviewInput>): Promise<{ ok: boolean; message?: string }> {
  const user = await requireUser();
  const parsed = reviewInput.safeParse(input);
  if (!parsed.success) return { ok: false, message: "Ungültige Bewertung" };
  const { cardId, rating, mode } = parsed.data;

  const supabase = await createClient();
  const { data: card, error } = await supabase
    .from("cards")
    .select("ease, interval_days, reps, lapses")
    .eq("id", cardId)
    .maybeSingle();
  if (error) return { ok: false, message: describeDbError(error) };
  if (!card) return { ok: false, message: "Karte nicht gefunden" };

  const now = new Date();
  const next = schedule(card, rating as Rating, now);
  const { error: updateError } = await supabase
    .from("cards")
    .update({
      ease: next.ease,
      interval_days: next.interval_days,
      reps: next.reps,
      lapses: next.lapses,
      due_at: next.due_at.toISOString(),
      last_reviewed_at: now.toISOString(),
    })
    .eq("id", cardId);
  if (updateError) return { ok: false, message: describeDbError(updateError) };

  // the log is best effort: a failed insert must not lose the schedule update above
  await supabase.from("card_reviews").insert({
    user_id: user.id,
    card_id: cardId,
    rating,
    mode,
    interval_before: card.interval_days,
    interval_after: next.interval_days,
    ease_before: card.ease,
    ease_after: next.ease,
    reviewed_at: now.toISOString(),
  });
  return { ok: true };
}
