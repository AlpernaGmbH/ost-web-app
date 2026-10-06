"use client";

import { useActionState } from "react";
import { createLecture } from "@/app/actions/lectures";
import { saveModule, saveSemester, syncNow } from "@/app/actions/semester";
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
