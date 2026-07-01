"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

type Wiki = { id: string; name: string; description: string; updated_at: string };

/** A wiki entry on the picker — opens the wiki, or flips to inline rename/edit. */
export default function WikiCard({ wiki }: { wiki: Wiki }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(wiki.name);
  const [description, setDescription] = useState(wiki.description);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/wikis/${wiki.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name, description }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Could not save");
      setEditing(false);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save");
    } finally {
      setBusy(false);
    }
  }

  if (editing) {
    return (
      <div className="h-full space-y-2 rounded-xl border border-lav-dim bg-card/60 p-5">
        <input
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Wiki name"
          className="w-full rounded-md border border-edge bg-sunken px-2.5 py-1.5 text-sm outline-none focus:border-lav-dim"
        />
        <input
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Description (optional)"
          className="w-full rounded-md border border-edge bg-sunken px-2.5 py-1.5 text-sm outline-none focus:border-lav-dim"
        />
        <div className="flex items-center gap-2">
          <button
            onClick={save}
            disabled={busy || !name.trim()}
            className="rounded-md bg-lav px-3 py-1.5 text-sm font-medium text-onaccent transition hover:bg-lav-light disabled:cursor-not-allowed disabled:opacity-40"
          >
            {busy ? "Saving…" : "Save"}
          </button>
          <button
            onClick={() => {
              setEditing(false);
              setName(wiki.name);
              setDescription(wiki.description);
              setError(null);
            }}
            className="rounded-md px-2.5 py-1.5 text-sm text-muted hover:text-fg"
          >
            Cancel
          </button>
        </div>
        {error && <p className="text-sm text-red-400">{error}</p>}
      </div>
    );
  }

  return (
    <div className="group relative h-full rounded-xl border border-edge bg-card/50 transition hover:border-lav-dim hover:bg-cardhi">
      <Link href={`/w/${wiki.id}`} className="block h-full p-5">
        <h2 className="truncate pr-12 font-medium text-fg">{wiki.name}</h2>
        {wiki.description && (
          <p className="mt-1 line-clamp-2 text-sm text-muted">{wiki.description}</p>
        )}
        <p className="mt-3 text-xs text-faint">
          updated {new Date(wiki.updated_at).toLocaleDateString()}
        </p>
      </Link>
      <button
        onClick={() => setEditing(true)}
        className="absolute right-3 top-3 rounded-md px-2 py-1 text-xs text-faint opacity-0 transition hover:bg-sunken hover:text-fg group-hover:opacity-100"
      >
        Rename
      </button>
    </div>
  );
}
