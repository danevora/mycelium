import Link from "next/link";
import AddSource from "@/components/AddSource";
import { listSources, listPages } from "@/lib/db";
import { requireWiki } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function Home({ params }: { params: Promise<{ wikiId: string }> }) {
  const { wikiId } = await params;
  const wiki = await requireWiki(wikiId);
  const [sources, pages] = await Promise.all([
    listSources(wiki.id),
    listPages(wiki.id),
  ]);
  const contentPages = pages.filter((p) => p.is_index === 0 && p.is_log === 0);
  const base = `/w/${wiki.id}`;

  return (
    <div className="space-y-8">
      <section>
        <h1 className="text-2xl font-semibold text-fg">{wiki.name}</h1>
        <div className="mt-3 flex gap-6 text-sm text-faint">
          <span>
            <span className="text-lav-light">{sources.length}</span> sources
          </span>
          <span>
            <span className="text-lav-light">{contentPages.length}</span> pages
          </span>
          <Link href={`${base}/graph`} className="text-lav hover:text-lav-light">
            View graph →
          </Link>
          <Link href={`${base}/wiki`} className="text-lav hover:text-lav-light">
            Browse wiki →
          </Link>
          <Link href={`${base}/chat`} className="text-lav hover:text-lav-light">
            Ask / edit →
          </Link>
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-lg font-medium text-fg">Add a source</h2>
        <AddSource wikiId={wiki.id} />
      </section>

      <section>
        <h2 className="mb-3 text-lg font-medium text-fg">Sources</h2>
        {sources.length === 0 ? (
          <p className="text-sm text-faint">
            No sources yet. Paste some text or a URL above and the AI will start building
            your wiki.
          </p>
        ) : (
          <ul className="divide-y divide-edge overflow-hidden rounded-xl border border-edge">
            {sources.map((s) => {
              const touched = JSON.parse(s.page_ids_touched) as string[];
              return (
                <li key={s.id}>
                  <Link
                    href={`${base}/source/${s.id}`}
                    className="block bg-card/40 px-4 py-3 transition hover:bg-cardhi"
                  >
                    <div className="flex items-center justify-between gap-4">
                      <span className="truncate font-medium text-fg">{s.title}</span>
                      <span className="shrink-0 rounded bg-cardhi px-2 py-0.5 text-xs uppercase tracking-wide text-muted">
                        {s.type}
                      </span>
                    </div>
                    {touched.length > 0 && (
                      <p className="mt-1 text-xs text-faint">
                        {touched.length} page{touched.length === 1 ? "" : "s"} touched
                      </p>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
