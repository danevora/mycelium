# PRD: Mycelium: An LLM Wiki — AI-Maintained Personal Knowledge Base

## Overview

LLM Wiki is a web application that transforms raw sources (articles, PDFs, notes, URLs) into a persistent, structured, interlinked knowledge base maintained entirely by AI. Users add sources; the AI builds and maintains a wiki of interconnected markdown pages. Users explore and refine through three surfaces: a graph view, a wiki view, and a chat interface.

The core insight (credit: Andrej Karpathy) is that this is fundamentally different from RAG. Rather than retrieving raw chunks at query time, the AI compiles knowledge once into a structured wiki that compounds over time — cross-referencing, flagging contradictions, and integrating new sources into the existing synthesis.

---

## Tech Stack

- **Framework:** Next.js (App Router) hosted on Vercel
- **Database:** Postgres (via Vercel Postgres or Neon)
- **Auth:** Clerk or NextAuth
- **AI:** Vercel AI SDK + Vercel AI Gateway (proxies Anthropic/OpenAI, tracks usage per user)
- **Storage:** Vercel Blob for raw source files
- **Background jobs:** Vercel Functions (for ingest pipeline)
- **Styling:** Tailwind CSS
- **Graph rendering:** react-force-graph or D3

---

## Core Concepts

### Raw Sources
User-supplied input. Immutable — the AI reads from them but never modifies them. Supported types:
- PDF upload
- Plain text / markdown paste
- URL (fetched and converted to markdown)

### Wiki
A collection of AI-generated markdown pages stored in the database. The AI owns this layer entirely — it creates pages, updates them on new ingests, maintains cross-references via `[[wikilinks]]`, and keeps everything consistent. Users read it; the AI writes it. Users can request changes via chat.

### Schema (System Prompt)
A persistent system prompt stored per-wiki that tells the AI how the wiki is structured, what conventions to follow, and how to behave during ingest and editing. Evolves as the wiki grows.

### Index
A special `index.md` page the AI maintains — a catalog of all pages with one-line summaries, organized by category. Used by the AI as a navigation tool during query and ingest.

### Log
An append-only `log.md` the AI updates on every ingest and significant edit. Records what happened and when.

---

## Data Model

```
User
  id, email, created_at
  subscription_tier (free | pro)
  ai_credits_used (tracked via AI Gateway)

Wiki
  id, user_id, name, description
  schema (text — system prompt / conventions)
  created_at, updated_at

WikiPage
  id, wiki_id
  title (text)
  slug (text — used for [[wikilinks]])
  content (markdown text)
  is_index (bool)
  is_log (bool)
  created_at, updated_at

Source
  id, wiki_id
  type (pdf | text | url)
  title
  raw_content (text)
  blob_url (for PDFs)
  ingested_at
  page_ids_touched (array — which wiki pages were created/updated)

ChatMessage
  id, wiki_id, role (user | assistant), content, created_at
```

---

## Core User Flows

### 1. Onboarding
1. User signs up
2. Creates a wiki (name + optional description)
3. Prompted to add their first source
4. Ingest runs, wiki builds
5. Redirected to graph view of the resulting wiki

### 2. Ingest
1. User adds a source (upload PDF, paste text, or enter URL)
2. Backend pipeline runs:
   a. Fetch/parse source into clean text
   b. Load the wiki's current index.md and schema
   c. Send to AI: "Here is a new source. Here is the current wiki index. Read the source, identify key concepts, create or update relevant pages, update the index, append to the log. Return a list of page operations (create/update) with full page content."
   d. Apply page operations to database
   e. Return to user: summary of what changed (X pages created, Y pages updated)
3. Graph view animates to show new/updated nodes

**AI ingest prompt structure:**
```
You are maintaining a personal knowledge wiki. 

Wiki schema and conventions:
{wiki.schema}

Current wiki index:
{index.md content}

New source to ingest:
Title: {source.title}
Content: {source.raw_content}

Instructions:
1. Read the source carefully
2. Identify key entities, concepts, and claims
3. For each: create a new wiki page or update an existing one
4. Use [[wikilinks]] to cross-reference related pages
5. Update index.md to include any new pages
6. Append an entry to log.md
7. Note any contradictions with existing wiki content

Return a JSON array of page operations:
[{ "operation": "create" | "update", "slug": "...", "title": "...", "content": "..." }]
```

