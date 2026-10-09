// Module colors come from the brand palette (--mod-1 ... --mod-6), not from a stored hex value:
// the n-th subject of the semester always gets the n-th tone, in the calendar as on its card.
// Administration is neutral.

const TONES = 6;

/** Tone 1..6 per module in the given order (pass modules sorted by sort_order); 0 = neutral (administration). */
export function assignTones(modules: readonly { id: string; kind: string }[]): Map<string, number> {
  const tones = new Map<string, number>();
  let n = 0;
  for (const m of modules) {
    if (m.kind === "admin") tones.set(m.id, 0);
    else tones.set(m.id, (n++ % TONES) + 1);
  }
  return tones;
}

/** CSS color values for a tone: a soft surface and the ink that goes with it. */
export function toneColors(tone: number | undefined): { soft: string; ink: string } {
  if (!tone || tone < 1 || tone > TONES) return { soft: "var(--surface-200)", ink: "var(--ink-muted)" };
  return { soft: `var(--mod-${tone})`, ink: `var(--mod-${tone}-ink)` };
}
