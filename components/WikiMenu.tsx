"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

/**
 * Manage-this-wiki control for the wiki header: a ⋯ menu to rename or delete the
 * current wiki. Delete is a soft delete (to trash) and redirects to the wiki list.
 */
export default function WikiMenu({ wikiId, name }: { wikiId: string; name: string }) {
  const router = useRouter();
  const [mode, setMode] = useState<"closed" | "menu" | "rename" | "confirmDelete">("closed");
  const [value, setValue] = useState(name);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function close() {
    setMode("closed");
    setValue(name);
    setError(null);
  }

  async function rename() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/wikis/${wikiId}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: value }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Could not rename");
      close();
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not rename");
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/wikis/${wikiId}`, { method: "DELETE" });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Could not delete");
      router.push("/");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not delete");
      setBusy(false);
    }
  }

  return (
    <div className="relative">
      <button
        aria-label="Manage wiki"
        onClick={() => setMode("menu")}
        className="rounded-md px-2 py-1.5 text-lg leading-none text-muted transition hover:bg-cardhi hover:text-fg"
      >
        ⋯
      </button>

      {mode === "menu" && (
        <>
          <div className="fixed inset-0 z-10" onClick={close} />
          <div className="absolute right-0 top-9 z-20 w-36 overflow-hidden rounded-lg border border-edge bg-card shadow-glow">
            <button
              onClick={() => setMode("rename")}
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

      {(mode === "rename" || mode === "confirmDelete") && (
        <div
          className="fixed inset-0 z-30 flex items-center justify-center bg-black/50 p-4"
          onClick={close}
        >
          <div
            className="w-full max-w-sm space-y-4 rounded-xl border border-edge bg-card p-6 shadow-glow"
            onClick={(e) => e.stopPropagation()}
          >
            {mode === "rename" ? (
              <>
                <h2 className="font-medium text-fg">Rename wiki</h2>
                <input
                  autoFocus
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && value.trim() && rename()}
                  className="w-full rounded-md border border-edge bg-sunken px-2.5 py-1.5 text-sm outline-none focus:border-lav-dim"
                />
                <div className="flex items-center gap-2">
                  <button
                    onClick={rename}
                    disabled={busy || !value.trim()}
                    className="rounded-md bg-lav px-3 py-1.5 text-sm font-medium text-onaccent transition hover:bg-lav-light disabled:opacity-40"
                  >
                    {busy ? "Saving…" : "Save"}
                  </button>
                  <button onClick={close} className="rounded-md px-2.5 py-1.5 text-sm text-muted hover:text-fg">
                    Cancel
                  </button>
                </div>
              </>
            ) : (
              <>
                <h2 className="font-medium text-fg">
                  Delete <span className="text-lav-light">{name}</span>?
                </h2>
                <p className="text-sm text-muted">
                  It moves to your trash — you can restore it later from your wiki list.
                </p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={remove}
                    disabled={busy}
                    className="rounded-md bg-red-500/90 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-red-500 disabled:opacity-40"
                  >
                    {busy ? "Deleting…" : "Delete"}
                  </button>
                  <button onClick={close} className="rounded-md px-2.5 py-1.5 text-sm text-muted hover:text-fg">
                    Cancel
                  </button>
                </div>
              </>
            )}
            {error && <p className="text-sm text-red-400">{error}</p>}
          </div>
        </div>
      )}
    </div>
  );
}
