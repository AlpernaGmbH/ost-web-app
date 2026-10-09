"use client";

import { Check, Minus, X } from "lucide-react";
import { useActionState, useEffect, useState, type ReactNode } from "react";
import { recordAttempt } from "@/app/actions/exercises";
import { formatDuration } from "@/lib/exercises/stats";
import { RESULTS } from "@/lib/exercises/types";
import type { FormState } from "@/lib/form-state";
import { Button, FormMessage } from "./ui";

const initial: FormState = {};
// always icon and word; the three answers are outlined, so the timer start stays the one primary button
const RESULT_STYLE = {
  correct: { cls: "border-success text-on-success-soft hover:bg-success-soft", Icon: Check },
  partial: { cls: "border-control text-foreground hover:bg-accent-soft", Icon: Minus },
  wrong: { cls: "border-danger text-danger hover:bg-danger-soft", Icon: X },
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
      <div className="flex items-center justify-between gap-3 rounded-card border border-border bg-card p-4">
        <span role="timer" aria-label="Verstrichene Zeit" className={`score ${over ? "text-accent-ink" : ""}`}>
          {formatDuration(seconds)}
        </span>
        <div className="flex gap-2">
          <Button type="button" variant={running ? "secondary" : "primary"} onClick={() => setRunning((r) => !r)}>
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
        <p className="font-bold">Wie ist es gelaufen?</p>
        <div className="grid grid-cols-3 gap-2">
          {RESULTS.map((r) => {
            const { cls, Icon } = RESULT_STYLE[r.id];
            return (
            <button
              key={r.id}
              type="submit"
              name="result"
              value={r.id}
              disabled={pending}
              className={`flex min-h-12 flex-col items-center justify-center gap-0.5 rounded-pill border-2 bg-card px-2 text-sm font-bold leading-tight transition-colors duration-150 ease-out disabled:opacity-50 sm:flex-row sm:gap-2 sm:text-base ${cls}`}
            >
              <Icon aria-hidden className="size-4" strokeWidth={3} />
              {r.label}
            </button>
            );
          })}
        </div>
        <FormMessage state={state} />
      </form>
    </div>
  );
}
