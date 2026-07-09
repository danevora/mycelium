import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import {
  countUserWikis,
  createUserWiki,
  applyPageOperations,
  createSource,
} from "@/lib/db";
import { isProUser, wikiCap } from "@/lib/billing";
import { WIKI_TEMPLATES } from "@/lib/templates";
import { sampleFor } from "@/lib/samples";

export const runtime = "nodejs";

/**
 * Create a sample wiki and seed its pre-authored pages directly — NO AI call.
 * Samples are deterministic demo content (see lib/samples.ts), so we bypass the
 * ingest pipeline entirely: instant, free, and always identical (the planted
 * inconsistency is guaranteed present for the Consistency Check).
 */
export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = (await req.json().catch(() => ({}))) as { templateKey?: string };
    const sample = body.templateKey ? sampleFor(body.templateKey) : undefined;
    if (!sample)
      return NextResponse.json({ error: "Unknown sample" }, { status: 400 });

    const isPro = await isProUser();
    const cap = wikiCap(isPro);
    const count = await countUserWikis(userId);
    if (count >= cap) {
      return NextResponse.json(
        {
          error: isPro
            ? `Wiki limit reached (${cap}).`
            : `Free plan is limited to ${cap} wikis. Upgrade to Pro for up to ${wikiCap(true)}.`,
          upgrade: !isPro,
        },
        { status: 403 },
      );
    }

    const template = WIKI_TEMPLATES.find((t) => t.key === sample.templateKey);
    const wiki = await createUserWiki(
      userId,
      sample.wikiName,
      "",
      template?.schema ?? "",
    );

    // Seed the pre-authored pages (index page overwrites the empty seeded one).
    const { created, updated } = await applyPageOperations(
      wiki.id,
      sample.pages.map((p) => ({ operation: "create" as const, ...p })),
    );

    // Record provenance so the Sources list isn't empty.
    await createSource({
      wikiId: wiki.id,
      type: "text",
      title: sample.sourceTitle,
      rawContent: sample.content,
      touchedSlugs: [...new Set([...created, ...updated])],
    });

    return NextResponse.json({ id: wiki.id });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Could not create sample";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
