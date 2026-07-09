import { notFound } from "next/navigation";
import GraphView from "@/components/GraphView";
import { getWikiByShareToken, listPages } from "@/lib/db";
import { buildGraph } from "@/lib/wikilinks";

// Public, no-auth, read-only view of a wiki's knowledge graph. Reachable ONLY via
// a valid share token (never by wiki id). Made public in middleware.ts.
export const dynamic = "force-dynamic";

export default async function PublicGraphPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const wiki = await getWikiByShareToken(token);
  // No wiki for this token (unshared, disabled, or bogus) -> 404. A guessable wiki
  // id can never resolve here because lookup is by token only.
  if (!wiki) notFound();

  const pages = await listPages(wiki.id);
  const graph = buildGraph(pages);
  const hasContent = pages.some((p) => p.is_index === 0 && p.is_log === 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-fg">{wiki.name}</h1>
          <p className="text-sm text-faint">
            Shared knowledge graph. Nodes are pages; edges are [[wikilinks]].
            Read-only.
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
          <p className="text-muted">This graph is empty.</p>
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
