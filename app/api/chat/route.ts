import { NextResponse } from "next/server";
import {
  getOrCreateDefaultWiki,
  getIndexPage,
  listPages,
  applyPageOperations,
  addChatMessage,
} from "@/lib/db";
import { chat } from "@/lib/ai";
import type { WikiPage } from "@/lib/db";

export const runtime = "nodejs";

/**
 * Naive relevance: pick pages whose slug/title shares a word with the message.
 * For a small prototype wiki, fall back to all content pages if nothing matches.
 * (PRD's "send the index, then fetch only relevant pages" — kept simple here.)
 */
function selectRelevant(pages: WikiPage[], message: string): WikiPage[] {
  const content = pages.filter((p) => p.is_index === 0 && p.is_log === 0);
  const words = new Set(
    message
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter((w) => w.length > 3),
  );
  const scored = content
    .map((p) => {
      const hay = `${p.slug} ${p.title}`.toLowerCase();
      const score = [...words].filter((w) => hay.includes(w)).length;
      return { p, score };
    })
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 8)
    .map((s) => s.p);

  if (scored.length > 0) return scored;
  return content.slice(0, 12); // small wiki fallback
}

export async function POST(req: Request) {
  try {
    const { message } = (await req.json()) as { message: string };
    if (!message?.trim())
      return NextResponse.json({ error: "Missing message" }, { status: 400 });

    const wiki = await getOrCreateDefaultWiki();
    const [indexPage, pages] = await Promise.all([
      getIndexPage(wiki.id),
      listPages(wiki.id),
    ]);
    const relevant = selectRelevant(pages, message);

    await addChatMessage(wiki.id, "user", message);
    const result = await chat({
      message,
      schema: wiki.schema,
      indexMd: indexPage?.content ?? "",
      relevantPages: relevant.map((p) => ({
        slug: p.slug,
        title: p.title,
        content: p.content,
      })),
    });
    await addChatMessage(wiki.id, "assistant", result.reply);

    let changedSlugs: string[] = [];
    if (result.operations.length > 0) {
      const { created, updated } = await applyPageOperations(wiki.id, result.operations);
      changedSlugs = [...new Set([...created, ...updated])];
    }

    return NextResponse.json({ reply: result.reply, changedSlugs });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Chat failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
