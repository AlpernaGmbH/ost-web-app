"use client";

import { useActionState } from "react";
import { importExercises, saveExercise } from "@/app/actions/exercises";
import { AIDS, DIFFICULTIES, KINDS, SOLUTION_SOURCES, type ExerciseRow } from "@/lib/exercises/types";
import type { FormState } from "@/lib/form-state";
import { Button, FormMessage, inputClass } from "./ui";

const initial: FormState = {};
const textareaClass = "mt-1 w-full rounded-lg border border-border bg-card p-3 text-base placeholder:text-muted focus:outline-2 focus:outline-primary";

/** Create (no `exercise`) or edit an exercise. A successful save redirects to the exercise page. */
export function ExerciseForm({ moduleId, exercise, topics }: { moduleId: string; exercise?: ExerciseRow; topics: string[] }) {
  const [state, action, pending] = useActionState(saveExercise, initial);
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="moduleId" value={moduleId} />
      {exercise ? <input type="hidden" name="exerciseId" value={exercise.id} /> : null}

      <label className="block text-sm">
        Titel
        <input name="title" required maxLength={200} defaultValue={exercise?.title} placeholder="z. B. Mittelwert und Standardabweichung" className={`${inputClass} mt-1`} />
      </label>
      <label className="block text-sm">
        Thema
        <input name="topic" required maxLength={120} list="exercise-topics" defaultValue={exercise?.topic} placeholder="z. B. Deskriptive Statistik" className={`${inputClass} mt-1`} />
        <datalist id="exercise-topics">
          {topics.map((topic) => (
            <option key={topic} value={topic} />
          ))}
        </datalist>
      </label>
      <label className="block text-sm">
        Aufgabentyp
        <select name="kind" defaultValue={exercise?.kind ?? "calculation"} className={`${inputClass} mt-1`}>
          {KINDS.map((k) => (
            <option key={k.id} value={k.id}>
              {k.label}
            </option>
          ))}
        </select>
      </label>
      <label className="block text-sm">
        Aufgabe (Markdown, Formeln mit $…$)
        <textarea name="task" required rows={8} maxLength={10000} defaultValue={exercise?.task_md} className={`${textareaClass} font-mono`} />
      </label>

      <fieldset className="space-y-2">
        <legend className="text-sm">Erlaubte Hilfsmittel</legend>
        <div className="grid grid-cols-2 gap-2">
          {AIDS.map((aid) => (
            <label key={aid.id} className="flex min-h-11 items-center gap-2 rounded-lg border border-border bg-card px-3 text-sm">
              <input type="checkbox" name="aids" value={aid.id} defaultChecked={exercise?.aids.includes(aid.id)} className="size-5" />
              {aid.label}
            </label>
          ))}
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="aids_confirmed" defaultChecked={exercise?.aids_confirmed} className="size-5" />
          Hilfsmittel stehen so in der Quelle (sonst werden sie als „abgeleitet“ angezeigt)
        </label>
      </fieldset>

      <div className="grid grid-cols-3 gap-2">
        <label className="block text-sm">
          Minuten
          <input name="minutes" inputMode="numeric" defaultValue={exercise?.minutes ?? ""} placeholder="12" className={`${inputClass} mt-1`} />
        </label>
        <label className="block text-sm">
          Punkte
          <input name="points" inputMode="decimal" defaultValue={exercise?.points ?? ""} placeholder="4,5" className={`${inputClass} mt-1`} />
        </label>
        <label className="block text-sm">
          Niveau
          <select name="difficulty" defaultValue={exercise?.difficulty ?? ""} className={`${inputClass} mt-1`}>
            <option value="">–</option>
            {DIFFICULTIES.map((d) => (
              <option key={d.id} value={d.id}>
                {d.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <label className="block text-sm">
          Quelle
          <input name="source" maxLength={160} defaultValue={exercise?.source_label ?? ""} placeholder="Skript Statistik" className={`${inputClass} mt-1`} />
        </label>
        <label className="block text-sm">
          Stelle in der Quelle
          <input name="source_ref" maxLength={120} defaultValue={exercise?.source_ref ?? ""} placeholder="Kap. 3, Aufgabe 2" className={`${inputClass} mt-1`} />
        </label>
      </div>

      <label className="block text-sm">
        Lösung (optional, Markdown)
        <textarea name="solution" rows={6} maxLength={10000} defaultValue={exercise?.solution_md ?? ""} className={`${textareaClass} font-mono`} />
      </label>
      <label className="block text-sm">
        Herkunft der Lösung
        <select name="solution_source" defaultValue={exercise?.solution_source ?? "manual"} className={`${inputClass} mt-1`}>
          {SOLUTION_SOURCES.map((s) => (
            <option key={s.id} value={s.id}>
              {s.label}
            </option>
          ))}
        </select>
      </label>

      <FormMessage state={state} />
      <Button type="submit" disabled={pending}>
        {pending ? "Speichert …" : exercise ? "Änderungen speichern" : "Aufgabe anlegen"}
      </Button>
    </form>
  );
}

/** Import of an exercise file: pick the .json file, or paste its content. */
export function ExerciseImportForm({ moduleId, moduleCode }: { moduleId: string; moduleCode: string }) {
  const [state, action, pending] = useActionState(importExercises, initial);
  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="moduleId" value={moduleId} />
      <label className="block text-sm">
        Übungsdatei für {moduleCode}
        <input type="file" name="file" className={`${inputClass} mt-1 py-2`} />
      </label>
      <label className="block text-sm">
        … oder den Inhalt hier einfügen
        <textarea name="text" rows={4} placeholder='{"format": "ost-exercises/1", …}' className={`${textareaClass} font-mono`} />
      </label>
      <p className="text-xs text-muted">
        Der Import ist wiederholbar: Aufgaben mit derselben ID werden aktualisiert (auch deine Änderungen daran, deine Versuche bleiben erhalten).
        Maximal 900 KB und 500 Aufgaben pro Datei.
      </p>
      <FormMessage state={state} />
      <Button type="submit" disabled={pending}>
        {pending ? "Importiert …" : "Importieren"}
      </Button>
    </form>
  );
}
