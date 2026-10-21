import { BookOpen, CalendarDays, Check, FileText, LayoutDashboard, ListChecks, PenLine, Sparkles, Upload, X } from "lucide-react";
import type { ReactNode } from "react";

// Mockups of the app drawn with the design tokens: no screenshots, no real material, invented subjects only.
// Each device is one accessible image (role="img" + label); everything inside is decorative.

const SUBJECTS = {
  stat: { name: "Statistik", surface: "var(--mod-1)", ink: "var(--mod-1-ink)" },
  law: { name: "Recht", surface: "var(--mod-2)", ink: "var(--mod-2-ink)" },
  en: { name: "Englisch", surface: "var(--mod-4)", ink: "var(--mod-4-ink)" },
  mkt: { name: "Marketing", surface: "var(--mod-5)", ink: "var(--mod-5-ink)" },
} as const;
type Subject = (typeof SUBJECTS)[keyof typeof SUBJECTS];

function Chip({ subject, className = "" }: { subject: Subject; className?: string }) {
  return (
    <span className={`inline-flex rounded-tag px-1.5 py-0.5 text-[10px] font-bold leading-3 ${className}`} style={{ background: subject.surface, color: subject.ink }}>
      {subject.name}
    </span>
  );
}

const card = "rounded-field border border-border bg-card";

export function Phone({ children, label, className = "" }: { children: ReactNode; label: string; className?: string }) {
  // an empty label marks a purely decorative repeat (the hero shows the phone next to the laptop)
  const a11y = label ? { role: "img", "aria-label": label } : { "aria-hidden": true };
  return (
    <figure {...a11y} className={`mx-auto w-[250px] ${className}`.trim()}>
      <div aria-hidden className="rounded-[2.1rem] bg-brand-deep p-[6px] shadow-lift">
        <div className="overflow-hidden rounded-[1.75rem] bg-background">
          <div className="flex justify-center pt-2">
            <span className="h-1.5 w-14 rounded-pill bg-ink/30" />
          </div>
          <div className="h-[470px] overflow-hidden px-3 pb-3 pt-2 text-[11px] leading-[15px] text-foreground">{children}</div>
        </div>
      </div>
    </figure>
  );
}

export function Laptop({ children, label, className = "" }: { children: ReactNode; label: string; className?: string }) {
  return (
    <figure role="img" aria-label={label} className={`w-full ${className}`.trim()}>
      <div aria-hidden>
        <div className="rounded-t-[14px] bg-brand-deep p-2 pb-0 shadow-lift">
          <div className="overflow-hidden rounded-t-[8px] bg-background">
            <div className="aspect-[16/10] text-[10px] leading-[14px] text-foreground sm:text-[11px] sm:leading-[15px]">{children}</div>
          </div>
        </div>
        <div className="mx-[-2%] h-3 rounded-b-[10px] bg-brand-deep" />
      </div>
    </figure>
  );
}

/* ---------------------------------------------------------------- screens */

function Sidebar() {
  const items = [
    ["Dashboard", LayoutDashboard, true],
    ["Fächer", BookOpen, false],
    ["Aufgaben", ListChecks, false],
    ["Stundenplan", CalendarDays, false],
    ["Üben", PenLine, false],
  ] as const;
  return (
    <aside className="hidden w-[108px] shrink-0 border-r border-border bg-card p-2 sm:block">
      <p className="wordmark mb-2 px-2 text-[14px]">Pensum</p>
      {items.map(([label, Icon, active]) => (
        <p key={label} className={`mb-0.5 flex items-center gap-1.5 rounded-pill px-2 py-1 font-bold ${active ? "bg-primary-soft text-on-primary-soft" : ""}`}>
          <Icon className="size-3" strokeWidth={2.5} />
          {label}
        </p>
      ))}
    </aside>
  );
}

