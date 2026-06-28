"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type IngestResponse = {
  summary?: string;
  created?: string[];
  updated?: string[];
  touchedSlugs?: string[];
  error?: string;
};

export default function AddSource() {
  const router = useRouter();
  const [mode, setMode] = useState<"text" | "url">("text");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<IngestResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      const payload =
        mode === "url"
          ? { type: "url", url }
          : { type: "text", title: title || undefined, content };
      const res = await fetch("/api/ingest", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await res.json()) as IngestResponse;
      if (!res.ok) throw new Error(data.error ?? "Ingest failed");
      setResult(data);
      setContent("");
      setUrl("");
      setTitle("");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ingest failed");
    } finally {
      setBusy(false);
    }
  }

  const tab = (m: "text" | "url", label: string) => (
    <button
      onClick={() => setMode(m)}
      className={`rounded-md px-3 py-1.5 text-sm transition ${
        mode === m
          ? "bg-lav-dim text-white shadow-glow"
          : "text-muted hover:bg-cardhi"
      }`}
    >
      {label}
    </button>
  );

  return (
    <div className="rounded-xl border border-edge bg-card/60 p-5">
      <div className="mb-4 flex items-center gap-2">
        {tab("text", "Paste text")}
        {tab("url", "Add URL")}
      </div>

      {mode === "text" ? (
        <div className="space-y-3">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Optional title"
            className="w-full rounded-md border border-edge bg-sunken px-3 py-2 text-sm outline-none focus:border-lav-dim"
          />
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Paste an article, notes, or any text to ingest…"
            rows={8}
            className="w-full resize-y rounded-md border border-edge bg-sunken px-3 py-2 text-sm outline-none focus:border-lav-dim"
          />
        </div>
      ) : (
        <input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://example.com/article"
          className="w-full rounded-md border border-edge bg-sunken px-3 py-2 text-sm outline-none focus:border-lav-dim"
        />
      )}

      <div className="mt-4 flex items-center gap-3">
        <button
          onClick={submit}
          disabled={busy || (mode === "text" ? !content.trim() : !url.trim())}
          className="rounded-md bg-lav px-4 py-2 text-sm font-medium text-onaccent transition hover:bg-lav-light disabled:cursor-not-allowed disabled:opacity-40"
        >
          {busy ? "Ingesting…" : "Ingest source"}
        </button>
        {busy && (
          <span className="text-sm text-faint">
            The AI is reading and weaving this into your wiki…
          </span>
        )}
      </div>

      {error && (
        <p className="mt-4 rounded-md border border-red-900/60 bg-red-950/40 px-3 py-2 text-sm text-red-300">
          {error}
        </p>
      )}

      {result && (
        <div className="mt-4 rounded-md border border-lav-dim/50 bg-lav-dim/10 px-3 py-2 text-sm">
          <p className="text-lav-light">{result.summary}</p>
          <p className="mt-1 text-muted">
            {result.created?.length ?? 0} created · {result.updated?.length ?? 0} updated
          </p>
          {(result.touchedSlugs?.length ?? 0) > 0 && (
            <p className="mt-1 text-faint">
              Touched: {result.touchedSlugs!.join(", ")}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
