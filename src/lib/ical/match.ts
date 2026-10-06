export type MatchableModule = { id: string; ical_match: string | null };

function keywords(rule: string | null): string[] {
  return (rule ?? "")
    .split(/[,;\n]/)
    .map((k) => k.trim().toLowerCase())
    .filter(Boolean);
}

/**
 * Returns the module whose keywords appear in the event title, or null when nothing matches or the
 * match is ambiguous (two modules match): ambiguous events go to the inbox instead of a wrong module.
 */
export function matchModule(title: string, modules: MatchableModule[]): string | null {
  const haystack = title.toLowerCase();
  const hits = modules.filter((m) => keywords(m.ical_match).some((k) => haystack.includes(k)));
  return hits.length === 1 ? hits[0].id : null;
}
