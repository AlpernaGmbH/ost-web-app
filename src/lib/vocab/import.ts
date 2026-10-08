// Parses a pasted word list (from Quizlet, Excel, a chat export, ...) into cards.
// One word per line. Accepted separators, in this order: tab, " - " / " – " / " — ", ";", "=", " : ".
// An optional third column is an example sentence. Lines starting with "#" are comments.

export type ImportRow = { front: string; back: string; example: string | null };
export type ImportResult = { rows: ImportRow[]; skipped: { line: number; text: string; reason: string }[] };

const SEPARATORS: RegExp[] = [/\t+/, /\s[-–—]\s/, /\s*;\s*/, /\s*=\s*/, /\s:\s/];
export const MAX_FIELD = 500;

function splitLine(line: string): string[] | null {
  for (const sep of SEPARATORS) {
    const parts = line.split(sep).map((p) => p.trim());
    if (parts.length >= 2 && parts[0] && parts[1]) return parts;
  }
  return null;
}

export function parseImport(text: string): ImportResult {
  const rows: ImportRow[] = [];
  const skipped: ImportResult["skipped"] = [];
  const seen = new Set<string>();

  text.split(/\r?\n/).forEach((raw, index) => {
    const line = raw.trim();
    if (!line || line.startsWith("#")) return;
    const parts = splitLine(line);
    if (!parts) {
      skipped.push({ line: index + 1, text: line, reason: "kein Trennzeichen gefunden" });
      return;
    }
    const [front, back, example] = parts;
    if (front.length > MAX_FIELD || back.length > MAX_FIELD) {
      skipped.push({ line: index + 1, text: line.slice(0, 60), reason: "Eintrag zu lang" });
      return;
    }
    const key = front.toLowerCase();
    if (seen.has(key)) {
      skipped.push({ line: index + 1, text: line, reason: "doppelt in der Liste" });
      return;
    }
    seen.add(key);
    rows.push({ front, back, example: example ? example.slice(0, MAX_FIELD) : null });
  });

  return { rows, skipped };
}
