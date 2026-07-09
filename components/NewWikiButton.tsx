"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { WIKI_TEMPLATES } from "@/lib/templates";

/**
 * Creates a named wiki via POST /api/wikis (which enforces the per-tier cap) and
 * routes into it. When the user is at their cap the route returns 403 + `upgrade`,
 * and we surface a link to /billing instead.
 */
export default function NewWikiButton() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [templateKey, setTemplateKey] = useState("story-bible");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [upgrade, setUpgrade] = useState(false);

  async function create() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/wikis", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name, description, templateKey }),
      });
      const data = (await res.json()) as { id?: string; error?: string; upgrade?: boolean };
      if (!res.ok) {
        setUpgrade(Boolean(data.upgrade));
        throw new Error(data.error ?? "Could not create wiki");
      }
      router.push(`/w/${data.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not create wiki");
    } finally {
      setBusy(false);
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="self-start rounded-md bg-lav px-4 py-2 text-sm font-medium text-onaccent transition hover:bg-lav-light"
      >
        New wiki
      </button>
    );
  }

  return (
    <div className="w-full max-w-sm space-y-2 rounded-xl border border-edge bg-card/60 p-4">
      <input
        autoFocus
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !busy) create();
        }}
        placeholder="Wiki name"
        className="w-full rounded-md border border-edge bg-sunken px-3 py-2 text-sm outline-none focus:border-lav-dim"
      />
      <input
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="Description (optional)"
        className="w-full rounded-md border border-edge bg-sunken px-3 py-2 text-sm outline-none focus:border-lav-dim"
      />
      <div className="space-y-1">
        <p className="px-1 text-xs font-medium text-muted">Template</p>
        {WIKI_TEMPLATES.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTemplateKey(t.key)}
            className={`block w-full rounded-md border px-3 py-2 text-left text-sm transition ${
              templateKey === t.key
                ? "border-lav bg-lav/10"
                : "border-edge bg-sunken hover:border-lav-dim"
            }`}
          >
            <span className="font-medium text-fg">{t.name}</span>
            <span className="mt-0.5 block text-xs text-muted">{t.tagline}</span>
          </button>
        ))}
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={create}
          disabled={busy || (!name.trim() && templateKey === "blank")}
          className="rounded-md bg-lav px-4 py-2 text-sm font-medium text-onaccent transition hover:bg-lav-light disabled:cursor-not-allowed disabled:opacity-40"
        >
          {busy ? "Creating…" : "Create"}
        </button>
        <button
          onClick={() => {
            setOpen(false);
            setError(null);
          }}
          className="rounded-md px-3 py-2 text-sm text-muted hover:text-fg"
        >
          Cancel
        </button>
      </div>
      {error && (
        <p className="text-sm text-red-400">
          {error}
          {upgrade && (
            <>
              {" "}
              <a href="/billing" className="font-medium text-lav hover:text-lav-light">
                Upgrade →
              </a>
            </>
          )}
        </p>
      )}
    </div>
  );
}
