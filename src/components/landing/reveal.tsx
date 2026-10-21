"use client";

import { useEffect } from "react";

/**
 * Fades sections in as they scroll into view. Elements carry `data-reveal`; the CSS in globals.css hides
 * them only once `html[data-reveal-ready]` is set here, so nothing is ever invisible without JavaScript,
 * and it does nothing at all when the visitor prefers reduced motion.
 */
export function RevealObserver() {
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches || !("IntersectionObserver" in window)) return;
    const root = document.documentElement;
    const elements = Array.from(document.querySelectorAll<HTMLElement>("[data-reveal]"));
    // what is already on screen stays visible; only what lies below the fold animates in
    const fold = window.innerHeight;
    for (const el of elements) if (el.getBoundingClientRect().top < fold) el.dataset.shown = "";
    root.dataset.revealReady = "";
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          (entry.target as HTMLElement).dataset.shown = "";
          observer.unobserve(entry.target);
        }
      },
      { rootMargin: "0px 0px -8% 0px" },
    );
    for (const el of elements) if (el.dataset.shown === undefined) observer.observe(el);
    return () => {
      observer.disconnect();
      delete root.dataset.revealReady;
    };
  }, []);
  return null;
}
