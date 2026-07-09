"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

type Wiki = { id: string; name: string; description: string; updated_at: string };

/** A wiki entry on the picker: opens the wiki, or a ⋯ menu to rename / delete it. */
export default function WikiCard({ wiki }: { wiki: Wiki }) {
  const router = useRouter();
  const [mode, setMode] = useState<"view" | "menu" | "edit" | "confirmDelete">("view");
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
      setMode("view");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save");
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/wikis/${wiki.id}`, { method: "DELETE" });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Could not delete");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not delete");
      setBusy(false);
    }
  }

  if (mode === "edit") {
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
              setMode("view");
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

  if (mode === "confirmDelete") {
    return (
      <div className="h-full space-y-3 rounded-xl border border-red-500/40 bg-card/60 p-5">
        <p className="text-sm text-fg">
          Delete <span className="font-medium">{wiki.name}</span>?
        </p>
        <p className="text-xs text-muted">
          It moves to your trash — you can restore it later.
        </p>
        <div className="flex items-center gap-2">
          <button
            onClick={remove}
            disabled={busy}
            className="rounded-md bg-red-500/90 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-red-500 disabled:opacity-40"
          >
            {busy ? "Deleting…" : "Delete"}
          </button>
          <button
            onClick={() => {
              setMode("view");
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
    <div className="relative h-full rounded-xl border border-edge bg-card/50 transition hover:border-lav-dim hover:bg-cardhi">
      <Link href={`/w/${wiki.id}`} className="block h-full p-5">
        <h2 className="truncate pr-10 font-medium text-fg">{wiki.name}</h2>
        {wiki.description && (
          <p className="mt-1 line-clamp-2 text-sm text-muted">{wiki.description}</p>
        )}
        <p className="mt-3 text-xs text-faint">
          updated {new Date(wiki.updated_at).toLocaleDateString()}
        </p>
      </Link>

      <button
        aria-label="Wiki actions"
        onClick={() => setMode("menu")}
        className="absolute right-2 top-2 rounded-md px-2 py-1 text-lg leading-none text-faint transition hover:bg-sunken hover:text-fg"
      >
        ⋯
      </button>

      {mode === "menu" && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setMode("view")} />
          <div className="absolute right-2 top-9 z-20 w-36 overflow-hidden rounded-lg border border-edge bg-card shadow-glow">
            <button
              onClick={() => setMode("edit")}
              className="block w-full px-3 py-2 text-left text-sm text-fg hover:bg-cardhi"
            >
              Rename
            </button>
            <button
              onClick={() => setMode("confirmDelete")}
              className="block w-full px-3 py-2 text-left text-sm text-red-400 hover:bg-cardhi"
            >
              Delete
            </button>
          </div>
        </>
      )}
    </div>
  );
}
