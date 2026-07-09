import ConsistencyPanel from "@/components/ConsistencyPanel";
import { requireWiki } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function ConsistencyPage({
  params,
}: {
  params: Promise<{ wikiId: string }>;
}) {
  const { wikiId } = await params;
  const wiki = await requireWiki(wikiId);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold text-fg">Consistency Check</h1>
        <p className="text-sm text-faint">
          Scan your pages for factual contradictions and timeline conflicts, and see exactly
          where each one appears.
        </p>
      </div>
      <ConsistencyPanel wikiId={wiki.id} />
    </div>
  );
}
