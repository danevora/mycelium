/**
 * AI layer — ingest + chat via the Vercel AI SDK, routed through Vercel AI Gateway.
 *
 * The Gateway proxies the model call (and is where per-user usage tracking / billing
 * margin will live once auth lands — PRD Phase 3). Auth: `AI_GATEWAY_API_KEY` locally,
 * or OIDC automatically on Vercel. Structured page operations come back via
 * `generateObject` + a Zod schema, so the JSON is validated for us.
 */
import { generateObject } from "ai";
import { z } from "zod";
import type { PageOperation } from "./db";

// AI Gateway model slug (creator/model). Override via env if the catalog slug differs.
const MODEL = process.env.MYCELIUM_MODEL ?? "anthropic/claude-sonnet-4-6";

// A single ingest/chat response can emit many full wiki pages as structured JSON.
// The provider default output cap (~4k tokens) truncates that mid-JSON, which then
// fails schema validation ("No object generated"). Give generation a generous budget.
const MAX_OUTPUT_TOKENS = 32_000;

const operationSchema = z.object({
  operation: z.enum(["create", "update"]),
  slug: z.string().describe("lowercase-hyphenated page slug"),
  title: z.string(),
  content: z.string().describe("full markdown content of the page"),
});

export type IngestResult = { operations: PageOperation[]; summary: string };

export async function ingestSource(input: {
  title: string;
  content: string;
  schema: string;
  indexMd: string;
}): Promise<IngestResult> {
  const system = `You are maintaining a personal knowledge wiki.

Wiki schema and conventions:
${input.schema}

Instructions:
1. Read the new source carefully.
2. Identify the key entities, concepts, and claims.
3. For each, create a new wiki page or update an existing one (prefer updating over duplicating).
4. Use [[slug]] wikilinks to cross-reference related pages.
5. Update index.md (slug "index") to include any new pages, grouped by category with one-line summaries.
6. Append an entry to log.md (slug "log") describing what changed and when.
7. Note any contradictions with existing wiki content inside the relevant page.

Return page operations covering every page you create or update (including index and log).
Slugs must be lowercase and hyphenated. "summary" is a one-line human-readable description
of what changed (e.g. "Created 3 pages, updated 2").`;

  const prompt = `Current wiki index (index.md):
${input.indexMd || "_empty_"}

New source to ingest:
Title: ${input.title}
Content:
${input.content}`;

  const { object } = await generateObject({
    model: MODEL,
    maxOutputTokens: MAX_OUTPUT_TOKENS,
    schema: z.object({
      operations: z.array(operationSchema),
      summary: z.string(),
    }),
    system,
    prompt,
  });

  return { operations: object.operations, summary: object.summary };
}

/**
 * Split a long document into sequential chunks for chunked ingest, each at most
 * `chunkChars` long. Pure function (no I/O) so it is unit-testable.
 *
 * Strategy: split on natural section boundaries first — chapter/part markers and
 * markdown headings (h1–h3) — then greedily pack those sections into chunks. A
 * section larger than the budget is further split on paragraph breaks, and as a
 * last resort hard-sliced by size, so no chunk exceeds `chunkChars`.
 */
export function splitIntoChunks(content: string, chunkChars: number): string[] {
  if (content.length <= chunkChars) return [content];

  const boundary = /^\s*(chapter\s+\w+|part\s+\w+)\b|^\s*#{1,3}\s/i;
  const lines = content.split("\n");
  const sections: string[] = [];
  let current: string[] = [];
  for (const line of lines) {
    if (boundary.test(line) && current.length > 0) {
      sections.push(current.join("\n"));
      current = [line];
    } else {
      current.push(line);
    }
  }
  if (current.length > 0) sections.push(current.join("\n"));

  const chunks: string[] = [];
  let buf = "";
  const flush = () => {
    if (buf.trim()) chunks.push(buf);
    buf = "";
  };
  for (const section of sections) {
    for (const piece of splitBySize(section, chunkChars)) {
      if (buf && buf.length + piece.length + 1 > chunkChars) flush();
      buf = buf ? buf + "\n" + piece : piece;
    }
  }
  flush();
  return chunks;
}

