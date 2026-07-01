import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { countUserWikis, createUserWiki } from "@/lib/db";
import { isProUser, wikiCap } from "@/lib/billing";

export const runtime = "nodejs";

/** Create a new wiki, enforcing the per-tier cap (free: 1, pro: 5). */
export async function POST(req: Request) {
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
            ? `Wiki limit reached (${cap}).`
            : `Free plan is limited to ${cap} wiki. Upgrade to Pro for up to ${wikiCap(true)}.`,
          upgrade: !isPro,
        },
        { status: 403 },
      );
    }

    const body = (await req.json().catch(() => ({}))) as {
      name?: string;
      description?: string;
    };
    const name = body.name?.trim().slice(0, 80) || "My Wiki";
    const description = body.description?.trim().slice(0, 200) ?? "";
    const wiki = await createUserWiki(userId, name, description);
    return NextResponse.json({ id: wiki.id });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Could not create wiki";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
