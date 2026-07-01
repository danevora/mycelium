import Link from "next/link";
import GraphView from "@/components/GraphView";
import { listPages } from "@/lib/db";
import { requireWiki } from "@/lib/auth";
import { buildGraph } from "@/lib/wikilinks";

export const dynamic = "force-dynamic";

export default async function GraphPage({ params }: { params: Promise<{ wikiId: string }> }) {
  const { wikiId } = await params;
  const wiki = await requireWiki(wikiId);
  const pages = await listPages(wiki.id);
  const graph = buildGraph(pages);
  const hasContent = pages.some((p) => p.is_index === 0 && p.is_log === 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-fg">Knowledge graph</h1>
          <p className="text-sm text-faint">
            Nodes are pages; edges are [[wikilinks]]. Hubs are larger, orphans dimmer,
            stubs grey. Click a node to open it.
          </p>
        </div>
        <div className="flex gap-3 text-xs text-faint">
          <Legend color="rgb(var(--lav))" label="page" />
          <Legend color="rgb(var(--lav-dim))" label="orphan" />
          <Legend color="rgb(var(--faint))" label="stub" />
        </div>
      </div>

      {hasContent ? (
        <GraphView graph={graph} wikiId={wiki.id} />
      ) : (
        <div className="rounded-xl border border-dashed border-edge p-10 text-center">
          <p className="text-muted">Your graph is empty.</p>
          <Link
            href={`/w/${wiki.id}`}
            className="mt-4 inline-block rounded-md bg-lav px-4 py-2 text-sm font-medium text-onaccent hover:bg-lav-light"
          >
            Add your first source
          </Link>
        </div>
      )}
    </div>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: color }} />
      {label}
    </span>
  );
}
