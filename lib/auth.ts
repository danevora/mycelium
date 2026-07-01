/**
 * Server-side helpers tying Clerk auth to a user's wikis.
 *
 * Page routes are already gated by `middleware.ts`, so `userId` is present in
 * practice — the guard is a safety net (and satisfies the types). API routes
 * should instead read `auth()` directly so they can return a JSON 401.
 */
import { auth } from "@clerk/nextjs/server";
import { redirect, notFound } from "next/navigation";
import { getUserWiki, type Wiki } from "./db";

/**
 * Resolve the wiki at `wikiId`, requiring the signed-in user to own it. A wiki id
 * that doesn't belong to the user 404s — so one user can't read another's wiki.
 */
export async function requireWiki(wikiId: string): Promise<Wiki> {
  const { userId } = await auth();
  if (!userId) redirect("/");
  const wiki = await getUserWiki(userId, wikiId);
  if (!wiki) notFound();
  return wiki;
}
