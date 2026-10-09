"use client";

import { BookOpen, CalendarDays, PenLine, Settings } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const PRACTICE = /^\/m\/[^/]+\/(ex|vocab)\//;

const items = [
  { href: "/", label: "Module", Icon: BookOpen, active: (p: string) => p === "/" || (p.startsWith("/m/") && !PRACTICE.test(p)) },
  { href: "/ueben", label: "Üben", Icon: PenLine, active: (p: string) => p.startsWith("/ueben") || PRACTICE.test(p) },
  { href: "/stundenplan", label: "Plan", Icon: CalendarDays, active: (p: string) => p.startsWith("/stundenplan") },
  { href: "/settings", label: "Einstellungen", Icon: Settings, active: (p: string) => p.startsWith("/settings") },
];

export function BottomNav() {
  const pathname = usePathname();
  return (
    <nav aria-label="Hauptnavigation" className="fixed inset-x-0 bottom-0 z-10 border-t border-border bg-card" style={{ paddingBottom: "env(safe-area-inset-bottom)" }}>
      <ul className="mx-auto flex max-w-2xl">
        {items.map(({ href, label, Icon, active }) => {
          const current = active(pathname);
          return (
            <li key={href} className="flex-1">
              <Link href={href} aria-current={current ? "page" : undefined} className="flex min-h-16 flex-col items-center justify-center gap-1 text-[13px]">
                <span className={`flex h-8 w-16 items-center justify-center rounded-pill transition-colors duration-150 ease-out ${current ? "bg-primary-soft text-on-primary-soft" : "text-muted"}`}>
                  <Icon aria-hidden className="size-6" strokeWidth={2} />
                </span>
                <span className={current ? "font-bold text-foreground" : "text-muted"}>{label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
