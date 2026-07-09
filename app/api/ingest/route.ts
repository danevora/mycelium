import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import TurndownService from "turndown";
import {
  getUserWiki,
  getIndexPage,
  applyPageOperations,
  createSource,
} from "@/lib/db";
import { ingestSource, splitIntoChunks } from "@/lib/ai";
import { isProUser } from "@/lib/billing";
import {
  assertFetchableUrl,
  MAX_SOURCE_CHARS,
  CHUNK_CHARS,
  MAX_DOCUMENT_CHARS,
  MAX_CHUNKS,
} from "@/lib/safety";
import { extractTextFromUpload, MAX_UPLOAD_BYTES } from "@/lib/extract";
import { consumeIngestQuota, quotaError } from "@/lib/usage";

export const runtime = "nodejs";
// AI ingest (generateObject) routinely exceeds the 10s Hobby default on real
// sources. Requires Vercel Pro for the full window.
export const maxDuration = 60;

type Body = { wikiId: string } & (
  | { type: "text"; title?: string; content: string }
  | { type: "url"; url: string }
);

async function fetchAsMarkdown(url: string): Promise<{ title: string; markdown: string }> {
  await assertFetchableUrl(url); // SSRF guard: public http(s) hosts only
  const res = await fetch(url, {
    headers: { "user-agent": "MyceliumBot/0.1 (+prototype)" },
    redirect: "error", // don't follow redirects into private space
    signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok) throw new Error(`Fetch failed: ${res.status} ${res.statusText}`);
  const html = (await res.text()).slice(0, MAX_SOURCE_CHARS);
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
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    let title: string;
    let content: string;
    let type: "text" | "url";

    const contentType = req.headers.get("content-type") ?? "";

    if (contentType.includes("multipart/form-data")) {
      // File-upload path: extract plain text server-side, then reuse the
      // existing single-shot ingest flow. Stored as a "text" source.
      const form = await req.formData();
      const wikiId = form.get("wikiId");
      const file = form.get("file");
      if (typeof wikiId !== "string" || !wikiId)
        return NextResponse.json({ error: "Missing wikiId" }, { status: 400 });
      const wiki = await getUserWiki(userId, wikiId);
      if (!wiki) return NextResponse.json({ error: "Wiki not found" }, { status: 404 });
      if (!(file instanceof File))
        return NextResponse.json({ error: "Missing file" }, { status: 400 });
      if (file.size > MAX_UPLOAD_BYTES)
        return NextResponse.json(
          { error: `File too large (max ${Math.round(MAX_UPLOAD_BYTES / 1024 / 1024)} MB).` },
          { status: 413 },
        );

      const bytes = Buffer.from(await file.arrayBuffer());
      const extracted = await extractTextFromUpload(file.name, bytes);
      if (!extracted.text.trim())
        return NextResponse.json(
          { error: "No text could be extracted from that file." },
          { status: 400 },
        );

      type = "text";
      title = extracted.title || file.name;
      // Keep the FULL extracted text (bounded by MAX_DOCUMENT_CHARS in runIngest);
      // long docs are chunked rather than truncated to MAX_SOURCE_CHARS.
      content = extracted.text.slice(0, MAX_DOCUMENT_CHARS);

      return await runIngest(userId, wiki, { title, content, type });
    }

    const body = (await req.json()) as Body;
    if (!body.wikiId) return NextResponse.json({ error: "Missing wikiId" }, { status: 400 });
    const wiki = await getUserWiki(userId, body.wikiId);
    if (!wiki) return NextResponse.json({ error: "Wiki not found" }, { status: 404 });

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
      // Keep the FULL text; long docs are chunked (not truncated) in runIngest.
      content = body.content.slice(0, MAX_DOCUMENT_CHARS);
    }

    return await runIngest(userId, wiki, { title, content, type });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Ingest failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

type Wiki = NonNullable<Awaited<ReturnType<typeof getUserWiki>>>;

async function runIngest(
  userId: string,
  wiki: Wiki,
  source: { title: string; content: string; type: "text" | "url" },
) {
  if (source.content.length > MAX_DOCUMENT_CHARS)
    return NextResponse.json(
      {
        error: `Document too large (${source.content.length} chars, max ${MAX_DOCUMENT_CHARS}).`,
      },
      { status: 413 },
    );

  // Consume quota only once we have real work to do, just before the paid AI call.
  // The whole document (single-shot OR multi-chunk) counts as ONE ingest unit.
  const quota = await consumeIngestQuota(userId, await isProUser());
  if (!quota.allowed)
    return NextResponse.json({ error: quotaError("ingest", quota) }, { status: 429 });

  // Short content stays on the fast single-shot path (no behavior change).
  // Long content is split and ingested chunk-by-chunk, each chunk seeing the
  // running index.md so pages accumulate across chunks.
  const chunks =
    source.content.length > MAX_SOURCE_CHARS
      ? splitIntoChunks(source.content, CHUNK_CHARS)
      : [source.content];

  if (chunks.length > MAX_CHUNKS)
    return NextResponse.json(
      { error: `Document produced too many chunks (${chunks.length}, max ${MAX_CHUNKS}).` },
      { status: 413 },
    );

  const created = new Set<string>();
  const updated = new Set<string>();
  let lastSummary = "";

  for (let i = 0; i < chunks.length; i++) {
    // Re-read index.md before each chunk so later chunks see pages created by
    // earlier ones (the bible accumulates across the document).
    const indexPage = await getIndexPage(wiki.id);
    const chunkTitle =
      chunks.length > 1 ? `${source.title} (part ${i + 1}/${chunks.length})` : source.title;
    const result = await ingestSource({
      title: chunkTitle,
      content: chunks[i],
      schema: wiki.schema,
      indexMd: indexPage?.content ?? "",
    });
    lastSummary = result.summary;
    const applied = await applyPageOperations(wiki.id, result.operations);
    for (const s of applied.created) {
      // A slug created in an earlier chunk then re-touched later is an update.
      if (updated.has(s) || created.has(s)) updated.add(s);
      else created.add(s);
    }
    for (const s of applied.updated) {
      created.delete(s);
      updated.add(s);
    }
  }

  const createdArr = [...created];
  const updatedArr = [...updated];

  // One source row for the whole document (raw_content sensibly capped).
  await createSource({
    wikiId: wiki.id,
    type: source.type,
    title: source.title,
    rawContent: source.content.slice(0, MAX_SOURCE_CHARS),
    touchedSlugs: [...createdArr, ...updatedArr],
  });

  const summary =
    chunks.length > 1
      ? `Ingested ${chunks.length} chunks: ${createdArr.length} pages created, ${updatedArr.length} updated`
      : lastSummary;

  return NextResponse.json({
    summary,
    created: createdArr,
    updated: updatedArr,
    touchedSlugs: [...new Set([...createdArr, ...updatedArr])],
  });
}
