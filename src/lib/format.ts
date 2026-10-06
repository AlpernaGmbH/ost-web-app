import { TIME_ZONE } from "./week";

const parts = (iso: string, options: Intl.DateTimeFormatOptions) =>
  new Intl.DateTimeFormat("de-CH", { timeZone: TIME_ZONE, ...options }).formatToParts(new Date(iso));
const pick = (list: Intl.DateTimeFormatPart[], type: string) => list.find((p) => p.type === type)?.value ?? "";

/** "Mi 07.10." */
export function formatDay(iso: string): string {
  const p = parts(iso, { weekday: "short", day: "2-digit", month: "2-digit" });
  return `${pick(p, "weekday").replace(".", "")} ${pick(p, "day")}.${pick(p, "month")}.`;
}

/** "10:15" */
export function formatTime(iso: string): string {
  const p = parts(iso, { hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
  return `${pick(p, "hour")}:${pick(p, "minute")}`;
}

export function formatDateTime(iso: string): string {
  return `${formatDay(iso)} ${formatTime(iso)}`;
}

export function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

/** Shows enough of the secret feed URL to recognise it without revealing the token. */
export function maskUrl(url: string): string {
  try {
    const { host } = new URL(url);
    return `${host}/…${url.slice(-4)}`;
  } catch {
    return "…";
  }
}