function Lecture({ time, subject, room }: { time: string; subject: Subject; room: string }) {
  return (
    <div className="flex items-center gap-2 py-1.5">
      <span className="num w-9 shrink-0 font-bold">{time}</span>
      <span className="min-w-0 flex-1">
        <span className="block truncate font-bold">{subject.name}: Vorlesung</span>
        <span className="block text-muted">Raum {room}</span>
      </span>
      <Chip subject={subject} />
    </div>
  );
}

export function DashboardScreen() {
  return (
    <div className="flex h-full">
      <Sidebar />
      <div className="min-w-0 flex-1 space-y-2 p-3">
        <p className="display-md text-[15px] leading-5">Mittwoch</p>
        <section className={`${card} p-2`}>
          <p className="label mb-1 text-[9px] text-muted">Heute</p>
          <Lecture time="08:15" subject={SUBJECTS.stat} room="3.12" />
          <Lecture time="10:15" subject={SUBJECTS.law} room="1.04" />
          <Lecture time="14:00" subject={SUBJECTS.mkt} room="2.20" />
        </section>
        <div className="grid grid-cols-2 gap-2">
          <section className={`${card} p-2`}>
            <p className="label mb-1 text-[9px] text-muted">Fällig</p>
            <p className="flex justify-between gap-2">
              <span className="truncate">Übungsserie 4</span>
              <span className="shrink-0 text-muted">Fr</span>
            </p>
            <p className="flex justify-between gap-2">
              <span className="truncate">Fallstudie lesen</span>
              <span className="shrink-0 text-muted">Mo</span>
            </p>
            <p className="flex justify-between gap-2">
              <span className="truncate">Vokabeln Lektion 3</span>
              <span className="shrink-0 text-muted">heute</span>
            </p>
          </section>
          <section className={`${card} p-2`}>
            <p className="label mb-1 text-[9px] text-muted">Üben</p>
            <p className="flex items-center justify-between gap-2">
              <Chip subject={SUBJECTS.stat} />
              <span className="num text-muted">14 offen</span>
            </p>
            <div className="mt-1 h-1.5 overflow-hidden rounded-pill bg-sunken">
              <div className="h-full w-[62%] rounded-pill bg-primary" />
            </div>
            <p className="mt-1.5 flex items-center justify-between gap-2">
              <Chip subject={SUBJECTS.en} />
              <span className="num text-muted">12 Wörter fällig</span>
            </p>
            <div className="mt-1 h-1.5 overflow-hidden rounded-pill bg-sunken">
              <div className="h-full w-[35%] rounded-pill bg-primary" />
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

function RateButton({ children, primary = false }: { children: ReactNode; primary?: boolean }) {
  return (
    <span className={`inline-flex min-h-7 flex-1 items-center justify-center rounded-pill border-2 px-1 font-bold ${primary ? "border-transparent bg-primary text-primary-foreground" : "border-control bg-card text-primary-ink"}`}>
      {children}
    </span>
  );
}

export function ExerciseScreen() {
  return (
    <div className="space-y-2">
      <p className="flex items-center justify-between">
        <Chip subject={SUBJECTS.stat} />
        <span className="num text-muted">03:40</span>
      </p>
      <p className="heading text-[14px] leading-[18px]">Mittelwert und Median</p>
      <p className="flex flex-wrap gap-1 text-[10px] text-muted">
        <span className="rounded-tag bg-sunken px-1.5">Lagemasse</span>
        <span className="rounded-tag bg-sunken px-1.5">Taschenrechner</span>
        <span className="rounded-tag bg-sunken px-1.5">ca. 5 Min.</span>
      </p>
      <div className={`${card} p-2`}>
        <p>Gegeben sind die Werte 4, 7, 9, 12 und 18. Berechne das arithmetische Mittel und den Median.</p>
      </div>
      <div className={`${card} p-2`}>
        <p className="label mb-1 text-[9px] text-muted">Lösung</p>
        <p className="num">x̄ = (4 + 7 + 9 + 12 + 18) / 5 = 10</p>
        <p className="num">Median: mittlerer Wert der geordneten Reihe = 9</p>
      </div>
      <p className="label text-[9px] text-muted">Wie ist es gelaufen?</p>
      <div className="flex gap-1.5">
        <RateButton>Falsch</RateButton>
        <RateButton>Teilweise</RateButton>
        <RateButton primary>Richtig</RateButton>
      </div>
    </div>
  );
}

export function VocabScreen() {
  return (
    <div className="flex h-full flex-col">
      <p className="flex items-center justify-between">
        <Chip subject={SUBJECTS.en} />
        <span className="num text-muted">7 von 12</span>
      </p>
      <div className="mt-1 h-1.5 overflow-hidden rounded-pill bg-sunken">
        <div className="h-full w-[58%] rounded-pill bg-primary" />
      </div>
      <div className={`${card} mt-3 flex flex-1 flex-col justify-center p-3 text-center`}>
        <p className="card-word text-[24px] leading-7">resilient</p>
        <p className="mt-3 text-muted">widerstandsfähig; erholt sich schnell</p>
        <p className="mt-3 italic">“The team stayed resilient after the setback.”</p>
      </div>
      <div className="mt-3 grid grid-cols-4 gap-1 text-[10px]">
        <RateButton>Nochmals</RateButton>
        <RateButton>Schwer</RateButton>
        <RateButton primary>Gut</RateButton>
        <RateButton>Leicht</RateButton>
      </div>
      <p className="mt-2 text-center text-[10px] text-muted">nächste Abfrage in 6 Tagen</p>
    </div>
  );
}

function Draft({ title, topic, minutes, checked = true }: { title: string; topic: string; minutes: number; checked?: boolean }) {
  return (
    <div className="flex items-center gap-2 border-t border-border py-1.5 first:border-t-0">
      <span className={`flex size-4 shrink-0 items-center justify-center rounded border-2 ${checked ? "border-primary bg-primary text-primary-foreground" : "border-control bg-card"}`}>
        {checked ? <Check className="size-3" strokeWidth={3} /> : null}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate font-bold">{title}</span>
        <span className="block text-muted">
          {topic} · ca. {minutes} Min. · Lösung aus Quelle
        </span>
      </span>
    </div>
  );
}

export function DraftsScreen() {
  return (
    <div className="flex h-full">
      <Sidebar />
      <div className="min-w-0 flex-1 space-y-2 p-3">
        <p className="flex items-center justify-between">
          <span className="display-md text-[15px] leading-5">Entwürfe prüfen</span>
          <Chip subject={SUBJECTS.stat} />
        </p>
        <p className="flex items-center gap-1.5 text-muted">
          <Sparkles className="size-3" strokeWidth={2.5} />
          3 Entwürfe aus Übungsblatt-3.pdf und Lösungen-3.pdf
        </p>
        <section className={`${card} px-2`}>
          <Draft title="Aufgabe 3.1: Mittelwert und Streuung" topic="Lagemasse" minutes={8} />
          <Draft title="Aufgabe 3.2: Histogramm zeichnen" topic="Häufigkeiten" minutes={12} />
          <Draft title="Aufgabe 3.3: Quartile bestimmen" topic="Lagemasse" minutes={6} checked={false} />
        </section>
        <div className="flex gap-2">
          <span className="inline-flex min-h-7 items-center gap-1 rounded-pill bg-primary px-3 font-bold text-primary-foreground">
            <Check className="size-3" strokeWidth={3} />2 annehmen
          </span>
          <span className="inline-flex min-h-7 items-center gap-1 rounded-pill border-2 border-danger px-3 font-bold text-danger">
            <X className="size-3" strokeWidth={3} />1 verwerfen
          </span>
        </div>
      </div>
    </div>
  );
}

const WEEK: { day: string; blocks: { top: number; height: number; subject: Subject }[] }[] = [
  { day: "Mo", blocks: [{ top: 0, height: 22, subject: SUBJECTS.stat }, { top: 48, height: 22, subject: SUBJECTS.en }] },
  { day: "Di", blocks: [{ top: 26, height: 30, subject: SUBJECTS.law }] },
  { day: "Mi", blocks: [{ top: 0, height: 22, subject: SUBJECTS.stat }, { top: 26, height: 22, subject: SUBJECTS.law }, { top: 70, height: 20, subject: SUBJECTS.mkt }] },
  { day: "Do", blocks: [{ top: 48, height: 30, subject: SUBJECTS.mkt }] },
  { day: "Fr", blocks: [{ top: 0, height: 22, subject: SUBJECTS.en }] },
];

export function ScheduleScreen() {
  return (
    <div className="flex h-full flex-col">
      <p className="flex items-center justify-between">
        <span className="display-md text-[15px] leading-5">Stundenplan</span>
        <span className="rounded-pill bg-primary px-2 py-0.5 text-[10px] font-bold text-primary-foreground">Heute</span>
      </p>
      <p className="text-muted">Woche 6 · 19.–25.10.</p>
      <div className="mt-2 grid flex-1 grid-cols-5 gap-1">
        {WEEK.map(({ day, blocks }) => (
          <div key={day} className="flex flex-col">
            <span className={`mb-1 text-center text-[10px] font-bold ${day === "Mi" ? "text-primary-ink" : "text-muted"}`}>{day}</span>
            <div className="relative flex-1 rounded-field bg-sunken">
              {blocks.map((b, i) => (
                <span
                  key={i}
                  className="absolute inset-x-0.5 rounded-tag px-0.5 text-[8px] font-bold leading-3"
                  style={{ top: `${b.top}%`, height: `${b.height}%`, background: b.subject.surface, color: b.subject.ink }}
                >
                  {b.subject.name}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
      <div className={`${card} mt-3 p-2`}>
        <p className="label mb-1 text-[9px] text-muted">Heute</p>
        <Lecture time="10:15" subject={SUBJECTS.law} room="1.04" />
        <Lecture time="14:00" subject={SUBJECTS.mkt} room="2.20" />
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------- small visuals for the three steps */

export function StepVisual({ step }: { step: 1 | 2 | 3 }) {
  const base = "h-32 overflow-hidden rounded-field border border-border bg-sunken p-3 text-[11px] leading-[15px]";
  if (step === 1) {
    return (
      <div aria-hidden className={base}>
        <p className="label text-[9px] text-muted">Fächer</p>
        <p className="mt-1.5 flex flex-wrap gap-1">
          <Chip subject={SUBJECTS.stat} className="text-[11px]" />
          <Chip subject={SUBJECTS.law} className="text-[11px]" />
          <Chip subject={SUBJECTS.en} className="text-[11px]" />
          <Chip subject={SUBJECTS.mkt} className="text-[11px]" />
        </p>
        <p className="label mt-3 text-[9px] text-muted">iCal-Link</p>
        <p className="mt-1 truncate rounded-field border-2 border-control bg-card px-2 py-1 text-muted">https://…/stundenplan.ics</p>
      </div>
    );
  }
  if (step === 2) {
    return (
      <div aria-hidden className={base}>
        <div className="flex h-full flex-col items-center justify-center rounded-field border-2 border-dashed border-control bg-card text-center">
          <Upload className="size-5 text-primary-ink" strokeWidth={2.25} />
          <p className="mt-1 font-bold">PDF hierher ziehen</p>
          <p className="mt-1 flex items-center gap-1 text-muted">
            <FileText className="size-3" /> Übungsblatt-3.pdf
          </p>
        </div>
      </div>
    );
  }
  return (
    <div aria-hidden className={base}>
      <p className="label text-[9px] text-muted">Heute</p>
      <Lecture time="10:15" subject={SUBJECTS.law} room="1.04" />
      <p className="mt-1 flex items-center justify-between">
        <span>Fällig: Übungsserie 4</span>
        <span className="text-muted">Fr</span>
      </p>
      <p className="mt-1 flex items-center justify-between">
        <Chip subject={SUBJECTS.en} />
        <span className="num text-muted">12 Wörter fällig</span>
      </p>
    </div>
  );
}
