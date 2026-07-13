"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { readNdjson } from "@/lib/ndjson-client";

type IngestResponse = {
  summary?: string;
  created?: string[];
  updated?: string[];
  touchedSlugs?: string[];
  error?: string;
};

// Events streamed by /api/ingest (`error` is raised by readNdjson, not seen here).
type IngestEvent =
  | { type: "progress"; chunk: number; of: number }
  | ({ type: "done" } & IngestResponse);

export default function AddSource({ wikiId }: { wikiId: string }) {
  const router = useRouter();
  const [mode, setMode] = useState<"text" | "url" | "file">("text");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [url, setUrl] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<{ chunk: number; of: number } | null>(null);
  const [result, setResult] = useState<IngestResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setBusy(true);
    setError(null);
    setResult(null);
    setProgress(null);
    try {
      let res: Response;
      if (mode === "file") {
        if (!file) throw new Error("Choose a file to upload");
        const form = new FormData();
        form.append("wikiId", wikiId);
        form.append("file", file);
        res = await fetch("/api/ingest", { method: "POST", body: form });
      } else {
        const payload =
          mode === "url"
            ? { type: "url", url, wikiId }
            : { type: "text", title: title || undefined, content, wikiId };
        res = await fetch("/api/ingest", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(payload),
        });
      }
      await readNdjson<IngestEvent>(res, (event) => {
        if (event.type === "progress") {
          setProgress({ chunk: event.chunk, of: event.of });
          return;
        }
        const { type: _type, ...data } = event;
        setResult(data);
        setContent("");
        setUrl("");
        setTitle("");
        setFile(null);
        if (fileInputRef.current) fileInputRef.current.value = "";
        router.refresh();
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ingest failed");
    } finally {
      setBusy(false);
      setProgress(null);
    }
  }

  const tab = (m: "text" | "url" | "file", label: string) => (
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
        {tab("file", "Upload file")}
      </div>

      {mode === "file" ? (
        <div className="space-y-2">
          <input
            ref={fileInputRef}
            type="file"
            accept=".txt,.md,.docx"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className="w-full rounded-md border border-edge bg-sunken px-3 py-2 text-sm text-muted outline-none file:mr-3 file:rounded-md file:border-0 file:bg-lav-dim file:px-3 file:py-1.5 file:text-sm file:text-white hover:file:bg-lav focus:border-lav-dim"
          />
          <p className="text-xs text-faint">Supported: .txt, .md, .docx</p>
        </div>
      ) : mode === "text" ? (
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
          disabled={
            busy ||
            (mode === "text" ? !content.trim() : mode === "url" ? !url.trim() : !file)
          }
          className="rounded-md bg-lav px-4 py-2 text-sm font-medium text-onaccent transition hover:bg-lav-light disabled:cursor-not-allowed disabled:opacity-40"
        >
          {busy ? "Ingesting…" : "Ingest source"}
        </button>
        {busy && (
          <span className="text-sm text-faint">
            {progress && progress.of > 1
              ? `Reading part ${progress.chunk} of ${progress.of}…`
              : "The AI is reading and weaving this into your wiki…"}
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
