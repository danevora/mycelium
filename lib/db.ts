/**
 * Data layer — the "swap seam".
 *
 * Backed by Neon serverless Postgres (provisioned via Vercel's Neon integration,
 * which injects DATABASE_URL). Everything is `async`; SQL is kept portable
 * (TEXT/INTEGER columns, ISO-string timestamps, `RETURNING`). Per-user scoping
 * lives on `wiki.user_id` (a Clerk user id) — one wiki per user.
 *
 * Table DDL lives in `lib/schema.sql` and is applied once via `npm run db:setup`
 * (scripts/migrate.ts), not on the request path.
 */
import { Pool, type PoolClient } from "@neondatabase/serverless";
import { randomUUID } from "node:crypto";

export type Wiki = {
  id: string;
  user_id: string;
  name: string;
  description: string;
  schema: string;
  created_at: string;
  updated_at: string;
};

export type WikiPage = {
  id: string;
  wiki_id: string;
  title: string;
  slug: string;
  content: string;
  is_index: number;
  is_log: number;
  created_at: string;
  updated_at: string;
};

export type Source = {
  id: string;
  wiki_id: string;
  type: "text" | "url" | "pdf";
  title: string;
  raw_content: string;
  blob_url: string | null;
  ingested_at: string;
  page_ids_touched: string; // JSON array of slugs
};

export type ChatMessage = {
  id: string;
  wiki_id: string;
  role: "user" | "assistant";
  content: string;
  created_at: string;
};

export type PageOperation = {
  operation: "create" | "update";
  slug: string;
  title: string;
  content: string;
};

export const DEFAULT_SCHEMA = `# Mycelium Wiki Conventions

You maintain a personal knowledge wiki of interlinked markdown pages.

Structure:
- One page per distinct entity, concept, or claim. Title pages clearly.
- Each page's slug is a lowercase, hyphenated form of its title (e.g. "Paul Atreides" -> "paul-atreides").
- Cross-reference related pages with [[slug]] wikilinks inline in the prose.
- index.md is a catalog of all pages with one-line summaries, grouped by category.
- log.md is an append-only record of what changed and when.

Behavior:
- Prefer updating an existing page over creating a near-duplicate.
- When new sources contradict existing pages, note the contradiction explicitly.
- Keep pages concise and well-structured; synthesize rather than dump raw text.`;

let _pool: Pool | null = null;

function pool(): Pool {
  if (_pool) return _pool;
  const connectionString = process.env.DATABASE_URL ?? process.env.POSTGRES_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL (or POSTGRES_URL) is not set — provision the Neon/Vercel Postgres integration.");
  }
  _pool = new Pool({ connectionString });
  return _pool;
}

async function query<T>(text: string, params: unknown[] = []): Promise<T[]> {
  const res = await pool().query(text, params);
  return res.rows as T[];
}

const now = () => new Date().toISOString();

const SEED_PAGE_SQL = `INSERT INTO wiki_page
  (id, wiki_id, title, slug, content, is_index, is_log, created_at, updated_at)
  VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`;

/**
 * Return the signed-in user's wiki, creating + seeding it (index/log pages) on
 * first visit. `wiki.user_id` is UNIQUE so the `ON CONFLICT` guards two first-load
 * requests racing each other.
 */
