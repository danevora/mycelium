import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { SignUpButton, SignInButton } from "@clerk/nextjs";
import NewWikiButton from "@/components/NewWikiButton";
import TrySampleButton from "@/components/TrySampleButton";
import WikiCard from "@/components/WikiCard";
import DeletedWikis from "@/components/DeletedWikis";
import { listUserWikis, listDeletedWikis } from "@/lib/db";
import { isProUser, wikiCap } from "@/lib/billing";
import { WIKI_TEMPLATES } from "@/lib/templates";

export const dynamic = "force-dynamic";

/**
 * Root route. Signed-out visitors get the marketing landing; signed-in users get
 * their wiki picker / dashboard (auto-creating + dropping into a first wiki for
 * brand-new accounts, exactly as before).
 */
export default async function Home() {
  const { userId } = await auth();
  if (!userId) return <Landing />;
  return <WikiPicker userId={userId} />;
}

/* ------------------------------ Landing (signed-out) ------------------------------ */

const HOW_IT_WORKS: { step: string; title: string; body: string }[] = [
  {
    step: "1",
    title: "Add your sources",
    body: "Drop in notes, PDFs, URLs, or a whole manuscript. No schema to design, no pages to file.",
  },
  {
    step: "2",
    title: "AI builds & maintains the wiki",
    body: "Every source is distilled into interlinked pages — one per entity, idea, or claim — and kept in sync as you add more.",
  },
  {
    step: "3",
    title: "Explore the graph & chat",
    body: "Navigate the knowledge graph of how everything connects, or just ask questions across all your sources.",
  },
  {
    step: "4",
    title: "Catch contradictions",
    body: "A consistency check scans your wiki and flags where sources disagree — an eye color, a date, an allegiance.",
  },
];

function Landing() {
  return (
    <div className="space-y-24 py-8">
      {/* Hero */}
      <section className="mx-auto max-w-3xl text-center">
        <p className="mb-4 text-sm font-medium uppercase tracking-widest text-lav">
          AI-maintained knowledge base
        </p>
        <h1 className="text-4xl font-bold tracking-tight text-fg sm:text-5xl">
          Knowledge that maintains itself
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-muted">
          Add your sources — notes, PDFs, URLs, a manuscript — and Mycelium builds an
          interlinked wiki from them, keeps it in sync as you add more, and flags
          contradictions across everything you&apos;ve fed it.
        </p>
        <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
          <SignUpButton mode="modal">
            <button className="rounded-md bg-lav px-6 py-3 text-base font-medium text-onaccent shadow-glow transition hover:bg-lav-light">
              Start building — free
            </button>
          </SignUpButton>
          <SignInButton mode="modal">
            <button className="rounded-md border border-edge px-6 py-3 text-base font-medium text-muted transition hover:bg-cardhi hover:text-lav-light">
              Sign in
            </button>
          </SignInButton>
        </div>
      </section>

      {/* How it works */}
      <section className="mx-auto max-w-5xl">
        <h2 className="text-center text-2xl font-semibold text-lav-light">
          How it works
        </h2>
        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {HOW_IT_WORKS.map((s) => (
            <div
              key={s.step}
              className="rounded-lg border border-edge bg-card p-5"
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-lav/15 text-sm font-semibold text-lav">
                {s.step}
              </div>
              <h3 className="mt-4 font-semibold text-fg">{s.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted">{s.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Templates */}
      <section className="mx-auto max-w-5xl">
        <div className="text-center">
          <h2 className="text-2xl font-semibold text-lav-light">
            Start from a template
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-muted">
            The same engine, tuned for how you work — worldbuilding, research, or a
            second brain. Pick a preset or start blank; every wiki stays editable.
          </p>
        </div>
        <div className="mt-10 grid gap-6 sm:grid-cols-2">
          {WIKI_TEMPLATES.map((t) => (
            <div
              key={t.key}
              className="rounded-lg border border-edge bg-card p-6 transition hover:border-lav-dim"
            >
              <h3 className="text-lg font-semibold text-fg">{t.name}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted">{t.tagline}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Closing CTA */}
      <section className="mx-auto max-w-2xl rounded-xl border border-edge bg-card px-6 py-12 text-center">
        <h2 className="text-2xl font-semibold text-fg">
          Turn your sources into a living wiki
        </h2>
        <p className="mt-3 text-muted">
          Free to start. Build your first knowledge base in minutes.
        </p>
        <div className="mt-8">
          <SignUpButton mode="modal">
            <button className="rounded-md bg-lav px-6 py-3 text-base font-medium text-onaccent shadow-glow transition hover:bg-lav-light">
              Get started
            </button>
          </SignUpButton>
        </div>
      </section>
    </div>
  );
}

/* ------------------------------ Empty state (signed-in, zero wikis) ------------------------------ */

/**
 * First-run screen for a brand-new account. Instead of silently auto-creating an
 * empty wiki, we offer a one-click "Try a sample" (create-from-template → ingest a
 * bundled source → land on the populated graph) alongside the normal New wiki path,
 * so the very first thing a new user sees is a populated graph a click away.
 */
function EmptyState() {
  return (
    <div className="mx-auto max-w-2xl space-y-10 py-8">
      <div className="text-center">
        <h1 className="text-2xl font-semibold text-fg">Build your first wiki</h1>
        <p className="mt-3 text-muted">
          Start from a ready-made sample to see Mycelium turn a source into an
          interlinked graph in one click — no upload or typing required.
        </p>
      </div>

      <section className="space-y-4">
        <h2 className="text-sm font-medium uppercase tracking-widest text-lav">
          Try a sample
        </h2>
        <TrySampleButton />
      </section>

      <section className="space-y-4 border-t border-edge pt-8">
        <h2 className="text-sm font-medium uppercase tracking-widest text-lav">
          Or start your own
        </h2>
        <NewWikiButton />
      </section>
    </div>
  );
}

/* ------------------------------ Wiki picker (signed-in) ------------------------------ */

/**
 * Wiki picker / dashboard. New accounts (zero wikis) get one auto-created and are
 * dropped straight into it. Otherwise we list the user's wikis and gate "New wiki"
 * on the per-tier cap (free: 1, pro: 5).
 */
async function WikiPicker({ userId }: { userId: string }) {
  const [wikis, deleted] = await Promise.all([
    listUserWikis(userId),
    listDeletedWikis(userId),
  ]);
  // Only a truly-empty account (no active wikis AND empty trash) gets onboarding;
  // if there's something to restore, show the picker so the trash is reachable.
  if (wikis.length === 0 && deleted.length === 0) return <EmptyState />;

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

      {!atCap && (
        <section className="space-y-4 rounded-lg border border-edge bg-card p-6">
          <h2 className="text-sm font-medium uppercase tracking-widest text-lav">
            Try a sample
          </h2>
          <TrySampleButton />
        </section>
      )}

      {wikis.length > 0 && (
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
      )}

      <DeletedWikis
        wikis={deleted.map((w) => ({
          id: w.id,
          name: w.name,
          deleted_at: w.deleted_at ?? w.updated_at,
        }))}
        atCap={atCap}
      />
    </div>
  );
}
