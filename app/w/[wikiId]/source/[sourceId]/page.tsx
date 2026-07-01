import Link from "next/link";
import { notFound } from "next/navigation";
import { getSource, listPages } from "@/lib/db";
import { requireWiki } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function SourceView({
  params,
}: {
  params: Promise<{ wikiId: string; sourceId: string }>;
}) {
  const { wikiId, sourceId } = await params;
  const wiki = await requireWiki(wikiId);
  const source = await getSource(wiki.id, sourceId);
  if (!source) notFound();

  const touched = JSON.parse(source.page_ids_touched) as string[];
  const pages = await listPages(wiki.id);
  const existing = new Set(pages.map((p) => p.slug));
  const base = `/w/${wiki.id}`;

  return (
    <div className="space-y-6">
      <div>
        <Link href={base} className="text-sm text-lav hover:text-lav-light">
          ← Sources
        </Link>
        <div className="mt-2 flex items-center gap-3">
          <h1 className="text-2xl font-semibold text-fg">{source.title}</h1>
          <span className="shrink-0 rounded bg-cardhi px-2 py-0.5 text-xs uppercase tracking-wide text-muted">
            {source.type}
          </span>
        </div>
        <p className="mt-1 text-sm text-faint">
          ingested {new Date(source.ingested_at).toLocaleString()}
        </p>
        {source.blob_url && (
          <a
            href={source.blob_url}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-1 inline-block text-sm text-lav hover:text-lav-light"
          >
            Download original file →
          </a>
        )}
      </div>

      {touched.length > 0 && (
        <section>
          <h2 className="mb-2 text-sm font-medium uppercase tracking-wide text-faint">
            Pages built from this source
          </h2>
          <div className="flex flex-wrap gap-1.5">
            {touched.map((slug) =>
              existing.has(slug) ? (
                <Link
                  key={slug}
                  href={`${base}/wiki/${slug}`}
                  className="rounded bg-lav-dim/20 px-2 py-0.5 text-sm text-lav-light hover:bg-lav-dim/40"
                >
                  {slug}
                </Link>
              ) : (
                <span
                  key={slug}
                  className="rounded bg-cardhi px-2 py-0.5 text-sm text-faint"
                  title="Page no longer exists"
                >
                  {slug}
                </span>
              ),
            )}
          </div>
        </section>
      )}

      <section>
        <h2 className="mb-2 text-sm font-medium uppercase tracking-wide text-faint">
          Raw source
        </h2>
        <pre className="max-h-[60vh] overflow-auto whitespace-pre-wrap rounded-xl border border-edge bg-sunken p-4 text-sm text-muted">
          {source.raw_content}
        </pre>
      </section>
    </div>
  );
}
