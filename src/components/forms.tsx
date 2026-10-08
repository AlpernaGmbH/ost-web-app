"use client";

import { useActionState } from "react";
import { createLecture } from "@/app/actions/lectures";
import { addCard, createDeck, importCards, updateCard } from "@/app/actions/vocab";
import { bootstrapSemester, saveModule, saveSemester, syncNow } from "@/app/actions/semester";
import type { FormState } from "@/lib/form-state";
import { Button, FormMessage, inputClass } from "./ui";

const initial: FormState = {};

export function LectureForm({ moduleId, today }: { moduleId: string; today: string }) {
  const [state, action, pending] = useActionState(createLecture, initial);
  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="moduleId" value={moduleId} />
      <label className="block text-sm">
        Titel
        <input name="title" required defaultValue="Vorlesung" className={`${inputClass} mt-1`} />
      </label>
      <div className="grid grid-cols-3 gap-2">
        <label className="col-span-3 block text-sm sm:col-span-1">
          Datum
          <input type="date" name="date" required defaultValue={today} className={`${inputClass} mt-1`} />
        </label>
        <label className="block text-sm">
          Von
          <input type="time" name="start" required defaultValue="08:15" className={`${inputClass} mt-1`} />
        </label>
        <label className="block text-sm">
          Bis
          <input type="time" name="end" className={`${inputClass} mt-1`} />
        </label>
      </div>
      <FormMessage state={state} />
      <Button type="submit" disabled={pending}>
        {pending ? "Speichert …" : "Vorlesung anlegen"}
      </Button>
    </form>
  );
}

export function SemesterForm({
  semester,
}: {
  semester: { id: string; name: string; start_date: string; icalHint: string | null };
}) {
  const [state, action, pending] = useActionState(saveSemester, initial);
  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="id" value={semester.id} />
      <div className="grid grid-cols-2 gap-2">
        <label className="block text-sm">
          Semester
          <input name="name" required defaultValue={semester.name} className={`${inputClass} mt-1`} />
        </label>
        <label className="block text-sm">
          W01 beginnt am (Montag)
          <input type="date" name="start_date" required defaultValue={semester.start_date} className={`${inputClass} mt-1`} />
        </label>
      </div>
      <label className="block text-sm">
        iCal-Abo-Link (Stundenplan){semester.icalHint ? ` – gesetzt: ${semester.icalHint}` : ""}
        <input
          type="url"
          name="ical_url"
          autoComplete="off"
          placeholder={semester.icalHint ? "Leer lassen = bisherigen Link behalten" : "https:// oder webcal://"}
          className={`${inputClass} mt-1`}
        />
      </label>
      {semester.icalHint ? (
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="clear_ical" className="size-5" /> Link entfernen
        </label>
      ) : null}
      <FormMessage state={state} />
      <Button type="submit" disabled={pending}>
        {pending ? "Speichert …" : "Speichern"}
      </Button>
    </form>
  );
}

export function SyncForm({ semesterId, hasUrl, lastSyncedLabel }: { semesterId: string; hasUrl: boolean; lastSyncedLabel: string }) {
  const [state, action, pending] = useActionState(syncNow, initial);
  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="id" value={semesterId} />
      <p className="text-sm text-muted">Letzter Import: {lastSyncedLabel}. Automatisch einmal täglich.</p>
      <FormMessage state={state} />
      <Button type="submit" variant="secondary" disabled={!hasUrl || pending}>
        {pending ? "Importiert …" : "Jetzt synchronisieren"}
      </Button>
      {!hasUrl ? <p className="text-sm text-muted">Zuerst den iCal-Link speichern.</p> : null}
    </form>
  );
}

export function ModuleForm({
  module,
}: {
  module: { id: string; code: string; name: string; ects: number; ical_match: string | null };
}) {
  const [state, action, pending] = useActionState(saveModule, initial);
  return (
    <form action={action} className="space-y-2" aria-label={`Modul ${module.code}`}>
      <input type="hidden" name="id" value={module.id} />
      <div className="grid grid-cols-[1fr_5rem] gap-2">
        <label className="block text-sm">
          {module.code}
          <input name="name" required defaultValue={module.name} className={`${inputClass} mt-1`} />
        </label>
        <label className="block text-sm">
          ECTS
          <input type="number" name="ects" min={0} max={30} defaultValue={module.ects} className={`${inputClass} mt-1`} />
        </label>
      </div>
      <label className="block text-sm">
        Stichwörter im iCal-Titel (Komma-getrennt)
        <input name="ical_match" defaultValue={module.ical_match ?? ""} className={`${inputClass} mt-1`} />
      </label>
      <div className="flex items-center gap-3">
        <Button type="submit" variant="secondary" disabled={pending}>
          {pending ? "Speichert …" : "Speichern"}
        </Button>
        <FormMessage state={state} />
      </div>
    </form>
  );
}

