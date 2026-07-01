import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import NewWikiButton from "@/components/NewWikiButton";
import WikiCard from "@/components/WikiCard";
import { listUserWikis, createUserWiki } from "@/lib/db";
import { isProUser, wikiCap } from "@/lib/billing";

export const dynamic = "force-dynamic";

/**
 * Wiki picker / dashboard. New accounts (zero wikis) get one auto-created and are
 * dropped straight into it. Otherwise we list the user's wikis and gate "New wiki"
 * on the per-tier cap (free: 1, pro: 5).
 */
export default async function WikiPicker() {
  const { userId } = await auth();
  if (!userId) redirect("/");

  const wikis = await listUserWikis(userId);
  if (wikis.length === 0) {
    const created = await createUserWiki(userId);
    redirect(`/w/${created.id}`);
  }

  const isPro = await isProUser();
  const cap = wikiCap(isPro);
  const atCap = wikis.length >= cap;

  return (
    <div className="space-y-8">
      <section className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-fg">My wikis</h1>
          <p className="mt-1 text-sm text-faint">
            {wikis.length} of {cap} {isPro ? "(Pro)" : "(Free)"}
            {!isPro && (
              <>
                {" · "}
                <Link href="/billing" className="text-lav hover:text-lav-light">
                  Upgrade for more →
                </Link>
              </>
            )}
          </p>
        </div>
        {!atCap && <NewWikiButton />}
        {atCap && !isPro && (
          <Link
            href="/billing"
            className="rounded-md bg-lav px-4 py-2 text-sm font-medium text-onaccent hover:bg-lav-light"
          >
            Upgrade to add more
          </Link>
        )}
      </section>

      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {wikis.map((w) => (
          <li key={w.id}>
            <WikiCard
              wiki={{
                id: w.id,
                name: w.name,
                description: w.description,
                updated_at: w.updated_at,
              }}
            />
          </li>
        ))}
      </ul>
    </div>
  );
}
