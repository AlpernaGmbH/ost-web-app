import { buttonClass } from "./ui";

/** Plain GET form (no JavaScript needed): picks direction and word scope, the buttons choose the mode. */
export function StudyForm({ action, choiceOk, defaultScope }: { action: string; choiceOk: boolean; defaultScope: "due" | "all" }) {
  return (
    <form action={action} method="get" className="space-y-3 rounded-xl border border-border bg-card p-4">
      <div className="grid grid-cols-2 gap-2">
        <label className="block text-sm">
          Richtung
          <select name="dir" defaultValue="auto" className="mt-1 min-h-11 w-full rounded-lg border border-border bg-card px-3">
            <option value="auto">Automatisch (empfohlen)</option>
            <option value="en-de">Begriff → Bedeutung</option>
            <option value="de-en">Bedeutung → Begriff</option>
            <option value="mixed">Gemischt</option>
          </select>
        </label>
        <label className="block text-sm">
          Welche Wörter
          <select name="scope" defaultValue={defaultScope} className="mt-1 min-h-11 w-full rounded-lg border border-border bg-card px-3">
            <option value="due">Fällige und neue</option>
            <option value="all">Alle (Zufall)</option>
          </select>
        </label>
      </div>
      <div className="grid grid-cols-3 gap-2">
        <button name="mode" value="cards" className={buttonClass("primary")}>
          Karten
        </button>
        <button name="mode" value="write" className={buttonClass("secondary")}>
          Schreiben
        </button>
        <button name="mode" value="choice" disabled={!choiceOk} className={buttonClass("secondary")}>
          Auswahl
        </button>
      </div>
      <p className="text-xs text-muted">
        Automatisch: Bei „Karten“ siehst du zuerst den Begriff. Bei „Schreiben“ und „Auswahl“ siehst du die Bedeutung und nennst den Begriff.
      </p>
      {!choiceOk ? <p className="text-xs text-muted">„Auswahl“ braucht mindestens 4 verschiedene Bedeutungen.</p> : null}
    </form>
  );
}
