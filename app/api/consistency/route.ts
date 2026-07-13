import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getUserWiki, listPages } from "@/lib/db";
import { checkConsistency } from "@/lib/ai";
import { isProUser } from "@/lib/billing";
import { consumeConsistencyQuota, quotaError } from "@/lib/usage";

export const runtime = "nodejs";
// AI audit (generateObject over many pages) is slow. 300s is the fluid-compute
// default and the Hobby ceiling; Pro can go to 800s if this ever needs it.
export const maxDuration = 300;

type Body = { wikiId?: string };

export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = (await req.json()) as Body;
    if (!body.wikiId) return NextResponse.json({ error: "Missing wikiId" }, { status: 400 });

    const wiki = await getUserWiki(userId, body.wikiId);
    if (!wiki) return NextResponse.json({ error: "Wiki not found" }, { status: 404 });

    // Consume quota just before the paid AI call.
    const quota = await consumeConsistencyQuota(userId, await isProUser());
    if (!quota.allowed)
      return NextResponse.json({ error: quotaError("consistency", quota) }, { status: 429 });

    // Audit real content pages; index/log are catalogs/history, not sources of truth.
    const pages = (await listPages(wiki.id))
      .filter((p) => p.is_index === 0 && p.is_log === 0)
      .map((p) => ({ slug: p.slug, title: p.title, content: p.content }));

    const { findings } = await checkConsistency({ schema: wiki.schema, pages });

    return NextResponse.json({ findings });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Consistency check failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