### 3. Graph View
- Animated force-directed graph of wiki pages as nodes
- Edges = [[wikilinks]] between pages
- Node size = number of inbound links (hub pages are larger)
- Click a node → opens that page in wiki view
- Orphan nodes visually distinct (no inbound links)
- New/recently updated nodes briefly highlighted after ingest

### 4. Wiki View
- Rendered markdown with clickable [[wikilinks]]
- Sidebar: page list, search
- Header: source count, last updated
- [[wikilinks]] that don't have a page yet render as stubs (dashed underline)

### 5. Chat View
Dual purpose: querying the wiki AND editing it.

**Query example:**
> "What do I know about the relationship between House Atreides and the Spacing Guild?"
AI searches the wiki index, reads relevant pages, synthesizes an answer with citations to specific wiki pages.

**Edit example:**
> "The page on Paul Atreides says he's the son of Duke Leto — add that his mother is Lady Jessica and she's a Bene Gesserit"
AI reads the relevant pages, makes targeted updates, returns a summary of what changed.

**AI chat prompt structure:**
```
You are maintaining a personal knowledge wiki and helping the user query and edit it.

Wiki schema:
{wiki.schema}

Wiki index:
{index.md content}

Relevant wiki pages (retrieved based on user message):
{page contents}

User message: {message}

If this is a query: answer it with citations to specific wiki pages.
If this is an edit request: make the changes and return updated page content as JSON operations, plus a plain-language summary of what you changed.
```

### 6. Linting (periodic / on-demand)
User can trigger a "health check" from settings. AI scans the wiki for:
- Orphan pages (no inbound links)
- Stubs (wikilinks pointing to non-existent pages)
- Potential contradictions between pages
- Missing cross-references
Returns a report with actionable suggestions.

---

## Surfaces

### Graph View (primary / marketing hook)
The first thing users see after ingest. Visually demonstrates the compounding nature of the wiki. Should feel alive — smooth animations, nodes that pulse on hover, edges that highlight on selection.

### Wiki View
Clean reading experience. Rendered markdown, clickable links, simple navigation. This is where most daily reading happens.

### Chat View
Persistent chat thread per wiki. Handles both Q&A and editing. Shows citations inline. After an edit operation, shows a diff-style summary of what changed.

---

## Monetization

Via Vercel AI Gateway — all AI calls are proxied through Gateway, which tracks token usage per user. A margin is applied on top of model provider costs.

**Free tier:**
- 1 wiki
- 50 wiki pages max
- 50k AI tokens/month
- Enough to experience the core loop on a small project

**Pro tier (~$15/month):**
- Unlimited wikis
- Unlimited wiki pages
- 500k AI tokens/month (additional usage billed per token above limit)
- Priority ingest queue

---

## MVP Scope

Build in this order:

**Phase 1 — Core loop**
- Auth + wiki creation
- Text/URL source ingest
- AI ingest pipeline → wiki pages in DB
- Wiki view (rendered markdown, wikilinks)
- Basic chat (query only, no editing)

**Phase 2 — Graph + editing**
- Graph view (force-directed, clickable nodes)
- Chat editing (user requests changes, AI updates pages)
- Index and log pages

**Phase 3 — Polish + monetization**
- PDF ingest
- AI Gateway integration + usage tracking
- Free/pro tier enforcement
- Lint / health check feature
- Onboarding flow

---

## Key Technical Decisions

**Wikilink resolution:** Store pages by slug. When rendering markdown, parse `[[slug]]` patterns and resolve to page IDs. Unresolved links render as stubs.

**Ingest atomicity:** Page operations from ingest should apply as a transaction — either all succeed or none do. Prevents partial wiki states.

**Context window management:** For large wikis, don't send all page content to the AI. Send the index first, then fetch only the pages the AI identifies as relevant. This keeps ingest cost bounded as the wiki grows.

**Graph data:** Derive graph edges in real time from wikilinks parsed out of page content. No separate edges table needed — parse on render.

**AI model:** Use Claude Sonnet (claude-sonnet-4-6) as default via AI Gateway. Allow pro users to select model.

---

## What Success Looks Like (MVP)

A user can:
1. Create a wiki
2. Add 5-10 sources
3. See a graph of interconnected pages
4. Ask a question and get a cited answer
5. Request an edit via chat and see it reflected immediately

The wiki after 10 sources should feel meaningfully more useful than reading those sources in isolation — that's the core value proposition to validate.