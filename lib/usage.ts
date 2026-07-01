/**
 * Per-user daily quotas — the cheap guard against runaway AI-Gateway spend.
 * Backed by the `usage_counter` table (see lib/schema.sql); no Redis/Upstash
 * needed. Limits are per-user (shared across all of a user's wikis) and vary by
 * tier: pro users get a higher cap. Tune the caps via env without a redeploy.
 */
import { tryConsumeQuota } from "./db";

export const DAILY_INGEST_LIMIT = Number(process.env.DAILY_INGEST_LIMIT ?? 20);
export const DAILY_CHAT_LIMIT = Number(process.env.DAILY_CHAT_LIMIT ?? 50);
export const PRO_DAILY_INGEST_LIMIT = Number(process.env.PRO_DAILY_INGEST_LIMIT ?? 200);
export const PRO_DAILY_CHAT_LIMIT = Number(process.env.PRO_DAILY_CHAT_LIMIT ?? 500);

export type Quota = { allowed: boolean; used: number; limit: number };

export function consumeIngestQuota(userId: string, isPro: boolean): Promise<Quota> {
  return tryConsumeQuota(userId, "ingest", isPro ? PRO_DAILY_INGEST_LIMIT : DAILY_INGEST_LIMIT);
}

export function consumeChatQuota(userId: string, isPro: boolean): Promise<Quota> {
  return tryConsumeQuota(userId, "chat", isPro ? PRO_DAILY_CHAT_LIMIT : DAILY_CHAT_LIMIT);
}

export function quotaError(kind: "ingest" | "chat", q: Quota): string {
  return `Daily ${kind} limit reached (${q.limit}/day). Try again tomorrow.`;
}
