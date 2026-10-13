import { Check, CircleAlert, Clock } from "lucide-react";
import { formatUsd } from "@/lib/ai/budget";
import type { AiRun } from "@/lib/db/types";
import { formatDateTime } from "@/lib/format";

export type RunRow = Pick<AiRun, "id" | "status" | "documents" | "hint" | "cost_usd" | "exercises_created" | "summary" | "error" | "created_at" | "finished_at">;

const badge = "inline-flex h-7 shrink-0 items-center gap-1.5 rounded-pill px-3 text-[13px] font-bold leading-none";

function StatusBadge({ status }: { status: AiRun["status"] }) {
  if (status === "done")
    return (
      <span className={`${badge} bg-success-soft text-on-success-soft`}>
        <Check aria-hidden className="size-3.5" strokeWidth={3} />
        Fertig
      </span>
    );
  if (status === "failed")
    return (
      <span className={`${badge} bg-danger-soft text-on-danger-soft`}>
        <CircleAlert aria-hidden className="size-3.5" strokeWidth={3} />
        Fehlgeschlagen
      </span>
    );
  return (
    <span className={`${badge} bg-primary-soft text-on-primary-soft`}>
      <Clock aria-hidden className="size-3.5" strokeWidth={3} />
      In Arbeit
    </span>
  );
}

/** History of the module's generation runs (pure rendering). */
export function AiRunList({ runs }: { runs: RunRow[] }) {
  if (runs.length === 0) return null;
  return (
    <ul className="divide-y divide-border rounded-card border border-border bg-card">
      {runs.map((run) => {
        const cost = Number(run.cost_usd);
        const files = run.documents.map((d) => d.filename).join(" + ");
        return (
          <li key={run.id} className="space-y-1 px-4 py-3">
            <div className="flex items-start justify-between gap-3">
              <span className="min-w-0 flex-1">
                <span className="line-clamp-2 break-words text-sm font-medium">{files || "Ohne Dokumente"}</span>
                <span className="block text-sm text-muted">
                  {formatDateTime(run.created_at)}
                  {run.status === "done" ? ` · ${run.exercises_created} ${run.exercises_created === 1 ? "Entwurf" : "Entwürfe"} · ${formatUsd(cost)}` : null}
                  {run.status === "queued" || run.status === "processing" ? ` · reserviert bis zu ${formatUsd(cost)}` : null}
                  {run.status === "failed" && cost > 0 ? ` · ${formatUsd(cost)}` : null}
                </span>
              </span>
              <StatusBadge status={run.status} />
            </div>
            {run.hint ? <p className="text-sm text-muted">Hinweis: {run.hint}</p> : null}
            {run.summary ? <p className="text-sm">{run.summary}</p> : null}
            {run.error ? <p className="text-sm text-danger">{run.error}</p> : null}
          </li>
        );
      })}
    </ul>
  );
}
