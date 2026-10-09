"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { saveNote } from "@/app/actions/notes";
import { Markdown } from "./markdown";

type Status = "saved" | "dirty" | "saving" | "error";
type Tool = "h2" | "list" | "bold" | "formula" | "block";

const TOOLS: { id: Tool; label: string }[] = [
  { id: "h2", label: "H2" },
  { id: "list", label: "• Liste" },
  { id: "bold", label: "Fett" },
  { id: "formula", label: "∑ Formel" },
  { id: "block", label: "Block" },
];

const draftKey = (lectureId: string) => `note-draft:${lectureId}`;

// localStorage can throw (private mode, blocked site data): the draft is a convenience, never a requirement.
function readDraft(lectureId: string): { content: string; savedAt: number } | null {
  try {
    const raw = localStorage.getItem(draftKey(lectureId));
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}
function writeDraft(lectureId: string, content: string) {
  try {
    localStorage.setItem(draftKey(lectureId), JSON.stringify({ content, savedAt: Date.now() }));
  } catch {}
}
function clearDraft(lectureId: string) {
  try {
    localStorage.removeItem(draftKey(lectureId));
  } catch {}
}

const STATUS_LABEL: Record<Status, string> = {
  saved: "Gespeichert",
  dirty: "Ungespeichert …",
  saving: "Speichert …",
  error: "Nicht gespeichert",
};

export function NoteEditor({
  lectureId,
  initialContent,
  initialUpdatedAt,
}: {
  lectureId: string;
  initialContent: string;
  initialUpdatedAt: string | null;
}) {
  const [content, setContent] = useState(initialContent);
  const [mode, setMode] = useState<"edit" | "preview">("edit");
  const [status, setStatus] = useState<Status>("saved");
  const [message, setMessage] = useState<string | null>(null);

  const latest = useRef(initialContent); // newest text, readable from async callbacks
  const persisted = useRef(initialContent); // text the server is known to have
  const inFlight = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const textarea = useRef<HTMLTextAreaElement>(null);

  // Saves until the server has the newest text. Text typed while a request is running is picked up by
  // the loop, so there is never more than one request in flight.
  const flush = useCallback(async () => {
    if (inFlight.current) return;
    inFlight.current = true;
    try {
      while (latest.current !== persisted.current) {
        const sending = latest.current;
        setStatus("saving");
        let result: Awaited<ReturnType<typeof saveNote>> | null = null;
        try {
          result = await saveNote(lectureId, sending);
        } catch {
          setMessage("Keine Verbindung. Der Entwurf bleibt auf diesem Gerät, es wird erneut versucht.");
        }
        if (!result?.ok) {
          if (result) setMessage(result.message ?? "Speichern fehlgeschlagen");
          setStatus("error");
          return;
        }
        persisted.current = sending;
      }
      clearDraft(lectureId);
      setMessage(null);
      setStatus("saved");
    } finally {
      inFlight.current = false;
    }
  }, [lectureId]);

  // after a failed save, try again every few seconds until it works
  useEffect(() => {
    if (status !== "error") return;
    const retry = setTimeout(() => void flush(), 5000);
    return () => clearTimeout(retry);
  }, [status, flush]);

  const update = useCallback(
    (next: string) => {
      latest.current = next;
      setContent(next);
      setStatus("dirty");
      writeDraft(lectureId, next);
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(flush, 800);
    },
    [flush, lectureId],
  );

  // Restore a newer local draft (e.g. the connection dropped before the last autosave). localStorage
  // only exists in the browser, so this one-time read has to happen after mount.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    const draft = readDraft(lectureId);
    const serverTime = initialUpdatedAt ? Date.parse(initialUpdatedAt) : 0;
    if (draft && draft.content !== initialContent && draft.savedAt > serverTime) {
      update(draft.content);
      setMessage("Ungespeicherter Entwurf von diesem Gerät wiederhergestellt.");
    } else if (draft) {
      clearDraft(lectureId);
    }
    // run once on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  // save when the page is hidden or closed; warn if something is still unsaved
  useEffect(() => {
    const onHide = () => {
      if (document.visibilityState === "hidden") void flush();
    };
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (latest.current !== persisted.current) e.preventDefault();
    };
    document.addEventListener("visibilitychange", onHide);
    window.addEventListener("pagehide", flush);
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => {
      document.removeEventListener("visibilitychange", onHide);
      window.removeEventListener("pagehide", flush);
      window.removeEventListener("beforeunload", onBeforeUnload);
      if (timer.current) clearTimeout(timer.current);
      void flush();
    };
  }, [flush]);

  function wrapSelection(before: string, after: string, placeholder: string) {
    const el = textarea.current;
    if (!el) return;
    const { selectionStart: start, selectionEnd: end, value } = el;
    const selected = value.slice(start, end) || placeholder;
    update(value.slice(0, start) + before + selected + after + value.slice(end));
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(start + before.length, start + before.length + selected.length);
    });
  }

  function prefixLine(prefix: string) {
    const el = textarea.current;
    if (!el) return;
    const { selectionStart: start, value } = el;
    const lineStart = value.lastIndexOf("\n", start - 1) + 1;
    update(value.slice(0, lineStart) + prefix + value.slice(lineStart));
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(start + prefix.length, start + prefix.length);
    });
  }

  function runTool(tool: Tool) {
    if (tool === "h2") prefixLine("## ");
    else if (tool === "list") prefixLine("- ");
    else if (tool === "bold") wrapSelection("**", "**", "Text");
    else if (tool === "formula") wrapSelection("$", "$", "x^2");
    else wrapSelection("\n$$\n", "\n$$\n", "a = b + c");
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div role="tablist" className="inline-flex rounded-pill border border-border bg-card p-1 text-sm">
          {(["edit", "preview"] as const).map((m) => (
            <button
              key={m}
              role="tab"
              aria-selected={mode === m}
              onClick={() => setMode(m)}
              className={`min-h-9 rounded-pill px-4 font-bold ${mode === m ? "bg-primary text-primary-foreground" : ""}`}
            >
              {m === "edit" ? "Schreiben" : "Vorschau"}
            </button>
          ))}
        </div>
        <span
          role="status"
          data-testid="save-status"
          className={`text-sm ${status === "error" ? "text-danger" : "text-muted"}`}
        >
          {STATUS_LABEL[status]}
        </span>
      </div>

      {mode === "edit" ? (
        <>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {TOOLS.map((t) => (
              <button
                key={t.id}
                type="button"
                // keep the textarea selection while tapping a toolbar button
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => runTool(t.id)}
                className="min-h-9 shrink-0 rounded-pill border-2 border-control bg-card px-4 text-sm font-bold text-primary-ink"
              >
                {t.label}
              </button>
            ))}
          </div>
          <textarea
            ref={textarea}
            value={content}
            onChange={(e) => update(e.target.value)}
            onBlur={() => void flush()}
            aria-label="Notiz (Markdown)"
            placeholder="Notizen in Markdown. Formeln: $x^2$ oder $$ … $$"
            lang="de"
            spellCheck
            className="min-h-[55dvh] w-full resize-y rounded-field border-2 border-control bg-card p-4 font-mono text-[15px] leading-relaxed hover:border-primary"
          />
        </>
      ) : (
        <div className="min-h-[55dvh] rounded-field border border-border bg-card p-4">
          {content.trim() ? <Markdown>{content}</Markdown> : <p className="text-muted">Noch nichts geschrieben.</p>}
        </div>
      )}

      {message ? (
        <p className={`text-sm ${status === "error" ? "text-danger" : "text-muted"}`}>{message}</p>
      ) : null}
    </div>
  );
}
