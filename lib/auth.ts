/**
 * Server-side helpers tying Clerk auth to the per-user wiki.
 *
 * Page routes are already gated by `middleware.ts`, so `userId` is present in
 * practice — the guard is a safety net (and satisfies the types). API routes
 * should instead read `auth()` directly so they can return a JSON 401.
 */
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { getOrCreateUserWiki, type Wiki } from "./db";

export async function requireUserWiki(): Promise<Wiki> {
  const { userId } = await auth();
  if (!userId) redirect("/");
  return getOrCreateUserWiki(userId);
}