export async function getOrCreateUserWiki(userId: string): Promise<Wiki> {
  const existing = await query<Wiki>("SELECT * FROM wiki WHERE user_id = $1 LIMIT 1", [userId]);
  if (existing[0]) return existing[0];

  const client = await pool().connect();
  try {
    await client.query("BEGIN");
    const ts = now();
    const inserted = await client.query(
      `INSERT INTO wiki (id, user_id, name, description, schema, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (user_id) DO NOTHING
       RETURNING *`,
      [randomUUID(), userId, "My Wiki", "An AI-maintained knowledge base.", DEFAULT_SCHEMA, ts, ts],
    );

    if (inserted.rows.length === 0) {
      // Lost the race — another request just created it. Return that one.
      await client.query("COMMIT");
      const w = await query<Wiki>("SELECT * FROM wiki WHERE user_id = $1 LIMIT 1", [userId]);
      return w[0];
    }

    const wiki = inserted.rows[0] as Wiki;
    await client.query(SEED_PAGE_SQL, [
      randomUUID(), wiki.id, "Index", "index", "# Index\n\n_No pages yet._\n", 1, 0, ts, ts,
    ]);
    await client.query(SEED_PAGE_SQL, [
      randomUUID(), wiki.id, "Log", "log", "# Log\n", 0, 1, ts, ts,
    ]);
    await client.query("COMMIT");
    return wiki;
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

export async function getWiki(id: string): Promise<Wiki | undefined> {
  return (await query<Wiki>("SELECT * FROM wiki WHERE id = $1", [id]))[0];
}

export async function updateWikiSchema(id: string, schema: string): Promise<void> {
  await query("UPDATE wiki SET schema = $1, updated_at = $2 WHERE id = $3", [schema, now(), id]);
}

export async function listPages(wikiId: string): Promise<WikiPage[]> {
  return query<WikiPage>(
    "SELECT * FROM wiki_page WHERE wiki_id = $1 ORDER BY LOWER(title) ASC",
    [wikiId],
  );
}

export async function getPage(wikiId: string, slug: string): Promise<WikiPage | undefined> {
  return (
    await query<WikiPage>("SELECT * FROM wiki_page WHERE wiki_id = $1 AND slug = $2", [wikiId, slug])
  )[0];
}

export async function getIndexPage(wikiId: string): Promise<WikiPage | undefined> {
  return (
    await query<WikiPage>(
      "SELECT * FROM wiki_page WHERE wiki_id = $1 AND is_index = 1 LIMIT 1",
      [wikiId],
    )
  )[0];
}

export async function getLogPage(wikiId: string): Promise<WikiPage | undefined> {
  return (
    await query<WikiPage>("SELECT * FROM wiki_page WHERE wiki_id = $1 AND is_log = 1 LIMIT 1", [wikiId])
  )[0];
}

/**
 * Apply a batch of create/update page operations atomically (PRD: ingest atomicity).
 * Returns the slugs created vs updated. Special slugs `index`/`log` map onto the
 * existing index/log pages.
 */
export async function applyPageOperations(
  wikiId: string,
  ops: PageOperation[],
): Promise<{ created: string[]; updated: string[] }> {
  const created: string[] = [];
  const updated: string[] = [];
  const client: PoolClient = await pool().connect();
  try {
    await client.query("BEGIN");
    const ts = now();
    for (const op of ops) {
      const slug = op.slug.trim().toLowerCase();
      if (!slug) continue;
      const isIndex = slug === "index" ? 1 : 0;
      const isLog = slug === "log" ? 1 : 0;
      const exists = await client.query("SELECT id FROM wiki_page WHERE wiki_id = $1 AND slug = $2", [
        wikiId,
        slug,
      ]);
      if (exists.rows.length > 0) {
        await client.query(
          "UPDATE wiki_page SET title = $1, content = $2, updated_at = $3 WHERE wiki_id = $4 AND slug = $5",
          [op.title, op.content, ts, wikiId, slug],
        );
        updated.push(slug);
      } else {
        await client.query(SEED_PAGE_SQL, [
          randomUUID(), wikiId, op.title, slug, op.content, isIndex, isLog, ts, ts,
        ]);
        created.push(slug);
      }
    }
    await client.query("UPDATE wiki SET updated_at = $1 WHERE id = $2", [ts, wikiId]);
    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
  return { created, updated };
}

export async function createSource(input: {
  wikiId: string;
  type: Source["type"];
  title: string;
  rawContent: string;
  blobUrl?: string | null;
  touchedSlugs: string[];
}): Promise<Source> {
  const src: Source = {
    id: randomUUID(),
    wiki_id: input.wikiId,
    type: input.type,
    title: input.title,
    raw_content: input.rawContent,
    blob_url: input.blobUrl ?? null,
    ingested_at: now(),
    page_ids_touched: JSON.stringify(input.touchedSlugs),
  };
  await query(
    "INSERT INTO source (id, wiki_id, type, title, raw_content, blob_url, ingested_at, page_ids_touched) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)",
    [
      src.id,
      src.wiki_id,
      src.type,
      src.title,
      src.raw_content,
      src.blob_url,
      src.ingested_at,
      src.page_ids_touched,
    ],
  );
  return src;
}

export async function listSources(wikiId: string): Promise<Source[]> {
  return query<Source>("SELECT * FROM source WHERE wiki_id = $1 ORDER BY ingested_at DESC", [wikiId]);
}

export async function listChat(wikiId: string): Promise<ChatMessage[]> {
  return query<ChatMessage>(
    "SELECT * FROM chat_message WHERE wiki_id = $1 ORDER BY created_at ASC",
    [wikiId],
  );
}

/**
 * Atomically increment a user's daily counter for `kind`, but only if still under
 * `limit`. Returns whether the action is allowed. The `WHERE count < limit` on the
 * conflict path means a maxed-out counter updates nothing and RETURNING yields no
 * row — so concurrent requests can't overshoot the cap.
 */
export async function tryConsumeQuota(
  userId: string,
  kind: string,
  limit: number,
): Promise<{ allowed: boolean; used: number; limit: number }> {
  const day = new Date().toISOString().slice(0, 10); // UTC YYYY-MM-DD
  const rows = await query<{ count: number }>(
    `INSERT INTO usage_counter (user_id, day, kind, count)
     VALUES ($1, $2, $3, 1)
     ON CONFLICT (user_id, day, kind)
     DO UPDATE SET count = usage_counter.count + 1
     WHERE usage_counter.count < $4
     RETURNING count`,
    [userId, day, kind, limit],
  );
  if (rows.length === 0) return { allowed: false, used: limit, limit };
  return { allowed: true, used: rows[0].count, limit };
}

export async function addChatMessage(
  wikiId: string,
  role: ChatMessage["role"],
  content: string,
): Promise<ChatMessage> {
  const msg: ChatMessage = {
    id: randomUUID(),
    wiki_id: wikiId,
    role,
    content,
    created_at: now(),
  };
  await query(
    "INSERT INTO chat_message (id, wiki_id, role, content, created_at) VALUES ($1, $2, $3, $4, $5)",
    [msg.id, msg.wiki_id, msg.role, msg.content, msg.created_at],
  );
  return msg;
}
