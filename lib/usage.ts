/**
 * Per-user daily quotas — the cheap guard against runaway AI-Gateway spend.
 * Backed by the `usage_counter` table (see lib/schema.sql); no Redis/Upstash
 * needed. Limits are per-user (shared across all of a user's wikis) and vary by
 * tier: pro users get a higher cap. Tune the caps via env without a redeploy.
 */
import { tryConsumeQuota } from "./db";

/**
 * Final daily caps (single source of truth) — env vars override without redeploy.
 * Launch is FREE + usage-capped, NO paywall gate: ingest/chat/consistency are all
 * available to free users within these caps (pro just raises them). The only
 * tier gate is the multi-wiki cap in lib/billing.ts.
 *
 *   kind         FREE/day   PRO/day
 *   ----------   --------   -------
 *   ingest          20        200
 *   chat            50        500
 *   consistency     20        200
 *
 * Free caps are set well above a first-session "wow" (create → sample ingest →
 * a couple more ingests → a consistency check → a few chats) so no cap is hit,
 * while still cheaply guarding against runaway AI-Gateway spend. Pro >= free.
 */
export const DAILY_INGEST_LIMIT = Number(process.env.DAILY_INGEST_LIMIT ?? 20);
export const DAILY_CHAT_LIMIT = Number(process.env.DAILY_CHAT_LIMIT ?? 50);
export const DAILY_CONSISTENCY_LIMIT = Number(process.env.DAILY_CONSISTENCY_LIMIT ?? 20);
export const PRO_DAILY_INGEST_LIMIT = Number(process.env.PRO_DAILY_INGEST_LIMIT ?? 200);
export const PRO_DAILY_CHAT_LIMIT = Number(process.env.PRO_DAILY_CHAT_LIMIT ?? 500);
export const PRO_DAILY_CONSISTENCY_LIMIT = Number(process.env.PRO_DAILY_CONSISTENCY_LIMIT ?? 200);

export type Quota = { allowed: boolean; used: number; limit: number };

export function consumeIngestQuota(userId: string, isPro: boolean): Promise<Quota> {
  return tryConsumeQuota(userId, "ingest", isPro ? PRO_DAILY_INGEST_LIMIT : DAILY_INGEST_LIMIT);
}

export function consumeChatQuota(userId: string, isPro: boolean): Promise<Quota> {
  return tryConsumeQuota(userId, "chat", isPro ? PRO_DAILY_CHAT_LIMIT : DAILY_CHAT_LIMIT);
}

export function consumeConsistencyQuota(userId: string, isPro: boolean): Promise<Quota> {
  return tryConsumeQuota(
    userId,
    "consistency",
    isPro ? PRO_DAILY_CONSISTENCY_LIMIT : DAILY_CONSISTENCY_LIMIT,
  );
}

export function quotaError(kind: "ingest" | "chat" | "consistency", q: Quota): string {
  return `Daily ${kind} limit reached (${q.limit}/day). Try again tomorrow.`;
}
