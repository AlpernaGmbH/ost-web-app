"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { generateExercises, syncAiRuns } from "@/app/actions/ai";
import type { FormState } from "@/lib/form-state";
import { Button, FormMessage, inputClass } from "./ui";

const initial: FormState = {};

export type GenerateDoc = { id: string; filename: string; size: string; pdf: boolean };

/** Pick PDFs of the module (sheet and solution together), add a focus, start a run. */
export function AiGenerateForm({ moduleId, documents, enabled, disabledReason }: { moduleId: string; documents: GenerateDoc[]; enabled: boolean; disabledReason?: string }) {
  const [state, action, pending] = useActionState(generateExercises, initial);
  const pdfs = documents.filter((d) => d.pdf);
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="moduleId" value={moduleId} />
      <p className="text-sm text-muted">
        Wähle die PDFs, aus denen Übungen entstehen sollen. Übungsblatt und Lösung zusammen wählen, dann übernimmt die KI die Musterlösungen. Was entsteht, sind
        Entwürfe: du prüfst sie und übernimmst sie mit einem Klick.
      </p>
      {pdfs.length === 0 ? (
        <p className="text-sm">Noch keine PDFs in diesem Modul. Lade sie im Tab «Dokumente» hoch, einzeln oder als ZIP.</p>
      ) : (
        <fieldset className="space-y-2">
          <legend className="text-sm">Dokumente (höchstens 5, zusammen max. 32 MB)</legend>
          {pdfs.map((d) => (
            <label key={d.id} className="flex min-h-12 items-center gap-3 rounded-field border-2 border-control bg-card px-4 text-base">
              <input type="checkbox" name="documentIds" value={d.id} className="size-5 shrink-0" />
              <span className="min-w-0 flex-1 truncate">{d.filename}</span>
              <span className="shrink-0 text-sm text-muted">{d.size}</span>
            </label>
          ))}
        </fieldset>
      )}
      {documents.length > pdfs.length ? <p className="text-sm text-muted">Nur PDFs werden gelesen. Word- oder PowerPoint-Dateien zuerst als PDF speichern.</p> : null}
      <label className="block text-sm">
        Hinweis für die KI (optional)
        <input name="hint" maxLength={500} placeholder="z. B. nur Kapitel 3, oder: nur Aufgaben mit Lösung" className={`${inputClass} mt-1`} />
      </label>
      {enabled ? (
        <Button type="submit" variant="secondary" disabled={pending || pdfs.length === 0} className="w-full">
          {pending ? "Wird gestartet …" : "Entwürfe erzeugen"}
        </Button>
      ) : (
        <p className="rounded-field bg-sunken p-4 text-sm">{disabledReason ?? "KI-Erzeugung ist nicht eingerichtet."}</p>
      )}
      <FormMessage state={state} />
    </form>
  );
}

/** While runs are open: asks the server for results on mount and every 20 seconds, then refreshes the page. */
export function AiRunPoller({ moduleId, queued }: { moduleId: string; queued: number }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [checkedAt, setCheckedAt] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  async function check() {
    if (busy) return;
    setBusy(true);
    try {
      const result = await syncAiRuns(moduleId);
      setCheckedAt(new Date().toLocaleTimeString("de-CH", { hour: "2-digit", minute: "2-digit" }));
      if (result.changed) router.refresh();
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    if (queued === 0) return;
    // first look after a second (the run was just started), then every 20 seconds
    const first = setTimeout(() => void check(), 1_000);
    timer.current = setInterval(() => void check(), 20_000);
    return () => {
      clearTimeout(first);
      if (timer.current) clearInterval(timer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [moduleId, queued]);

  if (queued === 0) return null;
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 rounded-field bg-primary-soft p-4 text-sm text-on-primary-soft">
      <span>
        {queued === 1 ? "Ein Durchlauf" : `${queued} Durchläufe`} in Arbeit. Die Seite prüft alle 20 Sekunden nach.
        {checkedAt ? ` Zuletzt ${checkedAt}.` : ""}
      </span>
      <Button type="button" variant="ghost" size="sm" onClick={() => void check()} disabled={busy}>
        {busy ? "Prüft …" : "Jetzt prüfen"}
      </Button>
    </div>
  );
}
