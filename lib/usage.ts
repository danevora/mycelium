/**
 * Per-user daily quotas — the cheap guard against runaway AI-Gateway spend on a
 * public trial. Backed by the `usage_counter` table (see lib/schema.sql); no
 * Redis/Upstash needed. Tune the caps via env without a redeploy.
 */
import { tryConsumeQuota } from "./db";

export const DAILY_INGEST_LIMIT = Number(process.env.DAILY_INGEST_LIMIT ?? 20);
export const DAILY_CHAT_LIMIT = Number(process.env.DAILY_CHAT_LIMIT ?? 50);

export type Quota = { allowed: boolean; used: number; limit: number };

export function consumeIngestQuota(userId: string): Promise<Quota> {
  return tryConsumeQuota(userId, "ingest", DAILY_INGEST_LIMIT);
}

export function consumeChatQuota(userId: string): Promise<Quota> {
  return tryConsumeQuota(userId, "chat", DAILY_CHAT_LIMIT);
}

export function quotaError(kind: "ingest" | "chat", q: Quota): string {
  return `Daily ${kind} limit reached (${q.limit}/day). Try again tomorrow.`;
}
