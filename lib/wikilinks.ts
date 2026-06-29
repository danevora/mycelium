/**
 * Wikilink parsing + graph derivation.
 *
 * PRD key decision: graph edges are derived in real time from [[wikilinks]] parsed
 * out of page content — there is no separate edges table.
 */
import type { WikiPage } from "./db";

const WIKILINK = /\[\[([^\]|]+)(?:\|[^\]]+)?\]\]/g;

export function slugify(text: string): string {
  return text
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** Extract the target slugs referenced by [[wikilinks]] in some markdown. */
export function parseWikilinks(content: string): string[] {
  const slugs = new Set<string>();
  for (const m of content.matchAll(WIKILINK)) {
    const target = slugify(m[1]);
    if (target) slugs.add(target);
  }
  return [...slugs];
}

export type GraphNode = {
  id: string; // slug
  title: string;
  inbound: number;
  isStub: boolean; // referenced but no page exists
  isOrphan: boolean; // a real page with no inbound links
  isSpecial: boolean; // index/log
  updatedAt: string | null;
};

export type GraphLink = { source: string; target: string };

export type Graph = { nodes: GraphNode[]; links: GraphLink[] };

/** Build the force-graph payload from the current set of pages. */
export function buildGraph(pages: WikiPage[]): Graph {
  // Index/log are special pages that shouldn't clutter the graph — drop them
  // and any edges that touch them.
  const visible = pages.filter((p) => p.is_index === 0 && p.is_log === 0);
  const visibleSlugs = new Set(visible.map((p) => p.slug));
  const specialSlugs = new Set(
    pages.filter((p) => p.is_index === 1 || p.is_log === 1).map((p) => p.slug)
  );

  const bySlug = new Map(visible.map((p) => [p.slug, p]));
  const inbound = new Map<string, number>();
  const links: GraphLink[] = [];
  const stubSlugs = new Set<string>();

  for (const p of visible) {
    for (const target of parseWikilinks(p.content)) {
      if (target === p.slug) continue; // ignore self-links
      if (specialSlugs.has(target)) continue; // skip edges into index/log
      links.push({ source: p.slug, target });
      inbound.set(target, (inbound.get(target) ?? 0) + 1);
      if (!bySlug.has(target)) stubSlugs.add(target);
    }
  }

  const nodes: GraphNode[] = [];
  for (const p of visible) {
    nodes.push({
      id: p.slug,
      title: p.title,
      inbound: inbound.get(p.slug) ?? 0,
      isStub: false,
      isOrphan: (inbound.get(p.slug) ?? 0) === 0,
      isSpecial: false,
      updatedAt: p.updated_at,
    });
  }
  for (const slug of stubSlugs) {
    nodes.push({
      id: slug,
      title: slug,
      inbound: inbound.get(slug) ?? 0,
      isStub: true,
      isOrphan: false,
      isSpecial: false,
      updatedAt: null,
    });
  }

  return { nodes, links };
}

/** Whether a [[link]] target resolves to a real page. */
export function isResolved(slug: string, pages: WikiPage[]): boolean {
  return pages.some((p) => p.slug === slug);
}

/**
 * Rewrite [[Target]] / [[Target|Label]] into standard markdown links pointing at
 * /wiki/<slug>, so a normal markdown renderer can display them. Stub vs. resolved
 * styling is decided at render time by the link component (see MarkdownView).
 */
export function wikilinksToMarkdown(content: string): string {
  const re = /\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g;
  return content.replace(re, (_full, target: string, label?: string) => {
    const slug = slugify(target);
    const text = (label ?? target).trim();
    // Escape any ] in the label so we don't break the markdown link syntax.
    const safe = text.replace(/]/g, "\\]");
    return `[${safe}](/wiki/${slug})`;
  });
}