export function BootstrapForm() {
  const [state, action, pending] = useActionState(bootstrapSemester, initial);
  return (
    <form action={action} className="space-y-3">
      <FormMessage state={state} />
      <Button type="submit" disabled={pending}>
        {pending ? "Richtet ein …" : "Semester HS26 einrichten"}
      </Button>
    </form>
  );
}

export function DeckForm({ moduleId }: { moduleId: string }) {
  const [state, action, pending] = useActionState(createDeck, initial);
  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="moduleId" value={moduleId} />
      <label className="block text-sm">
        Name der Liste
        <input name="name" required maxLength={80} placeholder="z. B. Unit 3 – Business" className={`${inputClass} mt-1`} />
      </label>
      <FormMessage state={state} />
      <Button type="submit" disabled={pending}>
        {pending ? "Speichert …" : "Liste anlegen"}
      </Button>
    </form>
  );
}

export function AddCardForm({ deckId }: { deckId: string }) {
  const [state, action, pending] = useActionState(addCard, initial);
  return (
    <form key={state.ok ? state.message : "form"} action={action} className="space-y-3">
      <input type="hidden" name="deckId" value={deckId} />
      <div className="grid grid-cols-2 gap-2">
        <label className="block text-sm">
          English
          <input name="front" required maxLength={500} autoCapitalize="none" className={`${inputClass} mt-1`} />
        </label>
        <label className="block text-sm">
          Deutsch
          <input name="back" required maxLength={500} className={`${inputClass} mt-1`} />
        </label>
      </div>
      <label className="block text-sm">
        Beispielsatz (optional)
        <input name="example" maxLength={500} className={`${inputClass} mt-1`} />
      </label>
      <p className="text-xs text-muted">Mehrere Bedeutungen mit „;“ trennen, z. B. „rennen; laufen“. Beim Schreiben zählt jede.</p>
      <FormMessage state={state} />
      <Button type="submit" disabled={pending}>
        {pending ? "Speichert …" : "Wort hinzufügen"}
      </Button>
    </form>
  );
}

export function ImportForm({ deckId }: { deckId: string }) {
  const [state, action, pending] = useActionState(importCards, initial);
  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="deckId" value={deckId} />
      <label className="block text-sm">
        Wortliste einfügen
        <textarea
          name="text"
          required
          rows={8}
          placeholder={"to run - rennen\nachieve; erreichen\nhouse = Haus"}
          className="mt-1 w-full rounded-lg border border-border bg-card p-3 font-mono text-[15px] focus:outline-2 focus:outline-primary"
        />
      </label>
      <p className="text-xs text-muted">
        Ein Wort pro Zeile: <code>English - Deutsch</code>. Erlaubt sind Tab, „ - “, „;“, „=“ oder „ : “. Optional eine dritte Spalte mit einem
        Beispielsatz. Bereits vorhandene Wörter werden übersprungen.
      </p>
      <FormMessage state={state} />
      <Button type="submit" disabled={pending}>
        {pending ? "Importiert …" : "Importieren"}
      </Button>
    </form>
  );
}

export function EditCardForm({
  card,
}: {
  card: { id: string; front_md: string; back_md: string; example: string | null };
}) {
  const [state, action, pending] = useActionState(updateCard, initial);
  return (
    <form action={action} className="space-y-2 px-4 pb-3">
      <input type="hidden" name="cardId" value={card.id} />
      <div className="grid grid-cols-2 gap-2">
        <input name="front" required maxLength={500} defaultValue={card.front_md} aria-label="English" className={inputClass} />
        <input name="back" required maxLength={500} defaultValue={card.back_md} aria-label="Deutsch" className={inputClass} />
      </div>
      <input name="example" maxLength={500} defaultValue={card.example ?? ""} placeholder="Beispielsatz" aria-label="Beispielsatz" className={inputClass} />
      <div className="flex items-center gap-3">
        <Button type="submit" variant="secondary" disabled={pending}>
          {pending ? "Speichert …" : "Speichern"}
        </Button>
        <FormMessage state={state} />
      </div>
    </form>
  );
}
