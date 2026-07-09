/**
 * Wiki templates — presets that seed a new wiki's `schema` (the per-wiki
 * system-prompt text injected in `lib/ai.ts`, both `ingestSource` and `chat`)
 * plus UI labels for the source and page nouns. Templates are a code constant,
 * not a DB table; the seeded `schema` stays editable afterward via the existing
 * `WikiSchemaEditor`. `blank` maps to an empty schema so ingest/chat fall back
 * to the layer's built-in conventions (current default behavior).
 */

export type WikiTemplate = {
  key: string;
  name: string;
  tagline: string;
  /** Per-wiki system-prompt text; injected verbatim into the AI system prompt. */
  schema: string;
  sourceLabel: string;
  pageLabel: string;
};

export const WIKI_TEMPLATES: WikiTemplate[] = [
  {
    key: "story-bible",
    name: "Story Bible",
    tagline: "A living bible for fiction — characters, places, factions, and timeline, kept consistent.",
    schema: `This wiki is a story bible for a work of fiction. Organize it as a knowledge base of the story's world.

Structure:
- Create ONE page per distinct entity: each character, location, faction/organization, timeline, and notable event gets its own page. Do not combine multiple entities onto a single page.
- Slugs are the lowercase, hyphenated form of the entity's name (e.g. "Paul Atreides" -> "paul-atreides").
- Cross-reference related entities inline with [[slug]] wikilinks (e.g. link a character to the [[faction]] they belong to and the [[location]] they live in).
- index.md catalogs every page grouped by category (Characters, Locations, Factions, Timeline, Events).

For each entity, record its key attributes so continuity can be checked later:
- Characters: physical appearance, personality, relationships to other characters, allegiances/faction, and how they change over the story.
- Locations: geography, notable features, who and what is found there.
- Factions: goals, leadership, membership, and relationships (allies/enemies) to other factions.
- Timeline & events: when things happen relative to each other, and who/what was involved.

Continuity is the priority. When a new source contradicts something already recorded (e.g. a character's eye color, an allegiance, or an event's date changes), do NOT silently overwrite it — note the contradiction explicitly on the relevant page so it can be reviewed. Prefer updating an existing entity page over creating a near-duplicate.`,
    sourceLabel: "Chapter / Manuscript",
    pageLabel: "Entry",
  },
  {
    key: "research",
    name: "Research / Literature",
    tagline: "A research base of concepts and claims, each tied to its sources, with contradictions flagged.",
    schema: `This wiki is a research and literature knowledge base. Organize it around the ideas being studied, not around individual documents.

Structure:
- Create ONE page per distinct concept, claim, or method. A source (paper, article, dataset) may also get a page capturing its bibliographic details, but its findings live on the concept/claim pages it supports.
- Slugs are the lowercase, hyphenated form of the concept or claim.
- Cross-reference related concepts, claims, methods, and sources inline with [[slug]] wikilinks.
- index.md catalogs every page grouped by category (Concepts, Claims, Methods, Sources).

For each claim, record who makes it and the evidence behind it:
- Attribute every claim to its source with an inline citation (author/year or title), and link to that source's page with [[slug]].
- Note the method or evidence supporting the claim where relevant.

When two sources disagree on a claim, explicitly flag the contradiction on the relevant claim page — name both sources and summarize how they differ, rather than picking a winner or overwriting one with the other. Prefer updating an existing concept/claim page over creating a near-duplicate.`,
    sourceLabel: "Paper / Source",
    pageLabel: "Note",
  },
  {
    key: "second-brain",
    name: "Second Brain",
    tagline: "Atomic notes — one idea per page, linked liberally, with an evolving index.",
    schema: `This wiki is a personal "second brain" of atomic notes. Favor small, focused, reusable notes over long documents.

Structure:
- Create ONE page per idea. Keep each note atomic: a single concept, insight, or topic expressed clearly enough to stand on its own.
- Slugs are the lowercase, hyphenated form of the note's title.
- Link liberally: whenever a note references another idea that has (or should have) its own note, connect them with [[slug]] wikilinks. Dense linking is a feature, not clutter.
- Maintain index.md as an evolving map of the notes, grouped by theme with one-line summaries, so the knowledge base stays navigable as it grows.

Prefer updating or splitting an existing note over creating a near-duplicate, and note explicitly when a new source contradicts an existing note.`,
    sourceLabel: "Source",
    pageLabel: "Note",
  },
  {
    key: "blank",
    name: "Blank",
    tagline: "No preset conventions — start from a clean slate and shape the wiki yourself.",
    schema: "",
    sourceLabel: "Source",
    pageLabel: "Page",
  },
];
