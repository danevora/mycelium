import ChatPanel from "@/components/ChatPanel";
import { listChat, listPages } from "@/lib/db";
import { requireWiki } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function ChatPage({ params }: { params: Promise<{ wikiId: string }> }) {
  const { wikiId } = await params;
  const wiki = await requireWiki(wikiId);
  const [history, pages] = await Promise.all([listChat(wiki.id), listPages(wiki.id)]);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold text-fg">Chat</h1>
        <p className="text-sm text-faint">
          Query your wiki or ask the AI to edit it. Edits apply immediately.
        </p>
      </div>
      <ChatPanel
        initial={history.map((m) => ({ role: m.role, content: m.content }))}
        existingSlugs={pages.map((p) => p.slug)}
        wikiId={wiki.id}
      />
    </div>
  );
}
