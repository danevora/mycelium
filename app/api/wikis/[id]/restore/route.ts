import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { countUserWikis, restoreWiki } from "@/lib/db";
import { isProUser, wikiCap } from "@/lib/billing";

export const runtime = "nodejs";

/**
 * Restore a soft-deleted wiki. A restore re-activates the wiki, so it must respect
 * the per-tier cap: if the user is already at their active limit, the restore is
 * refused (403) and they're told to delete another or upgrade.
 */
export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const isPro = await isProUser();
    const cap = wikiCap(isPro);
    const count = await countUserWikis(userId);
    if (count >= cap) {
      return NextResponse.json(
        {
          error: isPro
            ? `You're at your wiki limit (${cap}). Delete another wiki to restore this one.`
            : `You're at your free wiki limit (${cap}). Delete another wiki or upgrade to restore this one.`,
          upgrade: !isPro,
        },
        { status: 403 },
      );
    }

    const { id } = await params;
    const wiki = await restoreWiki(userId, id);
    if (!wiki) return NextResponse.json({ error: "Wiki not found" }, { status: 404 });
    return NextResponse.json({ id: wiki.id });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Could not restore wiki";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
