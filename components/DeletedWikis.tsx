"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Deleted = { id: string; name: string; deleted_at: string };

/**
 * "Recently deleted" list on the wiki picker. Restores a soft-deleted wiki, unless
 * the user is at their active cap — restore reactivates a wiki, so it's blocked
 * (with a message) when there's no room. `atCap` gates the buttons client-side; the
 * restore route enforces the same rule server-side.
 */
export default function DeletedWikis({
  wikis,
  atCap,
}: {
  wikis: Deleted[];
  atCap: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (wikis.length === 0) return null;

  async function restore(id: string) {
    setBusy(id);
    setError(null);
    try {
      const res = await fetch(`/api/wikis/${id}/restore`, { method: "POST" });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Could not restore");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not restore");
      setBusy(null);
    }
  }

  return (
    <section className="space-y-3 border-t border-edge pt-6">
      <h2 className="text-sm font-medium uppercase tracking-widest text-faint">
        Recently deleted
      </h2>
      {atCap && (
        <p className="text-sm text-muted">
          You&apos;re at your wiki limit — delete an active wiki or upgrade to restore one.
        </p>
      )}
      <ul className="space-y-2">
        {wikis.map((w) => (
          <li
            key={w.id}
            className="flex items-center justify-between rounded-lg border border-edge bg-card/40 px-4 py-2.5"
          >
            <div className="min-w-0">
              <span className="block truncate text-sm text-fg">{w.name}</span>
              <span className="text-xs text-faint">
                deleted {new Date(w.deleted_at).toLocaleDateString()}
              </span>
            </div>
            <button
              onClick={() => restore(w.id)}
              disabled={atCap || busy !== null}
              className="shrink-0 rounded-md border border-edge px-3 py-1.5 text-sm text-muted transition hover:border-lav-dim hover:text-lav-light disabled:cursor-not-allowed disabled:opacity-40"
            >
              {busy === w.id ? "Restoring…" : "Restore"}
            </button>
          </li>
        ))}
      </ul>
      {error && <p className="text-sm text-red-400">{error}</p>}
    </section>
  );
}
