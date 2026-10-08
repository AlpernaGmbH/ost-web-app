"use client";

import { useActionState, useEffect, useState, type ReactNode } from "react";
import { recordAttempt } from "@/app/actions/exercises";
import { formatDuration } from "@/lib/exercises/stats";
import { RESULTS } from "@/lib/exercises/types";
import type { FormState } from "@/lib/form-state";
import { Button, FormMessage } from "./ui";

const initial: FormState = {};
const RESULT_STYLE = {
  correct: "border-success/50 text-success hover:bg-success/10",
  partial: "border-border hover:bg-border/40",
  wrong: "border-danger/50 text-danger hover:bg-danger/10",
} as const;

/**
 * Timer, the solution (children) and the self-assessment of one attempt. The page remounts this component
 * with a new `key` after every saved attempt, which resets the timer.
 */
export function ExerciseRunner({ exerciseId, estimatedMinutes, children }: { exerciseId: string; estimatedMinutes: number | null; children?: ReactNode }) {
  const [state, action, pending] = useActionState(recordAttempt, initial);
  const [seconds, setSeconds] = useState(0);
  const [running, setRunning] = useState(false);

  useEffect(() => {
    if (!running) return;
    const timer = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(timer);
  }, [running]);

  const over = estimatedMinutes !== null && seconds > estimatedMinutes * 60;
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 rounded-xl border border-border bg-card p-3">
        <span role="timer" aria-label="Verstrichene Zeit" className={`text-2xl font-semibold tabular-nums ${over ? "text-danger" : ""}`}>
          {formatDuration(seconds)}
        </span>
        <div className="flex gap-2">
          <Button type="button" variant="secondary" onClick={() => setRunning((r) => !r)}>
            {running ? "Pause" : seconds > 0 ? "Weiter" : "Timer starten"}
          </Button>
          {seconds > 0 ? (
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setRunning(false);
                setSeconds(0);
              }}
            >
              Zurücksetzen
            </Button>
          ) : null}
        </div>
      </div>

      {children}

      <form action={action} className="space-y-2">
        <input type="hidden" name="exerciseId" value={exerciseId} />
        <input type="hidden" name="seconds" value={seconds > 0 ? seconds : ""} />
        <p className="text-sm font-medium">Wie ist es gelaufen?</p>
        <div className="grid grid-cols-3 gap-2">
          {RESULTS.map((r) => (
            <button
              key={r.id}
              type="submit"
              name="result"
              value={r.id}
              disabled={pending}
              className={`min-h-12 rounded-lg border bg-card px-2 text-sm font-medium transition-colors disabled:opacity-50 ${RESULT_STYLE[r.id]}`}
            >
              {r.label}
            </button>
          ))}
        </div>
        <FormMessage state={state} />
      </form>
    </div>
  );
}
