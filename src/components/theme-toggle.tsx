"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import { useEffect, useSyncExternalStore } from "react";
import { applyPref, readPref, savePref, THEME_EVENT, type ThemePref } from "@/lib/theme";

const DARK_QUERY = "(prefers-color-scheme: dark)";
const canMatch = () => typeof window !== "undefined" && typeof window.matchMedia === "function";

function subscribe(onChange: () => void) {
  window.addEventListener(THEME_EVENT, onChange);
  window.addEventListener("storage", onChange);
  const query = canMatch() ? window.matchMedia(DARK_QUERY) : null;
  query?.addEventListener("change", onChange);
  return () => {
    window.removeEventListener(THEME_EVENT, onChange);
    window.removeEventListener("storage", onChange);
    query?.removeEventListener("change", onChange);
  };
}

function usePref(): ThemePref {
  return useSyncExternalStore(subscribe, readPref, () => "system");
}

function useSystemDark(): boolean {
  return useSyncExternalStore(subscribe, () => canMatch() && window.matchMedia(DARK_QUERY).matches, () => false);
}

/** Applies the stored choice once the stylesheet is there (browser bar color) and keeps it in step with the system. */
export function ThemeSync() {
  const pref = usePref();
  useEffect(() => applyPref(pref), [pref]);
  return null;
}

const OPTIONS = [
  { id: "system", label: "System", Icon: Monitor },
  { id: "light", label: "Hell", Icon: Sun },
  { id: "dark", label: "Dunkel", Icon: Moon },
] as const;

/** variant "segmented": System / Hell / Dunkel (settings). variant "icon": one button that flips light and dark (header). */
export function ThemeToggle({ variant = "segmented" }: { variant?: "segmented" | "icon" }) {
  const pref = usePref();
  const systemDark = useSystemDark();

  if (variant === "icon") {
    const dark = pref === "dark" || (pref === "system" && systemDark);
    const Icon = dark ? Sun : Moon;
    return (
      <button
        type="button"
        onClick={() => savePref(dark ? "light" : "dark")}
        aria-label={dark ? "Hellmodus einschalten" : "Dunkelmodus einschalten"}
        className="inline-flex size-12 shrink-0 items-center justify-center rounded-pill border-2 border-control bg-card text-primary-ink transition-colors duration-150 ease-out hover:bg-primary-soft hover:text-on-primary-soft"
      >
        <Icon aria-hidden className="size-6" strokeWidth={2} />
      </button>
    );
  }

  return (
    <div role="group" aria-label="Darstellung" className="grid grid-cols-3 gap-1 rounded-pill border border-border bg-card p-1">
      {OPTIONS.map(({ id, label, Icon }) => (
        <button
          key={id}
          type="button"
          aria-pressed={pref === id}
          onClick={() => savePref(id)}
          className={`inline-flex min-h-10 items-center justify-center gap-2 rounded-pill font-bold transition-colors duration-150 ease-out ${pref === id ? "bg-primary text-primary-foreground" : "text-foreground hover:bg-sunken"}`}
        >
          <Icon aria-hidden className="size-4" strokeWidth={2.25} />
          {label}
        </button>
      ))}
    </div>
  );
}
