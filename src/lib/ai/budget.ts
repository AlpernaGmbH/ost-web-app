// Cost estimate and spending limit of the AI extraction (pure).
import { BATCH_PRICE_USD_PER_MTOK } from "./config";

/** Cost of a batch request in USD, rounded to 4 decimals. */
export function estimateCostUsd(inputTokens: number, outputTokens: number): number {
  const usd = (inputTokens * BATCH_PRICE_USD_PER_MTOK.input + outputTokens * BATCH_PRICE_USD_PER_MTOK.output) / 1_000_000;
  return Math.round(usd * 10_000) / 10_000;
}

/** First instant of the current month (UTC) as ISO string; spending is counted per calendar month. */
export function monthStartIso(now: Date = new Date()): string {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString();
}

/** Sum of `cost_usd` (PostgREST returns numerics as strings). */
export function sumCostUsd(rows: { cost_usd: number | string | null }[]): number {
  let sum = 0;
  for (const row of rows) {
    const n = Number(row.cost_usd ?? 0);
    if (Number.isFinite(n)) sum += n;
  }
  return Math.round(sum * 10_000) / 10_000;
}

export function formatUsd(usd: number): string {
  return `${usd.toFixed(2)} USD`;
}

export type BudgetCheck = { ok: true } | { ok: false; message: string };

/** A run may start when its reservation still fits under both monthly caps. */
export function checkBudget(args: { reservation: number; userSpent: number; globalSpent: number; userCap: number; globalCap: number }): BudgetCheck {
  const { reservation, userSpent, globalSpent, userCap, globalCap } = args;
  if (userSpent + reservation > userCap) {
    return {
      ok: false,
      message: `Dein Monatsbudget reicht nicht: ${formatUsd(userSpent)} verbraucht, dieser Durchlauf braucht bis zu ${formatUsd(reservation)}, Limit ${formatUsd(userCap)}. Nächsten Monat wieder, oder das Limit (AI_USER_MONTHLY_CAP_USD) erhöhen.`,
    };
  }
  if (globalSpent + reservation > globalCap) {
    return {
      ok: false,
      message: `Das Monatsbudget der App ist erreicht: ${formatUsd(globalSpent)} von ${formatUsd(globalCap)} verbraucht, dieser Durchlauf braucht bis zu ${formatUsd(reservation)}.`,
    };
  }
  return { ok: true };
}
