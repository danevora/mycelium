import Link from "next/link";
import MarkdownView from "@/components/MarkdownView";
import WikiSidebar from "@/components/WikiSidebar";
import { listPages, getPage, listSourcesForPage } from "@/lib/db";
import { requireWiki } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function WikiPageView({
  params,
}: {
  params: Promise<{ wikiId: string; slug: string }>;
}) {
  const { wikiId, slug } = await params;
  const wiki = await requireWiki(wikiId);
  const [pages, page, sources] = await Promise.all([
    listPages(wiki.id),
    getPage(wiki.id, slug),
    listSourcesForPage(wiki.id, slug),
  ]);

  const items = pages.map((p) => ({
    slug: p.slug,
    title: p.title,
    special: p.is_index === 1 || p.is_log === 1,
  }));
  const existingSlugs = pages.map((p) => p.slug);

  return (
    <div className="flex gap-8">
      <WikiSidebar items={items} activeSlug={slug} wikiId={wiki.id} />
      <article className="min-w-0 flex-1">
        {page ? (
          <>
            <div className="mb-4 flex items-center justify-between border-b border-edge pb-3">
              <h1 className="text-sm font-medium uppercase tracking-wide text-faint">
                {page.slug}
              </h1>
              <span className="text-xs text-faint">
                updated {new Date(page.updated_at).toLocaleString()}
              </span>
            </div>
            <MarkdownView
              content={page.content}
              existingSlugs={existingSlugs}
              basePath={`/w/${wiki.id}/wiki`}
            />
            {sources.length > 0 && (
              <div className="mt-8 border-t border-edge pt-4">
                <h2 className="mb-2 text-xs font-medium uppercase tracking-wide text-faint">
                  Built from
                </h2>
                <ul className="space-y-1">
                  {sources.map((s) => (
                    <li key={s.id}>
                      <Link
                        href={`/w/${wiki.id}/source/${s.id}`}
                        className="text-sm text-lav hover:text-lav-light"
                      >
                        {s.title}
                      </Link>
                      <span className="ml-2 text-xs uppercase tracking-wide text-faint">
                        {s.type}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </>
        ) : (
          <div className="rounded-xl border border-dashed border-edge p-8 text-center">
            <p className="text-muted">
              No page exists at{" "}
              <code className="rounded bg-cardhi px-1.5 py-0.5 text-lav-glow">
                {slug}
              </code>{" "}
              yet.
            </p>
            <p className="mt-2 text-sm text-faint">
              It may be a stub — referenced by other pages but not written. Ingest more
              sources, or ask the chat to create it.
            </p>
            <Link
              href={`/w/${wiki.id}`}
              className="mt-4 inline-block rounded-md bg-lav px-4 py-2 text-sm font-medium text-onaccent hover:bg-lav-light"
            >
              Add a source
            </Link>
          </div>
        )}
      </article>
    </div>
  );
}
