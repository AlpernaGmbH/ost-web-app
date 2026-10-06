/**
 * The feed URL is fetched server-side, so it must not be usable to reach internal hosts.
 * Accepts https:// and webcal:// (normalised to https) and rejects localhost / IP literals.
 */
export function normalizeFeedUrl(input: string): string {
  const raw = input.trim().replace(/^webcal:\/\//i, "https://");
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new Error("Ungültige iCal-URL");
  }
  const host = url.hostname.toLowerCase();
  if (url.protocol !== "https:") throw new Error("Die iCal-URL muss mit https:// oder webcal:// beginnen");
  const isIpLiteral = /^\d{1,3}(\.\d{1,3}){3}$/.test(host) || host.includes(":") || host.startsWith("[");
  if (host === "localhost" || host.endsWith(".local") || host.endsWith(".internal") || isIpLiteral) {
    throw new Error("Die iCal-URL darf nicht auf einen lokalen oder internen Host zeigen");
  }
  return url.toString();
}
