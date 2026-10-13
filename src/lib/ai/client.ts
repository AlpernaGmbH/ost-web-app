import "server-only";
import Anthropic from "@anthropic-ai/sdk";

export class AiNotConfiguredError extends Error {
  constructor() {
    super("KI-Erzeugung ist nicht eingerichtet: ANTHROPIC_API_KEY fehlt (in Vercel unter Environment Variables setzen).");
    this.name = "AiNotConfiguredError";
  }
}

/** The API client; built per call so a missing key fails the request, not the build. */
export function getAnthropic(): Anthropic {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new AiNotConfiguredError();
  return new Anthropic({ apiKey, maxRetries: 2 });
}

/** Readable German reason for an API failure (most specific class first). */
export function describeAiError(error: unknown): string {
  if (error instanceof AiNotConfiguredError) return error.message;
  if (error instanceof Anthropic.AuthenticationError) return "Der API-Schlüssel wird abgelehnt (ANTHROPIC_API_KEY prüfen).";
  if (error instanceof Anthropic.PermissionDeniedError) return "Der API-Schlüssel darf das nicht (Berechtigung im Anthropic-Konto prüfen).";
  if (error instanceof Anthropic.RateLimitError) return "Die API ist gerade ausgelastet (Rate Limit). In ein paar Minuten nochmals versuchen.";
  if (error instanceof Anthropic.BadRequestError) return `Die API lehnt die Anfrage ab: ${error.message}`;
  if (error instanceof Anthropic.APIConnectionError) return "Keine Verbindung zur API. Später nochmals versuchen.";
  if (error instanceof Anthropic.APIError) return `API-Fehler ${error.status ?? ""}: ${error.message}`.trim();
  return error instanceof Error ? error.message : "Unbekannter Fehler";
}
