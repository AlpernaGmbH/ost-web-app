"use client";

import Link from "next/link";
import { useEffect, useReducer, useState } from "react";
import { recordReview } from "@/app/actions/vocab";
import type { Entry, Mode } from "@/lib/vocab/queue";
import { current, initialState, isFinished, ratingFor, reduce, summary } from "@/lib/vocab/session";
import { Button, buttonClass, inputClass } from "./ui";

function speak(text: string) {
  try {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text.replace(/[()]/g, " ").replace(/\s+/g, " ").trim());
    utterance.lang = "en-GB";
    window.speechSynthesis.speak(utterance);
  } catch {
    // speech is a convenience; it must never break a study round
  }
}

function SpeakButton({ text }: { text: string }) {
  return (
    <button
      type="button"
      onClick={() => speak(text)}
      aria-label={`„${text}" anhören`}
      className="inline-flex size-11 items-center justify-center rounded-full border border-border bg-card text-lg"
    >
      🔊
    </button>
  );
}

export function StudySession({
  mode,
  entries,
  backHref,
  againHref,
}: {
  mode: Mode;
  entries: Entry[];
  backHref: string;
  againHref: string;
}) {
  const [state, dispatch] = useReducer(reduce, undefined, () => initialState(mode, entries));
  const [saveFailed, setSaveFailed] = useState(false);
  const [typed, setTyped] = useState("");
  const entry = current(state);

  function save(rating: 0 | 1 | 2 | 3) {
    if (!entry) return;
    recordReview({ cardId: entry.id, rating, mode })
      .then((result) => {
        if (!result.ok) setSaveFailed(true);
      })
      .catch(() => setSaveFailed(true));
  }

  function rate(rating: 0 | 2 | 3) {
    save(rating);
    dispatch({ type: "rate", rating });
  }

  function next() {
    if (state.verdict) save(ratingFor(state.verdict));
    setTyped("");
    dispatch({ type: "next" });
  }

  // keyboard: space flips, 1/2/3 rate (cards); enter continues after feedback (write/choice).
  // No dependency array on purpose: the handler must always see the latest state.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (mode === "cards") {
        if (!state.revealed && (e.key === " " || e.key === "Enter")) {
          e.preventDefault();
          dispatch({ type: "reveal" });
        } else if (state.revealed && (e.key === "1" || e.key === "2" || e.key === "3")) {
          rate(e.key === "1" ? 0 : e.key === "2" ? 2 : 3);
        }
      } else if (state.verdict && e.key === "Enter") {
        next();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  if (isFinished(state)) {
    const result = summary(state);
    return (
      <div className="space-y-5" data-testid="summary">
        <h2 className="text-xl font-bold">Runde geschafft</h2>
        <p className="text-lg">
          {result.correct} von {result.total} gleich beim ersten Mal gewusst.
        </p>
        {result.wrong.length > 0 ? (
          <div>
            <h3 className="mb-2 text-sm font-semibold text-muted">Zum Nachlernen</h3>
            <ul className="divide-y divide-border rounded-xl border border-border bg-card">
              {result.wrong.map((w) => (
                <li key={w.id} className="flex items-center justify-between gap-3 px-4 py-3">
                  <span>
                    <span className="block font-medium">{w.english}</span>
                    <span className="text-sm text-muted">{w.dir === "en-de" ? w.answer : w.prompt}</span>
                  </span>
                  <SpeakButton text={w.english} />
                </li>
              ))}
            </ul>
          </div>
        ) : null}
        {saveFailed ? <p className="text-sm text-danger">Ein Teil des Fortschritts konnte nicht gespeichert werden (Verbindung?).</p> : null}
        <div className="flex flex-col gap-2 sm:flex-row">
          {result.wrong.length > 0 ? (
            <Button onClick={() => dispatch({ type: "restart-wrong" })}>Falsche nochmals üben</Button>
          ) : null}
          <a href={againHref} className={buttonClass(result.wrong.length > 0 ? "secondary" : "primary")}>
            Nächste Runde
          </a>
          <Link href={backHref} className={buttonClass("ghost")}>
            Zurück zur Liste
          </Link>
        </div>
      </div>
    );
  }
  if (!entry) return null;

  const progress = Math.round((state.pos / state.queue.length) * 100);
  const targetLabel = entry.dir === "en-de" ? "Bedeutung" : "Begriff";

  return (
    <div className="space-y-5">
      <div>
        <div className="mb-1 flex justify-between text-xs text-muted">
          <span>
            {state.pos + 1} / {state.queue.length}
            {entry.attempt === 1 ? " · Wiederholung" : ""}
          </span>
          <Link href={backHref}>Beenden</Link>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-border" role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100}>
          <div className="h-full bg-primary transition-all" style={{ width: `${progress}%` }} />
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card p-6 text-center">
        <p className="mb-1 text-xs uppercase tracking-wide text-muted">{entry.dir === "en-de" ? "Begriff" : "Bedeutung"}</p>
        <p className="text-3xl font-semibold" data-testid="prompt">
          {entry.prompt}
        </p>
        {entry.dir === "en-de" ? (
          <div className="mt-3 flex justify-center">
            <SpeakButton text={entry.english} />
          </div>
        ) : null}
        {mode === "cards" && state.revealed ? (
          <div className="mt-5 border-t border-border pt-5">
            <p className="mb-1 text-xs uppercase tracking-wide text-muted">{targetLabel}</p>
            <p className="text-2xl" data-testid="answer">
              {entry.answer}
            </p>
            {entry.example ? <p className="mt-3 text-sm italic text-muted">{entry.example}</p> : null}
          </div>
        ) : null}
      </div>

      {mode === "cards" ? (
        state.revealed ? (
          <div className="grid grid-cols-3 gap-2">
            <Button variant="danger" onClick={() => rate(0)}>
              Nochmal
            </Button>
            <Button variant="secondary" onClick={() => rate(2)}>
              Gut
            </Button>
            <Button onClick={() => rate(3)}>Einfach</Button>
          </div>
        ) : (
          <Button className="w-full" onClick={() => dispatch({ type: "reveal" })}>
            Antwort zeigen
          </Button>
        )
      ) : null}

      {mode === "write" ? (
        state.verdict ? (
          <Feedback verdict={state.verdict} given={state.given} entry={entry} onNext={next} />
        ) : (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              dispatch({ type: "submit", text: typed });
            }}
            className="space-y-3"
          >
            <input
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              aria-label={`Antwort: ${targetLabel}`}
              placeholder={`${targetLabel} eintippen …`}
              autoFocus
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              className={inputClass}
            />
            <Button type="submit" className="w-full">
              Prüfen
            </Button>
          </form>
        )
      ) : null}

      {mode === "choice" && entry.options ? (
        <div className="space-y-2">
          {entry.options.map((option) => {
            const isAnswer = option.toLowerCase() === entry.answer.toLowerCase();
            const picked = state.given === option;
            const tone = !state.verdict
              ? "border-border bg-card hover:bg-border/40"
              : isAnswer
                ? "border-success bg-success/10"
                : picked
                  ? "border-danger bg-danger/10"
                  : "border-border bg-card opacity-60";
            return (
              <button
                key={option}
                type="button"
                disabled={Boolean(state.verdict)}
                onClick={() => dispatch({ type: "pick", option })}
                className={`min-h-12 w-full rounded-xl border px-4 py-3 text-left ${tone}`}
              >
                {option}
              </button>
            );
          })}
          {state.verdict ? (
            <Button className="w-full" onClick={next} autoFocus>
              Weiter
            </Button>
          ) : null}
        </div>
      ) : null}

      {saveFailed ? <p className="text-sm text-danger">Fortschritt konnte nicht gespeichert werden (Verbindung?). Du kannst weiterlernen.</p> : null}
    </div>
  );
}

function Feedback({
  verdict,
  given,
  entry,
  onNext,
}: {
  verdict: "correct" | "typo" | "wrong";
  given: string | null;
  entry: Entry;
  onNext: () => void;
}) {
  return (
    <div className="space-y-3" role="status" data-testid="feedback">
      {verdict === "correct" ? <p className="font-semibold text-success">Richtig!</p> : null}
      {verdict === "typo" ? (
        <p className="font-semibold text-success">
          Fast richtig, achte auf die Schreibweise: <span className="underline">{entry.answer}</span>
        </p>
      ) : null}
      {verdict === "wrong" ? (
        <div>
          <p className="font-semibold text-danger">Leider falsch.</p>
          <p className="text-sm text-muted">Deine Antwort: {given || "–"}</p>
          <p>
            Richtig: <span className="font-semibold">{entry.answer}</span>
          </p>
        </div>
      ) : null}
      {entry.example ? <p className="text-sm italic text-muted">{entry.example}</p> : null}
      <Button className="w-full" onClick={onNext} autoFocus>
        Weiter
      </Button>
    </div>
  );
}
