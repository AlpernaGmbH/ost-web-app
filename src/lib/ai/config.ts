// Settings of the AI extraction (documents -> exercise drafts). Pure: no I/O besides reading process.env.

export const AI_MODEL = "claude-opus-5-5";

/** Message Batches prices of the model in USD per million tokens (half the standard rate), as of 2026-10. */
export const BATCH_PRICE_USD_PER_MTOK = { input: 2, output: 10 } as const;

/** Room for the thinking and a long list of exercises (thinking counts towards the output). */
export const MAX_OUTPUT_TOKENS = 64_000;
export const MAX_DOCUMENTS_PER_RUN = 5;
/** PDF limit of the API per request. */
export const MAX_BYTES_PER_RUN = 32 * 1024 * 1024;
export const MAX_HINT_LENGTH = 500;
/** Uploaded files expire at the provider on their own, should the cleanup after a run ever fail. */
export const PROVIDER_FILE_TTL_SECONDS = 7 * 24 * 3600;
/** A result claimed longer ago than this was abandoned (function died) and may be processed again. */
export const STALE_CLAIM_MINUTES = 10;

export const DEFAULT_MONTHLY_CAP_USD = 10;
export const DEFAULT_USER_MONTHLY_CAP_USD = 5;

/** Numeric cap from an environment variable; anything unusable falls back to the default. */
export function capFromEnv(value: string | undefined, fallback: number): number {
  const n = Number(value?.trim());
  return value !== undefined && value.trim() !== "" && Number.isFinite(n) && n >= 0 ? n : fallback;
}

export function aiConfigured(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

/** Monthly spending limits in USD: for the whole deployment and per account. */
export function caps(): { global: number; user: number } {
  return {
    global: capFromEnv(process.env.AI_MONTHLY_CAP_USD, DEFAULT_MONTHLY_CAP_USD),
    user: capFromEnv(process.env.AI_USER_MONTHLY_CAP_USD, DEFAULT_USER_MONTHLY_CAP_USD),
  };
}
