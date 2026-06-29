-- Mycelium Postgres schema. Idempotent — safe to run repeatedly.
-- Applied via `npm run db:setup` (scripts/migrate.ts). Mirrors the prior SQLite
-- shape: TEXT/INTEGER columns + ISO-string timestamps for portability.

CREATE TABLE IF NOT EXISTS wiki (
  id          TEXT PRIMARY KEY,
  user_id     TEXT NOT NULL UNIQUE,   -- Clerk user id; one wiki per user
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

-- Per-user daily usage counters (cheap rate limiting; no external store).
-- One row per (user, UTC day, action kind); count is incremented atomically.
CREATE TABLE IF NOT EXISTS usage_counter (
  user_id TEXT    NOT NULL,
  day     TEXT    NOT NULL,   -- 'YYYY-MM-DD' (UTC)
  kind    TEXT    NOT NULL,   -- 'ingest' | 'chat'
  count   INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, day, kind)
);

CREATE INDEX IF NOT EXISTS idx_wiki_page_wiki    ON wiki_page (wiki_id);
CREATE INDEX IF NOT EXISTS idx_source_wiki       ON source (wiki_id);
CREATE INDEX IF NOT EXISTS idx_chat_message_wiki ON chat_message (wiki_id);
