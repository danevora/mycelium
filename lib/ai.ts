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
    schema: z.object({
      operations: z.array(operationSchema),
      summary: z.string(),
    }),
    system,
    prompt,
  });

  return { operations: object.operations, summary: object.summary };
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
    schema: z.object({
      reply: z.string(),
      operations: z.array(operationSchema),
    }),
    system,
    prompt,
  });

  return { reply: object.reply, operations: object.operations };
}
