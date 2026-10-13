"use client";

import { BookOpen, CalendarDays, LayoutDashboard, ListChecks, PenLine, Settings } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const PRACTICE = /^\/m\/[^/]+\/(ex|vocab)\//;

type Item = { href: string; label: string; short: string; Icon: typeof BookOpen; active: (path: string) => boolean };

// One list for both navigations; `short` is the label on the phone where five items share the width.
const ITEMS: Item[] = [
  { href: "/", label: "Dashboard", short: "Dashboard", Icon: LayoutDashboard, active: (p) => p === "/" },
  { href: "/faecher", label: "Fächer", short: "Fächer", Icon: BookOpen, active: (p) => p.startsWith("/faecher") || (p.startsWith("/m/") && !PRACTICE.test(p)) },
  { href: "/aufgaben", label: "Aufgaben", short: "Aufgaben", Icon: ListChecks, active: (p) => p.startsWith("/aufgaben") },
  { href: "/stundenplan", label: "Stundenplan", short: "Plan", Icon: CalendarDays, active: (p) => p.startsWith("/stundenplan") },
  { href: "/ueben", label: "Üben", short: "Üben", Icon: PenLine, active: (p) => p.startsWith("/ueben") || PRACTICE.test(p) },
];
const SETTINGS: Item = { href: "/settings", label: "Einstellungen", short: "Einstellungen", Icon: Settings, active: (p) => p.startsWith("/settings") };

/** Desktop: a column on the left with every page, settings at the bottom. Hidden on phones. */
export function Sidebar() {
  const pathname = usePathname();
  const link = ({ href, label, Icon, active }: Item) => {
    const current = active(pathname);
    return (
      <Link
        key={href}
        href={href}
        aria-current={current ? "page" : undefined}
        className={`flex min-h-12 items-center gap-3 rounded-pill px-4 font-bold transition-colors duration-150 ease-out ${current ? "bg-primary-soft text-on-primary-soft" : "text-foreground hover:bg-sunken"}`}
      >
        <Icon aria-hidden className="size-5 shrink-0" strokeWidth={2.25} />
        {label}
      </Link>
    );
  };
  return (
    <nav aria-label="Hauptnavigation" className="fixed inset-y-0 left-0 z-10 hidden w-60 flex-col border-r border-border bg-card p-4 md:flex">
      <Link href="/" className="wordmark mb-6 block px-4 pt-2 text-[28px]">
        Pensum
      </Link>
      <div className="flex flex-1 flex-col gap-1">{ITEMS.map(link)}</div>
      <div className="border-t border-border pt-3">{link(SETTINGS)}</div>
    </nav>
  );
}

/** Phone: the five main pages along the bottom edge; settings live on the dashboard. Hidden from `md` up. */
export function BottomNav() {
  const pathname = usePathname();
  return (
    <nav aria-label="Hauptnavigation" className="fixed inset-x-0 bottom-0 z-10 border-t border-border bg-card md:hidden" style={{ paddingBottom: "env(safe-area-inset-bottom)" }}>
      <ul className="mx-auto flex max-w-2xl">
        {ITEMS.map(({ href, short, Icon, active }) => {
          const current = active(pathname);
          return (
            <li key={href} className="min-w-0 flex-1">
              <Link href={href} aria-current={current ? "page" : undefined} className="flex min-h-16 flex-col items-center justify-center gap-1 text-[12px]">
                <span className={`flex h-8 w-14 items-center justify-center rounded-pill transition-colors duration-150 ease-out ${current ? "bg-primary-soft text-on-primary-soft" : "text-muted"}`}>
                  <Icon aria-hidden className="size-6" strokeWidth={2} />
                </span>
                <span className={`max-w-full truncate ${current ? "font-bold text-foreground" : "text-muted"}`}>{short}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
