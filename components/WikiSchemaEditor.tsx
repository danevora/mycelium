"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

/**
 * Edits a wiki's organization rules — the free-text schema that's injected into
 * the AI system prompt on every ingest/chat (see lib/ai.ts). This is how a user
 * tells the agent how to structure pages (e.g. "one hub page per job-application
 * stage; each company links to its current stage").
 *
 * Persists via PATCH /api/wikis/[id] with a `schema` body (ownership-scoped).
 */
export default function WikiSchemaEditor({
  wikiId,
  schema,
}: {
  wikiId: string;
  schema: string;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(schema);
  const [saved, setSaved] = useState(schema);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/wikis/${wikiId}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ schema: value }),
      });
      const data = (await res.json()) as { schema?: string; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Could not save");
      setSaved(data.schema ?? value);
      setValue(data.schema ?? value);
      setEditing(false);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save");
    } finally {
      setBusy(false);
    }
  }

  if (!editing) {
    return (
      <div className="rounded-xl border border-edge bg-card/40 p-4">
        <div className="flex items-start justify-between gap-4">
          <p className="text-sm text-muted">
            Rules the AI follows when organizing this wiki. Edit them to control how
            sources get turned into pages and grouped.
          </p>
          <button
            onClick={() => setEditing(true)}
            className="shrink-0 rounded-md border border-edge px-3 py-1.5 text-sm text-muted transition hover:border-lav-dim hover:text-fg"
          >
            Edit rules
          </button>
        </div>
        <pre className="mt-3 max-h-40 overflow-y-auto whitespace-pre-wrap rounded-md bg-sunken p-3 text-xs text-faint">
          {saved.trim() || "No rules set."}
        </pre>
      </div>
    );
  }

  return (
    <div className="space-y-2 rounded-xl border border-lav-dim bg-card/60 p-4">
      <textarea
        autoFocus
        value={value}
        onChange={(e) => setValue(e.target.value)}
        rows={14}
        placeholder="Describe how the AI should organize pages…"
        className="w-full resize-y rounded-md border border-edge bg-sunken px-3 py-2 font-mono text-xs leading-relaxed outline-none focus:border-lav-dim"
      />
      <div className="flex items-center gap-2">
        <button
          onClick={save}
          disabled={busy}
          className="rounded-md bg-lav px-3 py-1.5 text-sm font-medium text-onaccent transition hover:bg-lav-light disabled:cursor-not-allowed disabled:opacity-40"
        >
          {busy ? "Saving…" : "Save rules"}
        </button>
        <button
          onClick={() => {
            setEditing(false);
            setValue(saved);
            setError(null);
          }}
          className="rounded-md px-2.5 py-1.5 text-sm text-muted hover:text-fg"
        >
          Cancel
        </button>
        <span className="text-xs text-faint">
          Applies to future ingests &amp; chat edits.
        </span>
      </div>
      {error && <p className="text-sm text-red-400">{error}</p>}
    </div>
  );
}
