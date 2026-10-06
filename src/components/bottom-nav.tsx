"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const items = [
  {
    href: "/",
    label: "Module",
    active: (p: string) => p === "/" || p.startsWith("/m/"),
    icon: "M4 5a2 2 0 0 1 2-2h12v16H6a2 2 0 0 0-2 2V5Zm2 0v11.17A4 4 0 0 1 6 16h10V5H6Z",
  },
  {
    href: "/settings",
    label: "Einstellungen",
    active: (p: string) => p.startsWith("/settings"),
    icon: "M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm8.1-2.5-.9.5v2.2l-1.9 1.1-1-.6-1.9 1.1V18.5L12 20l-2.4-1.2v-1.2l-1.9-1.1-1 .6-1.9-1.1v-2.2l-.9-.5V9.6l.9-.5V6.9l1.9-1.1 1 .6 1.9-1.1V4L12 2.8 14.4 4v1.3l1.9 1.1 1-.6 1.9 1.1v2.2l.9.5v3Z",
  },
];

export function BottomNav() {
  const pathname = usePathname();
  return (
    <nav
      aria-label="Hauptnavigation"
      className="fixed inset-x-0 bottom-0 z-10 border-t border-border bg-card/95 backdrop-blur"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <ul className="mx-auto flex max-w-2xl">
        {items.map((item) => {
          const active = item.active(pathname);
          return (
            <li key={item.href} className="flex-1">
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`flex min-h-14 flex-col items-center justify-center gap-0.5 text-xs ${active ? "font-semibold text-primary" : "text-muted"}`}
              >
                <svg viewBox="0 0 24 24" className="size-6" fill="currentColor" aria-hidden>
                  <path d={item.icon} />
                </svg>
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
