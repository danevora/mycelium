/**
 * Data layer — the "swap seam".
 *
 * Everything here is `async` even though better-sqlite3 is synchronous, so that
 * swapping to an async Postgres driver later touches only this file. SQL is kept
 * portable (TEXT/INTEGER timestamps, `RETURNING`) so the queries barely change.
 */
import Database from "better-sqlite3";
import { randomUUID } from "node:crypto";
import path from "node:path";

export type Wiki = {
  id: string;
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

const DEFAULT_SCHEMA = `# Mycelium Wiki Conventions

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

let _db: Database.Database | null = null;

function db(): Database.Database {
  if (_db) return _db;
  const file = process.env.MYCELIUM_DB ?? path.join(process.cwd(), "mycelium.db");
  const conn = new Database(file);
  conn.pragma("journal_mode = WAL");
  conn.exec(`
    CREATE TABLE IF NOT EXISTS wiki (
      id          TEXT PRIMARY KEY,
      name        TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      schema      TEXT NOT NULL DEFAULT '',
      created_at  TEXT NOT NULL,
      updated_at  TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS wiki_page (
      id         TEXT PRIMARY KEY,
      wiki_id    TEXT NOT NULL,
      title      TEXT NOT NULL,
      slug       TEXT NOT NULL,
      content    TEXT NOT NULL DEFAULT '',
      is_index   INTEGER NOT NULL DEFAULT 0,
      is_log     INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      UNIQUE (wiki_id, slug)
    );
    CREATE TABLE IF NOT EXISTS source (
      id               TEXT PRIMARY KEY,
      wiki_id          TEXT NOT NULL,
      type             TEXT NOT NULL,
      title            TEXT NOT NULL,
      raw_content      TEXT NOT NULL DEFAULT '',
      blob_url         TEXT,
      ingested_at      TEXT NOT NULL,
      page_ids_touched TEXT NOT NULL DEFAULT '[]'
    );
    CREATE TABLE IF NOT EXISTS chat_message (
      id         TEXT PRIMARY KEY,
      wiki_id    TEXT NOT NULL,
      role       TEXT NOT NULL,
      content    TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
  `);
  _db = conn;
  return conn;
}

const now = () => new Date().toISOString();

export async function getOrCreateDefaultWiki(): Promise<Wiki> {
  const conn = db();
  const existing = conn
    .prepare("SELECT * FROM wiki ORDER BY created_at ASC LIMIT 1")
    .get() as Wiki | undefined;
  if (existing) return existing;

  const ts = now();
  const wiki: Wiki = {
    id: randomUUID(),
    name: "My Wiki",
    description: "An AI-maintained knowledge base.",
    schema: DEFAULT_SCHEMA,
    created_at: ts,
    updated_at: ts,
  };
  conn
    .prepare(
      "INSERT INTO wiki (id, name, description, schema, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)",
    )
    .run(wiki.id, wiki.name, wiki.description, wiki.schema, wiki.created_at, wiki.updated_at);

  // Seed the special index + log pages so the AI has something to maintain.
  const seed = conn.prepare(
    "INSERT INTO wiki_page (id, wiki_id, title, slug, content, is_index, is_log, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
  );
  seed.run(randomUUID(), wiki.id, "Index", "index", "# Index\n\n_No pages yet._\n", 1, 0, ts, ts);
  seed.run(randomUUID(), wiki.id, "Log", "log", "# Log\n", 0, 1, ts, ts);
  return wiki;
}

export async function getWiki(id: string): Promise<Wiki | undefined> {
  return db().prepare("SELECT * FROM wiki WHERE id = ?").get(id) as Wiki | undefined;
}

export async function updateWikiSchema(id: string, schema: string): Promise<void> {
  db()
    .prepare("UPDATE wiki SET schema = ?, updated_at = ? WHERE id = ?")
    .run(schema, now(), id);
}

export async function listPages(wikiId: string): Promise<WikiPage[]> {
  return db()
    .prepare("SELECT * FROM wiki_page WHERE wiki_id = ? ORDER BY title COLLATE NOCASE ASC")
    .all(wikiId) as WikiPage[];
}

export async function getPage(wikiId: string, slug: string): Promise<WikiPage | undefined> {
  return db()
    .prepare("SELECT * FROM wiki_page WHERE wiki_id = ? AND slug = ?")
    .get(wikiId, slug) as WikiPage | undefined;
}

export async function getIndexPage(wikiId: string): Promise<WikiPage | undefined> {
  return db()
    .prepare("SELECT * FROM wiki_page WHERE wiki_id = ? AND is_index = 1 LIMIT 1")
    .get(wikiId) as WikiPage | undefined;
}

export async function getLogPage(wikiId: string): Promise<WikiPage | undefined> {
  return db()
    .prepare("SELECT * FROM wiki_page WHERE wiki_id = ? AND is_log = 1 LIMIT 1")
    .get(wikiId) as WikiPage | undefined;
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
  const conn = db();
  const created: string[] = [];
  const updated: string[] = [];

  const tx = conn.transaction(() => {
    const ts = now();
    const find = conn.prepare("SELECT id FROM wiki_page WHERE wiki_id = ? AND slug = ?");
    const upd = conn.prepare(
      "UPDATE wiki_page SET title = ?, content = ?, updated_at = ? WHERE wiki_id = ? AND slug = ?",
    );
    const ins = conn.prepare(
      "INSERT INTO wiki_page (id, wiki_id, title, slug, content, is_index, is_log, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
    );
    for (const op of ops) {
      const slug = op.slug.trim().toLowerCase();
      if (!slug) continue;
      const isIndex = slug === "index" ? 1 : 0;
      const isLog = slug === "log" ? 1 : 0;
      const exists = find.get(wikiId, slug) as { id: string } | undefined;
      if (exists) {
        upd.run(op.title, op.content, ts, wikiId, slug);
        updated.push(slug);
      } else {
        ins.run(randomUUID(), wikiId, op.title, slug, op.content, isIndex, isLog, ts, ts);
        created.push(slug);
      }
    }
    conn.prepare("UPDATE wiki SET updated_at = ? WHERE id = ?").run(ts, wikiId);
  });
  tx();
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
  const conn = db();
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
  conn
    .prepare(
      "INSERT INTO source (id, wiki_id, type, title, raw_content, blob_url, ingested_at, page_ids_touched) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
    )
    .run(
      src.id,
      src.wiki_id,
      src.type,
      src.title,
      src.raw_content,
      src.blob_url,
      src.ingested_at,
      src.page_ids_touched,
    );
  return src;
}

export async function listSources(wikiId: string): Promise<Source[]> {
  return db()
    .prepare("SELECT * FROM source WHERE wiki_id = ? ORDER BY ingested_at DESC")
    .all(wikiId) as Source[];
}

export async function listChat(wikiId: string): Promise<ChatMessage[]> {
  return db()
    .prepare("SELECT * FROM chat_message WHERE wiki_id = ? ORDER BY created_at ASC")
    .all(wikiId) as ChatMessage[];
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
  db()
    .prepare(
      "INSERT INTO chat_message (id, wiki_id, role, content, created_at) VALUES (?, ?, ?, ?, ?)",
    )
    .run(msg.id, msg.wiki_id, msg.role, msg.content, msg.created_at);
  return msg;
}