// Split a single section that may exceed the budget: by paragraphs, then by hard size.
function splitBySize(section: string, chunkChars: number): string[] {
  if (section.length <= chunkChars) return [section];
  const paras = section.split(/\n\s*\n/);
  const out: string[] = [];
  let buf = "";
  for (const para of paras) {
    if (para.length > chunkChars) {
      if (buf) {
        out.push(buf);
        buf = "";
      }
      for (let i = 0; i < para.length; i += chunkChars) out.push(para.slice(i, i + chunkChars));
      continue;
    }
    if (buf && buf.length + para.length + 2 > chunkChars) {
      out.push(buf);
      buf = "";
    }
    buf = buf ? buf + "\n\n" + para : para;
  }
  if (buf) out.push(buf);
  return out;
}

export type ChatResult = { reply: string; operations: PageOperation[] };

export async function chat(input: {
  message: string;
  schema: string;
  indexMd: string;
  relevantPages: { slug: string; title: string; content: string }[];
}): Promise<ChatResult> {
  const system = `You are maintaining a personal knowledge wiki and helping the user query and edit it.

Wiki schema:
${input.schema}

If the user is asking a question: answer it from the wiki, citing specific pages with [[slug]] wikilinks. Return an empty "operations" array.
If the user is requesting an edit: make the changes and return the updated page content in "operations" (create/update), keeping [[wikilinks]] consistent and updating index/log as needed. In "reply", give a short plain-language summary of what changed.`;

  const pageBlocks = input.relevantPages
    .map((p) => `--- page: ${p.slug} (${p.title}) ---\n${p.content}`)
    .join("\n\n");

  const prompt = `Wiki index (index.md):
${input.indexMd || "_empty_"}

Relevant wiki pages:
${pageBlocks || "_none retrieved_"}

User message: ${input.message}`;

  const { object } = await generateObject({
    model: MODEL,
    maxOutputTokens: MAX_OUTPUT_TOKENS,
    schema: z.object({
      reply: z.string(),
      operations: z.array(operationSchema),
    }),
    system,
    prompt,
  });

  return { reply: object.reply, operations: object.operations };
}

export type ConsistencyFinding = { entity: string; issue: string; locations: string[] };
export type ConsistencyResult = { findings: ConsistencyFinding[] };

// Cap total page content sent to the model, in the spirit of MAX_SOURCE_CHARS.
const MAX_CONSISTENCY_CHARS = 60_000;

export async function checkConsistency(input: {
  schema: string;
  pages: { slug: string; title: string; content: string }[];
}): Promise<ConsistencyResult> {
  const system = `You are auditing a personal knowledge wiki for internal factual contradictions.

Wiki schema and conventions:
${input.schema}

Instructions:
1. Read all the provided pages together as one knowledge base.
2. Find genuine factual contradictions or inconsistencies between pages (or within a page):
   an attribute stated differently in two places (e.g. eye color, birthplace, a number),
   timeline/date conflicts, mutually exclusive claims about the same entity.
3. Return one finding per distinct contradiction, with:
   - "entity": the person/place/thing/concept the contradiction is about,
   - "issue": a single-line description of the conflicting statements,
   - "locations": the page slugs (or titles) where the conflicting statements appear.
4. Only report real contradictions — do not invent issues or flag mere incompleteness.
   If the wiki is internally consistent, return an empty "findings" array.`;

  // Budget the payload: include pages until we hit the char cap.
  let used = 0;
  const blocks: string[] = [];
  for (const p of input.pages) {
    const block = `--- page: ${p.slug} (${p.title}) ---\n${p.content}`;
    if (used + block.length > MAX_CONSISTENCY_CHARS) break;
    blocks.push(block);
    used += block.length;
  }

  const prompt = `Wiki pages to audit:
${blocks.join("\n\n") || "_no pages_"}`;

  const { object } = await generateObject({
    model: MODEL,
    maxOutputTokens: MAX_OUTPUT_TOKENS,
    schema: z.object({
      findings: z.array(
        z.object({
          entity: z.string(),
          issue: z.string(),
          locations: z.array(z.string()),
        }),
      ),
    }),
    system,
    prompt,
  });

  return { findings: object.findings };
}
