import { NextResponse } from "next/server";
import TurndownService from "turndown";
import {
  getOrCreateDefaultWiki,
  getIndexPage,
  applyPageOperations,
  createSource,
} from "@/lib/db";
import { ingestSource } from "@/lib/ai";

export const runtime = "nodejs";

type Body =
  | { type: "text"; title?: string; content: string }
  | { type: "url"; url: string };

async function fetchAsMarkdown(url: string): Promise<{ title: string; markdown: string }> {
  const res = await fetch(url, {
    headers: { "user-agent": "MyceliumBot/0.1 (+prototype)" },
  });
  if (!res.ok) throw new Error(`Fetch failed: ${res.status} ${res.statusText}`);
  const html = await res.text();
  const titleMatch = html.match(/<title[^>]*>([^<]*)<\/title>/i);
  const title = titleMatch?.[1]?.trim() || url;
  // Strip scripts/styles before converting to reduce noise.
  const cleaned = html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, "");
  const markdown = new TurndownService({ headingStyle: "atx" }).turndown(cleaned);
  return { title, markdown };
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Body;
    const wiki = await getOrCreateDefaultWiki();

    let title: string;
    let content: string;
    let type: "text" | "url";

    if (body.type === "url") {
      if (!body.url) return NextResponse.json({ error: "Missing url" }, { status: 400 });
      type = "url";
      const fetched = await fetchAsMarkdown(body.url);
      title = fetched.title;
      content = fetched.markdown;
    } else {
      if (!body.content?.trim())
        return NextResponse.json({ error: "Missing content" }, { status: 400 });
      type = "text";
      title = body.title?.trim() || body.content.slice(0, 60).trim();
      content = body.content;
    }

    const indexPage = await getIndexPage(wiki.id);
    const result = await ingestSource({
      title,
      content,
      schema: wiki.schema,
      indexMd: indexPage?.content ?? "",
    });

    const { created, updated } = await applyPageOperations(wiki.id, result.operations);
    await createSource({
      wikiId: wiki.id,
      type,
      title,
      rawContent: content,
      touchedSlugs: [...created, ...updated],
    });

    return NextResponse.json({
      summary: result.summary,
      created,
      updated,
      touchedSlugs: [...new Set([...created, ...updated])],
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Ingest failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
