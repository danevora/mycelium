import Link from "next/link";
import MarkdownView from "@/components/MarkdownView";
import WikiSidebar from "@/components/WikiSidebar";
import { listPages, getPage } from "@/lib/db";
import { requireUserWiki } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function WikiPageView({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const wiki = await requireUserWiki();
  const [pages, page] = await Promise.all([listPages(wiki.id), getPage(wiki.id, slug)]);

  const items = pages.map((p) => ({
    slug: p.slug,
    title: p.title,
    special: p.is_index === 1 || p.is_log === 1,
  }));
  const existingSlugs = pages.map((p) => p.slug);

  return (
    <div className="flex gap-8">
      <WikiSidebar items={items} activeSlug={slug} />
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
            <MarkdownView content={page.content} existingSlugs={existingSlugs} />
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
              href="/"
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
