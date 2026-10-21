import Link from "next/link";
import type { ReactNode } from "react";
import { Brand } from "@/components/brand";
import { LEGAL_UPDATED, PRODUCT_NAME } from "@/lib/site";

const footerLink = "inline-flex min-h-11 items-center text-muted hover:text-foreground";

/** "2026-10-21" -> "21.10.2026" */
const updated = LEGAL_UPDATED.split("-").reverse().join(".");

/** Shell of the public legal pages: brand header, title, date of the last change, prose, footer. */
export function LegalPage({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="mx-auto flex w-full max-w-3xl items-center justify-between px-4 py-4 sm:px-6">
        <Brand href="/" />
        <Link href="/login" className={footerLink}>
          Anmelden
        </Link>
      </header>
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 pb-16 pt-6 sm:px-6">
        <h1 className="display-lg">{title}</h1>
        <p className="small mt-2 text-muted">Stand: {updated}</p>
        <div className="note-prose mt-8">{children}</div>
      </main>
      <footer className="border-t border-border">
        <div className="mx-auto flex w-full max-w-3xl flex-col gap-2 px-4 py-6 text-sm sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <span className="text-muted">&copy; {new Date().getFullYear()} {PRODUCT_NAME}</span>
          <nav aria-label="Rechtliches" className="flex gap-6">
            <Link href="/impressum" className={footerLink}>
              Impressum
            </Link>
            <Link href="/datenschutz" className={footerLink}>
              Datenschutz
            </Link>
            <Link href="/" className={footerLink}>
              Startseite
            </Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}
