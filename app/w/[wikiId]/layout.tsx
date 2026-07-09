import Link from "next/link";
import WikiSwitcher from "@/components/WikiSwitcher";
import { requireWiki } from "@/lib/auth";
import { listUserWikis } from "@/lib/db";

export const dynamic = "force-dynamic";

/**
 * Wiki-scoped chrome: authorizes the wiki once for the whole subtree, then renders
 * the page sub-nav (which needs the wiki id) plus a switcher across the user's wikis.
 */
export default async function WikiLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ wikiId: string }>;
}) {
  const { wikiId } = await params;
  const wiki = await requireWiki(wikiId);
  const wikis = await listUserWikis(wiki.user_id);
  const base = `/w/${wiki.id}`;
  const nav = [
    { href: base, label: "Sources" },
    { href: `${base}/graph`, label: "Graph" },
    { href: `${base}/wiki`, label: "Wiki" },
    { href: `${base}/chat`, label: "Chat" },
    { href: `${base}/consistency`, label: "Consistency Check" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 border-b border-edge pb-3">
        <WikiSwitcher
          wikis={wikis.map((w) => ({ id: w.id, name: w.name }))}
          currentId={wiki.id}
        />
        <nav className="flex items-center gap-1 text-sm">
          {nav.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              className="rounded-md px-3 py-1.5 text-muted transition hover:bg-cardhi hover:text-lav-light"
            >
              {n.label}
            </Link>
          ))}
        </nav>
      </div>
      {children}
    </div>
  );
}
