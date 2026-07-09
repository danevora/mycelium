/**
 * Pro-tier gating, backed by Clerk Billing (Clerk holds subscription state — no
 * Stripe code or users table here). Enable Billing in the Clerk dashboard and
 * create a plan whose slug matches CLERK_PRO_PLAN_SLUG (default "pro").
 *
 * The single source of truth is `auth().has({ plan })`; everything that needs to
 * know "is this user paid?" goes through `isProUser()`.
 */
import { auth } from "@clerk/nextjs/server";

export const PRO_PLAN_SLUG = process.env.CLERK_PRO_PLAN_SLUG ?? "pro";

const FREE_WIKI_CAP = 3;
const PRO_WIKI_CAP = 5;

export async function isProUser(): Promise<boolean> {
  const { has } = await auth();
  return has?.({ plan: PRO_PLAN_SLUG }) ?? false;
}

/** Max wikis a user may own, by tier. */
export function wikiCap(isPro: boolean): number {
  return isPro ? PRO_WIKI_CAP : FREE_WIKI_CAP;
}
