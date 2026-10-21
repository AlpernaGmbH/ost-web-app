"use client";

import { useEffect, useState } from "react";

const INTERVAL_MS = 5000;
const FADE_MS = 500;

/**
 * Heading of the price section: one comparison at a time, changing every few seconds with a fade.
 * All lines sit in the same grid cell so the tallest one sets the height and nothing shifts.
 * Screen readers get one complete static sentence; without JavaScript or with reduced motion the
 * first line simply stays.
 */
export function RotatingComparison({ lines, className = "" }: { lines: readonly string[]; className?: string }) {
  const [index, setIndex] = useState(0);
  const [fading, setFading] = useState(false);

  useEffect(() => {
    if (lines.length < 2 || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let fade: ReturnType<typeof setTimeout> | undefined;
    const tick = setInterval(() => {
      setFading(true);
      fade = setTimeout(() => {
        setIndex((i) => (i + 1) % lines.length);
        setFading(false);
      }, FADE_MS);
    }, INTERVAL_MS);
    return () => {
      clearInterval(tick);
      if (fade) clearTimeout(fade);
    };
  }, [lines.length]);

  return (
    <h2 className={className}>
      <span className="sr-only">{lines[0]}</span>
      <span aria-hidden className="grid">
        {lines.map((line, i) => (
          <span
            key={line}
            className={`col-start-1 row-start-1 transition-opacity ease-out ${i === index ? (fading ? "opacity-0" : "opacity-100") : "invisible opacity-0"}`}
            style={{ transitionDuration: `${FADE_MS}ms` }}
          >
            {line}
          </span>
        ))}
      </span>
    </h2>
  );
}
